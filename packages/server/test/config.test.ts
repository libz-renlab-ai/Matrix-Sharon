import { describe, it, expect } from "vitest";
import { loadConfig, ConfigError } from "../src/config.js";

function env(extra: Record<string, string | undefined> = {}): NodeJS.ProcessEnv {
  // Start with a clean slate so the test isn't affected by the dev's local env.
  const base: NodeJS.ProcessEnv = { NODE_ENV: "test" };
  for (const [k, v] of Object.entries(extra)) {
    if (v !== undefined) base[k] = v;
  }
  return base;
}

describe("loadConfig — defaults", () => {
  it("defaults port=4321, host=127.0.0.1, publicBaseUrl computed", () => {
    const c = loadConfig(env({ SHARON_SESSION_SECRET: "x".repeat(32) }));
    expect(c.port).toBe(4321);
    expect(c.host).toBe("127.0.0.1");
    expect(c.publicBaseUrl).toBe("http://127.0.0.1:4321");
  });

  it("respects PORT, HOST, SHARON_PUBLIC_BASE_URL", () => {
    const c = loadConfig(
      env({
        PORT: "5500",
        HOST: "0.0.0.0",
        SHARON_PUBLIC_BASE_URL: "https://sharon.example.com",
        SHARON_SESSION_SECRET: "y".repeat(32),
      })
    );
    expect(c.port).toBe(5500);
    expect(c.host).toBe("0.0.0.0");
    expect(c.publicBaseUrl).toBe("https://sharon.example.com");
  });
});

describe("loadConfig — OAuth env", () => {
  it("oauthEnabled=false when neither GH var set", () => {
    const c = loadConfig(env({ SHARON_SESSION_SECRET: "x".repeat(32) }));
    expect(c.oauthEnabled).toBe(false);
    expect(c.github).toBeUndefined();
  });

  it("oauthEnabled=true when both GH vars set", () => {
    const c = loadConfig(
      env({
        SHARON_SESSION_SECRET: "x".repeat(32),
        GITHUB_CLIENT_ID: "client",
        GITHUB_CLIENT_SECRET: "secret",
      })
    );
    expect(c.oauthEnabled).toBe(true);
    expect(c.github).toEqual({ clientId: "client", clientSecret: "secret" });
  });

  it("throws ConfigError when only client_id is set", () => {
    expect(() =>
      loadConfig(
        env({
          SHARON_SESSION_SECRET: "x".repeat(32),
          GITHUB_CLIENT_ID: "client",
        })
      )
    ).toThrow(ConfigError);
  });

  it("throws ConfigError when only client_secret is set", () => {
    expect(() =>
      loadConfig(
        env({
          SHARON_SESSION_SECRET: "x".repeat(32),
          GITHUB_CLIENT_SECRET: "secret",
        })
      )
    ).toThrow(ConfigError);
  });
});

describe("loadConfig — cookie secret", () => {
  it("requires SHARON_SESSION_SECRET in production", () => {
    expect(() => loadConfig(env({ NODE_ENV: "production" }))).toThrow(ConfigError);
  });

  it("uses an insecure dev default in non-production when missing", () => {
    const c = loadConfig(env({ NODE_ENV: "development" }));
    expect(c.cookieSecret.length).toBeGreaterThan(0);
  });

  it("requires SHARON_SESSION_SECRET to be at least 16 chars when supplied", () => {
    expect(() => loadConfig(env({ SHARON_SESSION_SECRET: "short" }))).toThrow(ConfigError);
  });
});
