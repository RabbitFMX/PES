import { z } from 'zod'

/**
 * Public self-signup (invite-code gated). The app is invite-only; this is the
 * one path that lets a brand-new user provision their own `member` row, so it is
 * fenced behind a shared code (SIGNUP_INVITE_CODE) rather than being open to the
 * whole internet. See `services/signup.ts`.
 */

/** Result of a signup attempt (mirrors the admin write result shape). */
export type SignupResult = { ok: true } | { ok: false; message: string }

export const signupSchema = z
  .object({
    name: z.string().min(1),
    email: z.string().email(),
    password: z.string().min(8),
    inviteCode: z.string().min(1),
  })
  .strict()

export type SignupInput = z.infer<typeof signupSchema>
