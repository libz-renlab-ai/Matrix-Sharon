import type Database from "better-sqlite3";
import type { Role, User } from "@matrix-sharon/types";
import type { UserStore } from "@matrix-sharon/ports";

interface Row {
  id: string;
  github_id: number;
  name: string;
  email: string | null;
  avatar_url: string | null;
  role: Role;
  created_at: number;
  last_seen_at: number | null;
}

function rowToUser(r: Row): User {
  return {
    id: r.id,
    githubId: r.github_id,
    name: r.name,
    email: r.email,
    avatarUrl: r.avatar_url,
    role: r.role,
    createdAt: r.created_at,
    lastSeenAt: r.last_seen_at,
  };
}

export class SqliteUserStore implements UserStore {
  constructor(private readonly db: Database.Database) {}

  async upsertFromGithub(input: {
    id: string;
    githubId: number;
    name: string;
    email: string | null;
    avatarUrl: string | null;
    defaultRoleIfNew: Role;
  }): Promise<User> {
    const now = Date.now();
    // First-user-is-leader bootstrap + role-preserving upsert must be atomic.
    const tx = this.db.transaction(() => {
      // Prefer github_id (stable across rename) over login name. If the user
      // renamed their GitHub login, the row still exists under the same
      // github_id — we keep the original `users.id` (it's the FK target of
      // skills/installs/pushes/etc.) but refresh the human-readable fields.
      const existing = (this.db
        .prepare("SELECT * FROM users WHERE github_id = ?")
        .get(input.githubId) as Row | undefined) ?? (this.db
        .prepare("SELECT * FROM users WHERE id = ?")
        .get(input.id) as Row | undefined);

      if (existing) {
        // Don't touch users.id — it's referenced by other tables. Refresh
        // mutable profile fields only. If the GitHub login changed, the
        // display name updates but the internal id stays stable.
        this.db
          .prepare(
            `UPDATE users
             SET github_id = ?, name = ?, email = ?, avatar_url = ?, last_seen_at = ?
             WHERE id = ?`
          )
          .run(input.githubId, input.name, input.email, input.avatarUrl, now, existing.id);
      } else {
        // First *real* login becomes leader. Count leaders, not all users, so
        // the synthetic 'system-seed' user inserted by `pnpm seed` (a member
        // record used as skill author) does not block the bootstrap.
        const leaderRow = this.db
          .prepare("SELECT COUNT(*) AS n FROM users WHERE role = 'leader'")
          .get() as { n: number };
        const role: Role = leaderRow.n === 0 ? "leader" : input.defaultRoleIfNew;
        this.db
          .prepare(
            `INSERT INTO users (id, github_id, name, email, avatar_url, role, created_at, last_seen_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            input.id,
            input.githubId,
            input.name,
            input.email,
            input.avatarUrl,
            role,
            now,
            now
          );
      }
      // Return by github_id so rename callers get the row keyed by the
      // stable internal id, not the (possibly-new) login they passed in.
      return this.db.prepare("SELECT * FROM users WHERE github_id = ?").get(input.githubId) as Row;
    });

    return rowToUser(tx());
  }

  async findById(id: string): Promise<User | null> {
    const row = this.db.prepare("SELECT * FROM users WHERE id = ?").get(id) as Row | undefined;
    return row ? rowToUser(row) : null;
  }

  async findByGithubId(githubId: number): Promise<User | null> {
    const row = this.db.prepare("SELECT * FROM users WHERE github_id = ?").get(githubId) as
      | Row
      | undefined;
    return row ? rowToUser(row) : null;
  }

  async list(): Promise<User[]> {
    const rows = this.db.prepare("SELECT * FROM users ORDER BY created_at ASC").all() as Row[];
    return rows.map(rowToUser);
  }

  async setRole(id: string, role: Role): Promise<void> {
    this.db.prepare("UPDATE users SET role = ? WHERE id = ?").run(role, id);
  }

  async touchLastSeen(id: string, at: number): Promise<void> {
    this.db.prepare("UPDATE users SET last_seen_at = ? WHERE id = ?").run(at, id);
  }
}
