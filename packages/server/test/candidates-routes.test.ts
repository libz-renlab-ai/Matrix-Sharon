import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { openDb } from "@matrix-sharon/adapters/storage/sqlite";
import { runMigrations } from "@matrix-sharon/adapters/storage/sqlite/migrate";
import type { FastifyInstance } from "fastify";
import { buildApp } from "../src/index.js";
import { buildTestContext, cleanupTmpDirs, installLoginHelper, loginAs, makeTmpDb } from "./helpers.js";

let db: Database.Database;
let app: FastifyInstance;

beforeEach(async () => {
  db = openDb({ path: makeTmpDb("sharon-candidates-routes-") });
  await runMigrations(db);
  app = await buildApp(buildTestContext({ db }));
  installLoginHelper(app);
});

afterEach(async () => {
  await app.close();
  db.close();
  cleanupTmpDirs();
});

describe("POST /v1/candidates", () => {
  it("401 anon", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/v1/candidates",
      payload: { skillSlug: "x", fullContentMd: "---\nname: x\ndescription: y\n---\n", reason: "本地新写" },
    });
    expect(res.statusCode).toBe(401);
  });

  it("400 on missing required fields", async () => {
    const cookie = await loginAs(app, db, "octocat");
    const res = await app.inject({
      method: "POST",
      url: "/v1/candidates",
      headers: { cookie },
      payload: { skillSlug: "x" },
    });
    expect(res.statusCode).toBe(400);
  });

  it("201 returns the candidate, scoped to caller", async () => {
    const cookie = await loginAs(app, db, "octocat");
    const res = await app.inject({
      method: "POST",
      url: "/v1/candidates",
      headers: { cookie },
      payload: {
        skillSlug: "sql-safety-gate",
        fullContentMd: "---\nname: sql-safety-gate\ndescription: x\n---\nbody",
        reason: "本地新写",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json() as { candidate: { id: string; userId: string; skillSlug: string } };
    expect(body.candidate.userId).toBe("octocat");
    expect(body.candidate.skillSlug).toBe("sql-safety-gate");
    expect(body.candidate.id).toMatch(/^[0-9A-Z]{26}$/);
  });
});

describe("GET /v1/candidates/mine", () => {
  it("401 anon", async () => {
    const res = await app.inject({ method: "GET", url: "/v1/candidates/mine" });
    expect(res.statusCode).toBe(401);
  });

  it("empty list initially", async () => {
    const cookie = await loginAs(app, db, "octocat");
    const res = await app.inject({
      method: "GET",
      url: "/v1/candidates/mine",
      headers: { cookie },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ candidates: [] });
  });

  it("returns only this user's candidates", async () => {
    const a = await loginAs(app, db, "octocat");
    const b = await loginAs(app, db, "ghost");
    // create one for each
    await app.inject({
      method: "POST",
      url: "/v1/candidates",
      headers: { cookie: a },
      payload: {
        skillSlug: "from-octo",
        fullContentMd: "---\nname: x\ndescription: y\n---\n",
        reason: "x",
      },
    });
    await app.inject({
      method: "POST",
      url: "/v1/candidates",
      headers: { cookie: b },
      payload: {
        skillSlug: "from-ghost",
        fullContentMd: "---\nname: x\ndescription: y\n---\n",
        reason: "x",
      },
    });
    const res = await app.inject({
      method: "GET",
      url: "/v1/candidates/mine",
      headers: { cookie: a },
    });
    const body = res.json() as { candidates: Array<{ skillSlug: string }> };
    expect(body.candidates).toHaveLength(1);
    expect(body.candidates[0]!.skillSlug).toBe("from-octo");
  });
});

describe("DELETE /v1/candidates/:id", () => {
  it("401 anon", async () => {
    const res = await app.inject({ method: "DELETE", url: "/v1/candidates/x" });
    expect(res.statusCode).toBe(401);
  });

  it("404 when candidate does not exist", async () => {
    const cookie = await loginAs(app, db, "octocat");
    const res = await app.inject({
      method: "DELETE",
      url: "/v1/candidates/01JNOPENOPENOPENOPENOPENOPE",
      headers: { cookie },
    });
    expect(res.statusCode).toBe(404);
  });

  it("403 when candidate belongs to another user", async () => {
    const a = await loginAs(app, db, "octocat");
    const b = await loginAs(app, db, "ghost");
    const createRes = await app.inject({
      method: "POST",
      url: "/v1/candidates",
      headers: { cookie: a },
      payload: {
        skillSlug: "x",
        fullContentMd: "---\nname: x\ndescription: y\n---\n",
        reason: "x",
      },
    });
    const id = (createRes.json() as { candidate: { id: string } }).candidate.id;
    const res = await app.inject({
      method: "DELETE",
      url: `/v1/candidates/${id}`,
      headers: { cookie: b },
    });
    expect(res.statusCode).toBe(403);
  });

  it("204 dismisses (soft delete), then list excludes it", async () => {
    const cookie = await loginAs(app, db, "octocat");
    const createRes = await app.inject({
      method: "POST",
      url: "/v1/candidates",
      headers: { cookie },
      payload: {
        skillSlug: "x",
        fullContentMd: "---\nname: x\ndescription: y\n---\n",
        reason: "x",
      },
    });
    const id = (createRes.json() as { candidate: { id: string } }).candidate.id;
    const del = await app.inject({
      method: "DELETE",
      url: `/v1/candidates/${id}`,
      headers: { cookie },
    });
    expect(del.statusCode).toBe(204);
    const list = await app.inject({
      method: "GET",
      url: "/v1/candidates/mine",
      headers: { cookie },
    });
    expect((list.json() as { candidates: unknown[] }).candidates).toHaveLength(0);
  });
});
