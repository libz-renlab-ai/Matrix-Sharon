import type Database from "better-sqlite3";
import type { Install, InstallToken } from "@matrix-sharon/types";
import type { InstallStore } from "@matrix-sharon/ports";

interface InstallRow {
  user_id: string;
  skill_slug: string;
  skill_version_id: string;
  installed_at: number;
  uninstalled_at: number | null;
  via_push_id: string | null;
}

interface TokenRow {
  token: string;
  user_id: string;
  skill_slug: string;
  version_id: string;
  expires_at: number;
  consumed_at: number | null;
}

function rowToInstall(r: InstallRow): Install {
  return {
    userId: r.user_id,
    skillSlug: r.skill_slug,
    skillVersionId: r.skill_version_id,
    installedAt: r.installed_at,
    uninstalledAt: r.uninstalled_at,
    viaPushId: r.via_push_id,
  };
}

function rowToToken(r: TokenRow): InstallToken {
  return {
    token: r.token,
    userId: r.user_id,
    skillSlug: r.skill_slug,
    versionId: r.version_id,
    expiresAt: r.expires_at,
    consumedAt: r.consumed_at,
  };
}

export class SqliteInstallStore implements InstallStore {
  constructor(private readonly db: Database.Database) {}

  async recordInstall(install: Install): Promise<void> {
    // COALESCE on via_push_id preserves the push linkage when a user
    // re-installs directly (POST /v1/installs without a push token) after
    // having received via push. This keeps leader retention numbers accurate.
    this.db
      .prepare(
        `INSERT INTO installs
         (user_id, skill_slug, skill_version_id, installed_at, uninstalled_at, via_push_id)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(user_id, skill_slug) DO UPDATE SET
           skill_version_id = excluded.skill_version_id,
           installed_at = excluded.installed_at,
           uninstalled_at = NULL,
           via_push_id = COALESCE(excluded.via_push_id, via_push_id)`
      )
      .run(
        install.userId,
        install.skillSlug,
        install.skillVersionId,
        install.installedAt,
        install.uninstalledAt,
        install.viaPushId
      );
  }

  async markUninstalled(userId: string, skillSlug: string, at: number): Promise<void> {
    this.db
      .prepare(
        "UPDATE installs SET uninstalled_at = ? WHERE user_id = ? AND skill_slug = ?"
      )
      .run(at, userId, skillSlug);
  }

  async listForUser(userId: string): Promise<Install[]> {
    const rows = this.db
      .prepare(
        "SELECT * FROM installs WHERE user_id = ? AND uninstalled_at IS NULL ORDER BY installed_at DESC"
      )
      .all(userId) as InstallRow[];
    return rows.map(rowToInstall);
  }

  async putToken(token: InstallToken): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO install_tokens
         (token, user_id, skill_slug, version_id, expires_at, consumed_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      )
      .run(
        token.token,
        token.userId,
        token.skillSlug,
        token.versionId,
        token.expiresAt,
        token.consumedAt
      );
  }

  async consumeToken(token: string, at: number): Promise<InstallToken | null> {
    // Atomic check-and-consume: the UPDATE itself enforces single-use and
    // un-expired. If two concurrent requests both observe consumed_at IS NULL
    // and race the UPDATE, only one wins (changes === 1); the other gets 0
    // changes and we return null as if the token were already consumed.
    const result = this.db
      .prepare(
        "UPDATE install_tokens SET consumed_at = ? WHERE token = ? AND consumed_at IS NULL AND expires_at >= ?"
      )
      .run(at, token, at);
    if (result.changes === 0) return null;
    const row = this.db
      .prepare("SELECT * FROM install_tokens WHERE token = ?")
      .get(token) as TokenRow | undefined;
    if (!row) return null;
    return rowToToken(row);
  }
}
