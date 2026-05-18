# Matrix-Sharon — Setup

End-to-end guide for running Matrix-Sharon on a real machine, from cold
checkout to the first leader logging in and approving a skill.

---

## 1. Prerequisites

- **Node.js ≥ 22** (`node --version` to check)
- **pnpm ≥ 9** (`corepack enable && corepack prepare pnpm@10 --activate`)
- A **GitHub account** for OAuth login

If you're deploying via Docker instead, only Docker ≥ 24 is required — skip
to [§5 Docker deploy](#5-docker-deploy).

---

## 2. Register a GitHub OAuth App

The first thing you need is a GitHub OAuth App. This gives users a "Sign in
with GitHub" button.

1. Open <https://github.com/settings/developers>
2. Click **New OAuth App**
3. Fill in:
   | Field | Value |
   | --- | --- |
   | Application name | `Matrix-Sharon (your-team)` |
   | Homepage URL | `http://127.0.0.1:4321` *(or your real URL)* |
   | Authorization callback URL | `http://127.0.0.1:4321/auth/callback` |
4. Click **Register application**
5. On the next page, copy the **Client ID**
6. Click **Generate a new client secret** and copy the secret immediately
   (GitHub only shows it once)

For production, set both URLs to your real domain (e.g.,
`https://sharon.example.com` and `https://sharon.example.com/auth/callback`).

---

## 3. Local dev setup

```bash
# 1. Clone
git clone https://github.com/libz-renlab-ai/Matrix-Sharon.git
cd Matrix-Sharon

# 2. Install
pnpm install

# 3. Environment
cp .env.example .env
# Edit .env — fill in SHARON_SESSION_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET.
# For SHARON_SESSION_SECRET, generate a random 32-byte hex string:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 4. (Optional) Seed three sample skills so the browse page isn't empty
pnpm seed

# 5. Boot server + web concurrently
pnpm dev
```

You should now have:
- **server** on http://127.0.0.1:4321 (API)
- **web**    on http://127.0.0.1:4322 (Astro dev with /v1 proxied to server)

Open <http://127.0.0.1:4322> and click **使用 GitHub 登录** in the top-right.

### 3.1. First-leader bootstrap

**The first user who logs in via GitHub becomes the leader, automatically.**
There is no separate setup step. Make sure you are that first user.

Subsequent users default to `member`. The leader can promote / demote via the
admin UI (v1.1+) or directly in SQLite:
```sql
UPDATE users SET role = 'leader' WHERE github_id = 12345;
```

---

## 4. End-to-end smoke walkthrough

After login, exercise the full v1 flow:

1. **Browse** — visit `/browse` to see seeded skills.
2. **Detail** — click a card → markdown README rendered.
3. **One-click install** — click "→ 安装到本地" on a detail page. This
   issues a 5-minute `install-intent` token, opens `sharon://install?token=…`
   (handled by the local CLI), and falls back to "复制命令" if the protocol
   handler isn't registered.
4. **Member submission** — `SHARON_TOKEN=<cookie> pnpm sharon publish ./my-skill-dir`
   from a directory containing a `SKILL.md`.
5. **Leader approval** — log in as leader, visit `/leader/queue`, click 通过.
   This atomically creates an immutable `SkillVersion` (with `bundle.tgz`).
6. **Leader push** — on a skill detail page (as leader), click **推送给成员**,
   pick recipients, write a reason. Receivers see it at `/me/inbox`.
7. **Receive on the recipient side** — `SHARON_TOKEN=<recipient-cookie>
   pnpm sharon receive` polls the inbox, installs the pushed skill, and
   reports `done` / `failed` back to the server. Leader's
   `/leader/pushes` now shows retention numbers.
8. **Uninstall signal** — recipient uninstalls (`pnpm sharon uninstall
   <slug>`) → push receipt flips to `uninstalled` → leader sees the
   regression in `/leader/pushes`.

> **Tip:** `SHARON_TOKEN` is just the `sharon_session` cookie. In Chrome
> DevTools → Application → Cookies → `http://127.0.0.1:4322`, copy the
> `sharon_session` value and export it as `SHARON_TOKEN=<that-value>`.

---

## 5. Docker deploy

A self-hosted single-image deployment. Server + web on a single port (4321).

```bash
# 1. Same OAuth registration as §2, but with your real callback URL.
# 2. cp .env.example .env and fill in.
# 3.
docker compose build
docker compose up -d

# Verify
curl http://127.0.0.1:4321/health
# → {"ok":true,"ts":…}
```

Data (SQLite + bundles) lives in the named volume `sharon-data` mounted at
`/data`. To back it up:
```bash
docker run --rm -v sharon-data:/data -v "$PWD":/backup alpine \
  tar czf /backup/sharon-backup-$(date +%F).tar.gz -C /data .
```

### 5.1. Behind a reverse proxy

If you front sharon with nginx/caddy on a real domain, set
`SHARON_PUBLIC_BASE_URL=https://sharon.example.com` in `.env` so the
GitHub OAuth callback URL is built correctly. Also update the OAuth App's
callback URL on github.com to match.

### 5.2. Promoting yourself to leader (if needed)

If the wrong account logged in first:
```bash
docker compose exec sharon sh -c "sqlite3 /data/sharon.db \"UPDATE users SET role = 'leader' WHERE github_id = <your-id>;\""
```

You can find `<your-id>` at <https://api.github.com/users/your-username>.

---

## 6. Common gotchas

| Symptom | Cause | Fix |
| --- | --- | --- |
| `/login/github` returns 503 | `GITHUB_CLIENT_ID/SECRET` not set | Put them in `.env`, restart server |
| "OAuth callback URL mismatch" | Callback URL on github.com ≠ `SHARON_PUBLIC_BASE_URL` + `/auth/callback` | Update either side to match exactly |
| Browser shows web on 4322 but `/v1/skills` 404s | Server not running on 4321 | Check `pnpm dev` started both processes |
| `sharon receive` says "401 not_signed_in" | `SHARON_TOKEN` env var missing or wrong | Re-copy `sharon_session` cookie from browser |
| Cookie secret warning at startup | `SHARON_SESSION_SECRET` not set; dev fallback in use | Set a real secret — required in production (server refuses to boot) |
| Astro dev hot reload not picking up edits | Vite cache stale | `rm -rf packages/web/.astro packages/web/node_modules/.vite` |

---

## 7. Upgrade path

```bash
git pull
pnpm install            # picks up new deps
pnpm typecheck && pnpm test   # sanity check
pnpm dev                # or: docker compose up -d --build
```

Migrations are embedded as TypeScript constants
(`packages/adapters/src/storage/sqlite/migrations/_embedded.ts`) and apply
automatically on boot. Schema changes ship as new entries in the
`MIGRATIONS` array — never edit a shipped migration.
