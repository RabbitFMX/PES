import { insertRound, listRounds, updateRound, type RoundUpdate } from '../db/rounds'
import {
  toRound,
  type Round,
  type RoundCreateInput,
  type RoundPatchInput,
  type AdminResult,
} from '../schemas/admin'

/** Admin round management (chunk 11). Open/close is manual for MVP. */

/** GET /api/admin/rounds — all rounds, most recent first. */
export async function getRounds(): Promise<Round[]> {
  const rows = await listRounds()
  return rows.map(toRound)
}

/**
 * POST /api/admin/rounds — create the next round. It starts `upcoming`; an
 * admin opens it later via PATCH (automated promotion/relegation is v2).
 */
export async function createRound(input: RoundCreateInput): Promise<AdminResult> {
  await insertRound({
    name: input.name,
    start_date: input.startDate,
    end_date: input.endDate,
    status: 'upcoming',
  })
  return { ok: true }
}

/** PATCH /api/admin/rounds/:id — edit fields; `status` is the open/close switch. */
export async function editRound(id: string, patch: RoundPatchInput): Promise<AdminResult> {
  const update: RoundUpdate = {}
  if (patch.name !== undefined) update.name = patch.name
  if (patch.startDate !== undefined) update.start_date = patch.startDate
  if (patch.endDate !== undefined) update.end_date = patch.endDate
  if (patch.status !== undefined) update.status = patch.status

  const updated = await updateRound(id, update)
  return updated ? { ok: true } : { ok: false, message: 'Round not found.' }
}
