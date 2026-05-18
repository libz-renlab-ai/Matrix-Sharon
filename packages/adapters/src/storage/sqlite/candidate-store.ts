import type Database from "better-sqlite3";
import type { Candidate } from "@matrix-sharon/types";
import type { CandidateStore } from "@matrix-sharon/ports";

interface Row {
  id: string;
  user_id: string;
  skill_slug: string;
  detected_at: number;
  reason: string;
  diff_unified: string | null;
  full_content_md: string;
  dismissed: number;
}

function rowToCandidate(r: Row): Candidate {
  return {
    id: r.id,
    userId: r.user_id,
    skillSlug: r.skill_slug,
    detectedAt: r.detected_at,
    reason: r.reason,
    diffUnified: r.diff_unified,
    fullContentMd: r.full_content_md,
    dismissed: r.dismissed === 1,
  };
}

export class SqliteCandidateStore implements CandidateStore {
  constructor(private readonly db: Database.Database) {}

  async upsert(c: Candidate): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO candidates (id, user_id, skill_slug, detected_at, reason, diff_unified, full_content_md, dismissed)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           skill_slug = excluded.skill_slug,
           detected_at = excluded.detected_at,
           reason = excluded.reason,
           diff_unified = excluded.diff_unified,
           full_content_md = excluded.full_content_md,
           dismissed = excluded.dismissed`
      )
      .run(
        c.id,
        c.userId,
        c.skillSlug,
        c.detectedAt,
        c.reason,
        c.diffUnified,
        c.fullContentMd,
        c.dismissed ? 1 : 0
      );
  }

  async listForUser(
    userId: string,
    opts: { includeDismissed?: boolean } = {}
  ): Promise<Candidate[]> {
    const sql = opts.includeDismissed
      ? "SELECT * FROM candidates WHERE user_id = ? ORDER BY detected_at DESC"
      : "SELECT * FROM candidates WHERE user_id = ? AND dismissed = 0 ORDER BY detected_at DESC";
    const rows = this.db.prepare(sql).all(userId) as Row[];
    return rows.map(rowToCandidate);
  }

  async find(id: string): Promise<Candidate | null> {
    const row = this.db.prepare("SELECT * FROM candidates WHERE id = ?").get(id) as
      | Row
      | undefined;
    return row ? rowToCandidate(row) : null;
  }

  async dismiss(id: string): Promise<void> {
    this.db.prepare("UPDATE candidates SET dismissed = 1 WHERE id = ?").run(id);
  }

  async delete(id: string): Promise<void> {
    this.db.prepare("DELETE FROM candidates WHERE id = ?").run(id);
  }
}
