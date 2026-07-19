import { supabase } from './supabase'
import { isTestDataEnabled, TEST_DATA_HEADER } from './testData'

/**
 * Tiny fetch wrapper for the PES backend. It prefixes `VITE_API_BASE_URL`,
 * sends JSON, attaches the Supabase access token as `Authorization: Bearer …`,
 * and throws `ApiError` on any non-2xx so `useAsync` / toasts surface failures.
 *
 * `VITE_API_BASE_URL` includes the `/api` base (e.g. `http://localhost:3001/api`);
 * paths passed here are relative to it (`/dashboard`, `/admin/members`, …).
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? ''

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string> | undefined),
  }
  if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
  // Testing aid: ask the backend for generated detailed stats (see lib/testData).
  if (isTestDataEnabled()) headers[TEST_DATA_HEADER] = '1'

  const res = await fetch(`${BASE_URL}${path}`, { ...init, headers })

  if (!res.ok) {
    let message = res.statusText
    try {
      const body = await res.json()
      message = body?.message ?? body?.error ?? message
    } catch {
      // non-JSON error body — keep the status text
    }
    throw new ApiError(res.status, message)
  }

  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const apiClient = {
  get: <T>(path: string) => request<T>(path, { method: 'GET' }),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, {
      method: 'POST',
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  put: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),
  /** Fetch a binary file (with auth) as a Blob + its Content-Disposition name. */
  download: async (path: string): Promise<{ blob: Blob; filename: string }> => {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    const headers: Record<string, string> = {}
    if (session?.access_token) headers.Authorization = `Bearer ${session.access_token}`
    if (isTestDataEnabled()) headers[TEST_DATA_HEADER] = '1'

    const res = await fetch(`${BASE_URL}${path}`, { headers })
    if (!res.ok) throw new ApiError(res.status, res.statusText)

    const blob = await res.blob()
    const cd = res.headers.get('Content-Disposition') ?? ''
    const match = /filename\*=UTF-8''([^;]+)/.exec(cd) ?? /filename="?([^";]+)"?/.exec(cd)
    const filename = match ? decodeURIComponent(match[1]) : 'download'
    return { blob, filename }
  },
}
