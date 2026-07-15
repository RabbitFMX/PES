import { listAllMembers } from '../db/members'
import { getRotation, putRotation } from '../db/rotation'
import { rotationEntrySchema, type RotationEntryOut, type AdminResult } from '../schemas/admin'

/** Admin challenge-setter rotation (chunk 11). */

/** GET /api/admin/rotation — the ordered rotation with member display names. */
export async function getRotationOrder(): Promise<RotationEntryOut[]> {
  const [rotation, members] = await Promise.all([getRotation(), listAllMembers()])
  const nameOf = new Map(members.map((m) => [m.id, m.name]))
  return rotation.map((r) =>
    rotationEntrySchema.parse({
      memberId: r.memberId,
      displayName: nameOf.get(r.memberId) ?? '',
      orderPosition: r.orderPosition,
    }),
  )
}

/** PUT /api/admin/rotation — persist the reordered list of member ids (atomic). */
export async function saveRotation(memberIds: string[]): Promise<AdminResult> {
  await putRotation(memberIds)
  return { ok: true }
}
