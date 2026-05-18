import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Database from "better-sqlite3";
import { ulid } from "ulid";
import { openDb } from "../../../src/storage/sqlite/db.js";
import { runMigrations } from "../../../src/storage/sqlite/migrate.js";
import { SqliteUserStore } from "../../../src/storage/sqlite/user-store.js";
import { SqliteCandidateStore } from "../../../src/storage/sqlite/candidate-store.js";
import type { Candidate } from "@matrix-sharon/types";

const tmpDirs: string[] = [];
function makeTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), "sharon-candidate-store-test-"));
  tmpDirs.push(dir);
  return join(dir, "test.db");
}

let db: Database.Database;
let store: SqliteCandidateStore;

function sampleCandidate(userId: string, slug = "x-skill"): Candidate {
  return {
    id: ulid(),
    userId,
    skillSlug: slug,
    detectedAt: Date.now(),
    reason: "本地新写",
    diffUnified: null,
    fullContentMd: `# ${slug}\n\nbody`,
    dismissed: false,
  };
}

beforeEach(async () => {
  db = openDb({ path: makeTmpDb() });
  await runMigrations(db);
  const us = new SqliteUserStore(db);
  await us.upsertFromGithub({
    id: "octocat",
    githubId: 1,
    name: "Octo",
    email: null,
    avatarUrl: null,
    defaultRoleIfNew: "member",
  });
  store = new SqliteCandidateStore(db);
});

afterEach(() => {
  db.close();
  while (tmpDirs.length) {
    const d = tmpDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

describe("SqliteCandidateStore", () => {
  it("upsert + find round-trips", async () => {
    const c = sampleCandidate("octocat");
    await store.upsert(c);
    const got = await store.find(c.id);
    expect(got).not.toBeNull();
    expect(got!.skillSlug).toBe("x-skill");
    expect(got!.dismissed).toBe(false);
  });

  it("upsert updates an existing row", async () => {
    const c = sampleCandidate("octocat");
    await store.upsert(c);
    await store.upsert({ ...c, reason: "更新过" });
    const got = await store.find(c.id);
    expect(got!.reason).toBe("更新过");
  });

  it("find returns null for unknown id", async () => {
    expect(await store.find("nope")).toBeNull();
  });

  it("listForUser excludes dismissed by default", async () => {
    const a = sampleCandidate("octocat", "a");
    const b = sampleCandidate("octocat", "b");
    await store.upsert(a);
    await store.upsert(b);
    await store.dismiss(b.id);
    const list = await store.listForUser("octocat");
    expect(list.map((c) => c.skillSlug)).toEqual(["a"]);
  });

  it("listForUser includes dismissed when opted in", async () => {
    const a = sampleCandidate("octocat", "a");
    const b = sampleCandidate("octocat", "b");
    await store.upsert(a);
    await store.upsert(b);
    await store.dismiss(b.id);
    const list = await store.listForUser("octocat", { includeDismissed: true });
    expect(list).toHaveLength(2);
  });

  it("listForUser is scoped to user", async () => {
    const us = new SqliteUserStore(db);
    await us.upsertFromGithub({
      id: "ghost",
      githubId: 2,
      name: "Ghost",
      email: null,
      avatarUrl: null,
      defaultRoleIfNew: "member",
    });
    await store.upsert(sampleCandidate("octocat", "a"));
    await store.upsert(sampleCandidate("ghost", "b"));
    const octoList = await store.listForUser("octocat");
    expect(octoList).toHaveLength(1);
    expect(octoList[0]!.skillSlug).toBe("a");
  });

  it("dismiss flips the flag", async () => {
    const c = sampleCandidate("octocat");
    await store.upsert(c);
    await store.dismiss(c.id);
    expect((await store.find(c.id))!.dismissed).toBe(true);
  });

  it("delete removes the row", async () => {
    const c = sampleCandidate("octocat");
    await store.upsert(c);
    await store.delete(c.id);
    expect(await store.find(c.id)).toBeNull();
  });
});
