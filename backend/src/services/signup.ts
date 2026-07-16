import { getMemberByEmail, insertMember, signUpAuthUser } from '../db/members'
import type { SignupInput, SignupResult } from '../schemas/signup'

/** Public self-signup, gated by a shared invite code. */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/**
 * Provision a new member from a public signup. This is the ONLY code path that
 * creates a member without an admin — the `requireAuth` guard stays invite-only
 * (no auto-provisioning), so access is fenced by `SIGNUP_INVITE_CODE` here. If
 * that env var is unset, signup is disabled (fail closed). Creates the Supabase
 * Auth user (email pre-confirmed) then the member row (role 'member', lower
 * division B — newcomers start there, matching the admin invite flow).
 */
export async function signUp(input: SignupInput): Promise<SignupResult> {
  const expected = process.env.SIGNUP_INVITE_CODE
  if (!expected) return { ok: false, message: 'Signup is currently disabled.' }
  if (input.inviteCode !== expected) return { ok: false, message: 'Invalid invite code.' }

  if (await getMemberByEmail(input.email)) {
    return { ok: false, message: 'An account with this email already exists.' }
  }

  const { userId } = await signUpAuthUser(input.email, input.password)
  await insertMember({
    id: userId,
    name: input.name,
    email: input.email,
    gender: null,
    coefficient: 1,
    division: 'B',
    role: 'member',
    status: 'active',
    joined_date: todayIso(),
    avatar_url: null,
    language_pref: 'cs',
    theme_pref: 'light',
    injury_exempt_until: null,
  })
  return { ok: true }
}
