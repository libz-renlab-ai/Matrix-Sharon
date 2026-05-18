import type { FastifyReply, FastifyRequest, RouteHandlerMethod } from "fastify";
import type { SessionPayload, User } from "@matrix-sharon/types";
import { readSessionCookie } from "./session-cookie.js";

export type AuthedHandler = (
  req: FastifyRequest,
  reply: FastifyReply,
  session: SessionPayload,
  user: User
) => Promise<unknown>;

/**
 * Wrap a route handler so it only runs for authenticated users.
 * Returns 401 {error:not_signed_in} for any failure mode.
 */
export function withAuth(handler: AuthedHandler): RouteHandlerMethod {
  return async function authedHandler(req, reply) {
    const session = readSessionCookie(req);
    if (!session) return reply.code(401).send({ error: "not_signed_in" });
    const user = await this.ctx.userStore.findById(session.uid);
    if (!user) return reply.code(401).send({ error: "not_signed_in" });
    return handler(req, reply, session, user);
  };
}
