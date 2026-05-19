import { describe, expect, it } from "vitest";
import { SLUG_PATTERN, isValidSlug, assertValidSlug } from "../src/slug.js";

describe("SLUG_PATTERN", () => {
  it.each([
    ["sql-safety-gate", true],
    ["i18n-key-finder", true],
    ["a", true],
    ["a-b-c", true],
    ["123", true],
    ["a".repeat(64), true],
  ])("accepts %s", (s, ok) => {
    expect(SLUG_PATTERN.test(s)).toBe(ok);
  });

  it.each([
    "",
    " ",
    "../etc/passwd",
    "a/b",
    "a\\b",
    "..",
    "-leading-hyphen",
    "UPPER",
    "with space",
    "with\nnewline",
    "with.dot",
    "a".repeat(65),
  ])("rejects %s", (s) => {
    expect(SLUG_PATTERN.test(s)).toBe(false);
    expect(isValidSlug(s)).toBe(false);
  });

  it("isValidSlug — refuses non-strings", () => {
    expect(isValidSlug(undefined)).toBe(false);
    expect(isValidSlug(null)).toBe(false);
    expect(isValidSlug(0)).toBe(false);
    expect(isValidSlug({})).toBe(false);
  });

  it("assertValidSlug — throws on bad input", () => {
    expect(() => assertValidSlug("../foo")).toThrow(/invalid slug/);
    expect(() => assertValidSlug("good-slug")).not.toThrow();
  });
});
