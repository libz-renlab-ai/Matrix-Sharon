import { describe, it, expect } from "vitest";
import { GithubOAuthHttp } from "../../../src/auth/github/oauth-http.js";

describe("GithubOAuthHttp", () => {
  describe("authorizeUrl", () => {
    const http = new GithubOAuthHttp({
      clientId: "test-client-id",
      clientSecret: "test-secret",
    });

    it("targets github.com/login/oauth/authorize", () => {
      const url = http.authorizeUrl({
        state: "abc123",
        redirectUri: "http://127.0.0.1:4321/auth/callback",
      });
      expect(url).toMatch(/^https:\/\/github\.com\/login\/oauth\/authorize\?/);
    });

    it("includes client_id, state, redirect_uri, scope", () => {
      const url = http.authorizeUrl({
        state: "abc123",
        redirectUri: "http://127.0.0.1:4321/auth/callback",
      });
      const parsed = new URL(url);
      expect(parsed.searchParams.get("client_id")).toBe("test-client-id");
      expect(parsed.searchParams.get("state")).toBe("abc123");
      expect(parsed.searchParams.get("redirect_uri")).toBe(
        "http://127.0.0.1:4321/auth/callback"
      );
      const scope = parsed.searchParams.get("scope") ?? "";
      expect(scope).toContain("read:user");
      expect(scope).toContain("user:email");
      expect(scope).toContain("read:org");
    });
  });

  describe("real GitHub smoke (skipped unless GITHUB_TEST_TOKEN)", () => {
    const token = process.env["GITHUB_TEST_TOKEN"];
    const condition = token ? it : it.skip;

    condition("fetchProfile returns a real-shaped profile", async () => {
      const http = new GithubOAuthHttp({
        clientId: "irrelevant",
        clientSecret: "irrelevant",
      });
      const profile = await http.fetchProfile({ accessToken: token! });
      expect(typeof profile.login).toBe("string");
      expect(typeof profile.id).toBe("number");
      expect(Array.isArray(profile.orgs)).toBe(true);
    });
  });
});
