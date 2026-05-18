import { describe, it, expect } from "vitest";
import { expandHandlerPath } from "../src/commands/receive.js";
import { homedir } from "node:os";
import { resolve } from "node:path";

describe("expandHandlerPath", () => {
  it("substitutes {name}", () => {
    expect(expandHandlerPath("/foo/{name}/bar", "sql-safety-gate"))
      .toBe("/foo/sql-safety-gate/bar");
  });

  it("expands ~/ to home", () => {
    const got = expandHandlerPath("~/.claude/skills/{name}/", "demo");
    expect(got).toBe(resolve(homedir(), ".claude/skills/demo/"));
  });

  it("leaves non-~ paths alone", () => {
    expect(expandHandlerPath("/abs/{name}", "demo")).toBe("/abs/demo");
  });
});
