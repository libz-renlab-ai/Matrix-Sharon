import { describe, it, expect, afterEach } from "vitest";
import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import Database from "better-sqlite3";
import { openDb } from "../../../src/storage/sqlite/db.js";
import { runMigrations } from "../../../src/storage/sqlite/migrate.js";

const tmpDirs: string[] = [];
function makeTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), "sharon-migrate-test-"));
  tmpDirs.push(dir);
  return join(dir, "test.db");
}

afterEach(() => {
  while (tmpDirs.length) {
    const d = tmpDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

describe("runMigrations", () => {
  it("creates all 10 tables on a fresh database", async () => {
    const dbPath = makeTmpDb();
    const db = openDb({ path: dbPath });
    await runMigrations(db);
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_migrations' ORDER BY name"
    ).all() as Array<{ name: string }>;
    expect(tables.map(t => t.name)).toEqual([
      "audit_log",
      "candidates",
      "install_tokens",
      "installs",
      "pending_submissions",
      "push_receipts",
      "pushes",
      "skill_versions",
      "skills",
      "team_config",
      "users",
    ]);
    db.close();
  });

  it("is idempotent — second run is a no-op", async () => {
    const dbPath = makeTmpDb();
    const db = openDb({ path: dbPath });
    await runMigrations(db);
    await runMigrations(db);  // must not throw
    const applied = db.prepare("SELECT count(*) AS n FROM _migrations").get() as { n: number };
    expect(applied.n).toBe(1);
    db.close();
  });

  it("seeds team_config singleton row", async () => {
    const dbPath = makeTmpDb();
    const db = openDb({ path: dbPath });
    await runMigrations(db);
    const row = db.prepare("SELECT * FROM team_config WHERE id = 1").get() as { id: number; allowed_github_orgs: string };
    expect(row).toBeDefined();
    expect(row.id).toBe(1);
    expect(row.allowed_github_orgs).toBe("[]");
    db.close();
  });

  it("enforces foreign keys", async () => {
    const dbPath = makeTmpDb();
    const db = openDb({ path: dbPath });
    await runMigrations(db);
    // try to insert a skill with non-existent author
    expect(() =>
      db.prepare(
        "INSERT INTO skills (slug, name, author_id, created_at) VALUES ('x', 'x', 'ghost', 1)"
      ).run()
    ).toThrow(/FOREIGN KEY/);
    db.close();
  });
});
