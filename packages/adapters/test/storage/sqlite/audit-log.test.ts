import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Database from "better-sqlite3";
import { openDb } from "../../../src/storage/sqlite/db.js";
import { runMigrations } from "../../../src/storage/sqlite/migrate.js";
import { SqliteAuditLog } from "../../../src/storage/sqlite/audit-log.js";

const tmpDirs: string[] = [];
function makeTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), "sharon-audit-log-test-"));
  tmpDirs.push(dir);
  return join(dir, "test.db");
}

let db: Database.Database;
let log: SqliteAuditLog;

beforeEach(async () => {
  db = openDb({ path: makeTmpDb() });
  await runMigrations(db);
  log = new SqliteAuditLog(db);
});

afterEach(() => {
  db.close();
  while (tmpDirs.length) {
    const d = tmpDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

describe("SqliteAuditLog", () => {
  it("record + list returns the entry", async () => {
    await log.record({
      actorId: "leader-one",
      action: "approve",
      targetKind: "submission",
      targetId: "sub-1",
      payload: { note: "looks good" },
      at: 1000,
    });
    const list = await log.list();
    expect(list).toHaveLength(1);
    expect(list[0]!.action).toBe("approve");
    expect(list[0]!.actor_id).toBe("leader-one");
  });

  it("list returns DESC by at", async () => {
    await log.record({ actorId: "x", action: "a", targetKind: null, targetId: null, payload: {}, at: 1 });
    await log.record({ actorId: "x", action: "b", targetKind: null, targetId: null, payload: {}, at: 3 });
    await log.record({ actorId: "x", action: "c", targetKind: null, targetId: null, payload: {}, at: 2 });
    const list = await log.list();
    expect(list.map((e) => e.action)).toEqual(["b", "c", "a"]);
  });

  it("filters by actorId", async () => {
    await log.record({ actorId: "alice", action: "a", targetKind: null, targetId: null, payload: {}, at: 1 });
    await log.record({ actorId: "bob", action: "b", targetKind: null, targetId: null, payload: {}, at: 2 });
    const list = await log.list({ actorId: "alice" });
    expect(list).toHaveLength(1);
    expect(list[0]!.actor_id).toBe("alice");
  });

  it("filters by action", async () => {
    await log.record({ actorId: "x", action: "approve", targetKind: null, targetId: null, payload: {}, at: 1 });
    await log.record({ actorId: "x", action: "reject", targetKind: null, targetId: null, payload: {}, at: 2 });
    const list = await log.list({ action: "approve" });
    expect(list).toHaveLength(1);
  });

  it("filters by sinceMs and respects limit", async () => {
    for (let i = 0; i < 10; i++) {
      await log.record({ actorId: "x", action: "a", targetKind: null, targetId: null, payload: { i }, at: i * 100 });
    }
    const list = await log.list({ sinceMs: 500, limit: 3 });
    expect(list).toHaveLength(3);
    for (const e of list) {
      expect(e["at"] as number).toBeGreaterThanOrEqual(500);
    }
  });
});
