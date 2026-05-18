import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import type { FastifyInstance } from "fastify";
import { openDb } from "@matrix-sharon/adapters/storage/sqlite";
import { runMigrations } from "@matrix-sharon/adapters/storage/sqlite/migrate";
import { buildApp } from "../src/index.js";
import {
  buildTestContext,
  cleanupTmpDirs,
  installLoginHelper,
  loginAs,
  makeTmpDataDir,
  makeTmpDb,
} from "./helpers.js";

let db: Database.Database;
let app: FastifyInstance;
let dataDir: string;

const sampleSkillMd = `---
name: sql-safety-gate
description: 拦
pain: 半夜 DROP
gain: PreToolUse hook
triggers: DROP/TRUNCATE
category: safety
icon: 🛡️
---
# sql-safety-gate
body
`;

async function seedApproved(): Promise<void> {
  const leader = await loginAs(app, db, "first-leader");
  const member = await loginAs(app, db, "publisher");
  const sub = await app.inject({
    method: "POST",
    url: "/v1/submissions",
    headers: { cookie: member },
    payload: { skillSlug: "sql-safety-gate", rawSkillMd: sampleSkillMd },
  });
  const id = (sub.json() as { submission: { id: string } }).submission.id;
  await app.inject({
    method: "POST",
    url: `/v1/submissions/${id}/approve`,
    headers: { cookie: leader },
    payload: {},
  });
}

beforeEach(async () => {
  db = openDb({ path: makeTmpDb("sharon-pushes-routes-") });
  await runMigrations(db);
  dataDir = makeTmpDataDir();
  app = await buildApp(buildTestContext({ db, dataDir }));
  installLoginHelper(app);
});

afterEach(async () => {
  await app.close();
  db.close();
  cleanupTmpDirs();
});

