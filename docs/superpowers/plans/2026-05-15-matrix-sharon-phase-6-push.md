# Matrix-Sharon Phase 6: Leader push + receiver dispatcher + INBOX

> **Status:** Plan locked, ready for execution.
> **Predecessor:** [Phase 5 install](./2026-05-15-matrix-sharon-phase-5-install.md) — landed `28eba7e..3d7e43c`.

**Goal:** Closes out v1.
1. Leader picks a skill version + recipients + reason → POST `/v1/pushes`. Server creates the push, a `PushReceipt(pending)` per recipient, and surfaces it in each recipient's inbox.
2. Recipients see pushes in `/me/inbox` Web page; can "我已了解" (acknowledge) and "查看" (link to detail).
3. Recipients can run `sharon receive` from CLI which polls `/v1/pushes/inbox`, runs the PUSH_KINDS dispatcher for each pending receipt (`fs-extract` to `~/.claude/skills/<slug>/` for kind=skill), marks `installed`, and records the install with `via_push_id` populated.
4. Uninstall from any path (CLI or web) flips `push_receipts.status` to `uninstalled` — Phase 5's uninstall route adds the receipt update if the install row was via a push.
5. Leader can read retention via a new `GET /v1/pushes/sent` listing their pushes + per-recipient status counts. UI for this is minimal (a JSON-driven table on `/leader/pushes`).

