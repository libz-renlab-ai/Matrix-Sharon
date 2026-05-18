# Matrix-Sharon Phase 2: GitHub OAuth + Session

> **Status:** Plan locked, ready for execution.
> **Predecessor:** [Phase 1 scaffold](./2026-05-15-matrix-sharon-phase-1-scaffold.md) — landed `937d495..eaa095d`.
> **Spec reference:** [Matrix-Sharon v1 design](../specs/2026-05-15-matrix-sharon-design.md) §3 roles, §6.1 OAuth flow, §7 API surface.

**Goal:** End-to-end GitHub OAuth login → signed session cookie → authenticated `GET /v1/me`. Web shows a real sign-in button that round-trips through the server. CI stays green without any GitHub credentials — fake OAuth provider drives tests; real provider requires user-supplied env vars to actually sign in.

**Out of scope (deferred to later phases):**
- GitHub org/team gating (`team_config.allowed_github_orgs/teams` stays empty, every authenticated user is accepted) — added in Phase 4 alongside leader-driven team config UI.
- Role-change endpoint (`POST /v1/users/:id/role`) — Phase 4 (needs leader queue UI to be useful).
- Web visual polish — Phase 3 brings the real browse layout; here it's a strip + status text.
- Token refresh — GitHub OAuth tokens are long-lived; we only use it once at login to fetch user.

---

## Architectural decisions (locked here, don't re-litigate)

