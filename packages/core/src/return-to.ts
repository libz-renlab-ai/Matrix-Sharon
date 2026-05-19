// Validate a user-supplied `returnTo` query param before passing it to
// `reply.redirect()`. Refuses any value that would let an attacker phish a
// victim by redirecting through our origin to an evil site:
//   - non-string
//   - empty string
//   - schemed URLs ("http://evil.com", "javascript:...")
//   - protocol-relative ("//evil.com") — browsers treat these as cross-origin
//   - missing leading slash ("evil.com/")
//   - backslash variants browsers may collapse to forward slashes
//
// Returns the value as-is when it's a same-origin path, else returns the
// `fallback` (typically "/"). Single source of truth — both /login/github
// and /dev-login should use this.
export function sanitizeReturnTo(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  if (value.length === 0) return fallback;
  if (value.length > 1024) return fallback; // unbounded redirect target = abuse vector
  // Must start with exactly one forward slash. Reject "//evil.com" (cross-origin)
  // and "/\evil.com" (some browsers collapse backslashes to forward slashes).
  if (value[0] !== "/") return fallback;
  if (value[1] === "/" || value[1] === "\\") return fallback;
  // Refuse control chars and newline injection.
  // eslint-disable-next-line no-control-regex
  if (/[\x00-\x1f\x7f]/.test(value)) return fallback;
  return value;
}
