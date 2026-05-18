# Changelog

All notable changes to Matrix-Sharon. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
This project adheres to [Semantic Versioning](https://semver.org/).

## [1.0.0] — 2026-05-18

The first release. Single-team self-hosted skills/plugins/workflows marketplace
for Claude Code, with leader-as-gatekeeper, member submission, one-click
install, and leader push with retention signals.

### Added

#### Phase 1 — scaffold
- pnpm monorepo with 7 packages (`types`, `ports`, `core`, `adapters`,
  `server`, `cli`, `web`) following Functional Core / Imperative Shell.
- SQLite schema migration 001 — 10 tables (users, skills, skill_versions,
  pending_submissions, candidates, pushes, push_receipts, installs,
  install_tokens, team_config) + audit_log.
- Idempotent migration runner.
- Fastify hello-world server with `/health` + auto-migrate-on-boot.
- Astro static web with vite proxy `/v1` → server.
- CLI bin stub.
- GitHub Actions CI (typecheck + test on push/PR to main).

#### Phase 2 — auth
- GitHub OAuth via `/login/github` + `/auth/callback` + `/auth/logout`.
- Signed `sharon_session` cookie (30-day TTL, base64url JSON payload).
- Zod-validated config loader; insecure dev secret fallback when
  `SHARON_SESSION_SECRET` unset (refuses in production).
- `GET /v1/me` returns current user.
- First user to log in is atomically promoted to `leader`.
- Web header with sign-in / current user / sign-out.

#### Phase 3 — browse
- `GET /v1/skills` (list), `GET /v1/skills/:slug` (detail with versions),
  `GET /v1/skills/:slug/readme` (markdown→HTML).
- `sharon-server-seed` bin: 3 deterministic sample skills + author user.
- Web `/browse` (skill grid) and `/skills?slug=…` (hero + readme + versions).
- `withAuth` wrapper for cookie-gated routes.

#### Phase 4 — submit & approve
- Member candidate flow: `POST /v1/candidates`, `GET /v1/candidates/mine`,
  `DELETE /v1/candidates/:id` (dismiss).
- `POST /v1/submissions` (frontmatter validated via zod; auto-promoted from
  matching candidate).
- Leader approval: `GET /v1/submissions/pending`,
  `POST /v1/submissions/:id/approve`, `…/reject`.
- Approval atomically creates immutable `SkillVersion` + persists
  `bundle.tgz` to `FsBundleStore` at `data/bundles/<slug>/<id>.tgz`.
- `withLeader` auth guard for leader-only routes.
- Web `/me/candidates` (member view) and `/leader/queue` (leader view).
- SqliteAuditLog wired to approval/rejection events.

#### Phase 5 — install
- Bundle download: `GET /v1/skills/:slug/versions/:semver/bundle`
  (cookie-gated) and `GET /v1/install-tokens/:token/bundle` (token-gated).
- Install-intent token flow: `POST /v1/install-intent` issues a 32-byte
  single-use 5-minute token; `…/done` consumes + records the install.
- Direct install: `POST /v1/installs`, `DELETE /v1/installs/:slug`,
  `GET /v1/installs/mine`.
- `sharon` CLI commands: `install`, `uninstall`, `publish`, `scan`.
- Web one-click install button — opens `sharon://install?token=…` deep link
  with copy-command fallback when the protocol handler isn't registered.

#### Phase 6 — leader push (closes v1)
- `POST /v1/pushes` (leader-only): targeted push to recipients with a
  required reason.
- Recipient inbox: `GET /v1/pushes/inbox`, `POST /v1/pushes/:id/ack`,
  `…/receipts/done`, `…/receipts/failed`.
- Leader retention view: `GET /v1/pushes/sent` (counts by status).
- `sharon receive` CLI: polls inbox, dispatches via PUSH_KINDS handlers
  (`fs-extract`, `fs-write-file`, `delegate-cli`), reports back.
- Uninstall side-effect: if `installs.via_push_id` is set, deleting the
  install flips `push_receipts.status` to `uninstalled` so leader's
  retention dashboard stays accurate.
- Web `/me/inbox` (recipient) and `/leader/pushes` (sender) pages.
- Detail-page **推送给成员** button for leaders.
- `GET /v1/users` (leader-only) for recipient pickers.

#### Release readiness (v1.0)
- MIT LICENSE.
- Migrations embedded as TypeScript string constants
  (`migrations/_embedded.ts`) — no more `__dirname`-relative `readFileSync`.
  Survives `tsc → dist`.
- tsx-based `.mjs` bin shims: `bin/sharon.mjs`, `bin/sharon-server.mjs`,
  `bin/sharon-server-seed.mjs`. tsx promoted from devDep to runtime dep.
- Root scripts: `pnpm dev` (concurrently runs server + web),
  `pnpm seed`, `pnpm sharon`.
- `.env.example` documenting every env var.
- Server gains `@fastify/static` + `SHARON_WEB_DIST` env. When set, web
  bundle is served at `/` from the same port as the API — single-origin
  Docker deploy works without a reverse proxy.
- Dockerfile (3-stage build) + `docker-compose.yml` with `/health`
  healthcheck and named `sharon-data` volume.
- SETUP.md — end-to-end walkthrough from OAuth registration through first
  leader bootstrap, including reverse-proxy and backup guidance.

### Tests
- 250 passing + 1 skipped across 6 packages.

### Known v1 limitations (deferred)
- Permissions are leader-or-member (no team scoping); `team_config`
  table reserved for v1.x.
- Push delivery is poll-based via `sharon receive` (no SSE/WebSocket).
- `sharon login` deferred — CLI auth uses pasted cookie via
  `SHARON_TOKEN` env.
- Astro pages use query params (`/skills?slug=…`) instead of pretty URLs
  to keep `output: "static"`. SSR mode comes in v1.x.

[1.0.0]: https://github.com/libz-renlab-ai/Matrix-Sharon/releases/tag/v1.0.0
