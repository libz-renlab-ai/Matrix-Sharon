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
import { SqliteInstallStore } from "../../../src/storage/sqlite/install-store.js";
import type { Install, InstallToken, SkillVersion } from "@matrix-sharon/types";

const tmpDirs: string[] = [];
function makeTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), "sharon-install-store-test-"));
  tmpDirs.push(dir);
  return join(dir, "test.db");
}

let db: Database.Database;
let store: SqliteInstallStore;
let versionId: string;

async function seedVersion(slug = "sql-safety-gate"): Promise<string> {
  const us = new SqliteUserStore(db);
  await us.upsertFromGithub({
    id: "octocat",
    githubId: 1,
    name: "Octo",
    email: null,
    avatarUrl: null,
    defaultRoleIfNew: "member",
  });
  const ss = new SqliteSkillStore(db);
  await ss.upsertSkill({
    slug,
    name: slug,
    category: null,
    icon: null,
    authorId: "octocat",
    createdAt: Date.now(),
    currentVersionId: null,
  });
  const v: SkillVersion = {
    id: ulid(),
    skillSlug: slug,
    semver: 1,
    bundleSha256: `sha-${slug}`,
    bundleSize: 100,
    description: "d",
    pain: null,
    gain: null,
    triggers: null,
    exampleJson: null,
    readmeMd: "# x",
    note: null,
    publishedBy: "octocat",
    approvedBy: "octocat",
    approvedAt: Date.now(),
    publishedAt: Date.now(),
  };
  await ss.insertVersion(v);
  await ss.setCurrentVersion(slug, v.id);
  return v.id;
}

beforeEach(async () => {
  db = openDb({ path: makeTmpDb() });
  await runMigrations(db);
  versionId = await seedVersion();
  store = new SqliteInstallStore(db);
});

afterEach(() => {
  db.close();
  while (tmpDirs.length) {
    const d = tmpDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function sampleInstall(): Install {
  return {
    userId: "octocat",
    skillSlug: "sql-safety-gate",
    skillVersionId: versionId,
    installedAt: Date.now(),
    uninstalledAt: null,
    viaPushId: null,
  };
}

describe("recordInstall + listForUser", () => {
  it("records, then lists", async () => {
    await store.recordInstall(sampleInstall());
    const list = await store.listForUser("octocat");
    expect(list).toHaveLength(1);
    expect(list[0]!.skillSlug).toBe("sql-safety-gate");
    expect(list[0]!.uninstalledAt).toBeNull();
  });

  it("upserts: second install for same (user, slug) overwrites the version + ts", async () => {
    await store.recordInstall(sampleInstall());
    const newVersionId = await seedVersion("other-skill"); // create a 2nd version row to FK to
    await store.recordInstall({
      ...sampleInstall(),
      skillVersionId: newVersionId,
      installedAt: Date.now() + 1000,
    });
    const list = await store.listForUser("octocat");
    expect(list).toHaveLength(1);
    expect(list[0]!.skillVersionId).toBe(newVersionId);
  });

  it("listForUser excludes uninstalled by default", async () => {
    await store.recordInstall(sampleInstall());
    await store.markUninstalled("octocat", "sql-safety-gate", Date.now());
    const list = await store.listForUser("octocat");
    expect(list).toHaveLength(0);
  });
});

describe("markUninstalled", () => {
  it("sets uninstalled_at; subsequent record marks it active again", async () => {
    await store.recordInstall(sampleInstall());
    const tNow = Date.now();
    await store.markUninstalled("octocat", "sql-safety-gate", tNow);
    // Inspect raw via SQL
    const row = db.prepare("SELECT uninstalled_at FROM installs WHERE user_id=? AND skill_slug=?").get("octocat", "sql-safety-gate") as { uninstalled_at: number };
    expect(row.uninstalled_at).toBe(tNow);
    // re-install
    await store.recordInstall({ ...sampleInstall(), installedAt: tNow + 1 });
    const after = db.prepare("SELECT uninstalled_at FROM installs WHERE user_id=? AND skill_slug=?").get("octocat", "sql-safety-gate") as { uninstalled_at: number | null };
    expect(after.uninstalled_at).toBeNull();
  });
});

describe("token put + consume", () => {
  function sampleToken(token = "tok-1", expiresAt = Date.now() + 60_000): InstallToken {
    return {
      token,
      userId: "octocat",
      skillSlug: "sql-safety-gate",
      versionId,
      expiresAt,
      consumedAt: null,
    };
  }

  it("put + consume round-trips and marks consumed", async () => {
    await store.putToken(sampleToken());
    const at = Date.now();
    const got = await store.consumeToken("tok-1", at);
    expect(got).not.toBeNull();
    expect(got!.skillSlug).toBe("sql-safety-gate");
    // re-consume returns null (already consumed)
    expect(await store.consumeToken("tok-1", at + 1)).toBeNull();
  });

  it("consume returns null for unknown token", async () => {
    expect(await store.consumeToken("nope", Date.now())).toBeNull();
  });

  it("consume returns null for expired token", async () => {
    await store.putToken(sampleToken("tok-old", Date.now() - 1000));
    expect(await store.consumeToken("tok-old", Date.now())).toBeNull();
  });
});
