import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { apiFetch, SKILLS_DIR } from "../config.js";

export async function scanCommand(log: (s: string) => void = console.log): Promise<void> {
  let entries: string[];
  try {
    entries = await readdir(SKILLS_DIR);
  } catch {
    log(`(no ~/.claude/skills directory — nothing to scan)`);
    return;
  }
  let posted = 0;
  for (const slug of entries) {
    const p = join(SKILLS_DIR, slug);
    const s = await stat(p).catch(() => null);
    if (!s?.isDirectory()) continue;
    const md = await readFile(join(p, "SKILL.md"), "utf8").catch(() => null);
    if (!md) continue;
    await apiFetch("/v1/candidates", {
      method: "POST",
      body: {
        skillSlug: slug,
        fullContentMd: md,
        reason: "scanned locally",
      },
    });
    log(`  ✓ candidate posted: ${slug}`);
    posted++;
  }
  log(`✅ scan done (${posted} candidates posted)`);
}
