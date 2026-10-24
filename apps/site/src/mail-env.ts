import * as z from 'zod'

const address = String.raw`[^\s@<>,;:"\\]+@[^\s@<>,;:"\\]+\.[^\s@<>,;:"\\]+`
const mailbox = new RegExp(String.raw`^(?:${address}|[^<>,;:"\\\r\n]*<${address}>)$`)

/**
 * Whether a string is exactly one mailbox: an address, or an address in angle brackets after a name, as in
 * `Naam <naam@example.org>`. A comma, a semicolon or a new line never passes, so one value can't name a second recipient
 * or start a second header.
 */
export function isMailbox(value: string) {
  return mailbox.test(value.trim())
}

/** The settings of the mail server, and the address that mail comes from. See `requireSmtpOutsideLocal` for which are needed. */
export const mailEnvSchema = z.object({
  MAIL_FROM: z
    .string()
    .refine(isMailbox, 'must be an email address, or a name followed by an address in < >')
    .optional(),
  SMTP_HOST: z
    .string()
    .regex(/^[\w.-]+$/, 'must be the name of a server, without a port or a scheme')
    .optional(),
  SMTP_PASSWORD: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535).optional(),
  SMTP_USER: z.string().optional(),
})

const smtpVariables = ['MAIL_FROM', 'SMTP_HOST', 'SMTP_PASSWORD', 'SMTP_PORT', 'SMTP_USER'] as const

/**
 * Refines a schema that has SITE_ENV and the variables above. On acceptance and production all five are required, so the
 * site doesn't start without them. Locally they may all be missing, and the mail goes to the log of the developer, but
 * never some of them: a half-filled set is a mistake the developer would only find out when sending.
 */
export function requireSmtpOutsideLocal(
  env: Partial<Record<(typeof smtpVariables)[number], unknown>> & { SITE_ENV: string },
  ctx: z.RefinementCtx,
) {
  const noneSet = smtpVariables.every((name) => env[name] === undefined)

  if (env.SITE_ENV === 'local' && noneSet) {
    return
  }

  for (const name of smtpVariables) {
    if (env[name] === undefined) {
      ctx.addIssue({ code: 'custom', message: 'is missing', path: [name] })
    }
  }
}
