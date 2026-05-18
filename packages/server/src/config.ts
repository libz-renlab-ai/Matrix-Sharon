export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

export interface AppConfig {
  port: number;
  host: string;
  publicBaseUrl: string;
  cookieSecret: string;
  oauthEnabled: boolean;
  github?: {
    clientId: string;
    clientSecret: string;
  };
}

const DEV_COOKIE_SECRET = "INSECURE-DEV-ONLY-NEVER-USE-IN-PROD-0123456789";

export function loadConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const portRaw = env["PORT"] ?? "4321";
  const port = Number(portRaw);
  if (!Number.isFinite(port) || port <= 0 || port > 65535) {
    throw new ConfigError(`PORT must be a valid port number, got '${portRaw}'`);
  }
  const host = env["HOST"] ?? "127.0.0.1";
  const publicBaseUrl = env["SHARON_PUBLIC_BASE_URL"] ?? `http://${host}:${port}`;

  const nodeEnv = env["NODE_ENV"] ?? "development";
  const secret = env["SHARON_SESSION_SECRET"];
  let cookieSecret: string;
  if (secret) {
    if (secret.length < 16) {
      throw new ConfigError("SHARON_SESSION_SECRET must be at least 16 characters");
    }
    cookieSecret = secret;
  } else if (nodeEnv === "production") {
    throw new ConfigError("SHARON_SESSION_SECRET is required in production");
  } else {
    cookieSecret = DEV_COOKIE_SECRET;
    // eslint-disable-next-line no-console
    console.warn(
      "[sharon] WARN: using insecure dev cookie secret; set SHARON_SESSION_SECRET for any real use"
    );
  }

  const clientId = env["GITHUB_CLIENT_ID"];
  const clientSecret = env["GITHUB_CLIENT_SECRET"];
  if ((clientId && !clientSecret) || (!clientId && clientSecret)) {
    throw new ConfigError(
      "GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must both be set, or both omitted"
    );
  }
  const oauthEnabled = Boolean(clientId && clientSecret);

  const base: AppConfig = {
    port,
    host,
    publicBaseUrl,
    cookieSecret,
    oauthEnabled,
  };
  if (oauthEnabled) {
    base.github = { clientId: clientId!, clientSecret: clientSecret! };
  }
  return base;
}
