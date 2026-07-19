/**
 * Critical-path end-to-end tests (chunk 13). These drive the REAL Express app
 * (createApp → routers → middleware → services → serializers) over Supertest,
 * with the DB and Supabase-auth boundary replaced by a single stateful
 * in-memory store. Unlike the per-route unit tests (which mock the DB per
 * request), the store persists across requests, so cross-endpoint flows are
 * exercised for real: logging an entry raises the dashboard total, submitting a
 * challenge shows up ranked, an admin edit shows up in the roster.
 *
 * A live-Supabase run (seeded project + browser login) is the remaining manual
 * check noted in the chunk; it needs credentials this environment does not have.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import request from 'supertest'
import { createApp } from './app'
import type {
  ActivityRow,
  ChallengeRow,
  LogEntryRow,
  MemberRow,
  RoundRow,
  WeekRow,
} from './db/types'

/* ---- In-memory store (seeded fresh per test) ---- */

interface Store {
  members: MemberRow[]
  activities: ActivityRow[]
  round: RoundRow | null
  weeks: WeekRow[]
  logEntries: LogEntryRow[]
  challenges: ChallengeRow[]
  submissions: { challenge_id: string; member_id: string; value: number | null }[]
  tokens: Record<string, string>
  seq: number
}

const store = vi.hoisted(
  () =>
    ({
      members: [],
      activities: [],
      round: null,
      weeks: [],
      logEntries: [],
      challenges: [],
      submissions: [],
      tokens: {},
      seq: 0,
    }) as Store,
)

/* ---- Mock the auth + DB boundary, backed by the store ---- */

vi.mock('./db/supabaseClient', () => ({
  supabase: {
    auth: {
      getUser: async (jwt: string) => {
        const id = store.tokens[jwt]
        return id
          ? { data: { user: { id } }, error: null }
          : { data: { user: null }, error: { message: 'invalid' } }
      },
    },
  },
}))

vi.mock('./db/members', () => ({
  getMemberById: async (id: string) => store.members.find((m) => m.id === id) ?? null,
  listActiveMembers: async () => store.members.filter((m) => m.status === 'active'),
  listAllMembers: async () => [...store.members],
  getMemberByEmail: async (email: string) => store.members.find((m) => m.email === email) ?? null,
  insertMember: async (row: MemberRow) => {
    store.members.push(row)
    return row
  },
  inviteAuthUser: async () => ({ userId: `invited-${(store.seq += 1)}` }),
  updateMember: async (id: string, patch: Record<string, unknown>) => {
    const m = store.members.find((x) => x.id === id)
    if (!m) return null
    Object.assign(m, patch)
    return m
  },
}))

vi.mock('./db/weeks', () => ({
  getCurrentWeek: async (onDate: string) =>
    store.weeks.find(
      (w) => store.round?.status === 'open' && w.start_date <= onDate && w.end_date >= onDate,
    ) ?? null,
  listWeeksByRound: async (roundId: string) =>
    store.weeks.filter((w) => w.round_id === roundId).sort((a, b) => a.week_number - b.week_number),
  listWeeks: async () => [...store.weeks],
}))

vi.mock('./db/rounds', () => ({
  getOpenRound: async () => (store.round?.status === 'open' ? store.round : null),
  getMemberRoundDivisions: async () => [],
  listRounds: async () => (store.round ? [store.round] : []),
  listAllMemberRoundDivisions: async () => [],
}))

vi.mock('./db/logEntries', () => ({
  insertLogEntries: async (rows: Omit<LogEntryRow, 'id' | 'created_at'>[]) => {
    const saved = rows.map((r) => ({
      ...r,
      id: `le-${(store.seq += 1)}`,
      created_at: '2020-01-01T00:00:00Z',
    })) as LogEntryRow[]
    store.logEntries.push(...saved)
    return saved
  },
  getWeeklyTotalPoints: async (memberId: string, weekId: string) =>
    Math.round(
      store.logEntries
        .filter((e) => e.member_id === memberId && e.week_id === weekId)
        .reduce((s, e) => s + Number(e.final_points), 0) * 100,
    ) / 100,
  hasDuplicateEntry: async () => false,
  listRoundEntries: async (weekIds: string[]) =>
    store.logEntries
      .filter((e) => weekIds.includes(e.week_id))
      .map((e) => ({ member_id: e.member_id, week_id: e.week_id, final_points: e.final_points })),
}))