describe("POST /v1/pushes", () => {
  it("401 anon", async () => {
    const res = await app.inject({ method: "POST", url: "/v1/pushes", payload: {} });
    expect(res.statusCode).toBe(401);
  });

  it("403 for non-leader", async () => {
    await loginAs(app, db, "first-leader");
    const member = await loginAs(app, db, "octocat");
    const res = await app.inject({
      method: "POST",
      url: "/v1/pushes",
      headers: { cookie: member },
      payload: { skillSlug: "x", semver: 1, recipientIds: ["x"], reason: "y" },
    });
    expect(res.statusCode).toBe(403);
  });

  it("400 on missing fields", async () => {
    const leader = await loginAs(app, db, "first-leader");
    const res = await app.inject({
      method: "POST",
      url: "/v1/pushes",
      headers: { cookie: leader },
      payload: { foo: "bar" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("404 when version unknown", async () => {
    const leader = await loginAs(app, db, "first-leader");
    const res = await app.inject({
      method: "POST",
      url: "/v1/pushes",
      headers: { cookie: leader },
      payload: { skillSlug: "ghost", semver: 1, recipientIds: ["x"], reason: "y" },
    });
    expect(res.statusCode).toBe(404);
  });

  it("400 unknown recipient", async () => {
    await seedApproved();
    const leader = await loginAs(app, db, "first-leader");
    const res = await app.inject({
      method: "POST",
      url: "/v1/pushes",
      headers: { cookie: leader },
      payload: { skillSlug: "sql-safety-gate", semver: 1, recipientIds: ["nope"], reason: "y" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("201 creates push + receipts for valid recipients", async () => {
    await seedApproved();
    const leader = await loginAs(app, db, "first-leader");
    await loginAs(app, db, "alice");
    await loginAs(app, db, "bob");
    const res = await app.inject({
      method: "POST",
      url: "/v1/pushes",
      headers: { cookie: leader },
      payload: {
        skillSlug: "sql-safety-gate",
        semver: 1,
        recipientIds: ["alice", "bob"],
        reason: "请大家用上",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as {
      push: { id: string; fromLeaderId: string };
      receipts: Array<{ recipientId: string; status: string }>;
    };
    expect(body.push.fromLeaderId).toBe("first-leader");
    expect(body.receipts).toHaveLength(2);
    expect(body.receipts.every((r) => r.status === "pending")).toBe(true);
  });
});

describe("GET /v1/pushes/inbox", () => {
  it("401 anon", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/pushes/inbox" });
    expect(res.statusCode).toBe(401);
  });

  it("returns only this user's pushes", async () => {
    await seedApproved();
    const leader = await loginAs(app, db, "first-leader");
    const alice = await loginAs(app, db, "alice");
    const bob = await loginAs(app, db, "bob");
    await app.inject({
      method: "POST",
      url: "/v1/pushes",
      headers: { cookie: leader },
      payload: { skillSlug: "sql-safety-gate", semver: 1, recipientIds: ["alice"], reason: "x" },
    });
    const ai = await app.inject({
      method: "GET",
      url: "/v1/pushes/inbox",
      headers: { cookie: alice },
    });
    const bi = await app.inject({
      method: "GET",
      url: "/v1/pushes/inbox",
      headers: { cookie: bob },
    });
    expect((ai.json() as { items: unknown[] }).items).toHaveLength(1);
    expect((bi.json() as { items: unknown[] }).items).toHaveLength(0);
  });
});

describe("POST /v1/pushes/:pushId/acknowledge & /receipts/done & /receipts/failed", () => {
  async function setup(): Promise<{ leader: string; alice: string; pushId: string }> {
    await seedApproved();
    const leader = await loginAs(app, db, "first-leader");
    const alice = await loginAs(app, db, "alice");
    const push = await app.inject({
      method: "POST",
      url: "/v1/pushes",
      headers: { cookie: leader },
      payload: { skillSlug: "sql-safety-gate", semver: 1, recipientIds: ["alice"], reason: "x" },
    });
    const pushId = (push.json() as { push: { id: string } }).push.id;
    return { leader, alice, pushId };
  }

  it("acknowledge: 403 when not a recipient", async () => {
    const { pushId } = await setup();
    const bob = await loginAs(app, db, "bob");
    const res = await app.inject({
      method: "POST",
      url: `/v1/pushes/${pushId}/acknowledge`,
      headers: { cookie: bob },
    });
    expect(res.statusCode).toBe(403);
  });

  it("acknowledge: 204 + sets flag", async () => {
    const { pushId, alice } = await setup();
    const res = await app.inject({
      method: "POST",
      url: `/v1/pushes/${pushId}/acknowledge`,
      headers: { cookie: alice },
    });
    expect(res.statusCode).toBe(204);
    const inbox = await app.inject({
      method: "GET",
      url: "/v1/pushes/inbox",
      headers: { cookie: alice },
    });
    const items = (inbox.json() as { items: Array<{ receipt: { acknowledged: boolean } }> }).items;
    expect(items[0]!.receipt.acknowledged).toBe(true);
  });

  it("receipts/done: marks installed + records install row with via_push_id", async () => {
    const { pushId, alice } = await setup();
    const done = await app.inject({
      method: "POST",
      url: `/v1/pushes/${pushId}/receipts/done`,
      headers: { cookie: alice },
    });
    expect(done.statusCode).toBe(204);

    const mine = await app.inject({
      method: "GET",
      url: "/v1/installs/mine",
      headers: { cookie: alice },
    });
    const installs = (mine.json() as { installs: Array<{ viaPushId: string | null; skillSlug: string }> }).installs;
    expect(installs).toHaveLength(1);
    expect(installs[0]!.viaPushId).toBe(pushId);
    expect(installs[0]!.skillSlug).toBe("sql-safety-gate");
  });

  it("receipts/failed: 204 + records reason", async () => {
    const { pushId, alice } = await setup();
    const res = await app.inject({
      method: "POST",
      url: `/v1/pushes/${pushId}/receipts/failed`,
      headers: { cookie: alice },
      payload: { reason: "extract failed" },
    });
    expect(res.statusCode).toBe(204);
    const inbox = await app.inject({
      method: "GET",
      url: "/v1/pushes/inbox",
      headers: { cookie: alice },
    });
    const items = (inbox.json() as { items: Array<{ receipt: { status: string; failReason: string | null } }> }).items;
    expect(items[0]!.receipt.status).toBe("failed");
    expect(items[0]!.receipt.failReason).toBe("extract failed");
  });
});

describe("GET /v1/pushes/sent (leader retention)", () => {
  it("403 for member", async () => {
    await loginAs(app, db, "first-leader");
    const m = await loginAs(app, db, "alice");
    const res = await app.inject({
      method: "GET",
      url: "/v1/pushes/sent",
      headers: { cookie: m },
    });
    expect(res.statusCode).toBe(403);
  });

  it("returns counts per status", async () => {
    await seedApproved();
    const leader = await loginAs(app, db, "first-leader");
    await loginAs(app, db, "alice");
    await loginAs(app, db, "bob");
    await app.inject({
      method: "POST",
      url: "/v1/pushes",
      headers: { cookie: leader },
      payload: { skillSlug: "sql-safety-gate", semver: 1, recipientIds: ["alice", "bob"], reason: "x" },
    });
    const res = await app.inject({
      method: "GET",
      url: "/v1/pushes/sent",
      headers: { cookie: leader },
    });
    expect(res.statusCode).toBe(200);
    const items = (res.json() as { items: Array<{ push: { semver: number | null; skillSlug: string }; counts: { pending: number } }> }).items;
    expect(items).toHaveLength(1);
    expect(items[0]!.counts.pending).toBe(2);
    // B1: leader's retention view should include human-readable semver,
    // not just the bundle's ULID hash prefix.
    expect(items[0]!.push.semver).toBe(1);
    expect(items[0]!.push.skillSlug).toBe("sql-safety-gate");
  });
});

describe("GET /v1/users (leader-only)", () => {
  it("403 for member", async () => {
    await loginAs(app, db, "first-leader");
    const m = await loginAs(app, db, "alice");
    const res = await app.inject({ method: "GET", url: "/v1/users", headers: { cookie: m } });
    expect(res.statusCode).toBe(403);
  });

  it("returns minimal user list for leader", async () => {
    const leader = await loginAs(app, db, "first-leader");
    await loginAs(app, db, "alice");
    const res = await app.inject({ method: "GET", url: "/v1/users", headers: { cookie: leader } });
    expect(res.statusCode).toBe(200);
    const body = res.json() as { users: Array<{ id: string; role: string }> };
    expect(body.users.length).toBeGreaterThanOrEqual(2);
    expect(body.users.some((u) => u.id === "first-leader" && u.role === "leader")).toBe(true);
    expect(body.users.some((u) => u.id === "alice" && u.role === "member")).toBe(true);
  });
});
