import { homedir } from "node:os";
import { resolve } from "node:path";

/** Resolve the runtime data directory. Honors SHARON_DATA_DIR env var. */
export function resolveDataDir(): string {
  if (process.env.SHARON_DATA_DIR) return resolve(process.env.SHARON_DATA_DIR);
  return resolve(process.cwd(), "data");
}

export function resolveDbPath(): string {
  return resolve(resolveDataDir(), "sharon.db");
}

export function resolveBundleDir(): string {
  return resolve(resolveDataDir(), "bundles");
}

/** Expand "~" to home directory in a path. */
export function expandHome(p: string): string {
  return p.startsWith("~/") ? resolve(homedir(), p.slice(2)) : p;
}
