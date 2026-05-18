import { describe, it, expect } from "vitest";
import Fastify, { type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import { createSession } from "@matrix-sharon/core";
import {
  SESSION_COOKIE,
  setSessionCookie,
  clearSessionCookie,
  readSessionCookie,
} from "../src/session-cookie.js";

async function buildTestApp(secret = "test-secret-at-least-16-chars-long"): Promise<FastifyInstance> {
  const app = Fastify();
  await app.register(fastifyCookie, { secret });
  return app;
}

describe("session-cookie helpers", () => {
  it("set → read round-trip via signed cookie", async () => {
    const app = await buildTestApp();
    const payload = createSession("octocat", Date.now());

    app.get("/set", async (_req, reply) => {
      setSessionCookie(reply, payload, { secure: false });
      return { ok: true };
    });
    app.get("/who", async (req) => {
      return { session: readSessionCookie(req) };
    });

    const setRes = await app.inject({ method: "GET", url: "/set" });
    expect(setRes.statusCode).toBe(200);
    const setCookie = setRes.headers["set-cookie"];
    expect(setCookie).toBeDefined();
    const cookieHeader = Array.isArray(setCookie) ? setCookie[0]! : (setCookie as string);
    expect(cookieHeader).toContain(`${SESSION_COOKIE}=`);
    expect(cookieHeader).toContain("HttpOnly");
    expect(cookieHeader).toContain("SameSite=Lax");

    // Replay the cookie back to /who
    const whoRes = await app.inject({
      method: "GET",
      url: "/who",
      headers: { cookie: cookieHeader.split(";")[0]! },
    });
    expect(whoRes.statusCode).toBe(200);
    const body = whoRes.json() as { session: { uid: string; iat: number; exp: number } | null };
    expect(body.session?.uid).toBe("octocat");
    expect(body.session?.exp).toBe(payload.exp);

    await app.close();
  });

  it("readSessionCookie returns null when cookie is missing", async () => {
    const app = await buildTestApp();
    app.get("/who", async (req) => ({ session: readSessionCookie(req) }));
    const res = await app.inject({ method: "GET", url: "/who" });
    expect(res.json()).toEqual({ session: null });
    await app.close();
  });

  it("readSessionCookie returns null on tampered signature", async () => {
    const app = await buildTestApp("secret-A-at-least-16-chars-long");
    app.get("/who", async (req) => ({ session: readSessionCookie(req) }));

    // Build a cookie signed with a different secret.
    const otherApp = Fastify();
    await otherApp.register(fastifyCookie, { secret: "secret-B-at-least-16-chars-long" });
    otherApp.get("/forge", async (_req, reply) => {
      setSessionCookie(reply, createSession("attacker", Date.now()), { secure: false });
      return {};
    });
    const forge = await otherApp.inject({ method: "GET", url: "/forge" });
    const cookieHeader = (forge.headers["set-cookie"] as string).split(";")[0]!;
    await otherApp.close();

    const res = await app.inject({
      method: "GET",
      url: "/who",
      headers: { cookie: cookieHeader },
    });
    expect(res.json()).toEqual({ session: null });
    await app.close();
  });

  it("readSessionCookie returns null when payload expired", async () => {
    const app = await buildTestApp();
    app.get("/set-expired", async (_req, reply) => {
      const past = Date.now() - 1000 * 60 * 60 * 24 * 365; // 1 year ago
      setSessionCookie(reply, createSession("octocat", past, 1000), { secure: false });
      return {};
    });
    app.get("/who", async (req) => ({ session: readSessionCookie(req) }));

    const set = await app.inject({ method: "GET", url: "/set-expired" });
    const cookieHeader = (set.headers["set-cookie"] as string).split(";")[0]!;
    const res = await app.inject({
      method: "GET",
      url: "/who",
      headers: { cookie: cookieHeader },
    });
    expect(res.json()).toEqual({ session: null });
    await app.close();
  });

  it("clearSessionCookie emits an expired Set-Cookie", async () => {
    const app = await buildTestApp();
    app.get("/logout", async (_req, reply) => {
      clearSessionCookie(reply);
      return { ok: true };
    });
    const res = await app.inject({ method: "GET", url: "/logout" });
    const cookieHeader = res.headers["set-cookie"] as string;
    expect(cookieHeader).toContain(`${SESSION_COOKIE}=`);
    expect(cookieHeader.toLowerCase()).toMatch(/expires=|max-age=0/);
    await app.close();
  });
});
