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

const sampleSkillMd = `---
name: sql-safety-gate
description: 拦
pain: 半夜 DROP
gain: PreToolUse hook
triggers: DROP/TRUNCATE
category: safety
icon: 🛡️
---
# sql-safety-gate
body
`;

/** Submit a candidate as member, leader approves it; returns slug + semver. */
async function seedApproved(): Promise<{ slug: string; semver: number }> {
  const leader = await loginAs(app, db, "first-leader"); // first → leader
  const member = await loginAs(app, db, "member-1");
  const sub = await app.inject({
    method: "POST",
    url: "/v1/submissions",
    headers: { cookie: member },
    payload: { skillSlug: "sql-safety-gate", rawSkillMd: sampleSkillMd },
  });
  const id = (sub.json() as { submission: { id: string } }).submission.id;
  await app.inject({
    method: "POST",
    url: `/v1/submissions/${id}/approve`,
    headers: { cookie: leader },
    payload: {},
  });
  return { slug: "sql-safety-gate", semver: 1 };
}

beforeEach(async () => {
  db = openDb({ path: makeTmpDb("sharon-install-routes-") });
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

describe("GET /v1/skills/:slug/versions/:semver/bundle (cookie-gated)", () => {
  it("401 anon", async () => {
    const res = await app.inject({
      method: "GET",
      url: "/v1/skills/x/versions/1/bundle",
    });
    expect(res.statusCode).toBe(401);
  });

  it("404 for unknown version", async () => {
    const cookie = await loginAs(app, db, "octocat");
    const res = await app.inject({
      method: "GET",
      url: "/v1/skills/sql-safety-gate/versions/99/bundle",
      headers: { cookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("200 streams gzip bytes after seed+approve", async () => {
    const { slug, semver } = await seedApproved();
    const cookie = await loginAs(app, db, "viewer");
    const res = await app.inject({
      method: "GET",
      url: `/v1/skills/${slug}/versions/${semver}/bundle`,
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/gzip");
    expect(res.headers["x-sharon-bundle-sha256"]).toMatch(/^[0-9a-f]{64}$/);
    expect(res.rawPayload.length).toBeGreaterThan(0);
  });
});

describe("POST /v1/install-intent → token flow", () => {
  it("401 anon", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/install-intent",
      payload: { skillSlug: "x", semver: 1 },
    });
    expect(res.statusCode).toBe(401);
  });

  it("404 when version doesn't exist", async () => {
    const cookie = await loginAs(app, db, "octocat");
    const res = await app.inject({
      method: "POST",
      url: "/v1/install-intent",
      headers: { cookie },
      payload: { skillSlug: "ghost", semver: 1 },
    });
    expect(res.statusCode).toBe(404);
  });

  it("201 returns token + deepLink + fallbackCmd", async () => {
    const { slug, semver } = await seedApproved();
    const cookie = await loginAs(app, db, "viewer");
    const res = await app.inject({
      method: "POST",
      url: "/v1/install-intent",
      headers: { cookie },
      payload: { skillSlug: slug, semver },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { token: string; deepLink: string; fallbackCmd: string };
    expect(body.token).toMatch(/^[0-9a-f]{64}$/);
    expect(body.deepLink).toBe(`sharon://install?token=${body.token}`);
    expect(body.fallbackCmd).toBe(`sharon install ${slug}@${semver}`);
  });

  it("GET /v1/install-tokens/:token → bundle metadata", async () => {
    const { slug, semver } = await seedApproved();
    const cookie = await loginAs(app, db, "viewer");
    const intent = await app.inject({
      method: "POST",
      url: "/v1/install-intent",
      headers: { cookie },
      payload: { skillSlug: slug, semver },
    });
    const token = (intent.json() as { token: string }).token;
    const lookup = await app.inject({
      method: "GET",
      url: `/v1/install-tokens/${token}`,
    });
    expect(lookup.statusCode).toBe(200);
    const data = lookup.json() as {
      skillSlug: string;
      semver: number;
      bundleSha256: string;
      bundleUrl: string;
    };
    expect(data.skillSlug).toBe(slug);
    expect(data.semver).toBe(semver);
    expect(data.bundleUrl).toBe(`/v1/install-tokens/${token}/bundle`);
  });

  it("GET /v1/install-tokens/:token returns 404 for unknown / expired / consumed", async () => {
    const r1 = await app.inject({
      method: "GET",
      url: "/v1/install-tokens/0000000000000000000000000000000000000000000000000000000000000000",
    });
    expect(r1.statusCode).toBe(404);
  });

  it("GET /v1/install-tokens/:token/bundle streams the bundle", async () => {
    const { slug, semver } = await seedApproved();
    const cookie = await loginAs(app, db, "viewer");
    const intent = await app.inject({
      method: "POST",
      url: "/v1/install-intent",
      headers: { cookie },
      payload: { skillSlug: slug, semver },
    });
    const token = (intent.json() as { token: string }).token;
    const res = await app.inject({
      method: "GET",
      url: `/v1/install-tokens/${token}/bundle`,
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["content-type"]).toContain("application/gzip");
  });

  it("POST /v1/install-tokens/:token/done consumes + records install", async () => {
    const { slug, semver } = await seedApproved();
    const cookie = await loginAs(app, db, "viewer");
    const intent = await app.inject({
      method: "POST",
      url: "/v1/install-intent",
      headers: { cookie },
      payload: { skillSlug: slug, semver },
    });
    const token = (intent.json() as { token: string }).token;
    const done = await app.inject({
      method: "POST",
      url: `/v1/install-tokens/${token}/done`,
    });
    expect(done.statusCode).toBe(204);

    // /v1/installs/mine should show it
    const mine = await app.inject({
      method: "GET",
      url: "/v1/installs/mine",
      headers: { cookie },
    });
    const body = mine.json() as { installs: Array<{ skillSlug: string }> };
    expect(body.installs).toHaveLength(1);
    expect(body.installs[0]!.skillSlug).toBe(slug);

    // Re-calling done now 404s (token consumed)
    const done2 = await app.inject({
      method: "POST",
      url: `/v1/install-tokens/${token}/done`,
    });
    expect(done2.statusCode).toBe(404);
  });
});

describe("POST /v1/installs (direct) + DELETE /v1/installs/:slug + GET /v1/installs/mine", () => {
  it("401 anon for direct install", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/installs",
      payload: { skillSlug: "x", semver: 1 },
    });
    expect(res.statusCode).toBe(401);
  });

  it("404 for unknown version", async () => {
    const cookie = await loginAs(app, db, "octocat");
    const res = await app.inject({
      method: "POST",
      url: "/v1/installs",
      headers: { cookie },
      payload: { skillSlug: "ghost", semver: 1 },
    });
    expect(res.statusCode).toBe(404);
  });

  it("full round-trip: install → mine shows it → delete → mine empty", async () => {
    const { slug, semver } = await seedApproved();
    const cookie = await loginAs(app, db, "viewer");
    await app.inject({
      method: "POST",
      url: "/v1/installs",
      headers: { cookie },
      payload: { skillSlug: slug, semver },
    });
    let mine = await app.inject({
      method: "GET",
      url: "/v1/installs/mine",
      headers: { cookie },
    });
    expect((mine.json() as { installs: unknown[] }).installs).toHaveLength(1);

    const del = await app.inject({
      method: "DELETE",
      url: `/v1/installs/${slug}`,
      headers: { cookie },
    });
    expect(del.statusCode).toBe(204);

    mine = await app.inject({
      method: "GET",
      url: "/v1/installs/mine",
      headers: { cookie },
    });
    expect((mine.json() as { installs: unknown[] }).installs).toHaveLength(0);
  });
});
