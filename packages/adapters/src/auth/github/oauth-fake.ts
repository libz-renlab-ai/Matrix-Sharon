import type { GithubProfile } from "@matrix-sharon/types";
import { type GithubOAuth, InvalidOauthCodeError } from "@matrix-sharon/ports";

/**
 * In-memory fake of GithubOAuth for tests.
 *
 * Usage:
 *   const fake = new GithubOAuthFake();
 *   fake.register("test-code-1", { login: "octocat", ... });
 *   // then drive the route under test with code=test-code-1
 */
export class GithubOAuthFake implements GithubOAuth {
  private readonly profiles = new Map<string, GithubProfile>();

  /** Pre-register a code → profile mapping for the test. */
  register(code: string, profile: GithubProfile): void {
    this.profiles.set(code, profile);
  }

  authorizeUrl(input: { state: string; redirectUri: string }): string {
    const params = new URLSearchParams({
      state: input.state,
      redirect_uri: input.redirectUri,
    });
    return `http://fake.local/oauth/authorize?${params.toString()}`;
  }

  async exchangeCode(input: { code: string; redirectUri: string }): Promise<{ accessToken: string }> {
    if (!this.profiles.has(input.code)) {
      throw new InvalidOauthCodeError(`fake: code '${input.code}' not registered`);
    }
    return { accessToken: `fake-token-for-${input.code}` };
  }

  async fetchProfile(input: { accessToken: string }): Promise<GithubProfile> {
    const prefix = "fake-token-for-";
    if (!input.accessToken.startsWith(prefix)) {
      throw new Error(`fake: not a fake token: ${input.accessToken}`);
    }
    const code = input.accessToken.slice(prefix.length);
    const profile = this.profiles.get(code);
    if (!profile) {
      throw new Error(`fake: no profile registered for code '${code}'`);
    }
    return profile;
  }
}
