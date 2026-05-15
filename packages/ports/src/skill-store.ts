import type { Skill, SkillVersion } from "@matrix-sharon/types";

export interface SkillStore {
  upsertSkill(skill: Skill): Promise<void>;
  findSkillBySlug(slug: string): Promise<Skill | null>;
  listApproved(): Promise<Array<{ skill: Skill; currentVersion: SkillVersion }>>;

  insertVersion(version: SkillVersion): Promise<void>;
  findVersion(id: string): Promise<SkillVersion | null>;
  listVersionsBySlug(slug: string): Promise<SkillVersion[]>;
  setCurrentVersion(slug: string, versionId: string): Promise<void>;
  /** Largest existing semver for this slug (0 if none). */
  maxSemver(slug: string): Promise<number>;
}
