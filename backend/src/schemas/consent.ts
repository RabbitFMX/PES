import { z } from 'zod'

/**
 * POST /api/consent request. Sent by the cookie banner (both categories) and by
 * the profile Privacy toggles (usually one category). Each provided category is
 * an explicit boolean — grant (true) or refuse/withdraw (false). `essential`
 * cannot be chosen: essential cookies need no consent, so they are not accepted
 * here. `policyVersion`/`policyHash` identify the exact consent text agreed to.
 */
export const consentRequestSchema = z
  .object({
    consents: z
      .object({
        analytics: z.boolean().optional(),
        marketing: z.boolean().optional(),
      })
      .strict()
      .refine((c) => c.analytics !== undefined || c.marketing !== undefined, {
        message: 'At least one consent category is required.',
      }),
    policyVersion: z.string().min(1),
    policyHash: z.string().min(1),
  })
  .strict()

export type ConsentRequest = z.infer<typeof consentRequestSchema>
