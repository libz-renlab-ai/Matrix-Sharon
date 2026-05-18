import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Database from "better-sqlite3";
import { ulid } from "ulid";
import { openDb } from "../../../src/storage/sqlite/db.js";
import { runMigrations } from "../../../src/storage/sqlite/migrate.js";
import { SqliteUserStore } from "../../../src/storage/sqlite/user-store.js";
import { SqliteSkillStore } from "../../../src/storage/sqlite/skill-store.js";
import type { Skill, SkillVersion } from "@matrix-sharon/types";

const tmpDirs: string[] = [];
function makeTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), "sharon-skill-store-test-"));
  tmpDirs.push(dir);
  return join(dir, "test.db");
}

let db: Database.Database;
let store: SqliteSkillStore;

async function makeUser(id: string): Promise<void> {
  const us = new SqliteUserStore(db);
  await us.upsertFromGithub({
    id,
    githubId: id.length,
    name: id,
    email: null,
    avatarUrl: null,
    defaultRoleIfNew: "member",
  });
}

function sampleSkill(slug = "sql-safety-gate", authorId = "octocat"): Skill {
  return {
    slug,
    name: slug,
    category: "safety",
    icon: "🛡️",
    authorId,
    createdAt: Date.now(),
    currentVersionId: null,
  };
}

function sampleVersion(slug: string, semver: number, authorId = "octocat"): SkillVersion {
  return {
    id: ulid(),
    skillSlug: slug,
    semver,
    bundleSha256: `sha-${slug}-v${semver}`,
    bundleSize: 1234,
    description: `desc ${slug} v${semver}`,
    pain: "claude 半夜 DROP TABLE",
    gain: "PreToolUse hook 拦截 + EXPLAIN + 二次确认",
    triggers: "DROP / TRUNCATE / UPDATE-无-WHERE",
    exampleJson: null,
    readmeMd: `# ${slug}\n\nreadme body`,
    note: null,
    publishedBy: authorId,
    approvedBy: authorId,
    approvedAt: Date.now(),
    publishedAt: Date.now(),
  };
}

beforeEach(async () => {
  db = openDb({ path: makeTmpDb() });
  await runMigrations(db);
  await makeUser("octocat"); // first user → leader
  store = new SqliteSkillStore(db);
});

afterEach(() => {
  db.close();
  while (tmpDirs.length) {
    const d = tmpDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

describe("upsertSkill + findSkillBySlug", () => {
  it("inserts then retrieves a skill", async () => {
    const s = sampleSkill();
    await store.upsertSkill(s);
    const got = await store.findSkillBySlug("sql-safety-gate");
    expect(got).not.toBeNull();
    expect(got!.slug).toBe("sql-safety-gate");
    expect(got!.icon).toBe("🛡️");
    expect(got!.category).toBe("safety");
  });

  it("upsert updates an existing skill", async () => {
    const s = sampleSkill();
    await store.upsertSkill(s);
    await store.upsertSkill({ ...s, name: "renamed", icon: "🆕" });
    const got = await store.findSkillBySlug("sql-safety-gate");
    expect(got!.name).toBe("renamed");
    expect(got!.icon).toBe("🆕");
  });

  it("findSkillBySlug returns null when missing", async () => {
    expect(await store.findSkillBySlug("nope")).toBeNull();
  });
});

describe("insertVersion + findVersion + listVersionsBySlug + maxSemver", () => {
  beforeEach(async () => {
    await store.upsertSkill(sampleSkill());
  });

  it("inserts and finds a version by id", async () => {
    const v = sampleVersion("sql-safety-gate", 1);
    await store.insertVersion(v);
    const got = await store.findVersion(v.id);
    expect(got).not.toBeNull();
    expect(got!.semver).toBe(1);
  });

  it("listVersionsBySlug returns DESC by semver", async () => {
    await store.insertVersion(sampleVersion("sql-safety-gate", 1));
    await store.insertVersion(sampleVersion("sql-safety-gate", 2));
    await store.insertVersion(sampleVersion("sql-safety-gate", 3));
    const list = await store.listVersionsBySlug("sql-safety-gate");
    expect(list.map((v) => v.semver)).toEqual([3, 2, 1]);
  });

  it("maxSemver returns 0 before any versions, then largest", async () => {
    expect(await store.maxSemver("sql-safety-gate")).toBe(0);
    await store.insertVersion(sampleVersion("sql-safety-gate", 1));
    expect(await store.maxSemver("sql-safety-gate")).toBe(1);
    await store.insertVersion(sampleVersion("sql-safety-gate", 5));
    expect(await store.maxSemver("sql-safety-gate")).toBe(5);
  });

  it("UNIQUE (slug, semver) violation throws", async () => {
    await store.insertVersion(sampleVersion("sql-safety-gate", 1));
    await expect(store.insertVersion(sampleVersion("sql-safety-gate", 1))).rejects.toThrow();
  });
});

describe("setCurrentVersion + listApproved", () => {
  it("listApproved excludes skills without current_version_id", async () => {
    await store.upsertSkill(sampleSkill());
    await store.insertVersion(sampleVersion("sql-safety-gate", 1));
    // current_version_id NOT set → should NOT appear
    const list = await store.listApproved();
    expect(list).toHaveLength(0);
  });

  it("listApproved includes skills with current_version_id set", async () => {
    await store.upsertSkill(sampleSkill());
    const v = sampleVersion("sql-safety-gate", 1);
    await store.insertVersion(v);
    await store.setCurrentVersion("sql-safety-gate", v.id);
    const list = await store.listApproved();
    expect(list).toHaveLength(1);
    expect(list[0]!.skill.slug).toBe("sql-safety-gate");
    expect(list[0]!.currentVersion.id).toBe(v.id);
  });

  it("listApproved sorts by skill name asc", async () => {
    for (const slug of ["zebra", "alpha", "mango"]) {
      await store.upsertSkill({ ...sampleSkill(slug), name: slug });
      const v = sampleVersion(slug, 1);
      await store.insertVersion(v);
      await store.setCurrentVersion(slug, v.id);
    }
    const list = await store.listApproved();
    expect(list.map((r) => r.skill.slug)).toEqual(["alpha", "mango", "zebra"]);
  });
});
