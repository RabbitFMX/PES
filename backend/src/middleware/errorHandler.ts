import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

/**
 * A domain error carrying an HTTP status and a stable machine-readable code.
 * Services throw this for expected failures (unknown activity, out-of-week
 * date, …); the handler below turns it into `{ error: code }` with the status.
 */
export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code)
    this.name = 'HttpError'
  }
}

export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'validation_error', details: err.issues })
    return
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.code })
    return
  }

  console.error(err)
  res.status(500).json({ error: 'internal_error' })
}
