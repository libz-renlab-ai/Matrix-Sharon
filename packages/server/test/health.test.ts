import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Database from "better-sqlite3";
import { openDb } from "@matrix-sharon/adapters/storage/sqlite";
import { runMigrations } from "@matrix-sharon/adapters/storage/sqlite/migrate";
import { SqliteSkillStore, SqliteUserStore } from "@matrix-sharon/adapters";
import { buildApp } from "../src/index.js";
import { loadConfig } from "../src/config.js";

const tmpDirs: string[] = [];
function makeTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), "sharon-server-test-"));
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

describe("GET /health", () => {
  it("returns ok and a timestamp", async () => {
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
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean; ts: number };
    expect(body.ok).toBe(true);
    expect(typeof body.ts).toBe("number");
    await app.close();
  });
});
