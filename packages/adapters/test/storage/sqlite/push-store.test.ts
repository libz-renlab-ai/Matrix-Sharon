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
import { SqlitePushStore } from "../../../src/storage/sqlite/push-store.js";
import type { Push, PushReceipt, SkillVersion } from "@matrix-sharon/types";

const tmpDirs: string[] = [];
function makeTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), "sharon-push-store-test-"));
  tmpDirs.push(dir);
  return join(dir, "test.db");
}

let db: Database.Database;
let store: SqlitePushStore;
let leaderId = "leader-one";
let recip1 = "octocat";
let recip2 = "ghost";
let versionId: string;

async function seedVersion(slug = "sql-safety-gate"): Promise<string> {
  const ss = new SqliteSkillStore(db);
  await ss.upsertSkill({
    slug,
    name: slug,
    category: null,
    icon: null,
    authorId: leaderId,
    createdAt: Date.now(),
    currentVersionId: null,
  });
  const v: SkillVersion = {
    id: ulid(),
    skillSlug: slug,
    semver: 1,
    bundleSha256: "sha-x",
    bundleSize: 0,
    description: "d",
    pain: null,
    gain: null,
    triggers: null,
    exampleJson: null,
    readmeMd: "# x",
    note: null,
    publishedBy: leaderId,
    approvedBy: leaderId,
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
  const us = new SqliteUserStore(db);
  for (const id of [leaderId, recip1, recip2]) {
    await us.upsertFromGithub({
      id,
      githubId: id.length,
      name: id,
      email: null,
      avatarUrl: null,
      defaultRoleIfNew: "member",
    });
  }
  versionId = await seedVersion();
  store = new SqlitePushStore(db);
});

afterEach(() => {
  db.close();
  while (tmpDirs.length) {
    const d = tmpDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function samplePush(id = "push-1"): Push {
  return {
    id,
    kind: "skill",
    skillSlug: "sql-safety-gate",
    skillVersionId: versionId,
    fromLeaderId: leaderId,
    reason: "请大家用上",
    pushedAt: Date.now(),
  };
}
function sampleReceipt(pushId: string, recipient: string): PushReceipt {
  return {
    pushId,
    recipientId: recipient,
    status: "pending",
    statusChangedAt: Date.now(),
    failReason: null,
    acknowledged: false,
  };
}

describe("insertPush + insertReceipts + findPush + listReceiptsForPush", () => {
  it("round-trips push + receipts", async () => {
    await store.insertPush(samplePush());
    await store.insertReceipts([
      sampleReceipt("push-1", recip1),
      sampleReceipt("push-1", recip2),
    ]);
    const got = await store.findPush("push-1");
    expect(got).not.toBeNull();
    expect(got!.skillSlug).toBe("sql-safety-gate");
    const receipts = await store.listReceiptsForPush("push-1");
    expect(receipts).toHaveLength(2);
    expect(receipts.map((r) => r.recipientId).sort()).toEqual(["ghost", "octocat"]);
  });

  it("findPush returns null for unknown", async () => {
    expect(await store.findPush("nope")).toBeNull();
  });

  it("insertReceipts handles empty array", async () => {
    await store.insertPush(samplePush());
    await store.insertReceipts([]);
    expect(await store.listReceiptsForPush("push-1")).toHaveLength(0);
  });
});

describe("listInboxFor", () => {
  it("returns user's pending/installed/failed, not uninstalled", async () => {
    await store.insertPush(samplePush("push-1"));
    await store.insertReceipts([sampleReceipt("push-1", recip1)]);
    let inbox = await store.listInboxFor(recip1);
    expect(inbox).toHaveLength(1);

    await store.setReceiptStatus("push-1", recip1, {
      status: "uninstalled",
      statusChangedAt: Date.now(),
      failReason: null,
    });
    inbox = await store.listInboxFor(recip1);
    expect(inbox).toHaveLength(0);
  });

  it("does NOT leak other users' pushes", async () => {
    await store.insertPush(samplePush("push-1"));
    await store.insertReceipts([sampleReceipt("push-1", recip1)]);
    const ghostInbox = await store.listInboxFor(recip2);
    expect(ghostInbox).toHaveLength(0);
  });
});

describe("setReceiptStatus + acknowledge", () => {
  beforeEach(async () => {
    await store.insertPush(samplePush("push-1"));
    await store.insertReceipts([sampleReceipt("push-1", recip1)]);
  });

  it("setReceiptStatus updates status + fail_reason", async () => {
    await store.setReceiptStatus("push-1", recip1, {
      status: "failed",
      statusChangedAt: 12345,
      failReason: "bundle sha mismatch",
    });
    const inbox = await store.listInboxFor(recip1);
    expect(inbox[0]!.receipt.status).toBe("failed");
    expect(inbox[0]!.receipt.failReason).toBe("bundle sha mismatch");
  });

  it("acknowledge flips the flag", async () => {
    await store.acknowledge("push-1", recip1);
    const inbox = await store.listInboxFor(recip1);
    expect(inbox[0]!.receipt.acknowledged).toBe(true);
  });
});
