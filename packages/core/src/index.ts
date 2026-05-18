/**
 * @matrix-sharon/core — pure business logic (IO-free).
 *
 * Phase 2: OAuth state codec, session payload codec.
 * Future phases: frontmatter validation, approval state machine,
 * semver allocation, candidate diff generation, PUSH_KINDS dispatch planning.
 */
export const CORE_VERSION = "0.0.0" as const;
export * from "./oauth-state.js";
