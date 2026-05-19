// Skill slug format. Used everywhere a slug crosses a security boundary:
//   - URL params (/v1/skills/:slug/...)
//   - filesystem paths (bundle store, CLI extraction)
//   - SQL primary keys
//
// Rules:
//   - lowercase letters, digits, hyphens
//   - must start with a letter or digit (no leading hyphen)
//   - 1–64 chars
//   - no path separators, no whitespace, no control chars
//
// A SINGLE source of truth — every zod schema that accepts a skill slug should
// reference SLUG_PATTERN or use isValidSlug() to ensure consistency.
export const SLUG_PATTERN = /^[a-z0-9][a-z0-9-]{0,63}$/;

export function isValidSlug(s: unknown): s is string {
  return typeof s === "string" && SLUG_PATTERN.test(s);
}

export function assertValidSlug(s: unknown): asserts s is string {
  if (!isValidSlug(s)) {
    throw new Error(
      `invalid slug ${JSON.stringify(s)}: must match ${SLUG_PATTERN}`
    );
  }
}
