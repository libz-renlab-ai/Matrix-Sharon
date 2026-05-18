import { describe, it, expect } from "vitest";
import { parseFrontmatter, FrontmatterParseError } from "../src/frontmatter.js";

describe("parseFrontmatter", () => {
  it("parses a minimal valid SKILL.md", () => {
    const md = `---\nname: my-skill\ndescription: does a thing\n---\n# body\n`;
    const r = parseFrontmatter(md);
    expect(r.frontmatter.name).toBe("my-skill");
    expect(r.frontmatter.description).toBe("does a thing");
    expect(r.body.trim()).toBe("# body");
  });

  it("parses all optional fields", () => {
    const md = `---
name: sql-safety-gate
description: 拦 SQL
pain: 半夜跑 DROP
gain: PreToolUse hook 拦
triggers: DROP / TRUNCATE
category: safety
icon: 🛡️
---
body
`;
    const r = parseFrontmatter(md);
    expect(r.frontmatter.pain).toBe("半夜跑 DROP");
    expect(r.frontmatter.category).toBe("safety");
    expect(r.frontmatter.icon).toBe("🛡️");
  });

  it("throws FrontmatterParseError when no opening fence", () => {
    expect(() => parseFrontmatter("# no frontmatter\n")).toThrow(FrontmatterParseError);
  });

  it("throws FrontmatterParseError when no closing fence", () => {
    expect(() => parseFrontmatter("---\nname: x\n# never closed\n")).toThrow(
      FrontmatterParseError
    );
  });

  it("throws FrontmatterParseError when YAML is malformed", () => {
    expect(() => parseFrontmatter("---\nname: : :\n---\nbody\n")).toThrow(
      FrontmatterParseError
    );
  });

  it("throws FrontmatterParseError when required fields missing", () => {
    expect(() => parseFrontmatter("---\ndescription: x\n---\nbody\n")).toThrow(
      FrontmatterParseError
    );
    expect(() => parseFrontmatter("---\nname: x\n---\nbody\n")).toThrow(
      FrontmatterParseError
    );
  });

  it("rejects an invalid category enum", () => {
    expect(() =>
      parseFrontmatter("---\nname: x\ndescription: y\ncategory: notreal\n---\n")
    ).toThrow(FrontmatterParseError);
  });

  it("preserves body verbatim including markdown headings", () => {
    const md = `---\nname: x\ndescription: y\n---\n## sub\n\nparagraph\n`;
    const r = parseFrontmatter(md);
    expect(r.body).toBe("## sub\n\nparagraph\n");
  });
});
