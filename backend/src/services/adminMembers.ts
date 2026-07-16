import {
  deleteMember,
  getMemberByEmail,
  getMemberById,
  insertMember,
  inviteAuthUser,
  listAllMembers,
  reassignMemberChildRecords,
  updateMember,
  type MemberUpdate,
} from '../db/members'
import { toMember, type Member, type MemberPatchInput, type AdminResult } from '../schemas/admin'

/** Admin member management (chunk 11). */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

/** GET /api/admin/members — every member, including those who left. */
export async function getMembers(): Promise<Member[]> {
  const rows = await listAllMembers()
  return rows.map(toMember)
}

/**
 * POST /api/admin/members/invite — Supabase Auth invite + a member row
 * (invite-only, §11). Rejects a duplicate email.
 */
export async function inviteMember(email: string): Promise<AdminResult> {
  if (await getMemberByEmail(email)) {
    return { ok: false, message: 'A member with this email already exists.' }
  }

  const { userId } = await inviteAuthUser(email)
  await insertMember({
    id: userId,
    name: email, // placeholder until the member completes their profile
    email,
    gender: null,
    coefficient: 1,
    division: 'B', // newcomers start in the lower division
    role: 'member',
    status: 'active',
    joined_date: todayIso(),
    avatar_url: null,
    language_pref: 'cs',
    theme_pref: 'light',
    injury_exempt_until: null,
    is_historical: false,
  })
  return { ok: true }
}

/**
 * POST /api/admin/members/merge — fold a historical (data-only, imported)
 * member into a real account: reassign all their history to the target, then
 * delete the historical placeholder. Only historical members can be merged
 * away, so a real account is never destroyed.
 */
export async function mergeMembers(targetId: string, historicalId: string): Promise<AdminResult> {
  if (targetId === historicalId) {
    return { ok: false, message: 'Choose two different members.' }
  }
  const [target, historical] = await Promise.all([
    getMemberById(targetId),
    getMemberById(historicalId),
  ])
  if (!target) return { ok: false, message: 'Target account not found.' }
  if (!historical) return { ok: false, message: 'Historical member not found.' }
  if (!historical.is_historical) {
    return { ok: false, message: 'Only a historical member can be merged into an account.' }
  }

  await reassignMemberChildRecords(historicalId, targetId)
  await deleteMember(historicalId)
  return { ok: true }
}

/** PATCH /api/admin/members/:id — edit division/coefficient/role/status/exemption. */
export async function editMember(id: string, patch: MemberPatchInput): Promise<AdminResult> {
  const update: MemberUpdate = {}
  if (patch.division !== undefined) update.division = patch.division
  if (patch.coefficient !== undefined) update.coefficient = patch.coefficient
  if (patch.role !== undefined) update.role = patch.role
  if (patch.status !== undefined) update.status = patch.status
  if (patch.injuryExemptUntil !== undefined) update.injury_exempt_until = patch.injuryExemptUntil

  const updated = await updateMember(id, update)
  return updated ? { ok: true } : { ok: false, message: 'Member not found.' }
}
