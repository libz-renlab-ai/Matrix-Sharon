import type { FastifyInstance } from "fastify";
import { marked } from "marked";
import { withAuth } from "../auth-guard.js";

/** Render markdown and strip <script> tags (skill markdown is leader-approved). */
function renderReadme(md: string): string {
  const html = marked.parse(md, { async: false });
  return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "");
}

export async function registerSkillRoutes(app: FastifyInstance): Promise<void> {
  app.get(
    "/v1/skills",
    withAuth(async (_req, _reply, _session, _user) => {
      const skills = await app.ctx.skillStore.listApproved();
      return { skills };
    })
  );

  app.get<{ Params: { slug: string } }>(
    "/v1/skills/:slug",
    withAuth(async (req, reply) => {
      const { slug } = req.params as { slug: string };
      const skill = await app.ctx.skillStore.findSkillBySlug(slug);
      if (!skill) return reply.code(404).send({ error: "skill_not_found" });
      const versions = await app.ctx.skillStore.listVersionsBySlug(slug);
      return { skill, versions, currentVersionId: skill.currentVersionId };
    })
  );

  app.get<{ Params: { slug: string; semver: string } }>(
    "/v1/skills/:slug/versions/:semver/readme",
    withAuth(async (req, reply) => {
      const { slug, semver: semverRaw } = req.params as { slug: string; semver: string };
      const semver = Number.parseInt(semverRaw, 10);
      if (!Number.isInteger(semver) || semver <= 0) {
        return reply.code(400).send({ error: "invalid_semver" });
      }
      const skill = await app.ctx.skillStore.findSkillBySlug(slug);
      if (!skill) return reply.code(404).send({ error: "skill_not_found" });
      const versions = await app.ctx.skillStore.listVersionsBySlug(slug);
      const v = versions.find((x) => x.semver === semver);
      if (!v) return reply.code(404).send({ error: "version_not_found" });
      const html = renderReadme(v.readmeMd);
      return { html, semver };
    })
  );
}
