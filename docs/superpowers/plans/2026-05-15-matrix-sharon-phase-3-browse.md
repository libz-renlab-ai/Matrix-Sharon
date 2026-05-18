# Matrix-Sharon Phase 3: Browse REST + Astro pages

> **Status:** Plan locked, ready for execution.
> **Predecessor:** [Phase 2 auth](./2026-05-15-matrix-sharon-phase-2-auth.md) — landed `f605654..ef50820`.

**Goal:** Authenticated users can browse all approved skills (`GET /v1/skills`), open a detail page (`GET /v1/skills/:slug`), and read a version's README (`GET /v1/skills/:slug/versions/:semver/readme`). Astro browse page + detail page render real data. Empty DB shows graceful empty state. A `sharon-server seed` script populates a few sample skills so the UI has something to show without waiting for Phase 4 publish flow.

**Out of scope (later phases):**
- `GET /v1/skills/:slug/versions/:ver/bundle` — bundles don't exist until Phase 4 publish creates them. Endpoint returns 404 for any version since `bundle_sha256` is just a string and no file is written. Defer to Phase 4.
- Search / category filter on backend — Astro pages do client-side filter on the full list (single-team, dozens of skills max). Phase 5+ if it ever needs server-side.
- Voting UI — UI placeholder per spec §2.2, no backend.
- Pagination — single team won't have >100 skills in v1.

---

## Architectural decisions

| # | Decision | Why |
|---|---------|-----|
| 1 | Single `requireAuth` middleware in `server/auth-guard.ts` — `app.addHook('preHandler', ...)` style or a per-route opt-in via a `withAuth(handler)` wrapper. **Use per-route wrapper** to keep `/health` and OAuth routes opt-out without `skipPaths` lists. | More explicit; no ambient surprise |
| 2 | List + detail responses return shape `{skill, currentVersion}` for browse, `{skill, versions: [...]}` for detail. Both wrap in `{}` envelope for future fields | Matches the existing port shape `Array<{skill, currentVersion}>` |
| 3 | Astro pages keep `output: 'static'`. Data fetched client-side via `fetch('/v1/...', {credentials: 'same-origin'})`. Skeleton during load, error state on failure. | Phase 2 set this pattern; consistent + no @astrojs/node dep |
| 4 | Seed runs via `sharon-server seed` CLI subcommand (already a bin) or `pnpm seed` script. Idempotent — skip skills/versions that already exist by primary key. Uses fixed ULIDs so seed runs are deterministic. Creates 3 skills with 1 version each, attributed to a synthetic `system-seed` user. | Phase 4 will replace this when real submissions exist. |
| 5 | `system-seed` user inserted by seed with `role='member'` and `last_seen_at=null`. Does NOT trigger first-user-leader bootstrap because we explicitly INSERT (raw SQL in seed) bypassing UserStore. | Bootstrap should remain "first real GitHub login"; not corrupted by seeds |
| 6 | Detail page renders **rendered HTML** from the version's `readme_md` column via a small markdown-to-HTML pass. Use `marked` (1KB) — simpler than a heavier renderer. Sanitize: strip `<script>` only (skill markdown is leader-approved; XSS surface low) | Trade nuance for simplicity; can swap renderer later |
| 7 | Skill cards on browse use `category` for color, frontmatter `icon` for emoji, and a `pain` truncation for the body. Empty `pain` falls back to `description`. | Matches the prototype |

---

## File structure additions

```
packages/
├─ adapters/src/storage/sqlite/
│   ├─ skill-store.ts              [NEW]
│   └─ ../test/.../skill-store.test.ts  [NEW]
│
├─ adapters/src/seed/
│   └─ index.ts                     [NEW] seedSampleSkills(db)
│
├─ server/src/
│   ├─ auth-guard.ts                [NEW] withAuth(handler) → wraps + checks session
│   ├─ routes/
│   │   └─ skills.ts                [NEW] /v1/skills + /v1/skills/:slug + /readme
│   ├─ index.ts                     [MODIFY] register skill routes
│   └─ bin/                         [NEW]
│       └─ seed.ts                  [NEW] sharon-server seed CLI entry
│   └─ package.json                 [MODIFY] add marked, add bin: sharon-server-seed
│   └─ test/
│       ├─ skills-list.test.ts      [NEW]
│       ├─ skills-detail.test.ts    [NEW]
│       └─ skills-readme.test.ts    [NEW]
│
└─ web/src/
    ├─ pages/
    │   ├─ index.astro              [MODIFY] redirect/link to /browse
    │   ├─ browse.astro             [NEW] grid of skill cards
    │   └─ skills/[slug].astro      [NEW] detail page
    └─ components/
        ├─ SkillCard.astro          [NEW]
        └─ EmptyState.astro         [NEW]
```

