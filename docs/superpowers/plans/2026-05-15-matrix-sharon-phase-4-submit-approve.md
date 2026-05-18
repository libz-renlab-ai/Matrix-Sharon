# Matrix-Sharon Phase 4: Candidate → Submission → Approval → Version

> **Status:** Plan locked, ready for execution.
> **Predecessor:** [Phase 3 browse](./2026-05-15-matrix-sharon-phase-3-browse.md) — landed `4477265..079cd74`.

**Goal:** Full vertical slice of the publish flow.
1. Member POSTs a candidate (e.g., via local scanner) → stored in `candidates` table
2. Member sees own candidates at `/me/candidates`, can submit or dismiss
3. Submit creates a `pending_submissions` row
4. Leader sees queue at `/leader/queue`, approves or rejects
5. Approval atomically: creates immutable `SkillVersion` (semver = maxSemver+1), packs SKILL.md as bundle.tgz with sha256, points `skills.current_version_id` at it, logs to audit
6. Rejection: just transitions status + logs reject reason

**Out of scope:**
- Multi-file skills (scripts/ subdirectory) — v1 bundle is single SKILL.md file as `.tgz`. Phase 5.x.
- Bundle download (`/bundle` endpoint) — Phase 5 (it's a precondition for install)
- Real local scanner CLI command — Phase 4 only needs the API endpoint; CLI `sharon scan` is Phase 5
- Push retention signal — Phase 6
- Concurrent leader-approval race detection — single-team, low risk; SQLite SERIALIZABLE-by-default + tx wrapper is enough

---

## Architectural decisions

| # | Decision | Why |
|---|---------|-----|
| 1 | Bundle = 1-file `.tgz` containing just `SKILL.md` | v1 spec; multi-file skill packs are Phase 5+ |
| 2 | `tar` from native CLI is platform-fragile (Windows lacks GNU tar); use the `tar` npm package | cross-platform, tested |
| 3 | `BundleStore` keeps `Buffer` in its port signature — adapters already have `@types/node`. Switching to `Uint8Array` is cosmetic and risks rework for nothing. | Don't touch the carry-forward without a forcing reason |
| 4 | `core/approval.ts` is a pure state machine: given (submission, action, leader, clock-now, maxSemver, bundleSha256, bundleSize) → either a `{kind:'approve', versionToInsert, statusChange}` or `{kind:'reject', statusChange}` description. Imperative shell (route) executes the description. | Spec §11 "core 100% line coverage, pure" |
| 5 | `core/frontmatter.ts` is a pure YAML parser → `Frontmatter` zod parse. Uses `js-yaml` (battle-tested, 3 KB). Reject submissions where frontmatter doesn't parse | Validation belongs in core; route just calls it |
| 6 | Leader-only routes use a new `withLeader` wrapper that composes withAuth + role check. Returns 403 (not 401) for member-attempt-leader-action so it's distinguishable. | Common pattern |
| 7 | Self-approval: spec §3.1 — "leader 自己提交的也走审批门；如果只有一个 leader，自我批准但记入审计". Implementation: no special case in code; just rely on the leader being able to approve any pending submission. Audit log captures who approved what. | Simple |
| 8 | Candidate → Submission conversion: API takes `candidate_id` (the member's own), server reads the candidate, creates submission, deletes the candidate atomically | Spec §6.2 — "从 candidates 取 → 创建 PendingSubmission ... 从 candidates 表删除" |
| 9 | Direct `sharon publish` path: API also accepts a body without `candidate_id`, with `slug + raw_skill_md` inline. Same downstream path. | Spec §6.2 supports both |
| 10 | Reject reason required (1+ chars); approve note optional | Spec §6.3 |

---

## File structure additions

```
packages/
├─ adapters/src/
│   ├─ storage/sqlite/
│   │   ├─ candidate-store.ts        [NEW]
│   │   ├─ submission-store.ts       [NEW]
│   │   └─ audit-log.ts              [NEW]
│   ├─ bundle/
│   │   └─ fs.ts                     [NEW] FsBundleStore (data/bundles/<slug>/<id>.tgz)
│   └─ index.ts                      [MODIFY]
│   └─ test/
│       ├─ storage/sqlite/candidate-store.test.ts
│       ├─ storage/sqlite/submission-store.test.ts
│       ├─ storage/sqlite/audit-log.test.ts
│       └─ bundle/fs.test.ts
│
├─ core/src/
│   ├─ frontmatter.ts                [NEW] parse YAML, zod validate against FrontmatterSchema
│   ├─ semver-alloc.ts               [NEW] nextSemver(max) → max+1
│   ├─ approval.ts                   [NEW] state machine
│   └─ index.ts                      [MODIFY]
│   └─ test/
│       ├─ frontmatter.test.ts
│       ├─ semver-alloc.test.ts
│       └─ approval.test.ts
│
├─ server/src/
│   ├─ auth-guard.ts                 [MODIFY] add withLeader
│   ├─ routes/
│   │   ├─ candidates.ts             [NEW] 3 routes
│   │   └─ submissions.ts            [NEW] 4 routes
│   ├─ context.ts                    [MODIFY] +candidateStore, submissionStore, auditLog, bundleStore
│   ├─ index.ts                      [MODIFY] wire new stores + routes
│   ├─ package.json                  [MODIFY] add tar, js-yaml
│   └─ test/
│       ├─ candidates-routes.test.ts
│       └─ submissions-routes.test.ts
│
└─ web/src/
    └─ pages/
        ├─ me/candidates.astro       [NEW]
        └─ leader/queue.astro        [NEW]
```

---

## Task list

### P4T1 — SqliteCandidateStore + tests
TDD: upsert, listForUser (with/without dismissed), find, dismiss, delete. 6+ tests.
Commit: `feat(adapters/storage/sqlite): SqliteCandidateStore`

### P4T2 — SqliteSubmissionStore + tests
TDD: insert, find, listByStatus, setStatus (with reviewer/at/reason). 5+ tests.
Commit: `feat(adapters/storage/sqlite): SqliteSubmissionStore`

### P4T3 — SqliteAuditLog + tests
TDD: record, list with filters (actorId/action/sinceMs/limit). 5+ tests.
Commit: `feat(adapters/storage/sqlite): SqliteAuditLog`

### P4T4 — core/frontmatter + tests
TDD: parse SKILL.md → Frontmatter (or throw). Handles missing/malformed YAML, missing required fields. 6+ tests including the seed sample.
Dep added to core: `js-yaml ^4` (4 KB).
Commit: `feat(core): SKILL.md frontmatter parser + zod validation`

### P4T5 — core/semver-alloc + approval state machine + tests
- `nextSemver(currentMax: number) => number` (just `max+1`; reserved for future custom semver schemes)
- `planApproval({submission, leader, nowMs, nextSemver, bundleSha256, bundleSize})` → either `{kind:'approve', versionToInsert, ...}` or throws (no `kind:'reject'` here — reject is trivial inline). Pure.
- `planRejection({submission, leader, nowMs, reason})` → describes status change + audit.

8+ tests for the two planners.
Commit: `feat(core): semver-alloc + approval/rejection state machines`

### P4T6 — FsBundleStore adapter + tests
TDD: put bytes → returns sha256+size, file lands at `data/bundles/<slug>/<id>.tgz`; get reads it; verify compares sha256. Tests use `mkdtempSync` + override `SHARON_DATA_DIR`. 5+ tests.
Adds dep: nothing — pure Node `node:crypto` + `node:fs/promises`.
Commit: `feat(adapters/bundle): FsBundleStore (data/bundles/<slug>/<id>.tgz)`

### P4T7 — withLeader guard + tests
`withLeader(handler)` composes `withAuth` and adds `if (user.role !== 'leader') return 403`. 3 tests: 401 anon, 403 member, 200 leader.
Commit: `feat(server): withLeader auth guard`

### P4T8 — Candidate REST routes + tests
- `POST /v1/candidates` body `{skillSlug, fullContentMd, diffUnified?, reason}` → creates Candidate for the calling user (id auto-ULID)
- `GET /v1/candidates/mine` → list (non-dismissed)
- `DELETE /v1/candidates/:id` → dismiss (soft delete via `dismissed=1`)
All `withAuth`. Tests cover 401, body validation, ownership (can't delete other's), happy paths. 8+ tests.
Commit: `feat(server): candidate REST endpoints`

### P4T9 — Submission REST routes + tests
- `POST /v1/submissions` body: either `{candidate_id}` (member's own — server fetches, deletes candidate, creates submission) OR `{slug, raw_skill_md}` (direct publish). Parses frontmatter, computes bundleSha256+size, isNewSkill = (slug doesn't exist in skills table). Inserts pending row.
- `GET /v1/submissions/pending` (leader) → list pending DESC by submittedAt
- `POST /v1/submissions/:id/approve` (leader) body `{note?}` → calls `planApproval` → tx: insertVersion, setCurrentVersion, upsertSkill, setStatus, audit, write bundle to FsBundleStore
- `POST /v1/submissions/:id/reject` (leader) body `{reason}` → setStatus + audit

12+ tests.
Commit: `feat(server): submission REST + approval/rejection flow`

### P4T10 — Astro /me/candidates page
Client-fetch `/v1/candidates/mine` → table with: detected_at, skill_slug, reason, "发布候选 ↗" button (POST /v1/submissions {candidate_id}) + "忽略" (DELETE). Empty state.
Commit: `feat(web): /me/candidates personal queue`

### P4T11 — Astro /leader/queue page
Client-fetch `/v1/submissions/pending` → list with skill info, submitter, raw_skill_md preview. Buttons: 通过 (POST /approve) + 拒绝 (modal asking reason → POST /reject). 403 from API → "leader only" message with link home.
Commit: `feat(web): /leader/queue approval queue`

### P4T12 — README + memory + push
Mark Phase 4 ⏳ → ✅. Document new endpoints. Snapshot memory. Push.
Commit: `docs: mark Phase 4 done + submission/approval walkthrough`

---

## Verification gate

End of phase:
1. After seed + login, can POST a candidate, see it in /me/candidates, submit it, see in /leader/queue, approve it → version 2 of an existing skill shows in /browse with new readme content
2. CI green
3. README ⏳→✅
4. Memory snapshot

---

## Carry-forward to Phase 5

- All previous carry-forward still applies
- `/v1/skills/:slug/versions/:ver/bundle` download endpoint NOT yet built (Phase 5)
- CLI `sharon scan` / `sharon publish` not yet built (Phase 5)
- Web `/me/candidates` posts manually; no local file watcher (Phase 5)

---

## Done definition

- [x] All 12 tasks committed
- [x] CI green on push
- [x] `pnpm -r typecheck && pnpm -r test` green (193 tests + 1 skipped)
- [x] README ⏳→✅ for Phase 4
- [x] Memory snapshot saved (`memory/phase-4-submit-approve-done.md`)
- [x] Phase 5 can start without unknowns about candidate/submission/approval
