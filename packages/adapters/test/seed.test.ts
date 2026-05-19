import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Database from "better-sqlite3";
import { openDb } from "../src/storage/sqlite/db.js";
import { runMigrations } from "../src/storage/sqlite/migrate.js";
import { seedSampleSkills } from "../src/seed/index.js";

const tmpDirs: string[] = [];
function makeTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), "sharon-seed-test-"));
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

describe("seedSampleSkills", () => {
  it("inserts 3 skills, 3 versions, 1 system-seed user", async () => {
    const r = await seedSampleSkills(db, { bundleStore: null });
    expect(r.skillsInserted).toBe(3);
    expect(r.versionsInserted).toBe(3);
    expect(r.userInserted).toBe(true);

    const skills = db.prepare("SELECT slug FROM skills ORDER BY slug").all() as Array<{ slug: string }>;
    expect(skills.map((s) => s.slug)).toEqual([
      "i18n-key-finder",
      "pr-review-checklist",
      "sql-safety-gate",
    ]);

    const versions = db.prepare("SELECT count(*) AS n FROM skill_versions").get() as { n: number };
    expect(versions.n).toBe(3);

    const user = db.prepare("SELECT * FROM users WHERE id = 'system-seed'").get() as { role: string };
    expect(user).toBeDefined();
    expect(user.role).toBe("member");
  });

  it("is idempotent: second invocation inserts nothing new", async () => {
    await seedSampleSkills(db);
    const r2 = await seedSampleSkills(db);
    expect(r2.skillsInserted).toBe(0);
    expect(r2.versionsInserted).toBe(0);
    expect(r2.userInserted).toBe(false);

    const skills = db.prepare("SELECT count(*) AS n FROM skills").get() as { n: number };
    expect(skills.n).toBe(3);
  });

  it("does NOT trigger leader bootstrap for system-seed user", async () => {
    await seedSampleSkills(db);
    const u = db.prepare("SELECT role FROM users WHERE id = 'system-seed'").get() as { role: string };
    expect(u.role).toBe("member");
  });

  it("each seeded skill has current_version_id set", async () => {
    await seedSampleSkills(db);
    const rows = db
      .prepare("SELECT slug, current_version_id FROM skills")
      .all() as Array<{ slug: string; current_version_id: string | null }>;
    for (const r of rows) {
      expect(r.current_version_id).not.toBeNull();
    }
  });
});