---

## Task list (TDD, one commit per task)

### P3T1 — SqliteSkillStore adapter + tests

**Files:** `packages/adapters/src/storage/sqlite/skill-store.ts`, `test/.../skill-store.test.ts`

Implements all 7 methods on the existing `SkillStore` port:
- `upsertSkill(skill)` — INSERT or UPDATE name/category/icon (slug is PK)
- `findSkillBySlug(slug)` — by PK
- `listApproved()` — INNER JOIN skills × skill_versions where `skills.current_version_id IS NOT NULL`; returns the joined `{skill, currentVersion}`, sorted by skill name
- `insertVersion(version)` — straightforward INSERT, errors on UNIQUE conflict (skill_slug + semver)
- `findVersion(id)` — by PK
- `listVersionsBySlug(slug)` — DESC by semver
- `setCurrentVersion(slug, versionId)` — UPDATE
- `maxSemver(slug)` — `SELECT COALESCE(MAX(semver), 0)`

Tests (TDD, in-memory DB):
- Round-trip skill insert + lookup
- Round-trip version insert + lookup
- `maxSemver` 0 → 1 → 2 sequence
- `setCurrentVersion` makes skill appear in `listApproved`
- Skill without `current_version_id` does NOT appear in `listApproved`
- Versions list sorted DESC by semver
- Unique constraint on (slug, semver) violated → throw

Commit: `feat(adapters/storage/sqlite): SqliteSkillStore`

---

### P3T2 — Seed module + sharon-server-seed bin

**Files:** `packages/adapters/src/seed/index.ts`, `packages/server/src/bin/seed.ts`, `packages/server/package.json` (add bin entry + marked dep)

`seedSampleSkills(db)`:
- Insert `system-seed` user with role=member if not exists (raw SQL — does NOT use UserStore so no leader bootstrap)
- Insert 3 sample skills with deterministic ULIDs:
  - `sql-safety-gate` (category=safety, icon=🛡️)
  - `pr-review-checklist` (category=review, icon=🔎)
  - `i18n-key-finder` (category=i18n, icon=🌍)
- Insert 1 SkillVersion per skill, semver=1, readme_md is the literal markdown
- Set each skill's current_version_id
- All inserts use `INSERT OR IGNORE`, runtime idempotent

`packages/server/src/bin/seed.ts` is the CLI entry: opens DB, runs migrations, runs seed, logs results, exits 0.

`packages/server/package.json` adds `"sharon-server-seed": "./src/bin/seed.ts"` bin + `marked` dep.

Tests (in-memory DB):
- Seed inserts 3 skills, 3 versions, 1 user
- Second invocation no-op (still 3 skills, 1 user)

Commit: `feat(adapters/seed): seedSampleSkills + sharon-server-seed bin`

---

### P3T3 — requireAuth wrapper + test

**Files:** `packages/server/src/auth-guard.ts`, `test/auth-guard.test.ts`

```ts
export function withAuth<Schema = unknown>(
  handler: (req: FastifyRequest<Schema>, reply: FastifyReply, session: SessionPayload, user: User) => Promise<unknown>
): RouteHandler { ... }
```

Reads session cookie → if null, reply 401 `{error:not_signed_in}`. Loads user via `app.ctx.userStore.findById` — if null, 401. Else calls handler with session + user.

Tests cover:
- 401 with no session
- 401 with valid session but missing user
- 200 with valid session + user (handler receives both)

Commit: `feat(server): requireAuth wrapper for protected routes`

---

### P3T4 — /v1/skills list endpoint

**Files:** `packages/server/src/routes/skills.ts`, `test/skills-list.test.ts`. AppContext gains `skillStore`. `buildApp` and main() add the store; tests update accordingly.

Returns `{skills: Array<{skill, currentVersion}>}`. Empty list when DB has nothing. Behind `withAuth`.

Tests:
- 401 without auth
- 200 empty list when no skills
- 200 returns seeded 3 after seed runs
- Skill without current_version_id excluded

Commit: `feat(server): GET /v1/skills (browse list, approved only)`

---

### P3T5 — /v1/skills/:slug detail endpoint

Same file. Returns `{skill, versions: SkillVersion[], currentVersionId}`. 404 if slug unknown.

Tests:
- 401 without auth
- 200 returns skill + versions DESC
- 404 unknown slug

Commit: `feat(server): GET /v1/skills/:slug (detail + versions)`

