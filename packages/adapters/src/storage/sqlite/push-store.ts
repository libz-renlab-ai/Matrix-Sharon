import type Database from "better-sqlite3";
import type {
  Push,
  PushKindId,
  PushReceipt,
  PushReceiptStatus,
} from "@matrix-sharon/types";
import type { PushStore } from "@matrix-sharon/ports";

interface PushRow {
  id: string;
  kind: PushKindId;
  skill_slug: string;
  skill_version_id: string | null;
  from_leader_id: string;
  reason: string;
  pushed_at: number;
}

interface ReceiptRow {
  push_id: string;
  recipient_id: string;
  status: PushReceiptStatus;
  status_changed_at: number;
  fail_reason: string | null;
  acknowledged: number;
}

function rowToPush(r: PushRow): Push {
  return {
    id: r.id,
    kind: r.kind,
    skillSlug: r.skill_slug,
    skillVersionId: r.skill_version_id,
    fromLeaderId: r.from_leader_id,
    reason: r.reason,
    pushedAt: r.pushed_at,
  };
}
function rowToReceipt(r: ReceiptRow): PushReceipt {
  return {
    pushId: r.push_id,
    recipientId: r.recipient_id,
    status: r.status,
    statusChangedAt: r.status_changed_at,
    failReason: r.fail_reason,
    acknowledged: r.acknowledged === 1,
  };
}

export class SqlitePushStore implements PushStore {
  constructor(private readonly db: Database.Database) {}

  async insertPush(push: Push): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO pushes
         (id, kind, skill_slug, skill_version_id, from_leader_id, reason, pushed_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        push.id,
        push.kind,
        push.skillSlug,
        push.skillVersionId,
        push.fromLeaderId,
        push.reason,
        push.pushedAt
      );
  }

  async insertReceipts(receipts: PushReceipt[]): Promise<void> {
    if (receipts.length === 0) return;
    const insert = this.db.prepare(
      `INSERT INTO push_receipts
       (push_id, recipient_id, status, status_changed_at, fail_reason, acknowledged)
       VALUES (?, ?, ?, ?, ?, ?)`
    );
    const tx = this.db.transaction((rs: PushReceipt[]) => {
      for (const r of rs) {
        insert.run(
          r.pushId,
          r.recipientId,
          r.status,
          r.statusChangedAt,
          r.failReason,
          r.acknowledged ? 1 : 0
        );
      }
    });
    tx(receipts);
  }

  async findPush(id: string): Promise<Push | null> {
    const row = this.db.prepare("SELECT * FROM pushes WHERE id = ?").get(id) as PushRow | undefined;
    return row ? rowToPush(row) : null;
  }

  async listReceiptsForPush(pushId: string): Promise<PushReceipt[]> {
    const rows = this.db
      .prepare("SELECT * FROM push_receipts WHERE push_id = ?")
      .all(pushId) as ReceiptRow[];
    return rows.map(rowToReceipt);
  }

  async listInboxFor(recipientId: string): Promise<Array<{ push: Push; receipt: PushReceipt }>> {
    const rows = this.db
      .prepare(
        `SELECT p.id AS p_id, p.kind AS p_kind, p.skill_slug AS p_skill_slug,
                p.skill_version_id AS p_skill_version_id, p.from_leader_id AS p_from_leader_id,
                p.reason AS p_reason, p.pushed_at AS p_pushed_at,
                r.push_id, r.recipient_id, r.status, r.status_changed_at,
                r.fail_reason, r.acknowledged
         FROM push_receipts r
         INNER JOIN pushes p ON p.id = r.push_id
         WHERE r.recipient_id = ? AND r.status != 'uninstalled'
         ORDER BY p.pushed_at DESC`
      )
      .all(recipientId) as Array<
      ReceiptRow & {
        p_id: string;
        p_kind: PushKindId;
        p_skill_slug: string;
        p_skill_version_id: string | null;
        p_from_leader_id: string;
        p_reason: string;
        p_pushed_at: number;
      }
    >;
    return rows.map((row) => ({
      push: rowToPush({
        id: row.p_id,
        kind: row.p_kind,
        skill_slug: row.p_skill_slug,
        skill_version_id: row.p_skill_version_id,
        from_leader_id: row.p_from_leader_id,
        reason: row.p_reason,
        pushed_at: row.p_pushed_at,
      }),
      receipt: rowToReceipt(row),
    }));
  }

  async setReceiptStatus(
    pushId: string,
    recipientId: string,
    params: {
      status: PushReceiptStatus;
      statusChangedAt: number;
      failReason: string | null;
    }
  ): Promise<void> {
    this.db
      .prepare(
        `UPDATE push_receipts
         SET status = ?, status_changed_at = ?, fail_reason = ?
         WHERE push_id = ? AND recipient_id = ?`
      )
      .run(params.status, params.statusChangedAt, params.failReason, pushId, recipientId);
  }

  async acknowledge(pushId: string, recipientId: string): Promise<void> {
    this.db
      .prepare(
        "UPDATE push_receipts SET acknowledged = 1 WHERE push_id = ? AND recipient_id = ?"
      )
      .run(pushId, recipientId);
  }
}
