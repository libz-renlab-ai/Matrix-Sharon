import { describe, it, expect } from "vitest";
import type { GithubProfile } from "@matrix-sharon/types";
import { InvalidOauthCodeError } from "@matrix-sharon/ports";
import { GithubOAuthFake } from "../../../src/auth/github/oauth-fake.js";

const octocat: GithubProfile = {
  login: "octocat",
  id: 583231,
  name: "The Octocat",
  email: "octo@github.com",
  avatarUrl: "https://avatars.githubusercontent.com/u/583231?v=4",
  orgs: ["github"],
};

describe("GithubOAuthFake", () => {
  it("authorizeUrl returns a deterministic local URL with state + redirect_uri", () => {
    const fake = new GithubOAuthFake();
    const url = fake.authorizeUrl({
      state: "abc",
      redirectUri: "http://127.0.0.1:4321/auth/callback",
    });
    expect(url).toContain("fake.local");
    expect(url).toContain("state=abc");
    expect(url).toContain(encodeURIComponent("http://127.0.0.1:4321/auth/callback"));
  });

  it("round-trips a registered code through exchangeCode → fetchProfile", async () => {
    const fake = new GithubOAuthFake();
    fake.register("valid-code", octocat);

    const { accessToken } = await fake.exchangeCode({
      code: "valid-code",
      redirectUri: "http://127.0.0.1:4321/auth/callback",
    });
    expect(accessToken).toBeTruthy();

    const profile = await fake.fetchProfile({ accessToken });
    expect(profile).toEqual(octocat);
  });

  it("exchangeCode throws InvalidOauthCodeError for unknown code", async () => {
    const fake = new GithubOAuthFake();
    await expect(
      fake.exchangeCode({ code: "nope", redirectUri: "http://x" })
    ).rejects.toBeInstanceOf(InvalidOauthCodeError);
  });

  it("fetchProfile throws when token is unknown", async () => {
    const fake = new GithubOAuthFake();
    await expect(fake.fetchProfile({ accessToken: "not-a-real-token" })).rejects.toThrow();
  });

  it("can register multiple users and dispatch by code", async () => {
    const ghost: GithubProfile = {
      login: "ghost",
      id: 1,
      name: "Ghost",
      email: null,
      avatarUrl: null,
      orgs: [],
    };
    const fake = new GithubOAuthFake();
    fake.register("code-a", octocat);
    fake.register("code-b", ghost);

    const a = await fake.exchangeCode({ code: "code-a", redirectUri: "x" });
    const b = await fake.exchangeCode({ code: "code-b", redirectUri: "x" });
    expect(await fake.fetchProfile({ accessToken: a.accessToken })).toEqual(octocat);
    expect(await fake.fetchProfile({ accessToken: b.accessToken })).toEqual(ghost);
  });
});
