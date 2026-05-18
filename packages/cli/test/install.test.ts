import { describe, it, expect } from "vitest";
import { parseSlugAt } from "../src/commands/install.js";

describe("parseSlugAt", () => {
  it("parses bare slug → no semver", () => {
    expect(parseSlugAt("foo")).toEqual({ slug: "foo" });
  });
  it("parses slug@1", () => {
    expect(parseSlugAt("foo@1")).toEqual({ slug: "foo", semver: 1 });
  });
  it("parses slug@42", () => {
    expect(parseSlugAt("sql-safety-gate@42")).toEqual({
      slug: "sql-safety-gate",
      semver: 42,
    });
  });
  it("throws on non-integer semver", () => {
    expect(() => parseSlugAt("foo@bar")).toThrow();
  });
  it("throws on zero semver", () => {
    expect(() => parseSlugAt("foo@0")).toThrow();
  });
});
