import type { SqliteDb } from "@matrix-sharon/adapters";
import type {
  AuditLog,
  BundleStore,
  CandidateStore,
  GithubOAuth,
  InstallStore,
  PushStore,
  SkillStore,
  SubmissionStore,
  UserStore,
} from "@matrix-sharon/ports";
import type { AppConfig } from "./config.js";

/**
 * Dependency-injection bag for the Fastify app.
 *
 * Constructed by main() in production; constructed by tests with fake adapters.
 * buildApp(ctx) takes one of these and returns a Fastify instance.
 */
export interface AppContext {
  config: AppConfig;
  db: SqliteDb.Database;
  userStore: UserStore;
  skillStore: SkillStore;
  candidateStore: CandidateStore;
  submissionStore: SubmissionStore;
  auditLog: AuditLog;
  bundleStore: BundleStore;
  installStore: InstallStore;
  pushStore: PushStore;
  /** null when oauthEnabled=false in config. */
  github: GithubOAuth | null;
}
