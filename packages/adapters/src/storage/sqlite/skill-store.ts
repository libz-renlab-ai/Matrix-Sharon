import type Database from "better-sqlite3";
import type { Category, Skill, SkillVersion } from "@matrix-sharon/types";
import type { SkillStore } from "@matrix-sharon/ports";

interface SkillRow {
  slug: string;
  name: string;
  category: Category | null;
  icon: string | null;
  author_id: string;
  created_at: number;
  current_version_id: string | null;
}

interface VersionRow {
  id: string;
  skill_slug: string;
  semver: number;
  bundle_sha256: string;
  bundle_size: number;
  description: string;
  pain: string | null;
  gain: string | null;
  triggers: string | null;
  example_json: string | null;
  readme_md: string;
  note: string | null;
  published_by: string;
  approved_by: string;
  approved_at: number;
  published_at: number;
}

function skillFromRow(r: SkillRow): Skill {
  return {
    slug: r.slug,
    name: r.name,
    category: r.category,
    icon: r.icon,
    authorId: r.author_id,
    createdAt: r.created_at,
    currentVersionId: r.current_version_id,
  };
}

function versionFromRow(r: VersionRow): SkillVersion {
  return {
    id: r.id,
    skillSlug: r.skill_slug,
    semver: r.semver,
    bundleSha256: r.bundle_sha256,
    bundleSize: r.bundle_size,
    description: r.description,
    pain: r.pain,
    gain: r.gain,
    triggers: r.triggers,
    exampleJson: r.example_json,
    readmeMd: r.readme_md,
    note: r.note,
    publishedBy: r.published_by,
    approvedBy: r.approved_by,
    approvedAt: r.approved_at,
    publishedAt: r.published_at,
  };
}

export class SqliteSkillStore implements SkillStore {
  constructor(private readonly db: Database.Database) {}

  async upsertSkill(s: Skill): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO skills (slug, name, category, icon, author_id, created_at, current_version_id)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(slug) DO UPDATE SET
           name = excluded.name,
           category = excluded.category,
           icon = excluded.icon,
           current_version_id = excluded.current_version_id`
      )
      .run(
        s.slug,
        s.name,
        s.category,
        s.icon,
        s.authorId,
        s.createdAt,
        s.currentVersionId
      );
  }

  async findSkillBySlug(slug: string): Promise<Skill | null> {
    const row = this.db.prepare("SELECT * FROM skills WHERE slug = ?").get(slug) as
      | SkillRow
      | undefined;
    return row ? skillFromRow(row) : null;
  }

  async listApproved(): Promise<Array<{ skill: Skill; currentVersion: SkillVersion }>> {
    const rows = this.db
      .prepare(
        `SELECT s.slug AS s_slug, s.name AS s_name, s.category AS s_category, s.icon AS s_icon,
                s.author_id AS s_author_id, s.created_at AS s_created_at,
                s.current_version_id AS s_current_version_id,
                v.id, v.skill_slug, v.semver, v.bundle_sha256, v.bundle_size, v.description,
                v.pain, v.gain, v.triggers, v.example_json, v.readme_md, v.note,
                v.published_by, v.approved_by, v.approved_at, v.published_at
         FROM skills s
         INNER JOIN skill_versions v ON s.current_version_id = v.id
         WHERE s.current_version_id IS NOT NULL
         ORDER BY s.name ASC`
      )
      .all() as Array<SkillRow & VersionRow & {
        s_slug: string;
        s_name: string;
        s_category: Category | null;
        s_icon: string | null;
        s_author_id: string;
        s_created_at: number;
        s_current_version_id: string | null;
      }>;

    return rows.map((r) => ({
      skill: skillFromRow({
        slug: r.s_slug,
        name: r.s_name,
        category: r.s_category,
        icon: r.s_icon,
        author_id: r.s_author_id,
        created_at: r.s_created_at,
        current_version_id: r.s_current_version_id,
      }),
      currentVersion: versionFromRow(r),
    }));
  }

  async insertVersion(v: SkillVersion): Promise<void> {
    this.db
      .prepare(
        `INSERT INTO skill_versions
         (id, skill_slug, semver, bundle_sha256, bundle_size, description,
          pain, gain, triggers, example_json, readme_md, note,
          published_by, approved_by, approved_at, published_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        v.id,
        v.skillSlug,
        v.semver,
        v.bundleSha256,
        v.bundleSize,
        v.description,
        v.pain,
        v.gain,
        v.triggers,
        v.exampleJson,
        v.readmeMd,
        v.note,
        v.publishedBy,
        v.approvedBy,
        v.approvedAt,
        v.publishedAt
      );
  }

  async findVersion(id: string): Promise<SkillVersion | null> {
    const row = this.db.prepare("SELECT * FROM skill_versions WHERE id = ?").get(id) as
      | VersionRow
      | undefined;
    return row ? versionFromRow(row) : null;
  }

  async listVersionsBySlug(slug: string): Promise<SkillVersion[]> {
    const rows = this.db
      .prepare("SELECT * FROM skill_versions WHERE skill_slug = ? ORDER BY semver DESC")
      .all(slug) as VersionRow[];
    return rows.map(versionFromRow);
  }

  async setCurrentVersion(slug: string, versionId: string): Promise<void> {
    this.db
      .prepare("UPDATE skills SET current_version_id = ? WHERE slug = ?")
      .run(versionId, slug);
  }

  async maxSemver(slug: string): Promise<number> {
    const row = this.db
      .prepare("SELECT COALESCE(MAX(semver), 0) AS n FROM skill_versions WHERE skill_slug = ?")
      .get(slug) as { n: number };
    return row.n;
  }
}
