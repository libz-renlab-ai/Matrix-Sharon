import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { rmSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type Database from "better-sqlite3";
import { openDb } from "@matrix-sharon/adapters/storage/sqlite";
import { runMigrations } from "@matrix-sharon/adapters/storage/sqlite/migrate";
import { GithubOAuthFake, SqliteUserStore } from "@matrix-sharon/adapters";
import type { GithubProfile } from "@matrix-sharon/types";
import { buildApp } from "../src/index.js";
import { loadConfig } from "../src/config.js";
import { SESSION_COOKIE } from "../src/session-cookie.js";

const tmpDirs: string[] = [];
function makeTmpDb() {
  const dir = mkdtempSync(join(tmpdir(), "sharon-auth-test-"));
  tmpDirs.push(dir);
  return join(dir, "test.db");
}

const octocat: GithubProfile = {
  login: "octocat",
  id: 583231,
  name: "The Octocat",
  email: "octo@github.com",
  avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
  orgs: ["github"],
};

const ghost: GithubProfile = {
  login: "ghost",
  id: 1,
  name: "Ghost",
  email: null,
  avatarUrl: null,
  orgs: [],
};

let db: Database.Database;
let fakeOauth: GithubOAuthFake;

beforeEach(async () => {
  db = openDb({ path: makeTmpDb() });
  await runMigrations(db);
  fakeOauth = new GithubOAuthFake();
});

afterEach(() => {
  db.close();
  while (tmpDirs.length) {
    const d = tmpDirs.pop();
    if (d) rmSync(d, { recursive: true, force: true });
  }
});

function buildOauthEnabledApp() {
  const config = loadConfig({
    NODE_ENV: "test",
    SHARON_SESSION_SECRET: "x".repeat(32),
    GITHUB_CLIENT_ID: "test-client",
    GITHUB_CLIENT_SECRET: "test-secret",
  });
  return buildApp({
    config,
    db,
    userStore: new SqliteUserStore(db),
    github: fakeOauth,
  });
}

function buildOauthDisabledApp() {
  const config = loadConfig({
    NODE_ENV: "test",
    SHARON_SESSION_SECRET: "x".repeat(32),
  });
  return buildApp({
    config,
    db,
    userStore: new SqliteUserStore(db),
    github: null,
  });
}

describe("GET /login/github", () => {
  it("redirects to the OAuth authorize URL and sets a state cookie", async () => {
    const app = await buildOauthEnabledApp();
    const res = await app.inject({ method: "GET", url: "/login/github" });
    expect(res.statusCode).toBe(302);
    const location = res.headers["location"] as string;
    expect(location).toContain("fake.local/oauth/authorize");
    expect(location).toContain("state=");
    const setCookie = res.headers["set-cookie"] as string;
    expect(setCookie).toContain("sharon_oauth_state=");
    await app.close();
  });

  it("respects returnTo query param", async () => {
    const app = await buildOauthEnabledApp();
    const res = await app.inject({ method: "GET", url: "/login/github?returnTo=/me/queue" });
    expect(res.statusCode).toBe(302);
    // returnTo is in the state cookie payload, not the redirect URL, so just
    // assert the redirect happened.
    expect(res.headers["location"]).toContain("fake.local");
    await app.close();
  });

  it("returns 503 with setup hint when OAuth is not configured", async () => {
    const app = await buildOauthDisabledApp();
    const res = await app.inject({ method: "GET", url: "/login/github" });
    expect(res.statusCode).toBe(503);
    const body = res.json() as { error: string; hint: string };
    expect(body.error).toBe("oauth_not_configured");
    expect(body.hint).toMatch(/GITHUB_CLIENT_ID/);
    await app.close();
  });
});

describe("GET /auth/callback — happy path", () => {
  it("first user becomes leader; sets session cookie; redirects to '/'", async () => {
    fakeOauth.register("code-1", octocat);
    const app = await buildOauthEnabledApp();

    // Step 1: hit /login/github to get the state cookie + the authorize URL
    const startRes = await app.inject({ method: "GET", url: "/login/github" });
    const stateCookie = (startRes.headers["set-cookie"] as string).split(";")[0]!;
    const authorizeUrl = startRes.headers["location"] as string;
    const state = new URL(authorizeUrl).searchParams.get("state")!;

    // Step 2: callback with that code + state
    const callbackRes = await app.inject({
      method: "GET",
      url: `/auth/callback?code=code-1&state=${state}`,
      headers: { cookie: stateCookie },
    });
    expect(callbackRes.statusCode).toBe(302);
    expect(callbackRes.headers["location"]).toBe("/");
    const setCookies = callbackRes.headers["set-cookie"];
    const cookieList = Array.isArray(setCookies) ? setCookies : [setCookies as string];
    const sessionCookie = cookieList.find((c) => c?.includes(SESSION_COOKIE));
    expect(sessionCookie).toBeDefined();

    // DB asserts: octocat exists with role=leader (first user bootstrap)
    const userStore = new SqliteUserStore(db);
    const user = await userStore.findById("octocat");
    expect(user).not.toBeNull();
    expect(user!.role).toBe("leader");
    await app.close();
  });

  it("second user defaults to member", async () => {
    fakeOauth.register("code-1", octocat);
    fakeOauth.register("code-2", ghost);
    const app = await buildOauthEnabledApp();

    async function fullFlow(code: string) {
      const start = await app.inject({ method: "GET", url: "/login/github" });
      const stateCookie = (start.headers["set-cookie"] as string).split(";")[0]!;
      const state = new URL(start.headers["location"] as string).searchParams.get("state")!;
      return app.inject({
        method: "GET",
        url: `/auth/callback?code=${code}&state=${state}`,
        headers: { cookie: stateCookie },
      });
    }

    await fullFlow("code-1");
    await fullFlow("code-2");

    const store = new SqliteUserStore(db);
    expect((await store.findById("octocat"))!.role).toBe("leader");
    expect((await store.findById("ghost"))!.role).toBe("member");
    await app.close();
  });

  it("respects returnTo from state — redirects to that path", async () => {
    fakeOauth.register("code-1", octocat);
    const app = await buildOauthEnabledApp();
    const start = await app.inject({ method: "GET", url: "/login/github?returnTo=/me/queue" });
    const stateCookie = (start.headers["set-cookie"] as string).split(";")[0]!;
    const state = new URL(start.headers["location"] as string).searchParams.get("state")!;
    const cb = await app.inject({
      method: "GET",
      url: `/auth/callback?code=code-1&state=${state}`,
      headers: { cookie: stateCookie },
    });
    expect(cb.headers["location"]).toBe("/me/queue");
    await app.close();
  });
});

describe("GET /auth/callback — error paths", () => {
  it("400 when state cookie missing", async () => {
    fakeOauth.register("code-1", octocat);
    const app = await buildOauthEnabledApp();
    const res = await app.inject({
      method: "GET",
      url: "/auth/callback?code=code-1&state=anything",
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("400 when state mismatches", async () => {
    fakeOauth.register("code-1", octocat);
    const app = await buildOauthEnabledApp();
    const start = await app.inject({ method: "GET", url: "/login/github" });
    const stateCookie = (start.headers["set-cookie"] as string).split(";")[0]!;
    const res = await app.inject({
      method: "GET",
      url: "/auth/callback?code=code-1&state=tampered",
      headers: { cookie: stateCookie },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("400 when code missing", async () => {
    const app = await buildOauthEnabledApp();
    const start = await app.inject({ method: "GET", url: "/login/github" });
    const stateCookie = (start.headers["set-cookie"] as string).split(";")[0]!;
    const state = new URL(start.headers["location"] as string).searchParams.get("state")!;
    const res = await app.inject({
      method: "GET",
      url: `/auth/callback?state=${state}`,
      headers: { cookie: stateCookie },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it("502 when OAuth provider rejects the code", async () => {
    const app = await buildOauthEnabledApp();
    const start = await app.inject({ method: "GET", url: "/login/github" });
    const stateCookie = (start.headers["set-cookie"] as string).split(";")[0]!;
    const state = new URL(start.headers["location"] as string).searchParams.get("state")!;
    const res = await app.inject({
      method: "GET",
      url: `/auth/callback?code=unknown&state=${state}`,
      headers: { cookie: stateCookie },
    });
    expect(res.statusCode).toBe(502);
    await app.close();
  });

  it("503 when OAuth not configured", async () => {
    const app = await buildOauthDisabledApp();
    const res = await app.inject({ method: "GET", url: "/auth/callback?code=x&state=y" });
    expect(res.statusCode).toBe(503);
    await app.close();
  });
});

describe("POST /auth/logout", () => {
  it("clears the session cookie and returns 204", async () => {
    const app = await buildOauthEnabledApp();
    const res = await app.inject({ method: "POST", url: "/auth/logout" });
    expect(res.statusCode).toBe(204);
    const setCookie = res.headers["set-cookie"] as string;
    expect(setCookie).toContain(SESSION_COOKIE);
    expect(setCookie.toLowerCase()).toMatch(/expires=|max-age=0/);
    await app.close();
  });
});
