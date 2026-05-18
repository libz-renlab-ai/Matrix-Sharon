import { type OauthState, OauthStateSchema } from "@matrix-sharon/types";

export function generateState(rand: () => string, returnTo = "/"): OauthState {
  return { nonce: rand(), returnTo };
}

export function encodeState(state: OauthState): string {
  return Buffer.from(JSON.stringify(state), "utf8").toString("base64url");
}

export function decodeState(encoded: string): OauthState {
  let json: string;
  try {
    json = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    throw new Error("decodeState: invalid base64url");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("decodeState: invalid JSON");
  }
  return OauthStateSchema.parse(parsed);
}

/**
 * Compare two state strings. Empty inputs always fail (cannot match a missing
 * cookie/query). For equal lengths, runs constant-time comparison.
 */
export function statesMatch(a: string, b: string): boolean {
  if (a.length === 0 || b.length === 0) return false;
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}
