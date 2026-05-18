import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Database from "better-sqlite3";
import {
  FsBundleStore,
  GithubOAuthFake,
  SqliteAuditLog,
  SqliteCandidateStore,
  SqliteSkillStore,
  SqliteSubmissionStore,
  SqliteUserStore,
} from "@matrix-sharon/adapters";
import type { GithubOAuth } from "@matrix-sharon/ports";
import type { AppContext } from "../src/context.js";
import { loadConfig } from "../src/config.js";

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
