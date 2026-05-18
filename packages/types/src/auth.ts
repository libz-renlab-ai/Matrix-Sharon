import { z } from "zod";

/** What GitHub's /user + /user/orgs endpoints give us, normalized. */
export const GithubProfileSchema = z.object({
  login: z.string().min(1),
  id: z.number().int(),
  name: z.string(),
  email: z.string().email().nullable(),
  avatarUrl: z.string().url().nullable(),
  orgs: z.array(z.string()),
});
export type GithubProfile = z.infer<typeof GithubProfileSchema>;

/** Body of the signed session cookie. */
export const SessionPayloadSchema = z.object({
  uid: z.string().min(1),
  iat: z.number().int(),
  exp: z.number().int(),
});
export type SessionPayload = z.infer<typeof SessionPayloadSchema>;

/** Body of the short-lived OAuth state cookie. */
export const OauthStateSchema = z.object({
  nonce: z.string().min(1),
  returnTo: z.string().default("/"),
});
export type OauthState = z.infer<typeof OauthStateSchema>;
