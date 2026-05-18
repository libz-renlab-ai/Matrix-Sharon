import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ulid } from "ulid";
import { withAuth } from "../auth-guard.js";

const CreateCandidateBody = z.object({
  skillSlug: z.string().min(1),
  fullContentMd: z.string().min(1),
  diffUnified: z.string().nullable().optional(),
  reason: z.string().min(1),
});

export async function registerCandidateRoutes(app: FastifyInstance): Promise<void> {
  app.post(
    "/v1/candidates",
    withAuth(async (req, reply, _session, user) => {
      const parsed = CreateCandidateBody.safeParse(req.body);
      if (!parsed.success) {
        return reply.code(400).send({ error: "invalid_body", issues: parsed.error.issues });
      }
      const c = {
        id: ulid(),
        userId: user.id,
        skillSlug: parsed.data.skillSlug,
        detectedAt: Date.now(),
        reason: parsed.data.reason,
        diffUnified: parsed.data.diffUnified ?? null,
        fullContentMd: parsed.data.fullContentMd,
        dismissed: false,
      };
      await app.ctx.candidateStore.upsert(c);
      return reply.code(201).send({ candidate: c });
    })
  );

  app.get(
    "/v1/candidates/mine",
    withAuth(async (_req, _reply, _session, user) => {
      const candidates = await app.ctx.candidateStore.listForUser(user.id);
      return { candidates };
    })
  );

  app.delete<{ Params: { id: string } }>(
    "/v1/candidates/:id",
    withAuth(async (req, reply, _session, user) => {
      const { id } = req.params as { id: string };
      const c = await app.ctx.candidateStore.find(id);
      if (!c) return reply.code(404).send({ error: "candidate_not_found" });
      if (c.userId !== user.id) {
        return reply.code(403).send({ error: "not_yours" });
      }
      await app.ctx.candidateStore.dismiss(id);
      return reply.code(204).send();
    })
  );
}
