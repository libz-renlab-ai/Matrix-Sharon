import type { GithubProfile } from "@matrix-sharon/types";

/**
 * Port for the GitHub OAuth provider.
 *
 * Two adapters in @matrix-sharon/adapters:
 *   - GithubOAuthHttp — real, calls api.github.com
 *   - GithubOAuthFake — in-memory, drives tests
 */
export interface GithubOAuth {
  /** Build the URL to redirect the user to for GitHub's consent screen. */
  authorizeUrl(input: { state: string; redirectUri: string }): string;

  /** Exchange an OAuth code for an access token. */
  exchangeCode(input: { code: string; redirectUri: string }): Promise<{ accessToken: string }>;

  /** Fetch the user profile + org memberships for an access token. */
  fetchProfile(input: { accessToken: string }): Promise<GithubProfile>;
}

/** Thrown by adapters when the OAuth code is unknown / expired / consumed. */
export class InvalidOauthCodeError extends Error {
  constructor(message = "invalid OAuth code") {
    super(message);
    this.name = "InvalidOauthCodeError";
  }
}
