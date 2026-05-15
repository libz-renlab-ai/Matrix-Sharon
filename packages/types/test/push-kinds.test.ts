import { describe, it, expect } from "vitest";
import { PUSH_KINDS } from "../src/push-kinds.js";

describe("PUSH_KINDS registry", () => {
  it("has skill available in v1", () => {
    expect(PUSH_KINDS.skill.available).toBe(true);
  });

  it("has viki-rule, workflow, prompt-template as future (disabled)", () => {
    expect(PUSH_KINDS["viki-rule"].available).toBe(false);
    expect(PUSH_KINDS.workflow.available).toBe(false);
    expect(PUSH_KINDS["prompt-template"].available).toBe(false);
  });

  it("every kind has a handler", () => {
    for (const def of Object.values(PUSH_KINDS)) {
      expect(def.handler).toBeDefined();
      expect(["fs-extract", "fs-write-file", "delegate-cli"]).toContain(def.handler.type);
    }
  });

  it("viki-rule delegates to viki CLI (integration contract)", () => {
    const h = PUSH_KINDS["viki-rule"].handler;
    expect(h.type).toBe("delegate-cli");
    if (h.type === "delegate-cli") {
      expect(h.cmd).toContain("viki import-rules");
    }
  });
});
