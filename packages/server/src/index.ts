import Fastify, { type FastifyInstance } from "fastify";
import fastifyCookie from "@fastify/cookie";
import { openDb } from "@matrix-sharon/adapters/storage/sqlite";
import { runMigrations } from "@matrix-sharon/adapters/storage/sqlite/migrate";
import {
  FsBundleStore,
  GithubOAuthHttp,
  SqliteAuditLog,
  SqliteCandidateStore,
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

export interface BuildAppOptions {
  /** Override Fastify logger. Default: pino in production, silent in test. */
  logger?: boolean | object;
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

  return app;
}

declare module "fastify" {
  interface FastifyInstance {
    ctx: AppContext;
  }
}

async function main(): Promise<void> {
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
    github: config.github
      ? new GithubOAuthHttp(config.github)
      : null,
  };

  const app = await buildApp(ctx);
  await app.listen({ port: config.port, host: config.host });
  app.log.info(
    `Matrix-Sharon server listening on ${config.publicBaseUrl} (oauth=${config.oauthEnabled})`
  );
}

// Boot only when this module is the entry point (not when imported by tests).
const entryHref = process.argv[1] ? new URL(`file://${process.argv[1]}`).href : "";
if (import.meta.url === entryHref) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
