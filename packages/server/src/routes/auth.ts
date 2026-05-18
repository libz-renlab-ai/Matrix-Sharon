import type { FastifyInstance } from "fastify";
import { randomBytes } from "node:crypto";
import {
  createSession,
  decodeState,
  encodeState,
  generateState,
  statesMatch,
} from "@matrix-sharon/core";
import { InvalidOauthCodeError } from "@matrix-sharon/ports";
import { setSessionCookie, clearSessionCookie } from "../session-cookie.js";

const STATE_COOKIE = "sharon_oauth_state";
const STATE_TTL_S = 10 * 60; // 10 minutes

const OAUTH_NOT_CONFIGURED = {
  error: "oauth_not_configured",
  hint: "Set GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET in the server env. See README §OAuth 设置.",
};

export async function registerAuthRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { returnTo?: string } }>("/login/github", async (req, reply) => {
    const { ctx } = app;
    if (!ctx.github) return reply.code(503).send(OAUTH_NOT_CONFIGURED);

    const state = generateState(
      () => randomBytes(16).toString("hex"),
      req.query.returnTo ?? "/"
    );
    const encoded = encodeState(state);
    reply.setCookie(STATE_COOKIE, encoded, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: ctx.config.publicBaseUrl.startsWith("https://"),
      signed: true,
      maxAge: STATE_TTL_S,
    });
    const redirectUri = `${ctx.config.publicBaseUrl}/auth/callback`;
    return reply.redirect(ctx.github.authorizeUrl({ state: state.nonce, redirectUri }));
  });

  app.get<{ Querystring: { code?: string; state?: string } }>("/auth/callback", async (req, reply) => {
    const { ctx } = app;
    if (!ctx.github) return reply.code(503).send(OAUTH_NOT_CONFIGURED);

    const { code, state: receivedState } = req.query;
    if (!code || !receivedState) {
      return reply.code(400).send({ error: "missing_code_or_state" });
    }

    const stateCookie = req.cookies[STATE_COOKIE];
    if (!stateCookie) return reply.code(400).send({ error: "missing_state_cookie" });
    const unsigned = req.unsignCookie(stateCookie);
    if (!unsigned.valid || unsigned.value == null) {
      return reply.code(400).send({ error: "invalid_state_cookie" });
    }
    let state;
    try {
      state = decodeState(unsigned.value);
    } catch {
      return reply.code(400).send({ error: "malformed_state_cookie" });
    }
    if (!statesMatch(state.nonce, receivedState)) {
      return reply.code(400).send({ error: "state_mismatch" });
    }

    let accessToken: string;
    try {
      const exch = await ctx.github.exchangeCode({
        code,
        redirectUri: `${ctx.config.publicBaseUrl}/auth/callback`,
      });
      accessToken = exch.accessToken;
    } catch (err) {
      if (err instanceof InvalidOauthCodeError) {
        return reply.code(502).send({ error: "invalid_code" });
      }
      req.log.error({ err }, "github exchangeCode failed");
      return reply.code(502).send({ error: "github_provider_failure" });
    }

    let profile;
    try {
      profile = await ctx.github.fetchProfile({ accessToken });
    } catch (err) {
      req.log.error({ err }, "github fetchProfile failed");
      return reply.code(502).send({ error: "github_profile_failure" });
    }

    const user = await ctx.userStore.upsertFromGithub({
      id: profile.login,
      githubId: profile.id,
      name: profile.name,
      email: profile.email,
      avatarUrl: profile.avatarUrl,
      defaultRoleIfNew: "member",
    });

    setSessionCookie(reply, createSession(user.id, Date.now()), {
      secure: ctx.config.publicBaseUrl.startsWith("https://"),
    });
    reply.clearCookie(STATE_COOKIE, { path: "/" });
    return reply.redirect(state.returnTo);
  });

  app.post("/auth/logout", async (_req, reply) => {
    clearSessionCookie(reply);
    return reply.code(204).send();
  });
}
