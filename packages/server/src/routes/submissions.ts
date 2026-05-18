import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ulid } from "ulid";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { create as tarCreate } from "tar";
import { readFile } from "node:fs/promises";
import {
  ApprovalPlanError,
  parseFrontmatter,
  planApproval,
  planRejection,
} from "@matrix-sharon/core";
import type { PendingSubmission, SkillVersion } from "@matrix-sharon/types";
import { withAuth, withLeader } from "../auth-guard.js";

const SubmitFromCandidate = z.object({
  candidateId: z.string().min(1),
});
const SubmitDirect = z.object({
  skillSlug: z.string().min(1),
  rawSkillMd: z.string().min(1),
});
const SubmitBody = z.union([SubmitFromCandidate, SubmitDirect]);

const ApproveBody = z.object({ note: z.string().optional() });
const RejectBody = z.object({ reason: z.string().min(1) });

/**
 * Bundle = 1-file .tgz with SKILL.md only (v1 — scripts/ subdir is Phase 5+).
 * Returns the in-memory bytes (caller hands them to BundleStore).
 */
async function packSkillMd(rawSkillMd: string): Promise<Buffer> {
  const dir = await mkdtemp(join(tmpdir(), "sharon-bundle-"));
  try {
    const filePath = join(dir, "SKILL.md");
    await writeFile(filePath, rawSkillMd, "utf8");
    const archivePath = join(dir, "bundle.tgz");
    await tarCreate(
      { file: archivePath, cwd: dir, gzip: true, portable: true },
      ["SKILL.md"]
    );
    return readFile(archivePath);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

export async function registerSubmissionRoutes(app: FastifyInstance): Promise<void> {
  // POST /v1/submissions
  app.post("/v1/submissions", withAuth(async (req, reply, _session, user) => {
    const parsed = SubmitBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: "invalid_body", issues: parsed.error.issues });
    }

    let skillSlug: string;
    let rawSkillMd: string;
    let candidateIdToDelete: string | null = null;

    if ("candidateId" in parsed.data) {
      const c = await app.ctx.candidateStore.find(parsed.data.candidateId);
      if (!c) return reply.code(404).send({ error: "candidate_not_found" });
      if (c.userId !== user.id) return reply.code(403).send({ error: "not_yours" });
      skillSlug = c.skillSlug;
      rawSkillMd = c.fullContentMd;
      candidateIdToDelete = c.id;
    } else {
      skillSlug = parsed.data.skillSlug;
      rawSkillMd = parsed.data.rawSkillMd;
    }

    // Validate frontmatter early — reject before persisting.
    try {
      parseFrontmatter(rawSkillMd);
    } catch (err) {
      return reply.code(400).send({
        error: "invalid_frontmatter",
        detail: err instanceof Error ? err.message : String(err),
      });
    }

    // Compute bundle now so we can persist sha256+size on the pending row.
    const bundleBytes = await packSkillMd(rawSkillMd);
    const { createHash } = await import("node:crypto");
    const bundleSha256 = createHash("sha256").update(bundleBytes).digest("hex");

    const existingSkill = await app.ctx.skillStore.findSkillBySlug(skillSlug);
    const isNewSkill = !existingSkill;

    const submission: PendingSubmission = {
      id: ulid(),
      skillSlug,
      isNewSkill,
      bundleSha256,
      bundleSize: bundleBytes.length,
      rawSkillMd,
      submitterId: user.id,
      submittedAt: Date.now(),
      status: "pending",
      reviewerId: null,
      reviewedAt: null,
      rejectReason: null,
    };
    await app.ctx.submissionStore.insert(submission);

    if (candidateIdToDelete) {
      await app.ctx.candidateStore.delete(candidateIdToDelete);
    }

    return reply.code(201).send({ submission });
  }));

  app.get("/v1/submissions/pending", withLeader(async () => {
    const submissions = await app.ctx.submissionStore.listByStatus("pending");
    return { submissions };
  }));

  // Current user's own submissions (all statuses). Backs the "我发布的" tab.
  app.get("/v1/submissions/mine", withAuth(async (_req, _reply, _session, user) => {
    const submissions = await app.ctx.submissionStore.listBySubmitter(user.id);
    return { submissions };
  }));

  app.post<{ Params: { id: string } }>(
    "/v1/submissions/:id/approve",
    withLeader(async (req, reply, _session, user) => {
      const { id } = req.params as { id: string };
      const bodyParsed = ApproveBody.safeParse(req.body ?? {});
      if (!bodyParsed.success) {
        return reply.code(400).send({ error: "invalid_body" });
      }

      const submission = await app.ctx.submissionStore.find(id);
      if (!submission) return reply.code(404).send({ error: "submission_not_found" });

      let plan;
      try {
        const maxSemver = await app.ctx.skillStore.maxSemver(submission.skillSlug);
        const versionId = ulid();
        // Pack & verify bundle bytes match what was stored on the submission.
        const bundleBytes = await packSkillMd(submission.rawSkillMd);
        const { createHash } = await import("node:crypto");
        const bundleSha256 = createHash("sha256").update(bundleBytes).digest("hex");

        const approveInput: Parameters<typeof planApproval>[0] = {
          submission,
          leader: user,
          nowMs: Date.now(),
          maxSemver,
          bundleSha256,
          bundleSize: bundleBytes.length,
          versionId,
        };
        if (bodyParsed.data.note !== undefined) approveInput.note = bodyParsed.data.note;
        plan = planApproval(approveInput);

        // Imperative shell: persist atomically.
        const versionToInsert = plan.versionToInsert;
        await persistApproval(app, submission, versionToInsert, bundleBytes, plan);

        return reply.code(200).send({ version: versionToInsert });
      } catch (err) {
        if (err instanceof ApprovalPlanError) {
          return reply.code(400).send({ error: "approval_invalid", detail: err.message });
        }
        req.log.error({ err }, "approval failed");
        return reply.code(500).send({ error: "approval_failure" });
      }
    })
  );

  app.post<{ Params: { id: string } }>(
    "/v1/submissions/:id/reject",
    withLeader(async (req, reply, _session, user) => {
      const { id } = req.params as { id: string };
      const bodyParsed = RejectBody.safeParse(req.body);
      if (!bodyParsed.success) {
        return reply.code(400).send({ error: "invalid_body" });
      }
      const submission = await app.ctx.submissionStore.find(id);
      if (!submission) return reply.code(404).send({ error: "submission_not_found" });

      try {
        const plan = planRejection({
          submission,
          leader: user,
          nowMs: Date.now(),
          reason: bodyParsed.data.reason,
        });
        await app.ctx.submissionStore.setStatus(submission.id, plan.statusChange);
        await app.ctx.auditLog.record(plan.auditEntry);
        return reply.code(200).send({ ok: true });
      } catch (err) {
        if (err instanceof ApprovalPlanError) {
          return reply.code(400).send({ error: "rejection_invalid", detail: err.message });
        }
        req.log.error({ err }, "rejection failed");
        return reply.code(500).send({ error: "rejection_failure" });
      }
    })
  );
}

