import { z } from "zod";

export const RoleSchema = z.enum(["leader", "member"]);
export type Role = z.infer<typeof RoleSchema>;

export const UserSchema = z.object({
  id: z.string(),               // GitHub login
  githubId: z.number().int(),
  name: z.string(),
  email: z.string().email().nullable(),
  avatarUrl: z.string().url().nullable(),
  role: RoleSchema,
  createdAt: z.number().int(),  // unix ms
  lastSeenAt: z.number().int().nullable(),
});
export type User = z.infer<typeof UserSchema>;
