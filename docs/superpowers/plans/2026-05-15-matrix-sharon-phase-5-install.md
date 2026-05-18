# Matrix-Sharon Phase 5: Install / Uninstall (CLI + Web)

> **Status:** Plan locked, ready for execution.
> **Predecessor:** [Phase 4 submit/approve](./2026-05-15-matrix-sharon-phase-4-submit-approve.md) — landed `2875bf7..c2c0021`.

**Goal:** Members can install an approved skill into `~/.claude/skills/<slug>/` via either:
1. CLI: `sharon install <slug>[@<semver>]` — direct flow (no web), useful for scripts/agents
2. Web: a button on `/skills?slug=…` that triggers an install-intent. Returns either a `sharon://install?token=…` deep link (for users who registered the scheme handler) **or** a copy-paste command (universal fallback)

And uninstall: `sharon uninstall <slug>` and a "卸载" button in the web's "我已安装" list.

**Out of scope for Phase 5:**
- OS scheme handler registration (`sharon://`) — spec defers Windows; even on Mac/Linux, registration is a separate install-time step. Phase 5 ships the URL + the fallback hint; user can register the handler manually.
- Push receipt linking — Phase 6 (uninstall already accepts an optional `pushId` foreign key; routes just don't set it yet).
- Local file watcher — Phase 5.x (sharon scan today reads the directory on demand).
- `sharon scan` writing a `.sharon/last-scan.json` baseline file for diff detection across runs — Phase 5.x; v1 of scan just lists what's in `~/.claude/skills/` and POSTs each as a candidate.

---

## Architectural decisions

| # | Decision | Why |
|---|---------|-----|
| 1 | Install token = 32-byte hex string, stored in `install_tokens` table, 5-minute TTL, single-use (`consumed_at` set on first use) | Spec §6.4 |
| 2 | `/v1/install-intent` is auth-gated (cookie). `/v1/install-tokens/:token` is **token-gated** (no cookie required so CLI doesn't need to share cookies with browser) | Spec §6.4 token grants bundle access for the holder |
| 3 | `/v1/skills/:slug/versions/:semver/bundle` is auth-gated by cookie (for `sharon install` direct flow that signs in via PAT-like flow). For token-flow, the CLI hits `/v1/install-tokens/:token` to get a one-shot bundle URL that already includes a signed query param. | Simpler: token holder gets bundle via `/install-tokens/:token/bundle` (sibling route) |
| 4 | CLI auth = `SHARON_BASE_URL` + `SHARON_TOKEN` env vars. Token is currently the user's session cookie value (manually extracted from browser); future: `sharon login` opens browser. For v1.0 the simpler env var path works | Don't ship half-baked CLI auth in Phase 5 |
| 5 | `sharon install <slug>` uses the cookie/token to call `GET /v1/skills/:slug/versions/:semver/bundle` directly (no install-intent dance) — cleaner than forcing the deep-link flow when you're already in a terminal | Matches spec §6.4 "Fallback：CLI 直接 sharon install <slug>@<ver> 不走 web token" |
| 6 | Bundle extraction: use `tar.extract` from the `tar` npm package (already a dep) | Same as Phase 4 packing — reuse |
| 7 | `~/.claude/skills/<slug>/` is the install target; constants in CLI module | Spec §4.1 + §5.1 |
| 8 | `sharon publish <dir>` packs the local dir's SKILL.md and POSTs to `/v1/submissions` with `{slug, rawSkillMd}` form | Spec §6.2 "底层 sharon publish 仍可直接用" |
| 9 | Uninstall: removes directory + records `installs.uninstalled_at`. Single best-effort transaction — DB update first, then rmdir; if rmdir fails the DB still shows uninstalled (consistent with "removed at user request") | Phase 6 push retention reads installs table; the row matters more than the on-disk presence |
| 10 | All new ports stay in their existing port (no new ports) — `InstallStore` covers it. Build a `SqliteInstallStore` adapter. | Reuse |

---

## File structure additions

```
packages/
├─ adapters/src/storage/sqlite/
│   └─ install-store.ts                  [NEW]
│   └─ ../test/.../install-store.test.ts
│
├─ server/src/
│   ├─ context.ts                         [MODIFY] +installStore
│   ├─ index.ts                           [MODIFY] wire + route
│   └─ routes/
│       └─ install.ts                     [NEW] all install routes
│   └─ test/
│       └─ install-routes.test.ts
│
├─ cli/src/
│   ├─ bin.ts                             [MODIFY] dispatch subcommands
│   ├─ config.ts                          [NEW] SHARON_BASE_URL/TOKEN + paths.ts re-export
│   ├─ commands/
│   │   ├─ install.ts                     [NEW]
│   │   ├─ uninstall.ts                   [NEW]
│   │   ├─ publish.ts                     [NEW]
│   │   └─ scan.ts                        [NEW]
│   ├─ package.json                       [MODIFY] +tar, +ulid
│   └─ test/
│       └─ commands.test.ts               (where feasible — most are IO-heavy; smoke-tested via mock fetch)
│
└─ web/src/pages/
    └─ skills.astro                       [MODIFY] add 一键安装 button + fallback
```

---

## Task list

### P5T1 — SqliteInstallStore + tests
TDD: recordInstall, markUninstalled, listForUser (excludes uninstalled by default), putToken (with expiry), consumeToken (one-shot, returns null on expired/consumed/unknown). 8+ tests.
Commit: `feat(adapters/storage/sqlite): SqliteInstallStore`

### P5T2 — Bundle download + install REST
**Files:** `packages/server/src/routes/install.ts` (one file, multiple routes), `test/install-routes.test.ts`

Routes:
- `GET /v1/skills/:slug/versions/:semver/bundle` (auth) — looks up version by slug+semver, streams bundle bytes via `bundleStore.get`, Content-Type `application/gzip`, Content-Disposition `attachment; filename=<slug>-<semver>.tgz`. 404 unknown slug/semver.
- `POST /v1/install-intent` (auth) — body `{skillSlug, semver}`; verifies version exists; generates 32-byte hex token; inserts into install_tokens with 5-min TTL; returns `{token, deepLink, fallbackCmd}` where deepLink = `sharon://install?token=…` and fallbackCmd = `sharon install <slug>@<semver>`.
- `GET /v1/install-tokens/:token` (token-gated, no cookie required) — looks up unconsumed unexpired token, returns `{skillSlug, semver, bundleUrl, bundleSha256}` where bundleUrl is `/v1/install-tokens/:token/bundle` (signed by the token itself).
- `GET /v1/install-tokens/:token/bundle` (token-gated) — like the cookie-gated bundle endpoint, but token-gated. Stream the same bytes.
- `POST /v1/install-tokens/:token/done` (token-gated) — marks token consumed, records install in installs table.
- `POST /v1/installs` (auth) — direct install record without token flow: body `{skillSlug, semver}`. Useful for CLI. Side effect: writes installs row.
- `DELETE /v1/installs/:slug` (auth) — soft-delete: sets uninstalled_at, leaves row.
- `GET /v1/installs/mine` (auth) — list non-uninstalled installs.

15+ tests. Note: `/install-tokens/:token` MUST NOT leak existence vs expired to anon — both → 404.

Commit: `feat(server): install REST — bundle download + intent/token flow + direct install`

### P5T3 — CLI scaffold: config + base URL + token
**Files:** `packages/cli/src/config.ts`, `package.json` (add ulid + tar + undici)

`config.ts` exports:
- `BASE_URL` = `process.env.SHARON_BASE_URL ?? 'http://127.0.0.1:4321'`
- `TOKEN` = `process.env.SHARON_TOKEN` (optional)
- `SKILLS_DIR` = `~/.claude/skills`
- helper `apiFetch(path, init)` that always includes cookie header if TOKEN set + Content-Type when body present + throws on non-2xx

Commit: `feat(cli): config + apiFetch wrapper`

### P5T4 — `sharon install <slug>[@<semver>]`
**Files:** `packages/cli/src/commands/install.ts`, `bin.ts`

Behavior:
1. If `@<semver>` omitted: GET `/v1/skills/:slug` → use current version's semver
2. GET `/v1/skills/:slug/versions/:semver/bundle` → stream into temp file
3. sha256 verify against version.bundleSha256
4. mkdir -p `~/.claude/skills/<slug>/`; `tar -xzf` into it
5. POST `/v1/installs` `{slug, semver}` to record on server
6. Print `✅ installed sql-safety-gate@1 → ~/.claude/skills/sql-safety-gate/`

bin.ts dispatches `install <slug>` to this command.

Commit: `feat(cli): sharon install — download + verify + extract + record`

### P5T5 — `sharon uninstall <slug>`
Removes `~/.claude/skills/<slug>/` (with confirm prompt unless `--yes`), DELETE `/v1/installs/:slug`.

Commit: `feat(cli): sharon uninstall — local remove + server record`

### P5T6 — `sharon publish <dir>`
Reads `<dir>/SKILL.md`, parses frontmatter (via @matrix-sharon/core), POSTs `/v1/submissions {skillSlug, rawSkillMd}`, prints submission id + status.

Commit: `feat(cli): sharon publish — parse + POST submission`

### P5T7 — `sharon scan`
Lists `~/.claude/skills/*/SKILL.md`, parses each, computes a tiny stable hash, POSTs as a candidate via `/v1/candidates` for any not already submitted. v1 is dumb: posts everything found (server-side upsert prevents dupe spam since `id=ulid`; user can dismiss).

Commit: `feat(cli): sharon scan — POST local skills as candidates`

### P5T8 — Web 安装按钮 + fallback
Modify `skills.astro` to add an "⬇ 一键安装" button in the hero strip. Click → POST `/v1/install-intent` → show modal:
- "尝试唤起 sharon CLI…" (browser tries `location.href = deepLink`)
- After 2s, show fallback: a code block with `fallbackCmd` and a copy button
- Bottom: "为什么这样？" link to a help section explaining the sharon:// scheme

Commit: `feat(web): 一键安装 button + sharon:// + copy-paste fallback`

### P5T9 — README + memory + push
Doc the new CLI commands (sharon install/uninstall/publish/scan), the SHARON_BASE_URL/TOKEN env vars, and the optional sharon:// scheme registration (Mac/Linux). Mark Phase 5 ✅.
Commit: `docs: mark Phase 5 done + sharon CLI usage`

---

## Verification gate

End of phase:
1. After seed+login, web `/browse` → click a card → click 一键安装 → see fallback command → paste in terminal with `SHARON_TOKEN=<cookie> sharon install sql-safety-gate@1` → file lands in `~/.claude/skills/sql-safety-gate/SKILL.md`
2. `sharon uninstall sql-safety-gate` removes it
3. CI green; `pnpm -r typecheck && pnpm -r test` green
4. README ⏳→✅; memory snapshot

---

## Carry-forward to Phase 6

- `installs.via_push_id` always null in Phase 5 — Phase 6's push flow sets it
- Web fallback command tells the user to paste their session cookie as SHARON_TOKEN — not great UX. Phase 6 or later: `sharon login` opens browser and auto-extracts the cookie
- CLI `bin` still points to `.ts` (Phase 1 carry-forward); for production install via `npm i -g`, needs a real build. Phase 6+

---

## Done definition

- [ ] All 9 tasks committed
- [ ] CI green on push
- [ ] `pnpm -r typecheck && pnpm -r test` green
- [ ] README ⏳→✅ for Phase 5
- [ ] Memory snapshot saved
- [ ] Phase 6 can start without unknowns about install/uninstall flow
