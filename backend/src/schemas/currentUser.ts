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
})

export type CurrentUser = z.infer<typeof currentUserSchema>

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
  })
}
