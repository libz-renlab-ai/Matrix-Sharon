import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { withAuth } from "../auth-guard.js";

const INSTALL_TOKEN_TTL_MS = 5 * 60 * 1000;

const InstallIntentBody = z.object({
  skillSlug: z.string().min(1),
  semver: z.number().int().positive(),
});

const InstallBody = z.object({
  skillSlug: z.string().min(1),
  semver: z.number().int().positive(),
});

async function findVersion(
  app: FastifyInstance,
  slug: string,
  semver: number
) {
  const versions = await app.ctx.skillStore.listVersionsBySlug(slug);
  return versions.find((v) => v.semver === semver) ?? null;
}

async function streamBundle(
  app: FastifyInstance,
  reply: FastifyReply,
  slug: string,
  semver: number
): Promise<FastifyReply> {
  const version = await findVersion(app, slug, semver);
  if (!version) return reply.code(404).send({ error: "version_not_found" });
  let bytes: Buffer;
  try {
    bytes = await app.ctx.bundleStore.get(slug, version.id);
  } catch {
    return reply.code(404).send({ error: "bundle_missing" });
  }
  return reply
    .header("Content-Type", "application/gzip")
    .header(
      "Content-Disposition",
      `attachment; filename="${slug}-${semver}.tgz"`
    )
    .header("X-Sharon-Bundle-Sha256", version.bundleSha256)
    .send(bytes);
}

export async function registerInstallRoutes(app: FastifyInstance): Promise<void> {
  // Auth-gated bundle download (CLI direct flow uses this when authenticated).
  app.get<{ Params: { slug: string; semver: string } }>(
    "/v1/skills/:slug/versions/:semver/bundle",
    withAuth(async (req, reply) => {
      const { slug, semver: semverRaw } = req.params as { slug: string; semver: string };
      const semver = Number.parseInt(semverRaw, 10);
      if (!Number.isInteger(semver) || semver <= 0) {
        return reply.code(400).send({ error: "invalid_semver" });
      }
      return streamBundle(app, reply, slug, semver);
    })
  );

  app.post(
    "/v1/install-intent",
    withAuth(async (req, reply, _session, user) => {
      const parsed = InstallIntentBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_body" });
      }
      const version = await findVersion(app, parsed.data.skillSlug, parsed.data.semver);
      if (!version) return reply.code(404).send({ error: "version_not_found" });

      const token = randomBytes(32).toString("hex");
      const now = Date.now();
      await app.ctx.installStore.putToken({
        token,
        userId: user.id,
        skillSlug: parsed.data.skillSlug,
        versionId: version.id,
        expiresAt: now + INSTALL_TOKEN_TTL_MS,
        consumedAt: null,
      });
      return reply.code(201).send({
        token,
        deepLink: `sharon://install?token=${token}`,
        fallbackCmd: `sharon install ${parsed.data.skillSlug}@${parsed.data.semver}`,
        expiresAt: now + INSTALL_TOKEN_TTL_MS,
      });
    })
  );

  // Token-gated: no cookie required. Looking up the token is the auth.
  // We do NOT consume the token here — only on /done. This GET is informational
  // ("what does this token grant me?") so the CLI can show the user what they're
  // about to install.
  app.get<{ Params: { token: string } }>(
    "/v1/install-tokens/:token",
    async (req, reply) => {
      const { token } = req.params as { token: string };
      // Peek: read row without consuming.
      const row = app.ctx.db
        .prepare("SELECT * FROM install_tokens WHERE token = ?")
        .get(token) as
        | {
            token: string;
            user_id: string;
            skill_slug: string;
            version_id: string;
            expires_at: number;
            consumed_at: number | null;
          }
        | undefined;
      if (!row) return reply.code(404).send({ error: "token_not_found" });
      if (row.consumed_at !== null) return reply.code(404).send({ error: "token_consumed" });
      if (row.expires_at < Date.now()) return reply.code(404).send({ error: "token_expired" });

      const version = await app.ctx.skillStore.findVersion(row.version_id);
      if (!version) return reply.code(404).send({ error: "version_not_found" });
      return {
        skillSlug: row.skill_slug,
        semver: version.semver,
        bundleSha256: version.bundleSha256,
        bundleSize: version.bundleSize,
        bundleUrl: `/v1/install-tokens/${token}/bundle`,
      };
    }
  );

  app.get<{ Params: { token: string } }>(
    "/v1/install-tokens/:token/bundle",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const { token } = req.params as { token: string };
      const row = app.ctx.db
        .prepare("SELECT skill_slug, version_id, expires_at, consumed_at FROM install_tokens WHERE token = ?")
        .get(token) as
        | {
            skill_slug: string;
            version_id: string;
            expires_at: number;
            consumed_at: number | null;
          }
        | undefined;
      if (!row || row.consumed_at !== null || row.expires_at < Date.now()) {
        return reply.code(404).send({ error: "token_invalid" });
      }
      const version = await app.ctx.skillStore.findVersion(row.version_id);
      if (!version) return reply.code(404).send({ error: "version_not_found" });
      return streamBundle(app, reply, row.skill_slug, version.semver);
    }
  );

  app.post<{ Params: { token: string } }>(
    "/v1/install-tokens/:token/done",
    async (req, reply) => {
      const { token } = req.params as { token: string };
      const consumed = await app.ctx.installStore.consumeToken(token, Date.now());
      if (!consumed) return reply.code(404).send({ error: "token_invalid" });
      await app.ctx.installStore.recordInstall({
        userId: consumed.userId,
        skillSlug: consumed.skillSlug,
        skillVersionId: consumed.versionId,
        installedAt: Date.now(),
        uninstalledAt: null,
        viaPushId: null,
      });
      return reply.code(204).send();
    }
  );

  // Direct install (no token dance). Used by CLI when authenticated.
  app.post(
    "/v1/installs",
    withAuth(async (req, reply, _session, user) => {
      const parsed = InstallBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_body" });
      }
      const version = await findVersion(app, parsed.data.skillSlug, parsed.data.semver);
      if (!version) return reply.code(404).send({ error: "version_not_found" });
      await app.ctx.installStore.recordInstall({
        userId: user.id,
        skillSlug: parsed.data.skillSlug,
        skillVersionId: version.id,
        installedAt: Date.now(),
        uninstalledAt: null,
        viaPushId: null,
      });
      return reply.code(201).send({ ok: true });
    })
  );

  app.delete<{ Params: { slug: string } }>(
    "/v1/installs/:slug",
    withAuth(async (req, reply, _session, user) => {
      const { slug } = req.params as { slug: string };
      await app.ctx.installStore.markUninstalled(user.id, slug, Date.now());
      return reply.code(204).send();
    })
  );

  app.get(
    "/v1/installs/mine",
    withAuth(async (_req, _reply, _session, user) => {
      const installs = await app.ctx.installStore.listForUser(user.id);
      return { installs };
    })
  );
}
