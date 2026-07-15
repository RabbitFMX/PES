import type { Response } from 'express'
import type { ZodError, ZodType } from 'zod'
import type { AdminResult } from '../../schemas/admin'

/** Flatten a Zod error into one readable line for the frontend failure toast. */
export function zodMessage(err: ZodError): string {
  return err.issues
    .map((i) => (i.path.length ? `${i.path.join('.')}: ${i.message}` : i.message))
    .join('; ')
}

/**
 * Validate a request body against a schema. On success returns the parsed data;
 * on failure sends the uniform `{ ok: false, message }` (so the frontend toasts
 * it rather than throwing) and returns null — the caller should `return`.
 */
export function parseBody<T>(schema: ZodType<T>, body: unknown, res: Response): T | null {
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    res.status(200).json({ ok: false, message: zodMessage(parsed.error) })
    return null
  }
  return parsed.data
}

/** Send a uniform admin result (201 for a successful create, else 200). */
export function sendResult(res: Response, result: AdminResult, successCode = 200): void {
  res.status(result.ok ? successCode : 200).json(result)
}
