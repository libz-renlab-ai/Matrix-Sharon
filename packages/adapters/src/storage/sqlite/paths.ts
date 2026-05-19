import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, resolve } from "node:path";

// Walk up from cwd looking for the pnpm-workspace.yaml that anchors the
// monorepo. Returns the anchor dir, or null if not found. Lets `pnpm seed`
// (cwd = repo root) and `pnpm --filter @matrix-sharon/server dev`
// (cwd = packages/server) agree on a single `data/` location.
function findMonorepoRoot(): string | null {
  let dir = process.cwd();
  for (let i = 0; i < 6; i++) {
    if (existsSync(resolve(dir, "pnpm-workspace.yaml"))) return dir;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

/** Resolve the runtime data directory. Honors SHARON_DATA_DIR env var.
 *  In a monorepo, anchors to the repo root so all packages share one DB. */
export function resolveDataDir(): string {
  if (process.env.SHARON_DATA_DIR) return resolve(process.env.SHARON_DATA_DIR);
  const root = findMonorepoRoot();
  return resolve(root ?? process.cwd(), "data");
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
