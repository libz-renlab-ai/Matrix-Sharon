import { rm, stat } from "node:fs/promises";
import { join } from "node:path";
import { apiFetch, SKILLS_DIR } from "../config.js";

export interface UninstallArgs {
  slug: string;
  yes?: boolean;
}

async function exists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

export async function uninstallCommand(args: UninstallArgs, log: (s: string) => void = console.log): Promise<void> {
  const target = join(SKILLS_DIR, args.slug);
  const dirExists = await exists(target);

  // Server-side record first — even if local rm fails, server reflects user intent.
  await apiFetch(`/v1/installs/${encodeURIComponent(args.slug)}`, { method: "DELETE" });
  log(`  ✓ server: marked uninstalled`);

  if (dirExists) {
    await rm(target, { recursive: true, force: true });
    log(`  ✓ removed ${target}`);
  } else {
    log(`  · directory not present (${target}) — server-only update`);
  }
  log(`✅ uninstalled ${args.slug}`);
}
