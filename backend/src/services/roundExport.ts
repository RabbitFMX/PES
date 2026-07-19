import ExcelJS from 'exceljs'
import { listRoundEntries } from '../db/logEntries'
import { listActiveMembers } from '../db/members'
import { getMemberRoundDivisions, listRounds } from '../db/rounds'
import { listWeeksByRound } from '../db/weeks'
import { HttpError } from '../middleware/errorHandler'

/**
 * Export one round to an .xlsx sheet in the SAME layout as the legacy
 * `PES 2.0.xlsx` round sheets ("R12", "R11", …), so the file can be pasted in /
 * continued in the original workbook:
 *
 *   Row 1: pack labels over the member columns ("Smečka A (gauč)" / "Smečka B (bouda)")
 *   Row 2: `týden` | <member names…> (pack A then pack B)
 *   Row 3+: one row per week — the week label in col A, then each member's
 *           weekly points total in their column. Week 0 carries its date range.
 *
 * Weekly totals are summed from `log_entry.final_points` per member per week
 * (exactly what the original sheet stored per cell).
 */

const PACK_A_LABEL = 'Smečka A (gauč)'
const PACK_B_LABEL = 'Smečka B (bouda)'

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

/** ISO `YYYY-MM-DD` → `MM/DD` (matches the legacy week-0 date range format). */
function mmdd(iso: string): string {
  const [, m, d] = iso.split('-')
  return `${m}/${d}`
}

/** Excel worksheet names cannot exceed 31 chars or contain []:*?/\\. */
function safeSheetName(name: string): string {
  return name.replace(/[[\]:*?/\\]/g, ' ').slice(0, 31) || 'Round'
}

export interface RoundExport {
  filename: string
  buffer: Buffer
}

export async function buildRoundExport(roundId: string): Promise<RoundExport> {
  const rounds = await listRounds()
  const round = rounds.find((r) => r.id === roundId)
  if (!round) throw new HttpError(404, 'round_not_found')

  const weeks = (await listWeeksByRound(round.id)).sort((a, b) => a.week_number - b.week_number)
  const weekIds = weeks.map((w) => w.id)
  const [members, divisions, entries] = await Promise.all([
    listActiveMembers(),
    getMemberRoundDivisions(round.id),
    listRoundEntries(weekIds),
  ])

  // Division for THIS round (recorded per-round division, else current).
  const divisionOf = new Map(divisions.map((d) => [d.member_id, d.division]))
  const packOf = (id: string, fallback: 'A' | 'B') => divisionOf.get(id) ?? fallback

  // Column order: pack A members then pack B members, each alphabetical — a
  // stable order that mirrors the legacy pack columns.
  const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name, 'cs')
  const packA = members.filter((m) => packOf(m.id, m.division) === 'A').sort(byName)
  const packB = members.filter((m) => packOf(m.id, m.division) === 'B').sort(byName)
  const ordered = [...packA, ...packB]

  // member_id → week_id → total points.
  const totals = new Map<string, Map<string, number>>()
  for (const e of entries) {
    const mw = totals.get(e.member_id) ?? new Map<string, number>()
    mw.set(e.week_id, round2((mw.get(e.week_id) ?? 0) + e.final_points))
    totals.set(e.member_id, mw)
  }

  const wb = new ExcelJS.Workbook()
  const ws = wb.addWorksheet(safeSheetName(round.name))

  // Row 1: pack labels merged over each pack's member columns (col 1 = týden).
  if (packA.length > 0) {
    const from = 2
    const to = 1 + packA.length
    ws.getCell(1, from).value = PACK_A_LABEL
    if (to > from) ws.mergeCells(1, from, 1, to)
  }
  if (packB.length > 0) {
    const from = 2 + packA.length
    const to = 1 + ordered.length
    ws.getCell(1, from).value = PACK_B_LABEL
    if (to > from) ws.mergeCells(1, from, 1, to)
  }

  // Row 2: týden | member names.
  ws.getCell(2, 1).value = 'týden'
  ordered.forEach((m, i) => {
    ws.getCell(2, 2 + i).value = m.name
  })

  // Row 3+: one row per week.
  weeks.forEach((w, wi) => {
    const row = 3 + wi
    ws.getCell(row, 1).value =
      w.week_number === 0
        ? `0 (${mmdd(w.start_date)} - ${mmdd(w.end_date)})`
        : w.week_number
    ordered.forEach((m, i) => {
      ws.getCell(row, 2 + i).value = totals.get(m.id)?.get(w.id) ?? 0
    })
  })

  // Light styling: bold header rows, sensible column widths.
  ws.getRow(1).font = { bold: true }
  ws.getRow(2).font = { bold: true }
  ws.getColumn(1).width = 18
  ordered.forEach((_, i) => {
    ws.getColumn(2 + i).width = 10
  })

  const buffer = Buffer.from(await wb.xlsx.writeBuffer())
  return { filename: `PES ${round.name}.xlsx`, buffer }
}
