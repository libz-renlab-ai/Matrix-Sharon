import type { FastifyReply, FastifyRequest } from "fastify";
// Import for its type augmentation (adds cookies / unsignCookie / setCookie / clearCookie).
import "@fastify/cookie";
import {
  decodeSession,
  encodeSession,
  isExpired,
  DEFAULT_SESSION_TTL_MS,
} from "@matrix-sharon/core";
import type { SessionPayload } from "@matrix-sharon/types";

export const SESSION_COOKIE = "sharon_session";

export function setSessionCookie(
  reply: FastifyReply,
  payload: SessionPayload,
  opts: { secure: boolean }
): void {
  const encoded = encodeSession(payload);
  reply.setCookie(SESSION_COOKIE, encoded, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: opts.secure,
    signed: true,
    maxAge: Math.floor(DEFAULT_SESSION_TTL_MS / 1000),
  });
}

export function clearSessionCookie(reply: FastifyReply): void {
  reply.clearCookie(SESSION_COOKIE, { path: "/" });
}

export function readSessionCookie(req: FastifyRequest): SessionPayload | null {
  const raw = req.cookies[SESSION_COOKIE];
  if (!raw) return null;
  const unsigned = req.unsignCookie(raw);
  if (!unsigned.valid || unsigned.value == null) return null;
  let payload: SessionPayload;
  try {
    payload = decodeSession(unsigned.value);
  } catch {
    return null;
  }
  if (isExpired(payload, Date.now())) return null;
  return payload;
}
