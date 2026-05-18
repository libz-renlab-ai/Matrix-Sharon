import type Database from "better-sqlite3";
import type { PendingSubmission, SubmissionStatus } from "@matrix-sharon/types";
import type { SubmissionStore } from "@matrix-sharon/ports";

interface Row {
  id: string;
  skill_slug: string;
  is_new_skill: number;
  bundle_sha256: string;
  bundle_size: number;
  raw_skill_md: string;
  submitter_id: string;
  submitted_at: number;
  status: SubmissionStatus;
  reviewer_id: string | null;
  reviewed_at: number | null;
  reject_reason: string | null;
}

function rowToSubmission(r: Row): PendingSubmission {
  return {
    id: r.id,
    skillSlug: r.skill_slug,
    isNewSkill: r.is_new_skill === 1,
    bundleSha256: r.bundle_sha256,
    bundleSize: r.bundle_size,
    rawSkillMd: r.raw_skill_md,
    submitterId: r.submitter_id,
    submittedAt: r.submitted_at,
    status: r.status,
    reviewerId: r.reviewer_id,
    reviewedAt: r.reviewed_at,
    rejectReason: r.reject_reason,
  };
}

export class SqliteSubmissionStore implements SubmissionStore {
  constructor(private readonly db: Database.Database) {}

  async insert(s: PendingSubmission): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO pending_submissions
         (id, skill_slug, is_new_skill, bundle_sha256, bundle_size, raw_skill_md,
          submitter_id, submitted_at, status, reviewer_id, reviewed_at, reject_reason)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        s.id,
        s.skillSlug,
        s.isNewSkill ? 1 : 0,
        s.bundleSha256,
        s.bundleSize,
        s.rawSkillMd,
        s.submitterId,
        s.submittedAt,
        s.status,
        s.reviewerId,
        s.reviewedAt,
        s.rejectReason
      );
  }

  async find(id: string): Promise<PendingSubmission | null> {
    const row = this.db
      .prepare("SELECT * FROM pending_submissions WHERE id = ?")
      .get(id) as Row | undefined;
    return row ? rowToSubmission(row) : null;
  }

  async listByStatus(status: SubmissionStatus): Promise<PendingSubmission[]> {
    const rows = this.db
      .prepare(
        "SELECT * FROM pending_submissions WHERE status = ? ORDER BY submitted_at ASC"
      )
      .all(status) as Row[];
    return rows.map(rowToSubmission);
  }

  async listBySubmitter(submitterId: string): Promise<PendingSubmission[]> {
    const rows = this.db
      .prepare(
        "SELECT * FROM pending_submissions WHERE submitter_id = ? ORDER BY submitted_at DESC"
      )
      .all(submitterId) as Row[];
    return rows.map(rowToSubmission);
  }

  async setStatus(
    id: string,
    params: {
      status: Exclude<SubmissionStatus, "pending">;
      reviewerId: string;
      reviewedAt: number;
      rejectReason: string | null;
    }
  ): Promise<void> {
    this.db
      .prepare(
        `UPDATE pending_submissions
         SET status = ?, reviewer_id = ?, reviewed_at = ?, reject_reason = ?
         WHERE id = ?`
      )
      .run(params.status, params.reviewerId, params.reviewedAt, params.rejectReason, id);
  }
}
