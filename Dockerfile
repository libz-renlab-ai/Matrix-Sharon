# Matrix-Sharon — single-image bundle (server + web on one port).
# v1 self-hosted target: one team, one box.
#
# Build:   docker build -t matrix-sharon:v1 .
# Run:     docker run -p 4321:4321 \
#            -v sharon-data:/data \
#            -e SHARON_SESSION_SECRET=... \
#            -e GITHUB_CLIENT_ID=... -e GITHUB_CLIENT_SECRET=... \
#            matrix-sharon:v1
#
# Or use docker-compose.yml.

FROM node:22-bookworm-slim AS base
WORKDIR /app
RUN corepack enable && corepack prepare pnpm@10 --activate

# ── deps stage ──────────────────────────────────────────────────────────────
# Copy lockfile + manifests first so the dep layer caches across source edits.
FROM base AS deps
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY packages/types/package.json packages/types/
COPY packages/ports/package.json packages/ports/
COPY packages/core/package.json packages/core/
COPY packages/adapters/package.json packages/adapters/
COPY packages/server/package.json packages/server/
COPY packages/cli/package.json packages/cli/
COPY packages/web/package.json packages/web/
RUN pnpm install --frozen-lockfile

# ── build stage ─────────────────────────────────────────────────────────────
# typecheck + astro build (produces packages/web/dist/).
FROM deps AS build
COPY . .
RUN pnpm -r typecheck
RUN pnpm --filter @matrix-sharon/web build

# ── runtime stage ───────────────────────────────────────────────────────────
FROM base AS runtime
ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=4321 \
    SHARON_DATA_DIR=/data \
    SHARON_WEB_DIST=/app/packages/web/dist

COPY --from=build /app /app
RUN mkdir -p /data
VOLUME ["/data"]

EXPOSE 4321
CMD ["node", "packages/server/bin/sharon-server.mjs"]
