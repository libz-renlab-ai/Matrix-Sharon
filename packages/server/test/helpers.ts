import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import {
  FsBundleStore,
  GithubOAuthFake,
  SqliteAuditLog,
  SqliteCandidateStore,
  SqliteSkillStore,
  SqliteSubmissionStore,
  SqliteUserStore,
} from "@matrix-sharon/adapters";
import { createSession } from "@matrix-sharon/core";
import type { GithubOAuth } from "@matrix-sharon/ports";
import type { Role } from "@matrix-sharon/types";
import type { AppContext } from "../src/context.js";
import { loadConfig } from "../src/config.js";
import { setSessionCookie } from "../src/session-cookie.js";

const tmpDirs: string[] = [];

export function makeTmpDb(prefix = "sharon-test-"): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tmpDirs.push(dir);
  return join(dir, "test.db");
}

export function makeTmpDataDir(prefix = "sharon-data-"): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  tmpDirs.push(dir);
  return dir;
}

export function cleanupTmpDirs(): void {
  while (tmpDirs.length) {
    const d = tmpDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
}

export interface BuildCtxOptions {
  db: Database.Database;
  oauthEnabled?: boolean;
  github?: GithubOAuth | null;
  dataDir?: string;
}

/**
 * Register a one-shot route `/_test_login?user=…` on the app that sets a
 * session cookie. Call once per app; then call `loginAs(app, "name")` to
 * get the cookie header.
 */
export function installLoginHelper(app: FastifyInstance): void {
  app.get<{ Querystring: { user?: string } }>("/_test_login", async (req, reply) => {
    const user = req.query.user;
    if (!user) return reply.code(400).send({ error: "missing user" });
    setSessionCookie(reply, createSession(user, Date.now()), { secure: false });
    return {};
  });
}

/**
 * Ensure a user exists (using UserStore directly) and produce a session cookie
 * header for them. Requires installLoginHelper(app) to have been called first.
 */
export async function loginAs(
  app: FastifyInstance,
  db: Database.Database,
  user: string,
  defaultRoleIfNew: Role = "member"
): Promise<string> {
  const us = new SqliteUserStore(db);
  await us.upsertFromGithub({
    id: user,
    githubId: user.length || 1,
    name: user,
    email: null,
    avatarUrl: null,
    defaultRoleIfNew,
  });
  const res = await app.inject({
    method: "GET",
    url: `/_test_login?user=${encodeURIComponent(user)}`,
  });
  return (res.headers["set-cookie"] as string).split(";")[0]!;
}

export function buildTestContext(opts: BuildCtxOptions): AppContext {
  const env: NodeJS.ProcessEnv = {
    NODE_ENV: "test",
    SHARON_SESSION_SECRET: "x".repeat(32),
  };
  if (opts.oauthEnabled) {
    env["GITHUB_CLIENT_ID"] = "test-client";
    env["GITHUB_CLIENT_SECRET"] = "test-secret";
  }
  const config = loadConfig(env);
  return {
    config,
    db: opts.db,
    userStore: new SqliteUserStore(opts.db),
    skillStore: new SqliteSkillStore(opts.db),
    candidateStore: new SqliteCandidateStore(opts.db),
    submissionStore: new SqliteSubmissionStore(opts.db),
    auditLog: new SqliteAuditLog(opts.db),
    bundleStore: new FsBundleStore(opts.dataDir ? { dataDir: opts.dataDir } : {}),
    github: opts.github ?? (opts.oauthEnabled ? new GithubOAuthFake() : null),
  };
}
