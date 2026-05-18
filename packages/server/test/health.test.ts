import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { openDb } from "@matrix-sharon/adapters/storage/sqlite";
import { runMigrations } from "@matrix-sharon/adapters/storage/sqlite/migrate";
import { buildApp } from "../src/index.js";
import { buildTestContext, cleanupTmpDirs, makeTmpDb } from "./helpers.js";

let db: Database.Database;

beforeEach(async () => {
  db = openDb({ path: makeTmpDb("sharon-server-health-") });
  await runMigrations(db);
});

afterEach(() => {
  db.close();
  cleanupTmpDirs();
});

describe("GET /health", () => {
  it("returns ok and a timestamp", async () => {
    const app = await buildApp(buildTestContext({ db }));
    const res = await app.inject({ method: "GET", url: "/health" });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { ok: boolean; ts: number };
    expect(body.ok).toBe(true);
    expect(typeof body.ts).toBe("number");
    await app.close();
  });
});
