import type { FastifyInstance } from "fastify";
import { marked } from "marked";
import sanitizeHtml from "sanitize-html";
import { withAuth } from "../auth-guard.js";

// Allowlist that covers everything a SKILL.md README needs (prose, code,
// lists, tables, inline anchors, images) and refuses everything else. Leader
// approval is a trust signal, not a sanitizer — a leader may not notice
// `<img onerror>` buried in a long markdown body, so we strip it server-side.
const README_SANITIZE_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1","h2","h3","h4","h5","h6",
    "p","br","hr","blockquote",
    "ul","ol","li",
    "strong","em","b","i","u","s","del","ins","mark","sub","sup",
    "a","img",
    "code","pre","kbd","samp","var",
    "table","thead","tbody","tr","th","td",
    "details","summary",
    "span","div",
  ],
  allowedAttributes: {
    a: ["href", "title", "name"],
    img: ["src", "alt", "title", "width", "height"],
    code: ["class"],
    pre: ["class"],
    span: ["class"],
    div: ["class"],
    th: ["align", "scope"],
    td: ["align"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesAppliedToAttributes: ["href", "src"],
  // No javascript:, data:, vbscript:, etc.
  disallowedTagsMode: "discard",
  enforceHtmlBoundary: true,
};

function renderReadme(md: string): string {
  const raw = marked.parse(md, { async: false });
  // marked@15 returns string when async:false. Be defensive in case of
  // an accidental type shift in a future dep bump.
  const html = typeof raw === "string" ? raw : String(raw);
  return sanitizeHtml(html, README_SANITIZE_OPTIONS);
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
