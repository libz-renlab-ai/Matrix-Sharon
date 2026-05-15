import { z } from "zod";

export const CandidateSchema = z.object({
  id: z.string(),               // ULID
  userId: z.string(),
  skillSlug: z.string(),        // local slug
  detectedAt: z.number().int(),
  reason: z.string(),
  diffUnified: z.string().nullable(),
  fullContentMd: z.string(),
  dismissed: z.boolean(),
});
export type Candidate = z.infer<typeof CandidateSchema>;
