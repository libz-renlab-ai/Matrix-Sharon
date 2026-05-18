import type Database from "better-sqlite3";
import type { AuditLog } from "@matrix-sharon/ports";

export class SqliteAuditLog implements AuditLog {
  constructor(private readonly db: Database.Database) {}

  async record(entry: {
    actorId: string;
    action: string;
    targetKind: string | null;
    targetId: string | null;
    payload: unknown;
    at: number;
  }): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO audit_log (actor_id, action, target_kind, target_id, payload_json, at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        entry.actorId,
        entry.action,
        entry.targetKind,
        entry.targetId,
        JSON.stringify(entry.payload),
        entry.at
      );
  }

  async list(
    filter: {
      actorId?: string;
      action?: string;
      sinceMs?: number;
      untilMs?: number;
      limit?: number;
    } = {}
  ): Promise<Array<{ id: number; [k: string]: unknown }>> {
    const where: string[] = [];
    const args: Array<string | number> = [];
    if (filter.actorId !== undefined) {
      where.push("actor_id = ?");
      args.push(filter.actorId);
    }
    if (filter.action !== undefined) {
      where.push("action = ?");
      args.push(filter.action);
    }
    if (filter.sinceMs !== undefined) {
      where.push("at >= ?");
      args.push(filter.sinceMs);
    }
    if (filter.untilMs !== undefined) {
      where.push("at <= ?");
      args.push(filter.untilMs);
    }
    const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
    const limitSql = filter.limit ? "LIMIT ?" : "";
    if (filter.limit) args.push(filter.limit);
    const rows = this.db
      .prepare(`SELECT * FROM audit_log ${whereSql} ORDER BY at DESC ${limitSql}`)
      .all(...args) as Array<{ id: number; [k: string]: unknown }>;
    return rows;
  }
}
