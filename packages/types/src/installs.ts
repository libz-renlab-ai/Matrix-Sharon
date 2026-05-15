import { z } from "zod";

export const InstallSchema = z.object({
  userId: z.string(),
  skillSlug: z.string(),
  skillVersionId: z.string(),
  installedAt: z.number().int(),
  uninstalledAt: z.number().int().nullable(),
  viaPushId: z.string().nullable(),
});
export type Install = z.infer<typeof InstallSchema>;

export const InstallTokenSchema = z.object({
  token: z.string(),
  userId: z.string(),
  skillSlug: z.string(),
  versionId: z.string(),
  expiresAt: z.number().int(),
  consumedAt: z.number().int().nullable(),
});
export type InstallToken = z.infer<typeof InstallTokenSchema>;
