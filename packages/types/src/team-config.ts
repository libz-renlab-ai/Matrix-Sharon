import { z } from "zod";

export const TeamConfigSchema = z.object({
  allowedGithubOrgs: z.array(z.string()),
  allowedGithubTeams: z.array(z.string()),
  updatedBy: z.string().nullable(),
  updatedAt: z.number().int().nullable(),
});
export type TeamConfig = z.infer<typeof TeamConfigSchema>;
