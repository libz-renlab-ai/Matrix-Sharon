import { load as yamlLoad, YAMLException } from "js-yaml";
import { type Frontmatter, FrontmatterSchema } from "@matrix-sharon/types";

export class FrontmatterParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FrontmatterParseError";
  }
}

const FENCE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

export interface ParsedSkillMd {
  frontmatter: Frontmatter;
  body: string;
}

/** Parse a SKILL.md (frontmatter + body). Throws FrontmatterParseError on any failure. */
export function parseFrontmatter(md: string): ParsedSkillMd {
  const match = FENCE.exec(md);
  if (!match) {
    throw new FrontmatterParseError(
      "SKILL.md must start with --- ... --- frontmatter fence"
    );
  }
  const yaml = match[1]!;
  const body = match[2]!;

  let raw: unknown;
  try {
    raw = yamlLoad(yaml);
  } catch (e) {
    if (e instanceof YAMLException) {
      throw new FrontmatterParseError(`malformed YAML: ${e.message}`);
    }
    throw e;
  }
  if (typeof raw !== "object" || raw === null) {
    throw new FrontmatterParseError("YAML frontmatter must be an object");
  }
  const parsed = FrontmatterSchema.safeParse(raw);
  if (!parsed.success) {
    throw new FrontmatterParseError(
      `frontmatter validation: ${parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ")}`
    );
  }
  return { frontmatter: parsed.data, body };
}
