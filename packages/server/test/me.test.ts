import { describe, it, expect, beforeEach, afterEach } from "vitest";
import type Database from "better-sqlite3";
import { openDb } from "@matrix-sharon/adapters/storage/sqlite";
import { runMigrations } from "@matrix-sharon/adapters/storage/sqlite/migrate";
import { GithubOAuthFake } from "@matrix-sharon/adapters";
import { createSession } from "@matrix-sharon/core";
import type { GithubProfile } from "@matrix-sharon/types";
import { buildApp } from "../src/index.js";
import { SESSION_COOKIE, setSessionCookie } from "../src/session-cookie.js";
import { buildTestContext, cleanupTmpDirs, makeTmpDb } from "./helpers.js";

const octocat: GithubProfile = {
  login: "octocat",
  id: 583231,
  name: "The Octocat",
  email: "octo@github.com",
  avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
  orgs: ["github"],
};

let db: Database.Database;

beforeEach(async () => {
  db = openDb({ path: makeTmpDb("sharon-me-") });
  await runMigrations(db);
});

afterEach(() => {
  db.close();
  cleanupTmpDirs();
});

function buildTestApp() {
  const fake = new GithubOAuthFake();
  fake.register("code-1", octocat);
  return {
    app: buildApp(buildTestContext({ db, oauthEnabled: true, github: fake })),
    fake,
  };
}

describe("GET /v1/me", () => {
  it("401 when no session cookie", async () => {
    const { app } = buildTestApp();
    const a = await app;
    const res = await a.inject({ method: "GET", url: "/v1/me" });
    expect(res.statusCode).toBe(401);
    expect(res.json()).toEqual({ error: "not_signed_in" });
    await a.close();
  });

  it("401 when cookie present but tampered/unsigned-by-other-secret", async () => {
    const { app } = buildTestApp();
    const a = await app;
    const res = await a.inject({
      method: "GET",
      url: "/v1/me",
      headers: { cookie: `${SESSION_COOKIE}=garbage` },
    });
    expect(res.statusCode).toBe(401);
    await a.close();
  });

  it("200 with user after full OAuth round-trip", async () => {
    const { app } = buildTestApp();
    const a = await app;

    const start = await a.inject({ method: "GET", url: "/login/github" });
    const stateCookie = (start.headers["set-cookie"] as string).split(";")[0]!;
    const state = new URL(start.headers["location"] as string).searchParams.get("state")!;
    const cb = await a.inject({
      method: "GET",
      url: `/auth/callback?code=code-1&state=${state}`,
      headers: { cookie: stateCookie },
    });
    const cookies = cb.headers["set-cookie"];
    const cookieList = Array.isArray(cookies) ? cookies : [cookies as string];
    const sessionCookie = cookieList
      .find((c) => c?.includes(SESSION_COOKIE))!
      .split(";")[0]!;

    const meRes = await a.inject({
      method: "GET",
      url: "/v1/me",
      headers: { cookie: sessionCookie },
    });
    expect(meRes.statusCode).toBe(200);
    const body = meRes.json() as { user: { id: string; name: string; role: string } };
    expect(body.user.id).toBe("octocat");
    expect(body.user.role).toBe("leader");
    expect(body.user.name).toBe("The Octocat");
    await a.close();
  });

  it("401 when session uid does not match any user in DB", async () => {
    const { app } = buildTestApp();
    const a = await app;
    // Manually set a session cookie pointing at a nonexistent user.
    a.get("/set-ghost-session", async (_req, reply) => {
      setSessionCookie(reply, createSession("ghost-not-in-db", Date.now()), { secure: false });
      return {};
    });
    const set = await a.inject({ method: "GET", url: "/set-ghost-session" });
    const cookie = (set.headers["set-cookie"] as string).split(";")[0]!;
    const res = await a.inject({
      method: "GET",
      url: "/v1/me",
      headers: { cookie },
    });
    expect(res.statusCode).toBe(401);
    await a.close();
  });
});
