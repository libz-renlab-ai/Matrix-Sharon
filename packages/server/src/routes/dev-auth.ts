import type { FastifyInstance } from "fastify";
import { createHash } from "node:crypto";
import { createSession, sanitizeReturnTo } from "@matrix-sharon/core";
import { setSessionCookie } from "../session-cookie.js";

// Dev-only zero-config login. Bypasses GitHub OAuth so local trials don't
// require registering an OAuth App. Mounted only when SHARON_DEV_AUTH=true
// and NODE_ENV is not "production".
//
// Usage:
//   GET /dev-login              → logs in as "demo"
//   GET /dev-login?as=alice     → logs in as alice (creates her if missing)
//   GET /dev-login?as=alice&returnTo=/leader/queue
//
// First user to hit it becomes leader automatically (same path as real OAuth).
export async function registerDevAuthRoutes(app: FastifyInstance): Promise<void> {
  app.get<{ Querystring: { as?: string; returnTo?: string } }>(
    "/dev-login",
    async (req, reply) => {
      const username = (req.query.as ?? "demo").trim();
      if (!/^[a-zA-Z0-9_-]{1,39}$/.test(username)) {
        return reply.code(400).send({
          error: "invalid_username",
          hint: "Use 1-39 chars, only letters/digits/_/- (GitHub-style).",
        });
      }
      const returnTo = sanitizeReturnTo(req.query.returnTo);

      // Deterministic fake github_id from the username so re-logging in as the
      // same name reuses the same user row.
      const hash = createHash("sha256").update(username).digest();
      const fakeGithubId = hash.readUInt32BE(0); // 32-bit positive int, well under int64 range

      const user = await app.ctx.userStore.upsertFromGithub({
        id: username,
        githubId: fakeGithubId,
        name: username,
        email: null,
        avatarUrl: `https://github.com/${username}.png`,
        defaultRoleIfNew: "member",
      });

      setSessionCookie(reply, createSession(user.id, Date.now()), {
        secure: app.ctx.config.publicBaseUrl.startsWith("https://"),
      });
      return reply.redirect(returnTo);
    }
  );

  // Tiny landing page that just shows a text box. Useful when you've never
  // hit /dev-login before and don't know the URL syntax.
  app.get("/dev-login/", async (_req, reply) => {
    reply.type("text/html; charset=utf-8");
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head><meta charset="utf-8"><title>dev login</title>
<style>
  body { font-family: -apple-system, "PingFang SC", sans-serif; background: #f7f8fb; color: #1d2433;
         display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
  .card { background: #fff; border: 1px solid #e6e8ee; border-radius: 12px; padding: 32px;
          max-width: 420px; box-shadow: 0 4px 16px rgba(0,0,0,0.04); }
  h1 { margin: 0 0 8px; font-size: 20px; }
  p { color: #5c6678; margin: 0 0 20px; line-height: 1.6; font-size: 14px; }
  form { display: flex; gap: 8px; }
  input { flex: 1; padding: 10px 12px; border: 1px solid #d6d9e0; border-radius: 6px; font-size: 14px; }
  button { padding: 10px 18px; background: #5b5bd6; color: #fff; border: 0; border-radius: 6px;
           font-weight: 500; cursor: pointer; }
  button:hover { background: #4747b3; }
  small { color: #8a93a4; display: block; margin-top: 16px; font-size: 12px; }
</style>
</head>
<body>
  <div class="card">
    <h1>Dev login（仅本地试用）</h1>
    <p>输入任意 GitHub username 即可登录。<strong>第一个登录的人自动成为 leader。</strong></p>
    <form action="/dev-login" method="get">
      <input name="as" placeholder="例如 alice" value="demo" autofocus>
      <button type="submit">登录</button>
    </form>
    <small>⚠️ 此页面仅在 <code>SHARON_DEV_AUTH=true</code> 时启用。生产部署请用 GitHub OAuth。</small>
  </div>
</body>
</html>`;
  });
}
