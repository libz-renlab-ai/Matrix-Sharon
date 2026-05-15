import type Database from "better-sqlite3";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Migration {
  id: string;
  file: string;
}

/**
 * Discover migrations in src/storage/sqlite/migrations/ at build time.
 * Phase 1 has a single migration. Later phases add files; we keep this list
 * static (vs glob at runtime) so it survives `tsc` to dist.
 */
const MIGRATIONS: Migration[] = [
  { id: "001_initial", file: "migrations/001_initial.sql" },
];

export async function runMigrations(db: Database.Database): Promise<void> {
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id          TEXT PRIMARY KEY,
      applied_at  INTEGER NOT NULL
    );
  `);

  const applied = new Set(
    db.prepare("SELECT id FROM _migrations").all().map((r) => (r as { id: string }).id)
  );

  for (const m of MIGRATIONS) {
    if (applied.has(m.id)) continue;
    const sqlPath = resolve(__dirname, m.file);
    const sql = readFileSync(sqlPath, "utf8");
    const tx = db.transaction(() => {
      db.exec(sql);
      db.prepare("INSERT INTO _migrations (id, applied_at) VALUES (?, ?)").run(
        m.id,
        Date.now()
      );
    });
    tx();
  }
}
