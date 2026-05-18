import { type SessionPayload, SessionPayloadSchema } from "@matrix-sharon/types";

export const DEFAULT_SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export function createSession(uid: string, nowMs: number, ttlMs = DEFAULT_SESSION_TTL_MS): SessionPayload {
  return { uid, iat: nowMs, exp: nowMs + ttlMs };
}

export function encodeSession(payload: SessionPayload): string {
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
}

export function decodeSession(encoded: string): SessionPayload {
  let json: string;
  try {
    json = Buffer.from(encoded, "base64url").toString("utf8");
  } catch {
    throw new Error("decodeSession: invalid base64url");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new Error("decodeSession: invalid JSON");
  }
  return SessionPayloadSchema.parse(parsed);
}

export function isExpired(payload: SessionPayload, nowMs: number): boolean {
  return nowMs > payload.exp;
}
