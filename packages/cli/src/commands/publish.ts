import { readFile, stat } from "node:fs/promises";
import { join, resolve, basename } from "node:path";
import { parseFrontmatter } from "@matrix-sharon/core";
import { apiFetch } from "../config.js";

export interface PublishArgs {
  dir: string;
}

export async function publishCommand(args: PublishArgs, log: (s: string) => void = console.log): Promise<void> {
  const dir = resolve(args.dir);
  const skillMdPath = join(dir, "SKILL.md");
  try {
    await stat(skillMdPath);
  } catch {
    throw new Error(`SKILL.md not found in ${dir}`);
  }
  const raw = await readFile(skillMdPath, "utf8");
  // Validate frontmatter locally for a fast failure (server checks too).
  const { frontmatter } = parseFrontmatter(raw);
  const slug = frontmatter.name || basename(dir);

  log(`→ submitting ${slug} from ${dir}…`);
  const res = await apiFetch("/v1/submissions", {
    method: "POST",
    body: { skillSlug: slug, rawSkillMd: raw },
  });
  const body = (await res.json()) as { submission: { id: string; status: string } };
  log(`✅ submission ${body.submission.id} (${body.submission.status})`);
}