vi.mock('./db/activities', () => ({
  getActivity: async (id: string) => store.activities.find((a) => a.id === id) ?? null,
  listActiveActivities: async () => store.activities.filter((a) => a.active),
  listAllActivities: async () => [...store.activities],
}))

vi.mock('./db/challenges', () => ({
  getChallengeForWeek: async (weekId: string) =>
    store.challenges
      .filter((c) => c.week_id === weekId)
      .sort((a, b) => b.created_at.localeCompare(a.created_at))[0] ?? null,
  getChallengeById: async (id: string) => store.challenges.find((c) => c.id === id) ?? null,
  countChallenges: async () => store.challenges.length,
  listSubmissions: async (challengeId: string) =>
    store.submissions
      .filter((s) => s.challenge_id === challengeId)
      .map((s) => ({
        memberId: s.member_id,
        displayName: store.members.find((m) => m.id === s.member_id)?.name ?? '',
        value: s.value,
      })),
  upsertSubmission: async (challengeId: string, memberId: string, value: number) => {
    const existing = store.submissions.find(
      (s) => s.challenge_id === challengeId && s.member_id === memberId,
    )
    if (existing) existing.value = value
    else store.submissions.push({ challenge_id: challengeId, member_id: memberId, value })
  },
  setSubmissionScores: async () => {},
  listWeekChallengeBonus: async () => [],
  hasSubmittedToChallenge: async (challengeId: string, memberId: string) =>
    store.submissions.some((s) => s.challenge_id === challengeId && s.member_id === memberId),
}))

vi.mock('./db/rotation', () => ({
  getRotation: async () => [],
}))

/* ---- Fixtures + seed ---- */

function member(id: string, over: Partial<MemberRow> = {}): MemberRow {
  return {
    id,
    name: id,
    email: `${id}@pes.dev`,
    gender: null,
    coefficient: 1,
    division: 'A',
    role: 'member',
    status: 'active',
    joined_date: '2020-01-01',
    avatar_url: null,
    language_pref: 'cs',
    theme_pref: 'light',
    injury_exempt_until: null,
    ...over,
  }
}

const runActivity: ActivityRow = {
  id: 'run',
  name_cs: 'běh',
  name_en: 'Running',
  unit: 'km',
  points_per_unit: 3,
  has_elevation_bonus: true,
  elevation_bonus_per_50m: 1.5,
  elevation_bonus_per_50m_stroller: 2.5,
  has_stroller_option: true,
  stroller_base_rate_override: null,
  is_tiered: false,
  tier_options: null,
  notes: null,
  active: true,
}

function logEntry(memberId: string, weekId: string, finalPoints: number): LogEntryRow {
  return {
    id: `seed-le-${(store.seq += 1)}`,
    member_id: memberId,
    week_id: weekId,
    activity_id: 'run',
    activity_date: '2020-01-03',
    quantity: 10,
    unit: 'km',
    elevation_m: null,
    with_stroller: false,
    raw_points: finalPoints,
    final_points: finalPoints,
    source: 'manual',
    note: null,
    created_at: '2020-01-03T00:00:00Z',
  }
}

// vi.mock calls above are hoisted, so the static createApp import already sees
// the in-memory DB + auth mocks.
const app = createApp()

function auth(token: string) {
  return { Authorization: `Bearer ${token}` }
}

beforeEach(() => {
  store.seq = 0
  store.members = [
    member('alice', { role: 'admin', division: 'A' }),
    member('bob', { division: 'A' }),
    member('carol', { division: 'B' }),
  ]
  store.activities = [runActivity]
  store.round = {
    id: 'R1',
    name: 'Round 1',
    start_date: '2020-01-01',
    end_date: '2999-12-31',
    status: 'open',
  }
  // W1 is a past week; W2 spans today (wide range) so it is the current week.
  store.weeks = [
    { id: 'W1', round_id: 'R1', week_number: 1, start_date: '2020-01-01', end_date: '2020-01-07' },
    { id: 'W2', round_id: 'R1', week_number: 2, start_date: '2020-01-08', end_date: '2999-12-31' },
  ]
  // Seed round history: alice 200 (W1), bob 120 (W1). Current week (W2) empty.
  store.logEntries = [logEntry('alice', 'W1', 200), logEntry('bob', 'W1', 120)]
  store.challenges = [
    {
      id: 'C1',
      week_id: 'W2',
      setter_member_id: 'alice',
      title: 'Nejvíc kliků',
      description: 'Do neděle.',
      deadline: '2999-01-01T00:00:00Z',
      status: 'open',
      created_at: '2020-01-08T00:00:00Z',
      bonus_split: null,
    },
  ]
  store.submissions = []
  store.tokens = { 'alice-token': 'alice', 'bob-token': 'bob' }
})

