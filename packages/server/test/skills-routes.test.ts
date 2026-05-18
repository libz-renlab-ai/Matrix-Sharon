import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Database from "better-sqlite3";
import { openDb } from "@matrix-sharon/adapters/storage/sqlite";
import { runMigrations } from "@matrix-sharon/adapters/storage/sqlite/migrate";
import {
  seedSampleSkills,
  SqliteSkillStore,
  SqliteUserStore,
} from "@matrix-sharon/adapters";
import { createSession } from "@matrix-sharon/core";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/index.js";
import { loadConfig } from "../src/config.js";
import { setSessionCookie } from "../src/session-cookie.js";

const tmpDirs: string[] = [];
function makeTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), "sharon-skills-routes-test-"));
  tmpDirs.push(dir);
  return join(dir, "test.db");
}

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
  db = openDb({ path: makeTmpDb() });
  await runMigrations(db);
  const config = loadConfig({
    NODE_ENV: "test",
    SHARON_SESSION_SECRET: "x".repeat(32),
  });
  app = await buildApp({
    config,
    db,
    userStore: new SqliteUserStore(db),
    skillStore: new SqliteSkillStore(db),
    github: null,
  });
  sessionCookie = await login("octocat");
});

afterEach(async () => {
  await app.close();
  db.close();
  while (tmpDirs.length) {
    const d = tmpDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
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

  it("strips <script> tags from rendered HTML", async () => {
    await seedSampleSkills(db);
    // Insert a version with malicious markdown into a new skill
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
      readmeMd: "# Hello\n\n<script>alert('xss')</script>\n\nsafe text",
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
    expect(body.html).not.toContain("<script");
    expect(body.html).not.toContain("alert(");
    expect(body.html).toContain("safe text");
  });
});
