/**
 * The data layer: every screen talks to the backend through these functions.
 * Signatures and return types match what the screens already expect (this file
 * replaced the Phase-1 `mockApi.ts`), so wiring the real API was a one-file
 * swap. The ONLY thing still mocked is `parseNaturalLanguage` — the LLM parse
 * is deferred to seminar 6; it keeps its demoable success/failure behaviour.
 */
import { apiClient } from './apiClient'
import { applyCoefficient, computeRawPoints } from './mockPoints'
import type {
  Activity,
  ApiResult,
  ChallengeData,
  CurrentUser,
  DashboardData,
  Lang,
  DetailedLogInput,
  LeaderboardData,
  LogPreview,
  Member,
  MemberDirectoryEntry,
  MemberOverview,
  PackStats,
  PackWeekly,
  PastChallenge,
  QuickAddInput,
  Round,
  RotationEntry,
  StatsData,
  ThemePref,
} from './types'

/* ---- Auth bootstrap ---- */

/** The current member's profile (backs session bootstrap in AuthProvider). */
export function getMe(): Promise<CurrentUser> {
  return apiClient.get<CurrentUser>('/me')
}

/** Update the current member's own profile (name, avatar, prefs); returns the fresh user. */
export function updateProfile(patch: {
  displayName?: string
  avatarUrl?: string | null
  languagePref?: Lang
  themePref?: ThemePref
}): Promise<CurrentUser> {
  return apiClient.patch<CurrentUser>('/me', patch)
}

/**
 * Public self-signup (invite-code gated). Creates the Supabase Auth user + a
 * member row server-side; the caller then signs in normally. Returns the
 * uniform `ApiResult` so the login screen can show the server's message
 * (bad code, duplicate email, …) without throwing.
 */
export function signup(input: {
  name: string
  email: string
  password: string
  inviteCode: string
}): Promise<ApiResult> {
  return apiClient.post<ApiResult>('/signup', input)
}

/* ---- GDPR consent ---- */

/**
 * Record a consent decision in the server audit log (cookie banner or a profile
 * Privacy withdrawal). Public endpoint: works anonymously; if the user is signed
 * in, `apiClient` attaches their token so the row + account flags are linked.
 */
export function recordConsent(input: {
  consents: { analytics?: boolean; marketing?: boolean }
  policyVersion: string
  policyHash: string
}): Promise<ApiResult> {
  return apiClient.post<ApiResult>('/consent', input)
}

/* ---- Dashboard ---- */

export function getDashboard(): Promise<DashboardData> {
  return apiClient.get<DashboardData>('/dashboard')
}

/* ---- Whole-pack comparison stats (Statistiky tab) ---- */

export function getPackStats(): Promise<PackStats> {
  return apiClient.get<PackStats>('/pack-stats')
}

/** Per-week per-member points for one round (default: open/most-recent). */
export function getPackWeekly(roundId?: string): Promise<PackWeekly> {
  const query = roundId ? `?roundId=${encodeURIComponent(roundId)}` : ''
  return apiClient.get<PackWeekly>(`/pack-weekly${query}`)
}

/* ---- Personal overview + view-others ---- */

export function getMemberOverview(memberId: string): Promise<MemberOverview> {
  return apiClient.get<MemberOverview>(`/members/${memberId}/overview`)
}

export function getMembersDirectory(): Promise<MemberDirectoryEntry[]> {
  return apiClient.get<MemberDirectoryEntry[]>('/members')
}

/* ---- Log activity ---- */

export function getActivities(): Promise<Activity[]> {
  return apiClient.get<Activity[]>('/activities')
}

/** Preview a detailed entry; echo the input back so `commitEntries` can POST it. */
export async function previewDetailed(input: DetailedLogInput): Promise<LogPreview> {
  const preview = await apiClient.post<LogPreview>('/log-entries/preview', input)
  return { ...preview, input }
}

export async function previewQuickAdd(input: QuickAddInput): Promise<LogPreview> {
  const preview = await apiClient.post<LogPreview>('/log-entries/preview', input)
  return { ...preview, input }
}

/**
 * Commit confirmed previews. Each preview carries the input it was computed
 * from; we POST each to the backend (which recomputes points server-side) and
 * return the member's latest weekly total from the final write.
 */
export async function commitEntries(previews: LogPreview[]): Promise<{ weeklyPoints: number }> {
  let weeklyPoints = 0
  for (const preview of previews) {
    if (!preview.input) continue
    const res = await apiClient.post<{ weeklyPoints: number }>('/log-entries', preview.input)
    weeklyPoints = res.weeklyPoints
  }
  return { weeklyPoints }
}

/* ---- Natural-language parse — DEFERRED (mock) ---- */

// A minimal "run" row so the mock parse can compute a plausible preview.
const NL_RUN: Activity = {
  id: 'run',
  nameCs: 'běh',
  nameEn: 'Running',
  unit: 'km',
  pointsPerUnit: 3,
  hasElevationBonus: true,
  elevationBonusPer50m: 1.5,
  elevationBonusPer50mStroller: 2.5,
  hasStrollerOption: true,
  strollerBaseRateOverride: null,
  isTiered: false,
  tierOptions: null,
  notes: null,
  active: true,
}
// Display-only coefficient for the mock preview; the real commit recomputes it.
const NL_MOCK_COEFFICIENT = 1.25

