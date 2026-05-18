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
name: x
description: y
---
# x
`;

async function seedApprovedAndPush(): Promise<{ pushId: string; leaderCookie: string; aliceCookie: string }> {
  const leader = await loginAs(app, db, "leader");
  const member = await loginAs(app, db, "publisher");
  const alice = await loginAs(app, db, "alice");
  const sub = await app.inject({
    method: "POST",
    url: "/v1/submissions",
    headers: { cookie: member },
    payload: { skillSlug: "x", rawSkillMd: sampleSkillMd },
  });
  const id = (sub.json() as { submission: { id: string } }).submission.id;
  await app.inject({
    method: "POST",
    url: `/v1/submissions/${id}/approve`,
    headers: { cookie: leader },
    payload: {},
  });
  const push = await app.inject({
    method: "POST",
    url: "/v1/pushes",
    headers: { cookie: leader },
    payload: { skillSlug: "x", semver: 1, recipientIds: ["alice"], reason: "y" },
  });
  return {
    pushId: (push.json() as { push: { id: string } }).push.id,
    leaderCookie: leader,
    aliceCookie: alice,
  };
}

beforeEach(async () => {
  db = openDb({ path: makeTmpDb("sharon-uninstall-link-") });
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

describe("DELETE /v1/installs/:slug flips push_receipts.status when via_push_id set", () => {
  it("install-via-push → uninstall → leader's /v1/pushes/sent shows uninstalled", async () => {
    const { pushId, leaderCookie, aliceCookie } = await seedApprovedAndPush();
    // alice runs receipts/done (simulates sharon receive)
    const done = await app.inject({
      method: "POST",
      url: `/v1/pushes/${pushId}/receipts/done`,
      headers: { cookie: aliceCookie },
    });
    expect(done.statusCode).toBe(204);

    // leader's sent shows installed=1
    let sent = await app.inject({
      method: "GET",
      url: "/v1/pushes/sent",
      headers: { cookie: leaderCookie },
    });
    let counts = (sent.json() as { items: Array<{ counts: { installed: number; uninstalled: number } }> }).items[0]!.counts;
    expect(counts.installed).toBe(1);
    expect(counts.uninstalled).toBe(0);

    // alice uninstalls
    const del = await app.inject({
      method: "DELETE",
      url: "/v1/installs/x",
      headers: { cookie: aliceCookie },
    });
    expect(del.statusCode).toBe(204);

    // leader's sent shows uninstalled=1
    sent = await app.inject({
      method: "GET",
      url: "/v1/pushes/sent",
      headers: { cookie: leaderCookie },
    });
    counts = (sent.json() as { items: Array<{ counts: { installed: number; uninstalled: number } }> }).items[0]!.counts;
    expect(counts.installed).toBe(0);
    expect(counts.uninstalled).toBe(1);
  });

  it("non-push install: uninstall does NOT touch push receipts", async () => {
    // Seed an approved skill
    const leader = await loginAs(app, db, "leader");
    const member = await loginAs(app, db, "publisher");
    const sub = await app.inject({
      method: "POST",
      url: "/v1/submissions",
      headers: { cookie: member },
      payload: { skillSlug: "x", rawSkillMd: sampleSkillMd },
    });
    const id = (sub.json() as { submission: { id: string } }).submission.id;
    await app.inject({
      method: "POST",
      url: `/v1/submissions/${id}/approve`,
      headers: { cookie: leader },
      payload: {},
    });
    const alice = await loginAs(app, db, "alice");
    // Direct install (no push)
    await app.inject({
      method: "POST",
      url: "/v1/installs",
      headers: { cookie: alice },
      payload: { skillSlug: "x", semver: 1 },
    });
    // Uninstall — should succeed without touching any push receipts
    const del = await app.inject({
      method: "DELETE",
      url: "/v1/installs/x",
      headers: { cookie: alice },
    });
    expect(del.statusCode).toBe(204);
    // Leader has no pushes; /sent should be empty
    const sent = await app.inject({
      method: "GET",
      url: "/v1/pushes/sent",
      headers: { cookie: leader },
    });
    expect((sent.json() as { items: unknown[] }).items).toHaveLength(0);
  });
});
