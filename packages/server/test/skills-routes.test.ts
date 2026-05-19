import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { openDb } from "@matrix-sharon/adapters/storage/sqlite";
import { runMigrations } from "@matrix-sharon/adapters/storage/sqlite/migrate";
import { seedSampleSkills, SqliteSkillStore, SqliteUserStore } from "@matrix-sharon/adapters";
import { createSession } from "@matrix-sharon/core";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/index.js";
import { setSessionCookie } from "../src/session-cookie.js";
import { buildTestContext, cleanupTmpDirs, makeTmpDb } from "./helpers.js";

let db: Database.Database;
let app: FastifyInstance;
let sessionCookie: string;

async function login(user = "octocat"): Promise<string> {
  const us = new SqliteUserStore(db);
  await us.upsertFromGithub({
    id: user,
    githubId: user.length,
    name: user,
    email: null,
    avatarUrl: null,
    defaultRoleIfNew: "member",
  });
  app.get(`/_test_login_${user}`, async (_req, reply) => {
    setSessionCookie(reply, createSession(user, Date.now()), { secure: false });
    return {};
  });
  const res = await app.inject({ method: "GET", url: `/_test_login_${user}` });
  return (res.headers["set-cookie"] as string).split(";")[0]!;
}

beforeEach(async () => {
  db = openDb({ path: makeTmpDb("sharon-skills-routes-") });
  await runMigrations(db);
  app = await buildApp(buildTestContext({ db }));
  sessionCookie = await login("octocat");
});

afterEach(async () => {
  await app.close();
  db.close();
  cleanupTmpDirs();
});

describe("GET /v1/skills", () => {
  it("401 when not authenticated", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/skills" });
    expect(res.statusCode).toBe(401);
  });

  it("200 empty list when no skills exist", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/skills",
      headers: { cookie: sessionCookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ skills: [] });
  });

  it("returns seeded 3 skills after seedSampleSkills", async () => {
    await seedSampleSkills(db);
    const res = await app.inject({
      method: "GET",
      url: "/v1/skills",
      headers: { cookie: sessionCookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      skills: Array<{ skill: { slug: string }; currentVersion: { semver: number } }>;
    };
    expect(body.skills).toHaveLength(3);
    expect(body.skills.every((r) => r.currentVersion.semver === 1)).toBe(true);
  });
});

describe("GET /v1/skills/:slug", () => {
  it("401 when not authenticated", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/skills/sql-safety-gate" });
    expect(res.statusCode).toBe(401);
  });

  it("200 with detail + versions after seed", async () => {
    await seedSampleSkills(db);
    const res = await app.inject({
      method: "GET",
      url: "/v1/skills/sql-safety-gate",
      headers: { cookie: sessionCookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as {
      skill: { slug: string };
      versions: Array<{ semver: number }>;
    };
    expect(body.skill.slug).toBe("sql-safety-gate");
    expect(body.versions).toHaveLength(1);
    expect(body.versions[0]!.semver).toBe(1);
  });

  it("404 for unknown slug", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/skills/does-not-exist",
      headers: { cookie: sessionCookie },
    });
    expect(res.statusCode).toBe(404);
  });
});

describe("GET /v1/skills/:slug/versions/:semver/readme", () => {
  it("401 when not authenticated", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/skills/sql-safety-gate/versions/1/readme",
    });
    expect(res.statusCode).toBe(401);
  });

  it("200 returns rendered HTML from seeded markdown", async () => {
    await seedSampleSkills(db);
    const res = await app.inject({
      method: "GET",
      url: "/v1/skills/sql-safety-gate/versions/1/readme",
      headers: { cookie: sessionCookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { html: string; semver: number };
    expect(body.semver).toBe(1);
    expect(body.html).toContain("<h1");
    expect(body.html).toContain("sql-safety-gate");
  });

  it("404 for unknown slug", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/skills/ghost/versions/1/readme",
      headers: { cookie: sessionCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("404 for unknown semver", async () => {
    await seedSampleSkills(db);
    const res = await app.inject({
      method: "GET",
      url: "/v1/skills/sql-safety-gate/versions/99/readme",
      headers: { cookie: sessionCookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("strips dangerous HTML across many XSS vectors", async () => {
    await seedSampleSkills(db);
    const ss = new SqliteSkillStore(db);
    await ss.upsertSkill({
      slug: "xss-test",
      name: "XSS test",
      category: null,
      icon: null,
      authorId: "system-seed",
      createdAt: Date.now(),
      currentVersionId: null,
    });
    // Multiple XSS vectors a malicious author could embed in SKILL.md.
    // Leaders may approve without spotting these; sanitizer is the real defense.
    const malicious = [
      "# Hello",
      "",
      "<script>alert('xss-script')</script>",
      "<img src=x onerror=\"alert('xss-onerror')\">",
      "<a href=\"javascript:alert('xss-js-url')\">click</a>",
      "<iframe src=\"https://evil.example/\"></iframe>",
      "<style>body{display:none}</style>",
      "<svg onload=\"alert('xss-svg')\"></svg>",
      "<object data=\"https://evil.example/\"></object>",
      "<embed src=\"https://evil.example/\">",
      "<form action=\"https://evil.example/\"><input name=x></form>",
      "<base href=\"https://evil.example/\">",
      "<link rel=\"stylesheet\" href=\"https://evil.example/x.css\">",
      "<meta http-equiv=\"refresh\" content=\"0;url=https://evil.example/\">",
      "<a href=\"vbscript:msgbox('xss-vbscript')\">vb</a>",
      "<a href=\"data:text/html,<script>alert(1)</script>\">data</a>",
      "<p onmouseover=\"alert('xss-mouseover')\">hover</p>",
      "",
      "marker-safe-text-PRESERVED",
    ].join("\n");
    await ss.insertVersion({
      id: "01JABCXSSTESTVERSIONAAAAAAAA",
      skillSlug: "xss-test",
      semver: 1,
      bundleSha256: "x",
      bundleSize: 0,
      description: "x",
      pain: null,
      gain: null,
      triggers: null,
      exampleJson: null,
      readmeMd: malicious,
      note: null,
      publishedBy: "system-seed",
      approvedBy: "system-seed",
      approvedAt: Date.now(),
      publishedAt: Date.now(),
    });
    await ss.setCurrentVersion("xss-test", "01JABCXSSTESTVERSIONAAAAAAAA");
    const res = await app.inject({
      method: "GET",
      url: "/v1/skills/xss-test/versions/1/readme",
      headers: { cookie: sessionCookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { html: string };
    const html = body.html;
    // No executable / dangerous elements survive.
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<iframe/i);
    expect(html).not.toMatch(/<object/i);
    expect(html).not.toMatch(/<embed/i);
    expect(html).not.toMatch(/<style/i);
    expect(html).not.toMatch(/<svg/i);
    expect(html).not.toMatch(/<form/i);
    expect(html).not.toMatch(/<base/i);
    expect(html).not.toMatch(/<link/i);
    expect(html).not.toMatch(/<meta/i);
    // No inline event handlers (catches onerror, onload, onmouseover, …).
    expect(html).not.toMatch(/\son[a-z]+\s*=/i);
    // No javascript:/vbscript:/data: URLs surfacing in href/src.
    expect(html).not.toMatch(/javascript:/i);
    expect(html).not.toMatch(/vbscript:/i);
    expect(html).not.toMatch(/href\s*=\s*['"]?data:/i);
    // Benign content still passes through.
    expect(html).toContain("marker-safe-text-PRESERVED");
  });
});
