import { z } from "zod";

export const CategorySchema = z.enum([
  "safety", "review", "debug", "write", "perf", "test", "i18n", "git",
]);
export type Category = z.infer<typeof CategorySchema>;

/** SKILL.md frontmatter — Sharon's superset of Claude Code's required fields. */
export const FrontmatterSchema = z.object({
  name: z.string(),
  description: z.string(),
  pain: z.string().optional(),
  gain: z.string().optional(),
  triggers: z.string().optional(),
  category: CategorySchema.optional(),
  icon: z.string().optional(),
  example: z.object({
    user: z.string().optional(),
    sharon: z.string().optional(),
    deny: z.string().optional(),
  }).optional(),
});
export type Frontmatter = z.infer<typeof FrontmatterSchema>;

export const SkillSchema = z.object({
  slug: z.string(),
  name: z.string(),
  category: CategorySchema.nullable(),
  icon: z.string().nullable(),
  authorId: z.string(),
  createdAt: z.number().int(),
  currentVersionId: z.string().nullable(),
});
export type Skill = z.infer<typeof SkillSchema>;

export const SkillVersionSchema = z.object({
  id: z.string(),               // ULID
  skillSlug: z.string(),
  semver: z.number().int().positive(),  // 1, 2, 3 ... (UI shows "v1")
  bundleSha256: z.string(),
  bundleSize: z.number().int().nonnegative(),
  description: z.string(),
  pain: z.string().nullable(),
  gain: z.string().nullable(),
  triggers: z.string().nullable(),
  exampleJson: z.string().nullable(),
  readmeMd: z.string(),
  note: z.string().nullable(),
  publishedBy: z.string(),
  approvedBy: z.string(),
  approvedAt: z.number().int(),
  publishedAt: z.number().int(),
});
export type SkillVersion = z.infer<typeof SkillVersionSchema>;
