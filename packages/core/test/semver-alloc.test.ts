import { describe, it, expect } from "vitest";
import { nextSemver } from "../src/semver-alloc.js";

describe("nextSemver", () => {
  it("0 → 1", () => {
    expect(nextSemver(0)).toBe(1);
  });
  it("1 → 2", () => {
    expect(nextSemver(1)).toBe(2);
  });
  it("99 → 100", () => {
    expect(nextSemver(99)).toBe(100);
  });
  it("throws on negative input", () => {
    expect(() => nextSemver(-1)).toThrow();
  });
  it("throws on non-integer", () => {
    expect(() => nextSemver(1.5)).toThrow();
  });
});