**Out of scope:**
- Real-time delivery (SSE / WebSocket) — `sharon receive` polls on demand or via a cron. Spec §6.5 allowed either SSE OR long-poll; polling is the simplest implementation that meets the soft-push semantics ("自动安装 + 软标记 + 留存率信号"; doesn't have to be instant).
- Push to multiple kinds (viki-rule, workflow, prompt-template) — `kind=skill` only per spec §5.1 `available: true`. The dispatcher does check `PUSH_KINDS[kind].handler` so adding kinds is config-only later.
- Force-uninstall protection / re-push of uninstalled — spec says "不阻止卸载、不通知 leader". Leader sees the number, no other UX.

---

## Architectural decisions

| # | Decision | Why |
|---|---------|-----|
| 1 | Insert push + N receipts in a single SQLite transaction | Atomicity; one push must produce all receipts |
| 2 | `/v1/pushes/inbox` returns `Array<{push, receipt}>` for the calling user where `receipt.status IN ('pending','installed','failed')` (not uninstalled) | Inbox shows currently-relevant items |
| 3 | `POST /v1/pushes/:pushId/acknowledge` (any recipient of that push) toggles `acknowledged=1` | Simple |
| 4 | `POST /v1/pushes/:pushId/receipts/done` (recipient) marks receipt installed + records install via_push_id | One endpoint; CLI calls this after extraction succeeds |
| 5 | `POST /v1/pushes/:pushId/receipts/failed` (recipient) marks failed + fail_reason | CLI error path |
| 6 | Receiver-side dispatcher uses PUSH_KINDS handler. For `fs-extract`: targetDir `~/.claude/skills/{name}/` substituting `{name}` with push.skillSlug; for `delegate-cli`: spawn the cmd, throw on non-zero exit | Spec §5.3 |
| 7 | Phase 5's `sharon uninstall` and Phase 6's `DELETE /v1/installs/:slug` both update push_receipts.status='uninstalled' atomically if the install row has via_push_id | Closes the loop for leader retention signal |
| 8 | Leader's `GET /v1/pushes/sent` returns `Array<{push, counts: {pending, installed, failed, uninstalled}}>` | Single trip from UI |

---

## File structure additions

```
packages/
├─ adapters/src/storage/sqlite/
│   ├─ push-store.ts                  [NEW]
│   └─ ../test/.../push-store.test.ts
│
├─ server/src/
│   ├─ context.ts                     [MODIFY] +pushStore
│   ├─ index.ts                       [MODIFY] register routes + wire store
│   └─ routes/
│       ├─ pushes.ts                  [NEW] all push routes
│       └─ install.ts                 [MODIFY] DELETE /v1/installs/:slug also flips push_receipts.status when via_push_id set
│   └─ test/
│       └─ pushes-routes.test.ts
│
├─ cli/src/
│   └─ commands/
│       └─ receive.ts                 [NEW]
│   └─ bin.ts                         [MODIFY] dispatch `sharon receive`
│   └─ test/
│       └─ receive.test.ts
│
└─ web/src/pages/
    ├─ me/inbox.astro                 [NEW] recipient inbox
    └─ leader/pushes.astro            [NEW] leader retention dashboard

    skills.astro                      [MODIFY] add "📤 推送给成员" button (leader-only)
```

---

## Task list

### P6T1 — SqlitePushStore + tests
TDD: insertPush, insertReceipts (batch), findPush, listReceiptsForPush, listInboxFor (excludes uninstalled), setReceiptStatus, acknowledge. 8+ tests.
Commit: `feat(adapters/storage/sqlite): SqlitePushStore`

### P6T2 — Push REST + leader/retention
**Files:** `packages/server/src/routes/pushes.ts`, `test/pushes-routes.test.ts`. Context gains pushStore.

Routes:
- `POST /v1/pushes` (leader) body `{skillSlug, semver, recipientIds: string[], reason}` — resolves version; creates push + receipts in one tx; 201 `{push, receipts}`
- `GET /v1/pushes/inbox` (auth) — `Array<{push, receipt}>` for caller, status ≠ uninstalled
- `POST /v1/pushes/:pushId/acknowledge` (auth) — recipient flips ack flag; 403 if not a recipient
- `POST /v1/pushes/:pushId/receipts/done` (auth) — recipient marks installed; records install via_push_id; 403 if not a recipient
- `POST /v1/pushes/:pushId/receipts/failed` (auth) body `{reason}` — marks failed
- `GET /v1/pushes/sent` (leader) — pushes the caller sent + per-status counts
- `GET /v1/users` (leader) — minimal user list `[{id, name, role, avatarUrl}]` for the push-target picker (needed by web)

15+ tests.

Commit: `feat(server): push REST — send, inbox, ack, done, failed, sent + GET /v1/users`

### P6T3 — Wire installs-uninstall ↔ push receipt
Modify `DELETE /v1/installs/:slug`: after `markUninstalled`, look up the install row; if `via_push_id` is set, also `pushStore.setReceiptStatus(pushId, userId, 'uninstalled', now, null)`. Add a test for the round-trip.
Commit: `feat(server): uninstall flips push_receipts.status when install was via push`

### P6T4 — sharon receive CLI
**Files:** `packages/cli/src/commands/receive.ts`, `bin.ts`, `test/receive.test.ts`

`sharon receive` (one-shot):
1. GET `/v1/pushes/inbox` → list
2. For each `{push, receipt}` with `receipt.status === 'pending'`:
   a. Look up `PUSH_KINDS[push.kind]`; skip with warning if `!available`
   b. For `fs-extract`: download bundle (`/v1/skills/:slug/versions/:ver/bundle` — auth-gated, so SHARON_TOKEN required), sha256 verify, extract to expanded `targetDir.replace('{name}', skillSlug)`
   c. POST `/v1/pushes/:pushId/receipts/done`
   d. On failure: POST `/v1/pushes/:pushId/receipts/failed` with reason
3. Print summary

5+ tests (parse + dispatch unit tests with mock fetch; full e2e is hard in test).
Commit: `feat(cli): sharon receive — poll inbox + dispatch + record`

### P6T5 — /me/inbox Astro page
Client-fetched list. Each row: skill name + version + reason + leader avatar + 我已了解 + 查看 link to /skills?slug=…
Commit: `feat(web): /me/inbox — recipient inbox UI`

### P6T6 — leader push UI + /leader/pushes retention page
- `skills.astro` (leader-only): "📤 推送给成员" button → modal with member picker (via `/v1/users`) + reason textarea → POST `/v1/pushes`. Button only renders when `/v1/me` shows role=leader.
- `/leader/pushes` page: GET `/v1/pushes/sent` → table with retention counts.

Commit: `feat(web): leader 推送 UI + /leader/pushes retention dashboard`

### P6T7 — README + memory + push v1 complete
Mark Phase 6 ✅, add `sharon receive` to CLI cheat sheet, document the push flow. Memory snapshot. Push.

Commit: `docs: mark Phase 6 done + v1 release notes`

---

## Verification gate

End of phase:
1. After seed+approval+login, leader picks a recipient, types reason, POSTs push → recipient's `/me/inbox` shows it
2. Recipient runs `sharon receive` → file lands in `~/.claude/skills/<slug>/`, server marks receipt installed
3. Recipient runs `sharon uninstall <slug>` → leader's `/leader/pushes` shows uninstalled count incremented
4. CI green; full test suite green

---

## Carry-forward (post-v1)

- All Phase 1-5 carry-forward still applies
- `sharon receive` is one-shot; a daemon mode (`sharon receive --watch`) is v1.x
- Leader UI for push has no autocomplete on member picker — picks from full list
- Push of non-skill kinds (viki-rule, workflow, prompt-template) needs server-side `kind` accepted as a parameter; today the route hard-codes `kind: 'skill'`
- No history view (audit log exists but not surfaced)

---

## Done definition

- [x] All 7 tasks committed
- [x] CI green on push
- [x] `pnpm -r typecheck && pnpm -r test` green (251 tests + 1 skipped)
- [x] README ⏳→✅ for Phase 6 (with "v1 完成 🎉" note)
- [x] Memory snapshot saved (`memory/phase-6-push-done.md`)
- [x] No ⏳ items left in the roadmap