/**
 * TODO: LLM API (seminar 6) — natural-language parsing.
 * Mock behaviour (kept so the UI path stays demoable): succeeds for text with a
 * number, throws when the text contains "fail". The returned preview carries a
 * real `input`, so confirming it commits against the backend like any entry.
 */
export function parseNaturalLanguage(text: string): Promise<LogPreview[]> {
  if (/fail/i.test(text) || !/\d/.test(text)) {
    return new Promise((_resolve, reject) =>
      setTimeout(() => reject(new Error('llm_unavailable')), 900),
    )
  }
  const km = Number(text.match(/(\d+(?:\.\d+)?)\s*k/i)?.[1] ?? 5)
  const raw = computeRawPoints(NL_RUN, km)
  const preview: LogPreview = {
    activityName: NL_RUN.nameCs,
    quantity: km,
    unit: NL_RUN.unit,
    rawPoints: raw,
    coefficient: NL_MOCK_COEFFICIENT,
    finalPoints: applyCoefficient(raw, NL_MOCK_COEFFICIENT),
    input: { activityId: NL_RUN.id, quantity: km },
  }
  return new Promise((resolve) => setTimeout(() => resolve([preview]), 1200))
}

/* ---- Leaderboard ---- */

export function getLeaderboard(): Promise<LeaderboardData> {
  return apiClient.get<LeaderboardData>('/leaderboard')
}

/* ---- My Stats ---- */

export function getStats(roundId?: string): Promise<StatsData> {
  const query = roundId ? `?roundId=${encodeURIComponent(roundId)}` : ''
  return apiClient.get<StatsData>(`/stats${query}`)
}

/* ---- Challenges ---- */

export function getChallenge(): Promise<ChallengeData> {
  return apiClient.get<ChallengeData>('/challenges/current')
}

export function getPastChallenges(): Promise<PastChallenge[]> {
  return apiClient.get<PastChallenge[]>('/challenges/past')
}

/**
 * Submit a value to the current challenge. The screen only has the value, so we
 * resolve the current challenge's id first (keeping the mock's `(value)`
 * signature) before posting to `/challenges/:id/submissions`.
 */
export async function submitChallenge(value: number): Promise<ApiResult> {
  const current = await apiClient.get<ChallengeData>('/challenges/current')
  if (current.id === null) return { ok: false, message: 'No active challenge.' }
  return apiClient.post<ApiResult>(`/challenges/${current.id}/submissions`, { value })
}

export function createChallenge(input: {
  title: string
  description: string
  deadline: string
}): Promise<ApiResult> {
  return apiClient.post<ApiResult>('/challenges', input)
}

/* ---- Admin ---- */

export function getMembers(): Promise<Member[]> {
  return apiClient.get<Member[]>('/admin/members')
}

/** Edit an existing member (the admin UI only edits, never creates directly). */
export function saveMember(member: Member): Promise<ApiResult> {
  return apiClient.patch<ApiResult>(`/admin/members/${member.id}`, {
    division: member.division,
    coefficient: member.coefficient,
    role: member.role,
    status: member.status,
    injuryExemptUntil: member.injuryExemptUntil,
  })
}

export function inviteMember(email: string): Promise<ApiResult> {
  return apiClient.post<ApiResult>('/admin/members/invite', { email })
}

/** Merge a historical (imported) member's history into a real account. */
export function mergeMembers(targetId: string, historicalId: string): Promise<ApiResult> {
  return apiClient.post<ApiResult>('/admin/members/merge', { targetId, historicalId })
}

export function getAdminActivities(): Promise<Activity[]> {
  return apiClient.get<Activity[]>('/admin/activities')
}

export function saveActivity(activity: Activity): Promise<ApiResult> {
  return apiClient.patch<ApiResult>(`/admin/activities/${activity.id}`, {
    nameCs: activity.nameCs,
    nameEn: activity.nameEn,
    unit: activity.unit,
    pointsPerUnit: activity.pointsPerUnit,
    hasElevationBonus: activity.hasElevationBonus,
    elevationBonusPer50m: activity.elevationBonusPer50m,
    elevationBonusPer50mStroller: activity.elevationBonusPer50mStroller,
    hasStrollerOption: activity.hasStrollerOption,
    strollerBaseRateOverride: activity.strollerBaseRateOverride,
    isTiered: activity.isTiered,
    tierOptions: activity.tierOptions,
    notes: activity.notes,
    active: activity.active,
  })
}

export function getRounds(): Promise<Round[]> {
  return apiClient.get<Round[]>('/admin/rounds')
}

export function saveRound(round: Round): Promise<ApiResult> {
  return apiClient.patch<ApiResult>(`/admin/rounds/${round.id}`, {
    name: round.name,
    startDate: round.startDate,
    endDate: round.endDate,
    status: round.status,
  })
}

export function getRotation(): Promise<RotationEntry[]> {
  return apiClient.get<RotationEntry[]>('/admin/rotation')
}

export function saveRotation(order: RotationEntry[]): Promise<ApiResult> {
  return apiClient.put<ApiResult>('/admin/rotation', { memberIds: order.map((o) => o.memberId) })
}
