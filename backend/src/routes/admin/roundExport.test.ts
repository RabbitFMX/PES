import { beforeEach, describe, expect, it, vi } from 'vitest'
import express from 'express'
import request from 'supertest'
import ExcelJS from 'exceljs'
import { mountProtected, type AuthDeps } from '../../middleware/auth'
import { errorHandler } from '../../middleware/errorHandler'
import { adminRoundsRouter } from './rounds'
import type { MemberRow, RoundRow, WeekRow } from '../../db/types'

const listRounds = vi.hoisted(() => vi.fn())
const getMemberRoundDivisions = vi.hoisted(() => vi.fn())
const listWeeksByRound = vi.hoisted(() => vi.fn())
const listActiveMembers = vi.hoisted(() => vi.fn())
const listRoundEntries = vi.hoisted(() => vi.fn())
// Unused by the export path but imported by the router module.
const getRounds = vi.hoisted(() => vi.fn())
const createRound = vi.hoisted(() => vi.fn())
const editRound = vi.hoisted(() => vi.fn())

vi.mock('../../db/rounds', () => ({ listRounds, getMemberRoundDivisions }))
vi.mock('../../db/weeks', () => ({ listWeeksByRound }))
vi.mock('../../db/members', () => ({ listActiveMembers }))
vi.mock('../../db/logEntries', () => ({ listRoundEntries }))
vi.mock('../../services/adminRounds', () => ({ getRounds, createRound, editRound }))

function member(id: string, name: string, division: 'A' | 'B', role: 'member' | 'admin' = 'member'): MemberRow {
  return {
    id,
    name,
    email: `${id}@pes.dev`,
    gender: null,
    coefficient: 1,
    division,
    role,
    status: 'active',
    joined_date: '2026-01-01',
    avatar_url: null,
    language_pref: 'cs',
    theme_pref: 'light',
    injury_exempt_until: null,
  }
}

const admin = member('admin-1', 'Admin', 'A', 'admin')

function buildApp(who: MemberRow) {
  const app = express()
  app.use(express.json())
  mountProtected(app, '/api', adminRoundsRouter, {
    admin: true,
    deps: {
      verifyToken: async (jwt) => (jwt === 'valid' ? { userId: who.id } : null),
      getMember: async () => who,
    } as AuthDeps,
  })
  app.use(errorHandler)
  return app
}

const round: RoundRow = {
  id: 'r13',
  name: 'Round 13 — Summer 2026',
  start_date: '2026-06-29',
  end_date: '2026-12-27',
  status: 'open',
}

function week(n: number, start: string, end: string): WeekRow {
  return { id: `w${n}`, round_id: 'r13', week_number: n, start_date: start, end_date: end }
}

/** Collect the binary response body into a Buffer. */
function binary(req: request.Test) {
  return req.buffer(true).parse((res, cb) => {
    const chunks: Buffer[] = []
    res.on('data', (c: Buffer) => chunks.push(c))
    res.on('end', () => cb(null, Buffer.concat(chunks)))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  listRounds.mockResolvedValue([round])
  getMemberRoundDivisions.mockResolvedValue([])
  listWeeksByRound.mockResolvedValue([
    week(0, '2026-06-29', '2026-07-12'),
    week(1, '2026-07-13', '2026-07-19'),
  ])
  listActiveMembers.mockResolvedValue([
    member('a', 'Aleš', 'A'),
    member('o', 'Ondřej', 'A'),
    member('r', 'Roman', 'B'),
  ])
  listRoundEntries.mockResolvedValue([
    { member_id: 'a', week_id: 'w0', final_points: 291 },
    { member_id: 'a', week_id: 'w1', final_points: 100 },
    { member_id: 'o', week_id: 'w0', final_points: 228 },
    { member_id: 'r', week_id: 'w1', final_points: 50 },
  ])
})

describe('GET /api/admin/rounds/:id/export', () => {
  it('403s a non-admin', async () => {
    const res = await request(buildApp(member('m', 'M', 'A')))
      .get('/api/admin/rounds/r13/export')
      .set('Authorization', 'Bearer valid')
    expect(res.status).toBe(403)
  })

  it('404s an unknown round', async () => {
    const res = await request(buildApp(admin))
      .get('/api/admin/rounds/nope/export')
      .set('Authorization', 'Bearer valid')
    expect(res.status).toBe(404)
  })

  it('streams an xlsx in the legacy round-sheet layout', async () => {
    const res = await binary(
      request(buildApp(admin)).get('/api/admin/rounds/r13/export').set('Authorization', 'Bearer valid'),
    )
    expect(res.status).toBe(200)
    expect(res.headers['content-type']).toContain('spreadsheetml.sheet')
    expect(res.headers['content-disposition']).toContain('.xlsx')

    const wb = new ExcelJS.Workbook()
    await wb.xlsx.load(res.body)
    const ws = wb.worksheets[0]

    // Header rows: pack labels + týden + member names (pack A alphabetical, then B).
    expect(ws.getCell('B1').value).toBe('Smečka A (gauč)')
    expect(ws.getCell('A2').value).toBe('týden')
    expect(ws.getCell('B2').value).toBe('Aleš')
    expect(ws.getCell('C2').value).toBe('Ondřej')
    expect(ws.getCell('D2').value).toBe('Roman') // pack B, last column

    // Week 0 carries its date range; weekly totals land in each member column.
    expect(ws.getCell('A3').value).toBe('0 (06/29 - 07/12)')
    expect(ws.getCell('B3').value).toBe(291) // Aleš, week 0
    expect(ws.getCell('C3').value).toBe(228) // Ondřej, week 0
    expect(ws.getCell('A4').value).toBe(1) // week 1
    expect(ws.getCell('B4').value).toBe(100) // Aleš, week 1
    expect(ws.getCell('D4').value).toBe(50) // Roman, week 1
  })
})
