// Auto-maintained: embedded migration SQL.
// Adding a new migration:
//   1. Create migrations/NNN_name.sql (kept as docs / source-of-truth).
//   2. Mirror its contents here as a string export.
//   3. Add a row to EMBEDDED_MIGRATIONS in migrate.ts.
// We embed (vs read at runtime) so migrations survive `tsc` to dist where the
// .sql sibling files would otherwise not be copied.

export const INITIAL_SQL = `-- Migration 001: initial schema for Matrix-Sharon v1
-- Spec: docs/superpowers/specs/2026-05-15-matrix-sharon-design.md §8

PRAGMA foreign_keys = ON;

CREATE TABLE users (
  id           TEXT PRIMARY KEY,
  github_id    INTEGER UNIQUE NOT NULL,
  name         TEXT NOT NULL,
  email        TEXT,
  avatar_url   TEXT,
  role         TEXT NOT NULL CHECK (role IN ('leader','member')),
  created_at   INTEGER NOT NULL,
  last_seen_at INTEGER
);

CREATE INDEX idx_users_role ON users(role);

CREATE TABLE skills (
  slug               TEXT PRIMARY KEY,
  name               TEXT NOT NULL,
  category           TEXT,
  icon               TEXT,
  author_id          TEXT NOT NULL REFERENCES users(id),
  created_at         INTEGER NOT NULL,
  current_version_id TEXT
);

CREATE TABLE skill_versions (
  id            TEXT PRIMARY KEY,
  skill_slug    TEXT NOT NULL REFERENCES skills(slug),
  semver        INTEGER NOT NULL,
  bundle_sha256 TEXT NOT NULL,
  bundle_size   INTEGER NOT NULL,
  description   TEXT NOT NULL,
  pain          TEXT,
  gain          TEXT,
  triggers      TEXT,
  example_json  TEXT,
  readme_md     TEXT NOT NULL,
  note          TEXT,
  published_by  TEXT NOT NULL REFERENCES users(id),
  approved_by   TEXT NOT NULL REFERENCES users(id),
  approved_at   INTEGER NOT NULL,
  published_at  INTEGER NOT NULL,
  UNIQUE(skill_slug, semver)
);

CREATE INDEX idx_skill_versions_slug_semver ON skill_versions(skill_slug, semver);

CREATE TABLE pending_submissions (
  id            TEXT PRIMARY KEY,
  skill_slug    TEXT NOT NULL,
  is_new_skill  INTEGER NOT NULL,
  bundle_sha256 TEXT NOT NULL,
  bundle_size   INTEGER NOT NULL,
  raw_skill_md  TEXT NOT NULL,
  submitter_id  TEXT NOT NULL REFERENCES users(id),
  submitted_at  INTEGER NOT NULL,
  status        TEXT NOT NULL CHECK (status IN ('pending','approved','rejected')),
  reviewer_id   TEXT REFERENCES users(id),
  reviewed_at   INTEGER,
  reject_reason TEXT
);

CREATE INDEX idx_pending_status_submitted ON pending_submissions(status, submitted_at);

CREATE TABLE candidates (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL REFERENCES users(id),
  skill_slug      TEXT NOT NULL,
  detected_at     INTEGER NOT NULL,
  reason          TEXT NOT NULL,
  diff_unified    TEXT,
  full_content_md TEXT NOT NULL,
  dismissed       INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_candidates_user_dismissed ON candidates(user_id, dismissed);

CREATE TABLE pushes (
  id                TEXT PRIMARY KEY,
  kind              TEXT NOT NULL,
  skill_slug        TEXT NOT NULL,
  skill_version_id  TEXT REFERENCES skill_versions(id),
  from_leader_id    TEXT NOT NULL REFERENCES users(id),
  reason            TEXT NOT NULL,
  pushed_at         INTEGER NOT NULL
);

CREATE TABLE push_receipts (
  push_id           TEXT NOT NULL REFERENCES pushes(id),
  recipient_id      TEXT NOT NULL REFERENCES users(id),
  status            TEXT NOT NULL CHECK (status IN ('pending','installed','failed','uninstalled')),
  status_changed_at INTEGER NOT NULL,
  fail_reason       TEXT,
  acknowledged      INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (push_id, recipient_id)
);

CREATE INDEX idx_push_receipts_recipient_status ON push_receipts(recipient_id, status);

CREATE TABLE installs (
  user_id          TEXT NOT NULL REFERENCES users(id),
  skill_slug       TEXT NOT NULL,
  skill_version_id TEXT NOT NULL REFERENCES skill_versions(id),
  installed_at     INTEGER NOT NULL,
  uninstalled_at   INTEGER,
  via_push_id      TEXT REFERENCES pushes(id),
  PRIMARY KEY (user_id, skill_slug)
);

CREATE TABLE install_tokens (
  token       TEXT PRIMARY KEY,
  user_id     TEXT NOT NULL REFERENCES users(id),
  skill_slug  TEXT NOT NULL,
  version_id  TEXT NOT NULL REFERENCES skill_versions(id),
  expires_at  INTEGER NOT NULL,
  consumed_at INTEGER
);

CREATE TABLE team_config (
  id                    INTEGER PRIMARY KEY CHECK (id = 1),
  allowed_github_orgs   TEXT,
  allowed_github_teams  TEXT,
  updated_by            TEXT REFERENCES users(id),
  updated_at            INTEGER
);

INSERT INTO team_config (id, allowed_github_orgs, allowed_github_teams) VALUES (1, '[]', '[]');

CREATE TABLE audit_log (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  actor_id     TEXT NOT NULL,
  action       TEXT NOT NULL,
  target_kind  TEXT,
  target_id    TEXT,
  payload_json TEXT,
  at           INTEGER NOT NULL
);

CREATE INDEX idx_audit_log_at ON audit_log(at);
`;
