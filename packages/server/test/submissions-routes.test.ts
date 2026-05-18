import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import { openDb } from "@matrix-sharon/adapters/storage/sqlite";
import { runMigrations } from "@matrix-sharon/adapters/storage/sqlite/migrate";
import { buildApp } from "../src/index.js";
import {
  buildTestContext,
  cleanupTmpDirs,
  installLoginHelper,
  loginAs,
  makeTmpDataDir,
  makeTmpDb,
} from "./helpers.js";

let db: Database.Database;
let app: FastifyInstance;
let dataDir: string;

const validSkillMd = `---
name: sql-safety-gate
description: 拦截破坏性 SQL
pain: 半夜 DROP TABLE
gain: PreToolUse hook + EXPLAIN
triggers: DROP / TRUNCATE
category: safety
icon: 🛡️
---
# sql-safety-gate

body
`;

beforeEach(async () => {
  db = openDb({ path: makeTmpDb("sharon-submissions-routes-") });
  await runMigrations(db);
  dataDir = makeTmpDataDir();
  app = await buildApp(buildTestContext({ db, dataDir }));
  installLoginHelper(app);
});

afterEach(async () => {
  await app.close();
  db.close();
  cleanupTmpDirs();
});

describe("POST /v1/submissions", () => {
  it("401 anon", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/submissions",
      payload: { skillSlug: "x", rawSkillMd: validSkillMd },
    });
    expect(res.statusCode).toBe(401);
  });

  it("400 on invalid body shape", async () => {
    const cookie = await loginAs(app, db, "octocat");
    const res = await app.inject({
      method: "POST",
      url: "/v1/submissions",
      headers: { cookie },
      payload: { foo: "bar" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("400 when rawSkillMd has malformed frontmatter", async () => {
    const cookie = await loginAs(app, db, "octocat");
    const res = await app.inject({
      method: "POST",
      url: "/v1/submissions",
      headers: { cookie },
      payload: { skillSlug: "x", rawSkillMd: "no frontmatter here" },
    });
    expect(res.statusCode).toBe(400);
    expect((res.json() as { error: string }).error).toBe("invalid_frontmatter");
  });

  it("201 creates a new-skill submission with sha256 + isNewSkill=true", async () => {
    const cookie = await loginAs(app, db, "octocat");
    const res = await app.inject({
      method: "POST",
      url: "/v1/submissions",
      headers: { cookie },
      payload: { skillSlug: "sql-safety-gate", rawSkillMd: validSkillMd },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as {
      submission: { id: string; isNewSkill: boolean; bundleSha256: string; bundleSize: number; status: string };
    };
    expect(body.submission.isNewSkill).toBe(true);
    expect(body.submission.status).toBe("pending");
    expect(body.submission.bundleSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(body.submission.bundleSize).toBeGreaterThan(0);
  });

  it("converts a candidate → submission and deletes the candidate", async () => {
    const cookie = await loginAs(app, db, "octocat");
    // create candidate
    const cRes = await app.inject({
      method: "POST",
      url: "/v1/candidates",
      headers: { cookie },
      payload: { skillSlug: "from-candidate", fullContentMd: validSkillMd, reason: "本地新写" },
    });
    const cId = (cRes.json() as { candidate: { id: string } }).candidate.id;

    const sRes = await app.inject({
      method: "POST",
      url: "/v1/submissions",
      headers: { cookie },
      payload: { candidateId: cId },
    });
    expect(sRes.statusCode).toBe(201);
    // candidate should be gone
    const list = await app.inject({
      method: "GET",
      url: "/v1/candidates/mine",
      headers: { cookie },
    });
    expect((list.json() as { candidates: unknown[] }).candidates).toHaveLength(0);
  });

  it("403 when submitting another user's candidate", async () => {
    const a = await loginAs(app, db, "octocat");
    const b = await loginAs(app, db, "ghost");
    const cRes = await app.inject({
      method: "POST",
      url: "/v1/candidates",
      headers: { cookie: a },
      payload: { skillSlug: "x", fullContentMd: validSkillMd, reason: "x" },
    });
    const cId = (cRes.json() as { candidate: { id: string } }).candidate.id;
    const sRes = await app.inject({
      method: "POST",
      url: "/v1/submissions",
      headers: { cookie: b },
      payload: { candidateId: cId },
    });
    expect(sRes.statusCode).toBe(403);
  });
});

describe("GET /v1/submissions/pending", () => {
  it("401 anon", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/submissions/pending" });
    expect(res.statusCode).toBe(401);
  });

  it("403 for non-leader", async () => {
    await loginAs(app, db, "first-leader"); // first user → leader
    const member = await loginAs(app, db, "octocat");
    const res = await app.inject({
      method: "GET",
      url: "/v1/submissions/pending",
      headers: { cookie: member },
    });
    expect(res.statusCode).toBe(403);
  });

  it("200 returns ASC pending only", async () => {
    const leader = await loginAs(app, db, "first-leader"); // → leader
    const member = await loginAs(app, db, "octocat");      // → member
    // create 2 submissions
    await app.inject({
      method: "POST",
      url: "/v1/submissions",
      headers: { cookie: member },
      payload: { skillSlug: "alpha", rawSkillMd: validSkillMd.replace("sql-safety-gate", "alpha") },
    });
    await app.inject({
      method: "POST",
      url: "/v1/submissions",
      headers: { cookie: member },
      payload: { skillSlug: "beta", rawSkillMd: validSkillMd.replace("sql-safety-gate", "beta") },
    });
    const res = await app.inject({
      method: "GET",
      url: "/v1/submissions/pending",
      headers: { cookie: leader },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { submissions: Array<{ skillSlug: string }> };
    expect(body.submissions.map((s) => s.skillSlug)).toEqual(["alpha", "beta"]);
  });
});

describe("POST /v1/submissions/:id/approve", () => {
  async function setupPendingSubmission(): Promise<{ leaderCookie: string; submissionId: string }> {
    const leaderCookie = await loginAs(app, db, "first-leader");
    const memberCookie = await loginAs(app, db, "octocat");
    const create = await app.inject({
      method: "POST",
      url: "/v1/submissions",
      headers: { cookie: memberCookie },
      payload: { skillSlug: "sql-safety-gate", rawSkillMd: validSkillMd },
    });
    const id = (create.json() as { submission: { id: string } }).submission.id;
    return { leaderCookie, submissionId: id };
  }

  it("401 anon", async () => {
    const res = await app.inject({ method: "POST", url: "/v1/submissions/x/approve", payload: {} });
    expect(res.statusCode).toBe(401);
  });

  it("403 for non-leader", async () => {
    await loginAs(app, db, "first-leader");
    const member = await loginAs(app, db, "octocat");
    const res = await app.inject({
      method: "POST",
      url: "/v1/submissions/anything/approve",
      headers: { cookie: member },
      payload: {},
    });
    expect(res.statusCode).toBe(403);
  });

  it("404 for unknown submission", async () => {
    const leaderCookie = await loginAs(app, db, "first-leader");
    const res = await app.inject({
      method: "POST",
      url: "/v1/submissions/01JNOTEXISTNOTEXISTNOTEXIST/approve",
      headers: { cookie: leaderCookie },
      payload: {},
    });
    expect(res.statusCode).toBe(404);
  });

  it("approves: creates version, sets current_version_id, bundle on disk, status=approved", async () => {
    const { leaderCookie, submissionId } = await setupPendingSubmission();
    const res = await app.inject({
      method: "POST",
      url: `/v1/submissions/${submissionId}/approve`,
      headers: { cookie: leaderCookie },
      payload: { note: "ship it" },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { version: { id: string; semver: number; skillSlug: string } };
    expect(body.version.semver).toBe(1);
    expect(body.version.skillSlug).toBe("sql-safety-gate");

    // /v1/skills should now show it
    const list = await app.inject({
      method: "GET",
      url: "/v1/skills",
      headers: { cookie: leaderCookie },
    });
    const lb = list.json() as { skills: Array<{ skill: { slug: string } }> };
    expect(lb.skills.some((r) => r.skill.slug === "sql-safety-gate")).toBe(true);
  });

  it("400 when approve is called again on already-approved submission", async () => {
    const { leaderCookie, submissionId } = await setupPendingSubmission();
    await app.inject({
      method: "POST",
      url: `/v1/submissions/${submissionId}/approve`,
      headers: { cookie: leaderCookie },
      payload: {},
    });
    const second = await app.inject({
      method: "POST",
      url: `/v1/submissions/${submissionId}/approve`,
      headers: { cookie: leaderCookie },
      payload: {},
    });
    expect(second.statusCode).toBe(400);
  });
});

describe("POST /v1/submissions/:id/reject", () => {
  it("400 when reason missing", async () => {
    const leaderCookie = await loginAs(app, db, "first-leader");
    const res = await app.inject({
      method: "POST",
      url: "/v1/submissions/whatever/reject",
      headers: { cookie: leaderCookie },
      payload: {},
    });
    expect(res.statusCode).toBe(400);
  });

  it("404 unknown submission", async () => {
    const leaderCookie = await loginAs(app, db, "first-leader");
    const res = await app.inject({
      method: "POST",
      url: "/v1/submissions/01JNOTREALNOTREALNOTREALAA/reject",
      headers: { cookie: leaderCookie },
      payload: { reason: "x" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("rejects pending submission, status → rejected", async () => {
    const leaderCookie = await loginAs(app, db, "first-leader");
    const memberCookie = await loginAs(app, db, "octocat");
    const create = await app.inject({
      method: "POST",
      url: "/v1/submissions",
      headers: { cookie: memberCookie },
      payload: { skillSlug: "x", rawSkillMd: validSkillMd },
    });
    const id = (create.json() as { submission: { id: string } }).submission.id;
    const rej = await app.inject({
      method: "POST",
      url: `/v1/submissions/${id}/reject`,
      headers: { cookie: leaderCookie },
      payload: { reason: "缺 pain 字段（举例）" },
    });
    expect(rej.statusCode).toBe(200);
    // Pending list should now be empty.
    const pending = await app.inject({
      method: "GET",
      url: "/v1/submissions/pending",
      headers: { cookie: leaderCookie },
    });
    expect((pending.json() as { submissions: unknown[] }).submissions).toHaveLength(0);
  });
});
