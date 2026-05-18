import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Database from "better-sqlite3";
import { openDb } from "@matrix-sharon/adapters/storage/sqlite";
import { runMigrations } from "@matrix-sharon/adapters/storage/sqlite/migrate";
import { SqliteUserStore, SqliteSkillStore } from "@matrix-sharon/adapters";
import { createSession } from "@matrix-sharon/core";
import { buildApp } from "../src/index.js";
import { loadConfig } from "../src/config.js";
import { setSessionCookie } from "../src/session-cookie.js";
import { withAuth, withLeader } from "../src/auth-guard.js";

const tmpDirs: string[] = [];
function makeTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), "sharon-guard-test-"));
  tmpDirs.push(dir);
  return join(dir, "test.db");
}

let db: Database.Database;

beforeEach(async () => {
  db = openDb({ path: makeTmpDb() });
  await runMigrations(db);
});

afterEach(() => {
  db.close();
  while (tmpDirs.length) {
    const d = tmpDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

async function buildTestApp() {
  const config = loadConfig({
    NODE_ENV: "test",
    SHARON_SESSION_SECRET: "x".repeat(32),
  });
  const app = await buildApp({
    config,
    db,
    userStore: new SqliteUserStore(db),
    skillStore: new SqliteSkillStore(db),
    github: null,
  });
  app.get(
    "/test-protected",
    withAuth(async (_req, _reply, session, user) => ({
      uid: session.uid,
      role: user.role,
    }))
  );
  app.get(
    "/test-leader-only",
    withLeader(async (_req, _reply, session, user) => ({
      uid: session.uid,
      role: user.role,
    }))
  );
  app.get("/set-session", async (_req, reply) => {
    setSessionCookie(reply, createSession("octocat", Date.now()), { secure: false });
    return {};
  });
  return app;
}

describe("withAuth", () => {
  it("401 when no session cookie", async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/test-protected" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "not_signed_in" });
    await app.close();
  });

  it("401 when session uid does not exist in users table", async () => {
    const app = await buildTestApp();
    const set = await app.inject({ method: "GET", url: "/set-session" });
    const cookie = (set.headers["set-cookie"] as string).split(";")[0]!;
    const res = await app.inject({
      method: "GET",
      url: "/test-protected",
      headers: { cookie },
    });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("200 with session uid + user role when user exists", async () => {
    const app = await buildTestApp();
    // Seed the user first.
    const us = new SqliteUserStore(db);
    await us.upsertFromGithub({
      id: "octocat",
      githubId: 1,
      name: "Octocat",
      email: null,
      avatarUrl: null,
      defaultRoleIfNew: "member",
    });
    const set = await app.inject({ method: "GET", url: "/set-session" });
    const cookie = (set.headers["set-cookie"] as string).split(";")[0]!;
    const res = await app.inject({
      method: "GET",
      url: "/test-protected",
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { uid: string; role: string };
    expect(body.uid).toBe("octocat");
    expect(body.role).toBe("leader"); // first user → leader
    await app.close();
  });
});

describe("withLeader", () => {
  it("401 anonymous", async () => {
    const app = await buildTestApp();
    const res = await app.inject({ method: "GET", url: "/test-leader-only" });
    expect(res.statusCode).toBe(401);
    await app.close();
  });

  it("403 when user is member, not leader", async () => {
    const app = await buildTestApp();
    const us = new SqliteUserStore(db);
    // First user → leader
    await us.upsertFromGithub({
      id: "leader-one",
      githubId: 1,
      name: "L",
      email: null,
      avatarUrl: null,
      defaultRoleIfNew: "member",
    });
    // Second → member (and the test session)
    await us.upsertFromGithub({
      id: "octocat",
      githubId: 2,
      name: "O",
      email: null,
      avatarUrl: null,
      defaultRoleIfNew: "member",
    });
    const set = await app.inject({ method: "GET", url: "/set-session" });
    const cookie = (set.headers["set-cookie"] as string).split(";")[0]!;
    const res = await app.inject({
      method: "GET",
      url: "/test-leader-only",
      headers: { cookie },
    });
    expect(res.statusCode).toBe(403);
    expect(res.json()).toEqual({ error: "leader_only" });
    await app.close();
  });

  it("200 when user is leader", async () => {
    const app = await buildTestApp();
    const us = new SqliteUserStore(db);
    await us.upsertFromGithub({
      id: "octocat",
      githubId: 1,
      name: "O",
      email: null,
      avatarUrl: null,
      defaultRoleIfNew: "member",
    });
    const set = await app.inject({ method: "GET", url: "/set-session" });
    const cookie = (set.headers["set-cookie"] as string).split(";")[0]!;
    const res = await app.inject({
      method: "GET",
      url: "/test-leader-only",
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { role: string };
    expect(body.role).toBe("leader");
    await app.close();
  });
});