---

### P3T6 — /v1/skills/:slug/versions/:semver/readme

Returns `{html, semver}`. 404 if slug or semver unknown. Markdown rendered via `marked`. Wrap with `<div class="sharon-readme">` and strip `<script>` tags via regex post-pass.

Tests:
- 401 without auth
- 200 returns rendered HTML from seed
- 404 unknown slug or semver
- HTML contains expected `<h1>` from seed markdown
- `<script>alert(1)</script>` in markdown is stripped from output

Commit: `feat(server): GET /v1/skills/:slug/versions/:semver/readme (markdown→html)`

---

### P3T7 — Astro browse.astro + SkillCard.astro

**Files:** `packages/web/src/pages/browse.astro`, `packages/web/src/components/SkillCard.astro`, `packages/web/src/components/EmptyState.astro`

Browse page: full-width grid of `SkillCard` components, populated by client-side `fetch('/v1/skills')`. Skeleton during load. Empty state on `{skills: []}`. Auth fail → redirect to `/login/github?returnTo=/browse`.

SkillCard:
- Category-colored top stripe
- Icon (emoji) + name
- `pain` text (truncated 2 lines) or fallback to description
- Footer: `v{semver}` + author (skill.authorId)
- Click → `/skills/{slug}`

Index page updates: replace phase-status with prominent "→ 浏览技能" CTA pointing at `/browse`.

Commit: `feat(web): browse page with SkillCard grid + empty state`

---

### P3T8 — Astro skills/[slug].astro detail page

**Files:** `packages/web/src/pages/skills/[slug].astro`

Two-pane layout:
- Header: icon + name + category pill + `v{currentSemver}` + author
- Left: rendered readme (fetched via `/readme` endpoint)
- Right: pain/gain/triggers/example cards (the "好处一目了然" 四联块 from prototype)
- Below: versions table

Client-side fetch chain: `/v1/skills/:slug` → render header + version table → `/v1/skills/:slug/versions/:current/readme` → inject HTML into left pane. 404 from API → "未找到该 skill" with link back to /browse.

Astro `getStaticPaths` returns `[]` so the page is generated client-side via Astro's static fallback. (We set the page to use dynamic params via SSR rewrite... Actually static + path-fallback works: declare `export const prerender = false` then it becomes a SPA route. Simplest: use the file `[slug].astro` with all logic in `<script>`, and `getStaticPaths` returning `[]` won't compile. So use `export const prerender = false` if Astro supports it in static mode — fallback is making it `/skills/index.astro` with `?slug=...` query.)

**Decision:** Use `/skills?slug=...` query-based detail page (file `packages/web/src/pages/skills.astro`) to dodge Astro's static-paths complexity. URL pattern is slightly worse (`?slug=` not `/skills/sql-safety-gate`) but keeps Phase 3 static + simple. Browse page links to `/skills?slug=...`. Defer pretty URLs to Phase 5 when we decide on SSR.

Commit: `feat(web): skill detail page (?slug=...) — readme + four-block + versions`

---

### P3T9 — README + memory + push

**Files:** `README.md` (Phase 3 ⏳ → ✅), `docs/superpowers/plans/2026-05-15-matrix-sharon-phase-3-browse.md` (this file, check the boxes), memory snapshot.

Also document the seed command in README.

Commit: `docs: mark Phase 3 done + seed/browse instructions`

---

## Verification gate

Every task: `pnpm -r typecheck && pnpm -r test` green before commit.

End of phase:
1. `pnpm --filter @matrix-sharon/server dev` boots, `pnpm sharon-server-seed` seeds, `/v1/skills` returns 3 (after login)
2. Web `/browse` shows 3 cards; click → detail page renders
3. CI green on push
4. Memory + README updated

---

## Carry-forward to Phase 4 (don't fix now)

- All Phase 2 carry-forward still applies (migrate `__dirname`, BundleStore Buffer, CLI bin → .ts)
- `/bundle` endpoint not yet built — wait for Phase 4 to create real bundles
- Astro pages use `?slug=` query for detail rather than path param — pretty URLs deferred
- `marked` is unsanitized beyond `<script>` strip; if we ever accept untrusted markdown (we won't in v1) we need DOMPurify

---

## Done definition

- [ ] All 9 tasks committed
- [ ] CI green on push
- [ ] `pnpm -r typecheck && pnpm -r test` green
- [ ] README ⏳ → ✅ for Phase 3, with seed instructions
- [ ] Memory snapshot saved
- [ ] Phase 4 can start without unknowns about list/detail/readme paths
