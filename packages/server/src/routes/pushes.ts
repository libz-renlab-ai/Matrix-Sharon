import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ulid } from "ulid";
import type { PushReceiptStatus } from "@matrix-sharon/types";
import { SLUG_PATTERN } from "@matrix-sharon/core";
import { withAuth, withLeader } from "../auth-guard.js";

const CreatePushBody = z.object({
  skillSlug: z.string().regex(SLUG_PATTERN, "invalid skill slug"),
  semver: z.number().int().positive(),
  recipientIds: z.array(z.string().min(1)).min(1),
  reason: z.string().min(1),
});

const FailBody = z.object({ reason: z.string().min(1) });

export async function registerPushRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/v1/pushes",
    withLeader(async (req, reply, _session, leader) => {
      const parsed = CreatePushBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_body", issues: parsed.error.issues });
      }
      // Dedupe recipientIds — push_receipts has a unique (push_id, recipient_id)
      // constraint, so a payload like {"recipientIds":["alice","alice"]} would
      // otherwise crash the receipts insert and leave an orphan push row.
      const recipientIds = [...new Set(parsed.data.recipientIds)];
      // Refuse self-push — a leader pushing to themselves is meaningless and
      // litters their own inbox.
      if (recipientIds.includes(leader.id)) {
        return reply.code(400).send({ error: "cannot_push_to_self" });
      }

      // Resolve version by slug+semver
      const versions = await app.ctx.skillStore.listVersionsBySlug(parsed.data.skillSlug);
      const version = versions.find((v) => v.semver === parsed.data.semver);
      if (!version) return reply.code(404).send({ error: "version_not_found" });

      // Validate recipients exist
      for (const id of recipientIds) {
        const u = await app.ctx.userStore.findById(id);
        if (!u) return reply.code(400).send({ error: "unknown_recipient", recipientId: id });
      }

      const pushId = ulid();
      const now = Date.now();
      const push = {
        id: pushId,
        kind: "skill" as const,
        skillSlug: parsed.data.skillSlug,
        skillVersionId: version.id,
        fromLeaderId: leader.id,
        reason: parsed.data.reason,
        pushedAt: now,
      };
      await app.ctx.pushStore.insertPush(push);
      const receipts = recipientIds.map((rid) => ({
        pushId,
        recipientId: rid,
        status: "pending" as const,
        statusChangedAt: now,
        failReason: null,
        acknowledged: false,
      }));
      await app.ctx.pushStore.insertReceipts(receipts);
      await app.ctx.auditLog.record({
        actorId: leader.id,
        action: "push",
        targetKind: "push",
        targetId: pushId,
        payload: { skillSlug: parsed.data.skillSlug, semver: parsed.data.semver, recipients: recipientIds },
        at: now,
      });
      return reply.code(201).send({ push, receipts });
    })
  );

  app.get(
    "/v1/pushes/inbox",
    withAuth(async (_req, _reply, _session, user) => {
      const items = await app.ctx.pushStore.listInboxFor(user.id);
      return { items };
    })
  );

  app.post<{ Params: { pushId: string } }>(
    "/v1/pushes/:pushId/acknowledge",
    withAuth(async (req, reply, _session, user) => {
      const { pushId } = req.params as { pushId: string };
      const receipts = await app.ctx.pushStore.listReceiptsForPush(pushId);
      const mine = receipts.find((r) => r.recipientId === user.id);
      if (!mine) return reply.code(403).send({ error: "not_a_recipient" });
      await app.ctx.pushStore.acknowledge(pushId, user.id);
      return reply.code(204).send();
    })
  );

  app.post<{ Params: { pushId: string } }>(
    "/v1/pushes/:pushId/receipts/done",
    withAuth(async (req, reply, _session, user) => {
      const { pushId } = req.params as { pushId: string };
      const push = await app.ctx.pushStore.findPush(pushId);
      if (!push) return reply.code(404).send({ error: "push_not_found" });
      const receipts = await app.ctx.pushStore.listReceiptsForPush(pushId);
      const mine = receipts.find((r) => r.recipientId === user.id);
      if (!mine) return reply.code(403).send({ error: "not_a_recipient" });
      const now = Date.now();
      await app.ctx.pushStore.setReceiptStatus(pushId, user.id, {
        status: "installed",
        statusChangedAt: now,
        failReason: null,
      });
      if (push.skillVersionId) {
        await app.ctx.installStore.recordInstall({
          userId: user.id,
          skillSlug: push.skillSlug,
          skillVersionId: push.skillVersionId,
          installedAt: now,
          uninstalledAt: null,
          viaPushId: pushId,
        });
      }
      return reply.code(204).send();
    })
  );

  app.post<{ Params: { pushId: string } }>(
    "/v1/pushes/:pushId/receipts/failed",
    withAuth(async (req, reply, _session, user) => {
      const { pushId } = req.params as { pushId: string };
      const parsed = FailBody.safeParse(req.body);
      if (!parsed.success) return reply.code(400).send({ error: "invalid_body", issues: parsed.error.issues });
      const receipts = await app.ctx.pushStore.listReceiptsForPush(pushId);
      const mine = receipts.find((r) => r.recipientId === user.id);
      if (!mine) return reply.code(403).send({ error: "not_a_recipient" });
      await app.ctx.pushStore.setReceiptStatus(pushId, user.id, {
        status: "failed",
        statusChangedAt: Date.now(),
        failReason: parsed.data.reason,
      });
      return reply.code(204).send();
    })
  );

  app.get(
    "/v1/pushes/sent",
    withLeader(async (_req, _reply, _session, leader) => {
      const rows = app.ctx.db
        .prepare("SELECT * FROM pushes WHERE from_leader_id = ? ORDER BY pushed_at DESC")
        .all(leader.id) as Array<{
          id: string;
          kind: string;
          skill_slug: string;
          skill_version_id: string | null;
          from_leader_id: string;
          reason: string;
          pushed_at: number;
        }>;
      const out: Array<{
        push: ReturnType<typeof toPushOut> & { semver: number | null };
        counts: Record<PushReceiptStatus, number>;
      }> = [];
      for (const r of rows) {
        const receipts = await app.ctx.pushStore.listReceiptsForPush(r.id);
        const counts: Record<PushReceiptStatus, number> = {
          pending: 0, installed: 0, failed: 0, uninstalled: 0,
        };
        for (const rec of receipts) counts[rec.status]++;
        let semver: number | null = null;
        if (r.skill_version_id) {
          const v = await app.ctx.skillStore.findVersion(r.skill_version_id);
          semver = v?.semver ?? null;
        }
        out.push({ push: { ...toPushOut(r), semver }, counts });
      }
      return { items: out };
    })
  );

  // Minimal user list for the push-target picker (leader only — exposes
  // member identities, which is acceptable inside the team but not public).
  app.get(
    "/v1/users",
    withLeader(async () => {
      const users = await app.ctx.userStore.list();
      return {
        users: users.map((u) => ({
          id: u.id, name: u.name, role: u.role, avatarUrl: u.avatarUrl,
        })),
      };
    })
  );
}

function toPushOut(r: {
  id: string;
  kind: string;
  skill_slug: string;
  skill_version_id: string | null;
  from_leader_id: string;
  reason: string;
  pushed_at: number;
}) {
  return {
    id: r.id,
    kind: r.kind,
    skillSlug: r.skill_slug,
    skillVersionId: r.skill_version_id,
    fromLeaderId: r.from_leader_id,
    reason: r.reason,
    pushedAt: r.pushed_at,
  };
}