/* ---- Critical paths ---- */

describe('e2e critical paths', () => {
  it('login → dashboard: /me and /dashboard return the member summary', async () => {
    const me = await request(app).get('/api/me').set(auth('bob-token'))
    expect(me.status).toBe(200)
    expect(me.body).toMatchObject({ id: 'bob', displayName: 'bob', role: 'member' })

    const dash = await request(app).get('/api/dashboard').set(auth('bob-token'))
    expect(dash.status).toBe(200)
    expect(dash.body).toMatchObject({
      weeklyPoints: 0, // nothing logged this week yet
      weeklyGoal: 100,
      roundTotal: 120, // W1 seed
      packRank: 2, // behind alice (200) in pack A
      packSize: 2,
      streakWeeks: 1, // W1 hit the goal; the empty current week doesn't break it
    })
    expect(dash.body.currentChallenge).toMatchObject({ id: 'C1', hasSubmitted: false })
  })

  it('rejects an unauthenticated dashboard request', async () => {
    expect((await request(app).get('/api/dashboard')).status).toBe(401)
  })

  it('log an entry → the weekly total rises', async () => {
    const before = await request(app).get('/api/dashboard').set(auth('bob-token'))
    expect(before.body.weeklyPoints).toBe(0)

    const logged = await request(app)
      .post('/api/log-entries')
      .set(auth('bob-token'))
      .send({ activityId: 'run', quantity: 10 })
    expect(logged.status).toBe(201)
    expect(logged.body.weeklyPoints).toBe(30) // 10 km × 3 × 1.0

    const after = await request(app).get('/api/dashboard').set(auth('bob-token'))
    expect(after.body.weeklyPoints).toBe(30)
    expect(after.body.roundTotal).toBe(150) // 120 + 30
  })

  it('leaderboard is ordered by round total within each pack', async () => {
    const res = await request(app).get('/api/leaderboard').set(auth('bob-token'))
    expect(res.status).toBe(200)
    expect(res.body.packA.map((r: { memberId: string }) => r.memberId)).toEqual(['alice', 'bob'])
    expect(res.body.packA.map((r: { rank: number }) => r.rank)).toEqual([1, 2])
    // carol logged nothing → pack B is the "be first" empty state.
    expect(res.body.packB).toEqual([])
    const bob = res.body.packA.find((r: { memberId: string }) => r.memberId === 'bob')
    expect(bob.isCurrentUser).toBe(true)
  })

  it('challenge submit → the value appears ranked with a bonus', async () => {
    // alice already submitted 40; bob submits 50 and should lead.
    store.submissions.push({ challenge_id: 'C1', member_id: 'alice', value: 40 })

    const submit = await request(app)
      .post('/api/challenges/C1/submissions')
      .set(auth('bob-token'))
      .send({ value: 50 })
    expect(submit.status).toBe(200)
    expect(submit.body).toEqual({ ok: true })

    const current = await request(app).get('/api/challenges/current').set(auth('bob-token'))
    expect(current.status).toBe(200)
    expect(current.body.hasSubmitted).toBe(true)
    expect(current.body.submissions).toEqual([
      { memberId: 'bob', displayName: 'bob', value: 50, rank: 1, bonusPoints: 30 },
      { memberId: 'alice', displayName: 'alice', value: 40, rank: 2, bonusPoints: 20 },
    ])
  })

  it('admin write: a member is forbidden, an admin edits and the roster reflects it', async () => {
    // A member cannot reach admin routes.
    expect((await request(app).get('/api/admin/members').set(auth('bob-token'))).status).toBe(403)

    const edit = await request(app)
      .patch('/api/admin/members/bob')
      .set(auth('alice-token'))
      .send({ division: 'B' })
    expect(edit.status).toBe(200)
    expect(edit.body).toEqual({ ok: true })

    const roster = await request(app).get('/api/admin/members').set(auth('alice-token'))
    expect(roster.status).toBe(200)
    const bob = roster.body.find((m: { id: string }) => m.id === 'bob')
    expect(bob.division).toBe('B')
  })
})
