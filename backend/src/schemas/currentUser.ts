import { z } from 'zod'
import type { MemberRow } from '../db/types'

/**
 * The current-user payload the frontend expects (`CurrentUser` in
 * frontend/src/lib/types.ts). Returned by GET /api/me to back session bootstrap.
 */
export const currentUserSchema = z.object({
  id: z.string(),
  displayName: z.string(),
  email: z.string(),
  avatarUrl: z.string().nullable(),
  role: z.enum(['member', 'admin']),
  division: z.enum(['A', 'B']),
  coefficient: z.number(),
  languagePref: z.enum(['cs', 'en']),
  themePref: z.enum(['light', 'dark']),
  // Current GDPR consent (account-level; the per-browser choice lives client-side).
  analyticsConsent: z.boolean(),
  marketingConsent: z.boolean(),
})

export type CurrentUser = z.infer<typeof currentUserSchema>

/**
 * PATCH /api/me — the fields a member may change on their OWN profile
 * (display name, avatar, language/theme prefs). Role/division/coefficient stay
 * admin-only (see schemas/admin.ts). `avatarUrl` carries either a URL or a
 * `dog:<style>:<color>:<size>` token from the avatar builder.
 */
export const meProfilePatchSchema = z
  .object({
    displayName: z.string().min(1).optional(),
    avatarUrl: z.string().nullable().optional(),
    languagePref: z.enum(['cs', 'en']).optional(),
    themePref: z.enum(['light', 'dark']).optional(),
  })
  .strict()

export type MeProfilePatch = z.infer<typeof meProfilePatchSchema>

/** Map a DB member row to the camelCase CurrentUser shape (validated). */
export function toCurrentUser(member: MemberRow): CurrentUser {
  return currentUserSchema.parse({
    id: member.id,
    displayName: member.name,
    email: member.email,
    avatarUrl: member.avatar_url,
    role: member.role,
    division: member.division,
    // numeric columns can arrive as strings from the driver — normalise.
    coefficient: Number(member.coefficient),
    languagePref: member.language_pref,
    themePref: member.theme_pref,
    // Consent columns default to false in the DB; absent ⇒ no consent given.
    analyticsConsent: member.analytics_consent ?? false,
    marketingConsent: member.marketing_consent ?? false,
  })
}
