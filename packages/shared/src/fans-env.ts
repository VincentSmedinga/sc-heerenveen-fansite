import * as z from 'zod'

import { parseEnv } from './env.ts'

/** The parts of the chapter Fans that can be switched on or off, one setting each. */
export const fansParts = ['accounts', 'prognose', 'uitblinker', 'vier', 'fantest'] as const

export type FansPart = (typeof fansParts)[number]

/** The games need an account, so they are off while accounts are off. */
const gameParts: readonly FansPart[] = ['prognose', 'uitblinker', 'vier', 'fantest']

type EnvSource = Record<string, string | undefined>

const onOff = z.enum(['on', 'off']).optional()

/**
 * The settings of the parts of Fans. A missing one means off, and any other value than `on` or
 * `off` is an error from `parseEnv`, like the other variables.
 */
export const fansEnvSchema = z.object({
  FANS_ACCOUNTS: onOff,
  FANS_FANTEST: onOff,
  FANS_PROGNOSE: onOff,
  FANS_UITBLINKER: onOff,
  FANS_VIER: onOff,
})

const variableOf = {
  accounts: 'FANS_ACCOUNTS',
  fantest: 'FANS_FANTEST',
  prognose: 'FANS_PROGNOSE',
  uitblinker: 'FANS_UITBLINKER',
  vier: 'FANS_VIER',
} as const satisfies Record<FansPart, keyof z.output<typeof fansEnvSchema>>

/** For a card: the card itself when the part is on, otherwise nothing. */
export function fansCard<Card>(part: FansPart, card: Card, source: EnvSource = process.env): Card | undefined {
  return isFansPartOn(part, source) ? card : undefined
}

/** For a menu: keeps the items of the parts that are on. */
export function fansMenuItems<Item extends { part: FansPart }>(
  items: readonly Item[],
  source: EnvSource = process.env,
) {
  const on = readFans(source)

  return items.filter((item) => on[item.part])
}

export function isFansPartOn(part: FansPart, source: EnvSource = process.env): boolean {
  return readFans(source)[part]
}

/**
 * Which parts of Fans are on. Everything about Fans asks here and reads no variable itself.
 * It reads the environment each time it is called, so a server restart with another value is
 * enough, without a new build. It reads only the five FANS_ variables.
 */
export function readFans(source: EnvSource = process.env): Record<FansPart, boolean> {
  const env = parseEnv(fansEnvSchema, source)
  const accounts = env.FANS_ACCOUNTS === 'on'

  return Object.fromEntries(
    fansParts.map((part) => [
      part,
      env[variableOf[part]] === 'on' && (part === 'accounts' || (accounts && gameParts.includes(part))),
    ]),
  ) as Record<FansPart, boolean>
}

/**
 * For a page or an action of a part: calls `notFound` (the 404 of Next.js, which throws) when
 * the part is off. Off also means the pages of a logged-in visitor: the sessions stay, so
 * switching accounts on again logs nobody out.
 */
export function requireFansPart(part: FansPart, notFound: () => never, source: EnvSource = process.env): void {
  if (!isFansPartOn(part, source)) {
    notFound()
  }
}

/** For a job of the importer or cron: runs it only when the part is on. Says whether it ran. */
export async function runFansJob(
  part: FansPart,
  job: () => Promise<unknown>,
  source: EnvSource = process.env,
): Promise<boolean> {
  return sendFansMail(part, job, source)
}

/** For a mail: sends it only when the part is on. Returns whether it was sent. */
export async function sendFansMail(
  part: FansPart,
  send: () => Promise<unknown>,
  source: EnvSource = process.env,
): Promise<boolean> {
  if (!isFansPartOn(part, source)) {
    return false
  }

  await send()

  return true
}

/**
 * The settings of the reminder by e-mail for the game Prognose (issue 1461). The hour is the
 * Dutch hour from which the reminder of the day before a match may go out, the limit the most
 * mails one run of the importer sends, and the secret signs the link to turn the reminder off.
 */
export const reminderEnvSchema = z.object({
  FANS_REMINDER_HOUR: z.coerce.number().int().min(0).max(23).default(9),
  FANS_REMINDER_LIMIT: z.coerce.number().int().min(1).max(1000).default(100),
  FANS_REMINDER_SECRET: z.string().min(32),
})

/** The secret that signs the link to turn the reminder off. It throws when it is missing. */
export function readReminderSecret(source: EnvSource = process.env): string {
  return parseEnv(reminderEnvSchema.pick({ FANS_REMINDER_SECRET: true }), source).FANS_REMINDER_SECRET
}

/** The hour and the limit, with their defaults. They need no secret. */
export function readReminderSettings(source: EnvSource = process.env) {
  const { FANS_REMINDER_HOUR: hour, FANS_REMINDER_LIMIT: limit } = parseEnv(
    reminderEnvSchema.omit({ FANS_REMINDER_SECRET: true }),
    source,
  )

  return { hour, limit }
}
