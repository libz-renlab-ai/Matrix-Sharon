import Fastify, { type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import fastifyStatic from "@fastify/static";
import { existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

// Auto-load .env at the earliest moment so config.ts and the gating in
// buildApp see whatever the user wrote in there. Walks up from cwd looking
// for .env in current dir, parent, and grandparent (repo root for monorepo).
// loadEnvFile does not overwrite existing process.env, so explicit env still wins.
const loadEnv = (process as unknown as { loadEnvFile?: (p: string) => void }).loadEnvFile;
if (typeof loadEnv === "function") {
  for (const candidate of [".env", "../.env", "../../.env"]) {
    if (existsSync(candidate)) {
      try { loadEnv(candidate); break; } catch { /* ignore */ }
    }
  }
}
import { openDb } from "@matrix-sharon/adapters/storage/sqlite";
import { runMigrations } from "@matrix-sharon/adapters/storage/sqlite/migrate";
import {
  FsBundleStore,
  GithubOAuthHttp,
  SqliteAuditLog,
  SqliteCandidateStore,
  SqliteInstallStore,
  SqlitePushStore,
  SqliteSkillStore,
  SqliteSubmissionStore,
  SqliteUserStore,
} from "@matrix-sharon/adapters";
import { loadConfig } from "./config.js";
import type { AppContext } from "./context.js";
import { registerHealthRoutes } from "./routes/health.js";
import { registerAuthRoutes } from "./routes/auth.js";
import { registerMeRoutes } from "./routes/me.js";
import { registerSkillRoutes } from "./routes/skills.js";
import { registerCandidateRoutes } from "./routes/candidates.js";
import { registerSubmissionRoutes } from "./routes/submissions.js";
import { registerInstallRoutes } from "./routes/install.js";
import { registerPushRoutes } from "./routes/pushes.js";
import { registerDevAuthRoutes } from "./routes/dev-auth.js";

export interface BuildAppOptions {
  /** Override Fastify logger. Default: pino in production, silent in test. */
  logger?: boolean | object;
  /**
   * Absolute path to a built Astro `dist/` directory to serve at /. If set
   * and the path exists, the web bundle is mounted alongside the API so a
   * single-port deploy works. Default: null (no static mount — dev uses
   * `astro dev` on a separate port with vite proxying /v1 → server).
   */
  webDist?: string | null;
}

export async function buildApp(ctx: AppContext, opts: BuildAppOptions = {}): Promise<FastifyInstance> {
  const logger = opts.logger ?? (process.env["NODE_ENV"] === "test" ? false : true);
  const app = Fastify({ logger });
  await app.register(fastifyCookie, { secret: ctx.config.cookieSecret });

  // Make ctx reachable inside route handlers via decorator (typed below).
  app.decorate("ctx", ctx);

  await registerHealthRoutes(app);
  await registerAuthRoutes(app);
  await registerMeRoutes(app);
  await registerSkillRoutes(app);
  await registerCandidateRoutes(app);
  await registerSubmissionRoutes(app);
  await registerInstallRoutes(app);
  await registerPushRoutes(app);

  // Dev-only OAuth bypass — gated by SHARON_DEV_AUTH=true and refused in
  // production. Lets local trials skip the GitHub OAuth registration step.
  if (process.env["SHARON_DEV_AUTH"] === "true" && process.env["NODE_ENV"] !== "production") {
    await registerDevAuthRoutes(app);
    app.log.warn("SHARON_DEV_AUTH enabled — /dev-login is OPEN. Do not use in production.");
  }

  if (opts.webDist && existsSync(opts.webDist) && statSync(opts.webDist).isDirectory()) {
    await app.register(fastifyStatic, {
      root: opts.webDist,
      prefix: "/",
      extensions: ["html"],
      index: ["index.html"],
    });
    app.log.info(`serving web bundle from ${opts.webDist}`);
  }

  return app;
}

declare module "fastify" {
  interface FastifyInstance {
    ctx: AppContext;
  }
}

export async function main(): Promise<void> {
  const config = loadConfig();
  const db = openDb();
  await runMigrations(db);

  const ctx: AppContext = {
    config,
    db,
    userStore: new SqliteUserStore(db),
    skillStore: new SqliteSkillStore(db),
    candidateStore: new SqliteCandidateStore(db),
    submissionStore: new SqliteSubmissionStore(db),
    auditLog: new SqliteAuditLog(db),
    bundleStore: new FsBundleStore(),
    installStore: new SqliteInstallStore(db),
    pushStore: new SqlitePushStore(db),
    github: config.github
      ? new GithubOAuthHttp(config.github)
      : null,
  };

  // Auto-mount web bundle if SHARON_WEB_DIST points at a built astro dist/.
  // The Docker image sets this; local dev leaves it unset and uses astro dev.
  const webDist = process.env["SHARON_WEB_DIST"]
    ? resolve(process.env["SHARON_WEB_DIST"])
    : null;

  const app = await buildApp(ctx, { webDist });
  await app.listen({ port: config.port, host: config.host });
  app.log.info(
    `Matrix-Sharon server listening on ${config.publicBaseUrl} (oauth=${config.oauthEnabled})`
  );
}

// Auto-boot when invoked via the standalone `tsx src/index.ts` dev script.
// The bin shim at bin/sharon-server.mjs calls main() explicitly, so this
// check just covers the `tsx watch src/index.ts` dev path.
const argv1 = process.argv[1];
if (argv1 && /[\\\/]src[\\\/]index\.ts$/.test(argv1)) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