| # | Decision | Why |
|---|---------|-----|
| 1 | Session = signed cookie, not server-side store | Stateless; matches spec; one less table; logout = clear cookie |
| 2 | Cookie name `sharon_session`, signed via `@fastify/cookie`, `httpOnly`, `sameSite=lax`, `secure` only in production, 30-day `Max-Age` | Spec §6.1 says 30-day TTL; `lax` works for OAuth callback redirect |
| 3 | `GithubOAuth` port + two adapters (`GithubOAuthHttp` real, `GithubOAuthFake` test) | Tests must run in CI with zero secrets; matches Phase 1 port pattern |
| 4 | First user (empty `users` table at the moment they log in) auto-promotes to `leader`. Every subsequent user defaults to `member`. | Spec §3 says "全能 leader" model; bootstrap a single-leader team without a manual SQL step |
| 5 | OAuth state token = random 32-byte hex stored in a short-lived cookie (`sharon_oauth_state`, 10-min TTL, `httpOnly`); validated on callback | Stateless CSRF protection without a new table |
| 6 | Config validation at boot via `zod`. If `GITHUB_CLIENT_ID`/`GITHUB_CLIENT_SECRET`/`SHARON_SESSION_SECRET` missing: warn (don't crash), `/login/github` returns 503 with setup instructions, other routes unaffected | Lets devs run server for local DB inspection without credentials |
| 7 | No `dist` build step — server still runs via `tsx watch`. Migrate.ts `__dirname` workaround stays as Phase 1 carry-forward debt | Phase 1 memory called this out; addressing it is its own phase |
| 8 | Web sign-in: server-rendered `<a href="/login/github">` link plus `GET /v1/me` fetch on page load to display current user. No client framework, no React, no islands. | Astro static + form-only HTML is fine; phase 3+ adds richer UI |

---

## File structure additions

```
packages/
├─ types/src/
│   └─ auth.ts                          [NEW] SessionPayload, OauthState, GithubProfile (zod schemas)
│
├─ ports/src/
│   └─ github-oauth.ts                  [NEW] GithubOAuth interface
│
├─ core/src/
│   ├─ index.ts                         [MODIFY] export new modules
│   ├─ oauth-state.ts                   [NEW] generateState(), validateState() pure helpers
│   └─ session.ts                       [NEW] encodeSession(), decodeSession(), pure
│   └─ ../test/
│       ├─ oauth-state.test.ts          [NEW]
│       └─ session.test.ts              [NEW]
│
├─ adapters/src/
│   ├─ auth/
│   │   └─ github/
│   │       ├─ oauth-http.ts            [NEW] real adapter — fetches GitHub
│   │       ├─ oauth-fake.ts            [NEW] in-memory test adapter
│   │       └─ index.ts                 [NEW] re-exports
│   ├─ storage/sqlite/
│   │   └─ user-store.ts                [NEW] SqliteUserStore (impl of UserStore port)
│   └─ index.ts                         [MODIFY] export new pieces
│   └─ test/
│       ├─ auth/github/oauth-http.test.ts   [NEW] (skipped unless GITHUB_TEST_TOKEN set)
│       ├─ auth/github/oauth-fake.test.ts   [NEW]
│       └─ storage/sqlite/user-store.test.ts [NEW]
│
├─ server/src/
│   ├─ index.ts                         [MODIFY] wires everything, no business logic
│   ├─ config.ts                        [NEW] zod-validated env loader
│   ├─ context.ts                       [NEW] AppContext type (db, ports, config) — DI bag
│   ├─ session-cookie.ts                [NEW] reads/writes signed cookie
│   ├─ routes/
│   │   ├─ auth.ts                      [NEW] /login/github, /auth/callback, /auth/logout
│   │   └─ me.ts                        [NEW] /v1/me
│   │   └─ health.ts                    [NEW] moves /health here
│   └─ test/
│       ├─ auth-flow.test.ts            [NEW] full OAuth round-trip with fake provider
│       └─ me.test.ts                   [NEW] /v1/me with & without cookie
│   └─ package.json                     [MODIFY] add @fastify/cookie, zod, vitest, supertest-like
│
└─ web/src/
    ├─ components/
    │   └─ Header.astro                 [NEW] sign-in button OR avatar+logout
    └─ pages/
        └─ index.astro                  [MODIFY] include Header
```

**Total new files:** ~18. **Modified:** 5.

---

## Tech additions

| Package | New dep | Why |
|---------|---------|-----|
| `@matrix-sharon/server` | `@fastify/cookie` ^11 | Signed session cookie |
| `@matrix-sharon/server` | `zod` ^3 | Env validation (already a transitive dep via types; making explicit) |
| `@matrix-sharon/server` | `vitest` ^2.1.5 (dev) | Server tests |
| `@matrix-sharon/adapters` | `undici` ^6 | HTTP for GitHub API in oauth-http.ts (Node 22 has fetch built-in, but undici gives a typed fetch + better timeouts) — *deferred decision: use built-in `fetch` first, only add undici if we hit a need.* Initial impl uses built-in `fetch`. |

**No new runtime deps in `core`, `ports`, `types`** — they stay zero-dep.

---

## Task list (TDD, one commit per task)

> Conventions:
> - Every task has tests written **first**, then implementation, then green test.
> - Commits message format: `feat|test|chore|docs(scope): subject`.
> - Push at the end of each task only if local CI (`pnpm typecheck && pnpm test`) is green.
> - On failure: fix, amend with new commit (never amend pushed commits), re-push.

### Task 1: Auth types + zod schemas

**Files:**
- `packages/types/src/auth.ts` [NEW]
- `packages/types/src/index.ts` [MODIFY]
- `packages/types/test/auth.test.ts` [NEW]

**Deliverable:** Zod schemas for:
- `GithubProfile` — `{ login, id, name, email|null, avatarUrl|null, orgs: string[] }` (orgs included for future Phase 4 gating; unused in Phase 2)
- `SessionPayload` — `{ uid: string, iat: number, exp: number }` (user id = GitHub login)
- `OauthState` — `{ nonce: string, returnTo: string }` (returnTo = path to redirect after login, default `/`)

Tests assert: each schema parses a happy-path object; rejects malformed input; `OauthState.returnTo` defaults when missing.

Commit: `feat(types): auth schemas — SessionPayload, OauthState, GithubProfile`

---

### Task 2: GithubOAuth port

**Files:**
- `packages/ports/src/github-oauth.ts` [NEW]
- `packages/ports/src/index.ts` [MODIFY]

```ts
export interface GithubOAuth {
  /** Build the URL to redirect the user to for consent. */
  authorizeUrl(input: { state: string; redirectUri: string }): string;
  /** Exchange OAuth code for an access token. */
  exchangeCode(input: { code: string; redirectUri: string }): Promise<{ accessToken: string }>;
  /** Fetch the user profile (name, email, orgs) for an access token. */
  fetchProfile(input: { accessToken: string }): Promise<GithubProfile>;
}
```

No tests — interface only. Adapters cover behavior.

Commit: `feat(ports): GithubOAuth interface`

---

### Task 3: GithubOAuthFake adapter

**Files:**
- `packages/adapters/src/auth/github/oauth-fake.ts` [NEW]
- `packages/adapters/src/auth/github/index.ts` [NEW] (re-exports)
- `packages/adapters/src/index.ts` [MODIFY]
- `packages/adapters/test/auth/github/oauth-fake.test.ts` [NEW]

**Behavior:**
- `GithubOAuthFake` constructor takes a `Map<code, GithubProfile>` (preloaded test fixtures)
- `authorizeUrl` returns `http://fake.local/oauth/authorize?state=...&redirect_uri=...`
- `exchangeCode({ code })` returns `{ accessToken: \`fake-token-for-\${code}\` }` if the code is in the map, else throws `InvalidCodeError`
- `fetchProfile({ accessToken })` extracts the code from the token, looks up the profile, returns it; throws if token unknown

Tests:
- Round-trip: register fixture → call exchange → call fetchProfile → assert profile equality
- Invalid code throws `InvalidCodeError`
- Invalid token throws

Commit: `feat(adapters/auth/github): in-memory fake for tests`

---

### Task 4: GithubOAuthHttp adapter (real)

**Files:**
- `packages/adapters/src/auth/github/oauth-http.ts` [NEW]
- `packages/adapters/src/auth/github/index.ts` [MODIFY]
- `packages/adapters/test/auth/github/oauth-http.test.ts` [NEW] — guarded by `process.env.GITHUB_TEST_TOKEN`; otherwise `test.skip`

**Behavior:**
- `new GithubOAuthHttp({ clientId, clientSecret })`
- `authorizeUrl({ state, redirectUri })` → `https://github.com/login/oauth/authorize?client_id=...&state=...&redirect_uri=...&scope=read:user user:email read:org`
- `exchangeCode({ code, redirectUri })` → POST `https://github.com/login/oauth/access_token`, accepts JSON, returns `{ accessToken: data.access_token }`. Throws on non-200 or `error` in body.
- `fetchProfile({ accessToken })` → parallel GET `https://api.github.com/user` + `https://api.github.com/user/orgs`. Merges into `GithubProfile`. Email may be null if user hides it (don't error).

Tests (skipped unless `GITHUB_TEST_TOKEN` set):
- Smoke: call `fetchProfile` with a real token, assert shape.

Implementation tests (always run):
- `authorizeUrl` produces correct URL given inputs (regex match).

Commit: `feat(adapters/auth/github): HTTP adapter calling real GitHub API`

---

### Task 5: SqliteUserStore adapter

**Files:**
- `packages/adapters/src/storage/sqlite/user-store.ts` [NEW]
- `packages/adapters/src/index.ts` [MODIFY] (export `SqliteUserStore`)
- `packages/adapters/test/storage/sqlite/user-store.test.ts` [NEW]

**Behavior:** Implements every method on `UserStore` port (Phase 1 already defined the interface):
- `upsertFromGithub({id, githubId, name, email, avatarUrl, defaultRoleIfNew})`:
  - SELECT existing by `id`. If exists: UPDATE name/email/avatar/last_seen, **preserve role**, return.
  - Else: INSERT. Role = `defaultRoleIfNew`, **unless `(SELECT COUNT(*) FROM users) === 0`**, in which case role = `'leader'` (auto-bootstrap rule).
  - `created_at` set to now on insert; `last_seen_at` set on both paths.
  - Wrap in transaction so first-user check + insert are atomic.
- `findById`, `findByGithubId`, `list`, `setRole`, `touchLastSeen` — straightforward.

Tests (using in-memory DB via `openDb({path: ':memory:'})` after running migrations):
1. First user inserted gets `role='leader'` even if `defaultRoleIfNew='member'`
2. Second user with `defaultRoleIfNew='member'` gets `member`
3. Upsert preserves existing role when user re-logs in (was leader → still leader even with `defaultRoleIfNew='member'`)
4. `findById` returns null for unknown
5. `findByGithubId` returns null for unknown
6. `list` returns all rows
7. `setRole` updates and persists
8. `touchLastSeen` updates timestamp only

Commit: `feat(adapters/storage/sqlite): SqliteUserStore with first-user-is-leader bootstrap`

---

### Task 6: core/oauth-state — pure helpers

**Files:**
- `packages/core/src/oauth-state.ts` [NEW]
- `packages/core/src/index.ts` [MODIFY]
- `packages/core/test/oauth-state.test.ts` [NEW]

**Behavior:**
```ts
export function generateState(rand: () => string, returnTo = "/"): OauthState
export function encodeState(s: OauthState): string         // JSON + base64url
export function decodeState(encoded: string): OauthState  // parse + zod validate
export function statesMatch(received: string, expected: string): boolean  // constant-time compare
```

Tests:
- Generate → encode → decode round-trip equals original
- Decode rejects invalid base64
- Decode rejects mismatched shape via zod
- `statesMatch` true on equal, false on different, constant-time (best-effort: at least same length comparison)

Commit: `feat(core): OAuth state token helpers`

---

### Task 7: core/session — pure encode/decode

**Files:**
- `packages/core/src/session.ts` [NEW]
- `packages/core/src/index.ts` [MODIFY]
- `packages/core/test/session.test.ts` [NEW]

**Behavior:**
```ts
export function createSession(uid: string, nowMs: number, ttlMs = 30 * 24 * 60 * 60 * 1000): SessionPayload
export function encodeSession(payload: SessionPayload): string   // JSON + base64url
export function decodeSession(encoded: string): SessionPayload   // parse + zod
export function isExpired(payload: SessionPayload, nowMs: number): boolean
```

Note: Signing is **NOT** done here (that's `@fastify/cookie`'s job). Core only encodes/decodes the payload. The server wraps it in a signed cookie.

Tests:
- Encode → decode round-trip
- `isExpired` true when now > exp
- `isExpired` false when now <= exp
- Decode rejects malformed

Commit: `feat(core): session payload encode/decode + expiry check`

---

### Task 8: Server config loader

**Files:**
- `packages/server/src/config.ts` [NEW]
- `packages/server/test/config.test.ts` [NEW]
- `packages/server/package.json` [MODIFY] (add `@fastify/cookie`, `zod`, `vitest`)
- `packages/server/tsconfig.json` [MODIFY] (already strict; ensure `test/` is excluded from build, included in tsc-noEmit typecheck)

**Behavior:**
```ts
export interface AppConfig {
  port: number;
  host: string;
  cookieSecret: string;        // signs sharon_session
  oauthEnabled: boolean;
  github?: {
    clientId: string;
    clientSecret: string;
  };
  publicBaseUrl: string;       // for OAuth redirect_uri assembly
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig
```

Rules:
- `PORT` defaults to 4321, `HOST` to `127.0.0.1`
- `SHARON_PUBLIC_BASE_URL` defaults to `http://${host}:${port}`
- `SHARON_SESSION_SECRET` is required if `NODE_ENV=production`; in dev, falls back to a deterministic insecure default with a warning logged
- `GITHUB_CLIENT_ID` + `GITHUB_CLIENT_SECRET` are both-or-neither. If both present → `oauthEnabled=true`. If neither → `oauthEnabled=false`. If exactly one → throw a clear config error.

Tests:
- Happy path with all envs set
- Missing GitHub envs → `oauthEnabled=false`
- Partial GitHub envs → throws
- Default port/host when missing

Commit: `feat(server): zod-validated config loader (PORT, OAuth, cookie secret)`

---

### Task 9: Session cookie helper

**Files:**
- `packages/server/src/session-cookie.ts` [NEW]
- `packages/server/test/session-cookie.test.ts` [NEW]

**Behavior:** Thin wrapper around fastify reply/request:
```ts
export const SESSION_COOKIE = "sharon_session";
export function setSessionCookie(reply: FastifyReply, payload: SessionPayload, opts: { secure: boolean }): void
export function clearSessionCookie(reply: FastifyReply): void
export function readSessionCookie(req: FastifyRequest): SessionPayload | null
```

`readSessionCookie`:
1. Get `request.cookies[SESSION_COOKIE]`
2. Use `request.unsignCookie()` (provided by @fastify/cookie when secret configured)
3. If invalid/missing/expired → return `null`
4. Else `decodeSession`, check `isExpired`, return payload or null

Tests: use Fastify's `inject` to drive request/response, assert cookie set/read/clear round-trip with signing.

Commit: `feat(server): signed session-cookie helpers`

---

### Task 10: Health route (move) + AppContext DI bag

**Files:**
- `packages/server/src/context.ts` [NEW]
- `packages/server/src/routes/health.ts` [NEW]
- `packages/server/src/index.ts` [MODIFY]

**Why this task:** Refactor before adding new routes. Build a small `buildApp(ctx)` factory that takes `AppContext` and returns a Fastify instance — enables every test to construct an isolated app with fake adapters. `/health` moves into a route module to prove the pattern.

```ts
// context.ts
export interface AppContext {
  config: AppConfig;
  db: Database.Database;
  userStore: UserStore;
  github: GithubOAuth | null;  // null when oauthEnabled=false
}

// index.ts
export function buildApp(ctx: AppContext): FastifyInstance { ... }
async function main() {
  const config = loadConfig();
  const db = openDb();
  await runMigrations(db);
  const ctx: AppContext = {
    config,
    db,
    userStore: new SqliteUserStore(db),
    github: config.github
      ? new GithubOAuthHttp(config.github)
      : null,
  };
  const app = buildApp(ctx);
  await app.listen({ port: config.port, host: config.host });
}
```

Tests:
- `buildApp(ctx).inject({method: 'GET', url: '/health'})` returns 200 `{ok:true, ts:number}`

Commit: `refactor(server): buildApp factory + AppContext; /health into route module`

---

### Task 11: Auth routes — /login/github, /auth/callback, /auth/logout

**Files:**
- `packages/server/src/routes/auth.ts` [NEW]
- `packages/server/src/index.ts` [MODIFY] (register route)
- `packages/server/test/auth-flow.test.ts` [NEW]

**Routes:**

`GET /login/github?returnTo=/some/path`
- If `ctx.github == null`: 503 with `{ error: "oauth_not_configured", hint: "Set GITHUB_CLIENT_ID + GITHUB_CLIENT_SECRET, see README" }`
- Else: generate state, set short-lived cookie (`sharon_oauth_state`, signed, 10 min), 302 to `github.authorizeUrl(...)`

`GET /auth/callback?code=...&state=...`
- If `ctx.github == null`: 503
- Read `sharon_oauth_state` cookie, decode + statesMatch with query.state. Mismatch → 400 "invalid_state"
- `github.exchangeCode({code, redirectUri})` → access token
- `github.fetchProfile({accessToken})` → profile
- `userStore.upsertFromGithub({...profile, defaultRoleIfNew: 'member'})` → user
- `userStore.touchLastSeen(user.id, now)`
- `setSessionCookie(reply, createSession(user.id, now))`
- `clearSessionCookie` for state cookie
- 302 redirect to `state.returnTo` (default `/`)

`POST /auth/logout`
- `clearSessionCookie(reply)` → 204

**Tests** (full integration with `GithubOAuthFake` + in-memory DB):
1. `GET /login/github` returns 302 to fake authorize URL, sets state cookie
2. `GET /auth/callback?code=valid&state=match` → 302 to `/`, sets session cookie, user exists in DB
3. `GET /auth/callback?code=valid&state=tampered` → 400
4. `GET /auth/callback` without code → 400
5. `GET /auth/callback?code=unknown` → 502 (oauth provider failure surfaced)
6. First user → role='leader'; second user → role='member' (asserts §3 bootstrap)
7. `POST /auth/logout` clears cookie
8. When `oauthEnabled=false`: `/login/github` returns 503 with setup hint

Commit: `feat(server): OAuth routes — /login/github, /auth/callback, /auth/logout`

---

### Task 12: /v1/me route

**Files:**
- `packages/server/src/routes/me.ts` [NEW]
- `packages/server/src/index.ts` [MODIFY]
- `packages/server/test/me.test.ts` [NEW]

`GET /v1/me`
- Read session cookie. If invalid/missing/expired → 401 `{ error: "not_signed_in" }`
- `userStore.findById(payload.uid)` → if null (user deleted) → 401
- Return `{ user: {id, githubId, name, email, avatarUrl, role} }` (don't expose timestamps)

Tests:
- 401 with no cookie
- 401 with tampered cookie
- 401 with expired payload
- 200 + correct user after auth flow (chain into existing fake-OAuth test setup)

Commit: `feat(server): GET /v1/me — current user from session cookie`

---

### Task 13: Web Header + sign-in/me display

**Files:**
- `packages/web/src/components/Header.astro` [NEW]
- `packages/web/src/pages/index.astro` [MODIFY]

**Behavior:**
- Header renders a placeholder strip with project name + a `<div id="auth-slot">…</div>`
- Inline `<script>` does `fetch('/v1/me')`:
  - 401 → render `<a href="/login/github">Sign in with GitHub</a>`
  - 200 → render `<img src=avatar /> <span>{name}</span> <form method="POST" action="/auth/logout"><button>Sign out</button></form>`
- `pages/index.astro` now imports Header and replaces the hello strip

**No tests** in Phase 2 — Astro page tests are Phase 3+ Playwright work. Astro check (typecheck) covers compile.

Commit: `feat(web): header with GitHub sign-in / current user / sign-out`

---

### Task 14: README + memory + plan checkmark

**Files:**
- `README.md` [MODIFY] — flip Phase 2 ⏳ → ✅; add a small "OAuth setup" section with step-by-step
- `docs/superpowers/plans/2026-05-15-matrix-sharon-phase-2-auth.md` [MODIFY] — mark all task checkboxes complete (this file)
- `~/.claude/projects/.../memory/phase-2-done.md` [NEW] — memory snapshot
- `~/.claude/projects/.../memory/MEMORY.md` [MODIFY] — add the new memory pointer

README "OAuth setup" section (terse):
```markdown
## OAuth 设置（运行真登录需要）

1. github.com/settings/developers → New OAuth App
2. Homepage: `http://127.0.0.1:4321`，Callback: `http://127.0.0.1:4321/auth/callback`
3. 拿 client_id + client_secret，写入 `packages/server/.env`：
   ```
   GITHUB_CLIENT_ID=...
   GITHUB_CLIENT_SECRET=...
   SHARON_SESSION_SECRET=<32+ 字节随机串>
   ```
4. `pnpm --filter @matrix-sharon/server dev` 启动 server，访问 web 即可登录。
```

Memory body covers: what shipped, carry-forward, next phase entry point.

Commit: `docs: mark Phase 2 done + OAuth setup instructions`

---

## Verification gates (every task must pass before commit)

```bash
pnpm -r typecheck    # all packages green
pnpm -r test         # all tests pass
```

End-of-phase verification:
1. Without env vars: `pnpm --filter @matrix-sharon/server dev` boots, `/health` returns 200, `/login/github` returns 503 with hint.
2. With env vars + real OAuth app: full login round-trip works in browser, `/v1/me` returns user.
3. CI on push to main: green run on the head commit.

---

## Carry-forward into Phase 3 (don't fix now)

- `migrate.ts` still uses `__dirname` (won't survive `tsc → dist/`) — we stay in `tsx`, so unaffected
- `ports/BundleStore` still uses `Buffer` (no impact until Phase 4 bundle creation)
- CLI `bin` still points to `.ts` — not exercised
- Web header is plain JS in `<script>`, no auth-state hydration during SSR — accept this trade in Phase 2; Phase 3 may move to server-rendered with cookie inspection
- No CSRF beyond OAuth state for `POST /auth/logout` — logout is the only state-changing route in this phase; risk surface trivial. Phase 4 adds proper CSRF when leader actions land.

---

## Done definition

- [x] All 14 tasks committed
- [x] CI green on push
- [x] `pnpm -r typecheck && pnpm -r test` green locally (88 tests + 1 skipped)
- [x] README ⏳ → ✅ for Phase 2
- [x] Memory snapshot saved (`memory/phase-2-auth-done.md`)
- [x] Phase 3 plan can start without unknowns about auth/session
