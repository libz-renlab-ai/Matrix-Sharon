import { z } from "zod";

export const SubmissionStatusSchema = z.enum(["pending", "approved", "rejected"]);
export type SubmissionStatus = z.infer<typeof SubmissionStatusSchema>;

export const PendingSubmissionSchema = z.object({
  id: z.string(),
  skillSlug: z.string(),
  isNewSkill: z.boolean(),
  bundleSha256: z.string(),
  bundleSize: z.number().int().nonnegative(),
  rawSkillMd: z.string(),
  submitterId: z.string(),
  submittedAt: z.number().int(),
  status: SubmissionStatusSchema,
  reviewerId: z.string().nullable(),
  reviewedAt: z.number().int().nullable(),
  rejectReason: z.string().nullable(),
});
export type PendingSubmission = z.infer<typeof PendingSubmissionSchema>;
