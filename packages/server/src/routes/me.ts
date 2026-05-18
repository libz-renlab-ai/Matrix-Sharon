import type { FastifyInstance } from "fastify";
import { readSessionCookie } from "../session-cookie.js";

export async function registerMeRoutes(app: FastifyInstance): Promise<void> {
  app.get("/v1/me", async (req, reply) => {
    const session = readSessionCookie(req);
    if (!session) return reply.code(401).send({ error: "not_signed_in" });

    const user = await app.ctx.userStore.findById(session.uid);
    if (!user) return reply.code(401).send({ error: "not_signed_in" });

    return {
      user: {
        id: user.id,
        githubId: user.githubId,
        name: user.name,
        email: user.email,
        avatarUrl: user.avatarUrl,
        role: user.role,
      },
    };
  });
}
