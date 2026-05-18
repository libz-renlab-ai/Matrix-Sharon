import { describe, it, expect } from "vitest";
import {
  generateState,
  encodeState,
  decodeState,
  statesMatch,
} from "../src/oauth-state.js";

describe("generateState", () => {
  it("uses the rand fn for nonce and defaults returnTo to '/'", () => {
    const s = generateState(() => "abc123");
    expect(s.nonce).toBe("abc123");
    expect(s.returnTo).toBe("/");
  });

  it("respects returnTo argument", () => {
    const s = generateState(() => "x", "/me/queue");
    expect(s.returnTo).toBe("/me/queue");
  });
});

describe("encodeState/decodeState round-trip", () => {
  it("encodes then decodes back to the original", () => {
    const original = { nonce: "deadbeef", returnTo: "/skills/sql-safety-gate" };
    const encoded = encodeState(original);
    expect(typeof encoded).toBe("string");
    const decoded = decodeState(encoded);
    expect(decoded).toEqual(original);
  });

  it("decode rejects garbage base64", () => {
    expect(() => decodeState("!!!not-base64!!!")).toThrow();
  });

  it("decode rejects valid base64 with wrong shape", () => {
    const bad = Buffer.from(JSON.stringify({ foo: "bar" })).toString("base64url");
    expect(() => decodeState(bad)).toThrow();
  });
});

describe("statesMatch", () => {
  it("returns true for identical strings", () => {
    expect(statesMatch("abc", "abc")).toBe(true);
  });

  it("returns false for different strings of same length", () => {
    expect(statesMatch("abc", "abd")).toBe(false);
  });

  it("returns false for different lengths", () => {
    expect(statesMatch("ab", "abc")).toBe(false);
  });

  it("returns false for empty inputs", () => {
    expect(statesMatch("", "x")).toBe(false);
    expect(statesMatch("", "")).toBe(false);
  });
});
