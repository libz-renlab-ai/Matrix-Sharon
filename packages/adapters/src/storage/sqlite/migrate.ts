import type Database from "better-sqlite3";
import { INITIAL_SQL } from "./migrations/_embedded.js";

interface Migration {
  id: string;
  sql: string;
}

// Migrations are embedded as TS string constants (see migrations/_embedded.ts)
// so they survive `tsc` to dist where sibling .sql files would not be copied.
const MIGRATIONS: Migration[] = [
  { id: "001_initial", sql: INITIAL_SQL },
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
    const tx = db.transaction(() => {
      db.exec(m.sql);
      db.prepare("INSERT INTO _migrations (id, applied_at) VALUES (?, ?)").run(
        m.id,
        Date.now()
      );
    });
    tx();
  }
}
