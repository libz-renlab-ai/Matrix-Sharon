import { describe, expect, it } from "vitest";
import { sanitizeReturnTo } from "../src/return-to.js";

describe("sanitizeReturnTo", () => {
  it.each([
    "/",
    "/browse",
    "/leader/queue",
    "/skills?slug=foo",
    "/me#tab=installs",
  ])("preserves same-origin path %s", (v) => {
    expect(sanitizeReturnTo(v)).toBe(v);
  });

  it.each([
    ["https://evil.com/", "/"],
    ["http://evil.com/x", "/"],
    ["//evil.com/x", "/"],
    ["/\\evil.com", "/"],
    ["javascript:alert(1)", "/"],
    ["evil.com", "/"],
    ["", "/"],
    [undefined, "/"],
    [null, "/"],
    [42, "/"],
    [{ "/": true }, "/"],
    ["/\nset-cookie:foo=bar", "/"],
    ["/" + "a".repeat(2000), "/"],
  ])("rejects %s", (input, expected) => {
    expect(sanitizeReturnTo(input)).toBe(expected);
  });

  it("uses caller-supplied fallback", () => {
    expect(sanitizeReturnTo("https://evil", "/safe")).toBe("/safe");
  });
});
