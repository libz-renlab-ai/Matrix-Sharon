import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Database from "better-sqlite3";
import { ulid } from "ulid";
import { openDb } from "../../../src/storage/sqlite/db.js";
import { runMigrations } from "../../../src/storage/sqlite/migrate.js";
import { SqliteUserStore } from "../../../src/storage/sqlite/user-store.js";
import { SqliteSubmissionStore } from "../../../src/storage/sqlite/submission-store.js";
import type { PendingSubmission } from "@matrix-sharon/types";

const tmpDirs: string[] = [];
function makeTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), "sharon-submission-store-test-"));
  tmpDirs.push(dir);
  return join(dir, "test.db");
}

let db: Database.Database;
let store: SqliteSubmissionStore;

function makeSub(submitter: string, slug = "x", isNew = true): PendingSubmission {
  return {
    id: ulid(),
    skillSlug: slug,
    isNewSkill: isNew,
    bundleSha256: `sha-${slug}`,
    bundleSize: 100,
    rawSkillMd: `---\nname: ${slug}\ndescription: x\n---\n# ${slug}`,
    submitterId: submitter,
    submittedAt: Date.now(),
    status: "pending",
    reviewerId: null,
    reviewedAt: null,
    rejectReason: null,
  };
}

beforeEach(async () => {
  db = openDb({ path: makeTmpDb() });
  await runMigrations(db);
  const us = new SqliteUserStore(db);
  await us.upsertFromGithub({
    id: "leader-one",
    githubId: 1,
    name: "Leader",
    email: null,
    avatarUrl: null,
    defaultRoleIfNew: "member",
  });
  await us.upsertFromGithub({
    id: "octocat",
    githubId: 2,
    name: "Octo",
    email: null,
    avatarUrl: null,
    defaultRoleIfNew: "member",
  });
  store = new SqliteSubmissionStore(db);
});

afterEach(() => {
  db.close();
  while (tmpDirs.length) {
    const d = tmpDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

describe("SqliteSubmissionStore", () => {
  it("insert + find round-trips", async () => {
    const s = makeSub("octocat", "x");
    await store.insert(s);
    const got = await store.find(s.id);
    expect(got).not.toBeNull();
    expect(got!.skillSlug).toBe("x");
    expect(got!.isNewSkill).toBe(true);
    expect(got!.status).toBe("pending");
  });

  it("find returns null for unknown id", async () => {
    expect(await store.find("nope")).toBeNull();
  });

  it("listByStatus filters and orders by submitted_at ASC", async () => {
    const oldSub = { ...makeSub("octocat", "a"), submittedAt: 1000 };
    const midSub = { ...makeSub("octocat", "b"), submittedAt: 2000 };
    const newSub = { ...makeSub("octocat", "c"), submittedAt: 3000 };
    await store.insert(newSub);
    await store.insert(oldSub);
    await store.insert(midSub);
    const list = await store.listByStatus("pending");
    expect(list.map((s) => s.skillSlug)).toEqual(["a", "b", "c"]);
  });

  it("listByStatus respects status filter", async () => {
    const s1 = makeSub("octocat", "a");
    const s2 = makeSub("octocat", "b");
    await store.insert(s1);
    await store.insert(s2);
    await store.setStatus(s1.id, {
      status: "approved",
      reviewerId: "leader-one",
      reviewedAt: Date.now(),
      rejectReason: null,
    });
    const pending = await store.listByStatus("pending");
    const approved = await store.listByStatus("approved");
    expect(pending.map((s) => s.skillSlug)).toEqual(["b"]);
    expect(approved.map((s) => s.skillSlug)).toEqual(["a"]);
  });

  it("setStatus updates reviewer/at/reason and persists", async () => {
    const s = makeSub("octocat", "x");
    await store.insert(s);
    const now = Date.now();
    await store.setStatus(s.id, {
      status: "rejected",
      reviewerId: "leader-one",
      reviewedAt: now,
      rejectReason: "missing pain field",
    });
    const got = await store.find(s.id);
    expect(got!.status).toBe("rejected");
    expect(got!.reviewerId).toBe("leader-one");
    expect(got!.reviewedAt).toBe(now);
    expect(got!.rejectReason).toBe("missing pain field");
  });
});
