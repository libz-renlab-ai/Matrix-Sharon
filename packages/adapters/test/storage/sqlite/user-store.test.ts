import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Database from "better-sqlite3";
import { openDb } from "../../../src/storage/sqlite/db.js";
import { runMigrations } from "../../../src/storage/sqlite/migrate.js";
import { SqliteUserStore } from "../../../src/storage/sqlite/user-store.js";

const tmpDirs: string[] = [];
function makeTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), "sharon-user-store-test-"));
  tmpDirs.push(dir);
  return join(dir, "test.db");
}

let db: Database.Database;
let store: SqliteUserStore;

beforeEach(async () => {
  db = openDb({ path: makeTmpDb() });
  await runMigrations(db);
  store = new SqliteUserStore(db);
});

afterEach(() => {
  db.close();
  while (tmpDirs.length) {
    const d = tmpDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

const baseInput = {
  id: "octocat",
  githubId: 583231,
  name: "The Octocat",
  email: "octo@github.com",
  avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
  defaultRoleIfNew: "member" as const,
};

describe("SqliteUserStore.upsertFromGithub", () => {
  it("first user is promoted to leader even when defaultRoleIfNew is member", async () => {
    const u = await store.upsertFromGithub(baseInput);
    expect(u.id).toBe("octocat");
    expect(u.role).toBe("leader");
  });

  it("second user with defaultRoleIfNew=member gets member", async () => {
    await store.upsertFromGithub(baseInput); // first → leader
    const second = await store.upsertFromGithub({
      ...baseInput,
      id: "ghost",
      githubId: 1,
      name: "Ghost",
      email: null,
      avatarUrl: null,
    });
    expect(second.role).toBe("member");
  });

  it("upsert preserves existing role on re-login (leader stays leader)", async () => {
    await store.upsertFromGithub(baseInput); // first → leader
    const again = await store.upsertFromGithub({
      ...baseInput,
      defaultRoleIfNew: "member",
      name: "Renamed Octocat",
    });
    expect(again.role).toBe("leader");
    expect(again.name).toBe("Renamed Octocat");
  });

  it("upsert preserves existing member role even when defaultRoleIfNew=leader", async () => {
    await store.upsertFromGithub(baseInput); // first → leader
    await store.upsertFromGithub({
      ...baseInput,
      id: "ghost",
      githubId: 1,
      name: "Ghost",
      email: null,
      avatarUrl: null,
    }); // second → member
    const again = await store.upsertFromGithub({
      ...baseInput,
      id: "ghost",
      githubId: 1,
      name: "Ghost",
      email: null,
      avatarUrl: null,
      defaultRoleIfNew: "leader",
    });
    expect(again.role).toBe("member");
  });

  it("sets last_seen_at on insert and on re-upsert", async () => {
    const u1 = await store.upsertFromGithub(baseInput);
    expect(u1.lastSeenAt).not.toBeNull();
    const first = u1.lastSeenAt!;
    await new Promise((r) => setTimeout(r, 5));
    const u2 = await store.upsertFromGithub(baseInput);
    expect(u2.lastSeenAt).not.toBeNull();
    expect(u2.lastSeenAt!).toBeGreaterThanOrEqual(first);
  });
});

describe("SqliteUserStore lookups", () => {
  it("findById returns null for unknown user", async () => {
    expect(await store.findById("nobody")).toBeNull();
  });

  it("findByGithubId returns null for unknown github id", async () => {
    expect(await store.findByGithubId(99999)).toBeNull();
  });

  it("findById + findByGithubId resolve an existing user", async () => {
    const inserted = await store.upsertFromGithub(baseInput);
    expect(await store.findById("octocat")).toEqual(inserted);
    expect(await store.findByGithubId(583231)).toEqual(inserted);
  });

  it("list returns all users sorted by created_at", async () => {
    await store.upsertFromGithub(baseInput);
    await store.upsertFromGithub({
      ...baseInput,
      id: "ghost",
      githubId: 1,
      name: "Ghost",
      email: null,
      avatarUrl: null,
    });
    const all = await store.list();
    expect(all).toHaveLength(2);
    expect(all.map((u) => u.id).sort()).toEqual(["ghost", "octocat"]);
  });
});

describe("SqliteUserStore mutations", () => {
  it("setRole flips role", async () => {
    await store.upsertFromGithub(baseInput); // → leader
    await store.upsertFromGithub({
      ...baseInput,
      id: "ghost",
      githubId: 1,
      name: "Ghost",
      email: null,
      avatarUrl: null,
    }); // → member
    await store.setRole("ghost", "leader");
    const u = await store.findById("ghost");
    expect(u?.role).toBe("leader");
  });

  it("touchLastSeen updates timestamp", async () => {
    const u = await store.upsertFromGithub(baseInput);
    const old = u.lastSeenAt!;
    await new Promise((r) => setTimeout(r, 5));
    const now = Date.now();
    await store.touchLastSeen("octocat", now);
    const after = await store.findById("octocat");
    expect(after?.lastSeenAt).toBe(now);
    expect(after?.lastSeenAt!).toBeGreaterThan(old);
  });
});
