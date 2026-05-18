import { describe, it, expect } from "vitest";
import {
  createSession,
  encodeSession,
  decodeSession,
  isExpired,
  DEFAULT_SESSION_TTL_MS,
} from "../src/session.js";

describe("createSession", () => {
  it("uses default 30-day TTL", () => {
    const now = 1_700_000_000_000;
    const s = createSession("octocat", now);
    expect(s.uid).toBe("octocat");
    expect(s.iat).toBe(now);
    expect(s.exp).toBe(now + 30 * 24 * 60 * 60 * 1000);
    expect(DEFAULT_SESSION_TTL_MS).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("respects custom TTL", () => {
    const now = 1_700_000_000_000;
    const oneHour = 60 * 60 * 1000;
    const s = createSession("octocat", now, oneHour);
    expect(s.exp).toBe(now + oneHour);
  });
});

describe("encode/decode round-trip", () => {
  it("decodes back to the original payload", () => {
    const now = Date.now();
    const original = createSession("octocat", now);
    const encoded = encodeSession(original);
    const decoded = decodeSession(encoded);
    expect(decoded).toEqual(original);
  });

  it("decode rejects garbage", () => {
    expect(() => decodeSession("!!!not-base64!!!")).toThrow();
  });

  it("decode rejects wrong shape", () => {
    const bad = Buffer.from(JSON.stringify({ foo: "bar" })).toString("base64url");
    expect(() => decodeSession(bad)).toThrow();
  });
});

describe("isExpired", () => {
  it("false when now < exp", () => {
    const s = createSession("x", 1_000_000);
    expect(isExpired(s, 1_000_500)).toBe(false);
  });

  it("false when now === exp (still inside the window — exp is exclusive)", () => {
    const s = createSession("x", 1_000_000);
    expect(isExpired(s, s.exp)).toBe(false);
  });

  it("true when now > exp", () => {
    const s = createSession("x", 1_000_000);
    expect(isExpired(s, s.exp + 1)).toBe(true);
  });
});