async function persistApproval(
  app: FastifyInstance,
  submission: PendingSubmission,
  versionToInsert: SkillVersion,
  bundleBytes: Buffer,
  plan: { statusChange: Parameters<typeof app.ctx.submissionStore.setStatus>[1]; auditEntry: Parameters<typeof app.ctx.auditLog.record>[0] }
): Promise<void> {
  // 1. Upsert the skill row (no-op if exists), with current_version_id staying as-is until we set it.
  const existing = await app.ctx.skillStore.findSkillBySlug(submission.skillSlug);
  await app.ctx.skillStore.upsertSkill({
    slug: submission.skillSlug,
    name: existing?.name ?? submission.skillSlug,
    category: existing?.category ?? null,
    icon: existing?.icon ?? null,
    authorId: existing?.authorId ?? submission.submitterId,
    createdAt: existing?.createdAt ?? Date.now(),
    currentVersionId: existing?.currentVersionId ?? null,
  });
  // 2. Insert the version
  await app.ctx.skillStore.insertVersion(versionToInsert);
  // 3. Write bundle to disk + verify
  const put = await app.ctx.bundleStore.put(submission.skillSlug, versionToInsert.id, bundleBytes);
  if (put.sha256 !== versionToInsert.bundleSha256) {
    throw new Error("bundle sha256 mismatch after put");
  }
  // 4. Point the skill at the new version
  await app.ctx.skillStore.setCurrentVersion(submission.skillSlug, versionToInsert.id);
  // 5. Update submission status
  await app.ctx.submissionStore.setStatus(submission.id, plan.statusChange);
  // 6. Audit
  await app.ctx.auditLog.record(plan.auditEntry);
}
