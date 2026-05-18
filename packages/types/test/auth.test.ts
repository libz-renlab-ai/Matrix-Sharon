import { describe, it, expect } from "vitest";
import {
  GithubProfileSchema,
  SessionPayloadSchema,
  OauthStateSchema,
} from "../src/auth.js";

describe("GithubProfileSchema", () => {
  it("parses a valid GitHub profile", () => {
    const profile = GithubProfileSchema.parse({
      login: "octocat",
      id: 583231,
      name: "The Octocat",
      email: "octo@github.com",
      avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
      orgs: ["github", "octo-org"],
    });
    expect(profile.login).toBe("octocat");
    expect(profile.orgs).toHaveLength(2);
  });

  it("accepts null email and avatar (GitHub may hide them)", () => {
    const profile = GithubProfileSchema.parse({
      login: "ghost",
      id: 1,
      name: "Ghost",
      email: null,
      avatarUrl: null,
      orgs: [],
    });
    expect(profile.email).toBeNull();
    expect(profile.avatarUrl).toBeNull();
  });

  it("rejects missing login", () => {
    expect(() =>
      GithubProfileSchema.parse({ id: 1, name: "x", email: null, avatarUrl: null, orgs: [] })
    ).toThrow();
  });
});

describe("SessionPayloadSchema", () => {
  it("parses a valid payload", () => {
    const now = Date.now();
    const p = SessionPayloadSchema.parse({
      uid: "octocat",
      iat: now,
      exp: now + 30 * 24 * 60 * 60 * 1000,
    });
    expect(p.uid).toBe("octocat");
  });

  it("rejects missing exp", () => {
    expect(() => SessionPayloadSchema.parse({ uid: "x", iat: 1 })).toThrow();
  });

  it("rejects non-integer timestamps", () => {
    expect(() => SessionPayloadSchema.parse({ uid: "x", iat: 1.5, exp: 2 })).toThrow();
  });
});

describe("OauthStateSchema", () => {
  it("parses with explicit returnTo", () => {
    const s = OauthStateSchema.parse({ nonce: "deadbeef", returnTo: "/me" });
    expect(s.returnTo).toBe("/me");
  });

  it("defaults returnTo to '/' when omitted", () => {
    const s = OauthStateSchema.parse({ nonce: "deadbeef" });
    expect(s.returnTo).toBe("/");
  });

  it("rejects missing nonce", () => {
    expect(() => OauthStateSchema.parse({ returnTo: "/" })).toThrow();
  });
});
