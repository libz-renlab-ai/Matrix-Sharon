import type { GithubProfile } from "@matrix-sharon/types";
import { type GithubOAuth, InvalidOauthCodeError } from "@matrix-sharon/ports";

const AUTHORIZE_URL = "https://github.com/login/oauth/authorize";
const ACCESS_TOKEN_URL = "https://github.com/login/oauth/access_token";
const USER_URL = "https://api.github.com/user";
const ORGS_URL = "https://api.github.com/user/orgs";
const SCOPE = "read:user user:email read:org";

export interface GithubOAuthHttpOptions {
  clientId: string;
  clientSecret: string;
  /** Override for tests / GitHub Enterprise. */
  fetchImpl?: typeof fetch;
}

export class GithubOAuthHttp implements GithubOAuth {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: GithubOAuthHttpOptions) {
    this.clientId = opts.clientId;
    this.clientSecret = opts.clientSecret;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  authorizeUrl(input: { state: string; redirectUri: string }): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      state: input.state,
      redirect_uri: input.redirectUri,
      scope: SCOPE,
    });
    return `${AUTHORIZE_URL}?${params.toString()}`;
  }

  async exchangeCode(input: { code: string; redirectUri: string }): Promise<{ accessToken: string }> {
    const res = await this.fetchImpl(ACCESS_TOKEN_URL, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code: input.code,
        redirect_uri: input.redirectUri,
      }),
    });
    if (!res.ok) {
      throw new Error(`github: access_token returned ${res.status}`);
    }
    const data = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
    if (data.error) {
      if (data.error === "bad_verification_code") {
        throw new InvalidOauthCodeError(data.error_description ?? data.error);
      }
      throw new Error(`github: ${data.error}: ${data.error_description ?? ""}`);
    }
    if (!data.access_token) {
      throw new Error("github: no access_token in response");
    }
    return { accessToken: data.access_token };
  }

  async fetchProfile(input: { accessToken: string }): Promise<GithubProfile> {
    const headers = {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${input.accessToken}`,
      "X-GitHub-Api-Version": "2022-11-28",
    };
    const [userRes, orgsRes] = await Promise.all([
      this.fetchImpl(USER_URL, { headers }),
      this.fetchImpl(ORGS_URL, { headers }),
    ]);
    if (!userRes.ok) throw new Error(`github: /user returned ${userRes.status}`);
    if (!orgsRes.ok) throw new Error(`github: /user/orgs returned ${orgsRes.status}`);

    const user = (await userRes.json()) as {
      login: string;
      id: number;
      name: string | null;
      email: string | null;
      avatar_url: string | null;
    };
    const orgs = (await orgsRes.json()) as Array<{ login: string }>;

    return {
      login: user.login,
      id: user.id,
      name: user.name ?? user.login,
      email: user.email ?? null,
      avatarUrl: user.avatar_url ?? null,
      orgs: orgs.map((o) => o.login),
    };
  }
}
