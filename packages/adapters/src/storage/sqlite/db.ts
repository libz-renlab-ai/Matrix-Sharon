import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { resolveDbPath } from "./paths.js";

export interface OpenDbOptions {
  /** Explicit path, otherwise resolves from SHARON_DATA_DIR or ./data/sharon.db */
  path?: string;
  /** Open read-only (for inspection tools). Default false. */
  readonly?: boolean;
}

export function openDb(opts: OpenDbOptions = {}): Database.Database {
  const path = opts.path ?? resolveDbPath();
  mkdirSync(dirname(path), { recursive: true });
  const db = new Database(path, { readonly: opts.readonly ?? false });
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  db.pragma("synchronous = NORMAL");
  return db;
}
