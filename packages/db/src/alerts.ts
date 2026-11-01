import type { Mail } from '@fansite/shared/mail'

import { sendMail } from '@fansite/shared/mail'
import { readAlertEnv, readMailEnv } from '@fansite/shared/mail-env'
import { siteOrigins } from '@fansite/shared/site-env'
import { eq } from 'drizzle-orm'

import type { Database } from './client.ts'

import { connect } from './client.ts'
import { readDatabaseEnv } from './env.ts'
import { importAlerts, reasonMaxLength } from './schema.ts'

/**
 * How many runs in a row the same import must fail before the owner gets a mail. The one place
 * for this number. A feed gets a run every quarter of an hour and the matches and the squad are
 * read once an hour, so three runs are half an hour for a feed and three hours for a season.
 */
export const alertAfterFailures = 3

/** How long a failing import waits for the next mail about it: a reminder once a day. */
export const remindAfterMs = 24 * 60 * 60 * 1000

/** The mail an alert sends, for a test that gives a fake mailer. */
export type { Mail as AlertMail } from '@fansite/shared/mail'

export type AlertOptions = {
  /** Gives the time. A test gives its own. */
  clock?: () => Date
  /** The environment variables: ALERT_MAIL_TO, SITE_ENV and the settings of the mailbox. */
  env?: Record<string, string | undefined>
  /** Sends a mail. A test gives a fake one, so nothing real is sent. */
  send?: (mail: Mail) => Promise<void>
  /** Writes a line of output. */
  write?: (line: string) => void
}

/**
 * What one run of an import came to, for the alert. `subject` names the import and stays the
 * same from run to run (`matches:2026/27`, `feed:12`, `backup`), `label` is what the mail calls
 * it, in Dutch, with its article: "De import van de wedstrijden 2026/27". A run that is neither
 * a failure nor a success, such as a request to wait, is not reported at all.
 */
export type AlertRun = ({ error: string; ok: false } | { ok: true }) & { label: string; subject: string }

type Executor = Pick<Database, 'delete' | 'insert' | 'select' | 'update'>

const environmentNames = { acceptance: 'acceptatie', local: 'lokaal', production: 'productie' } as const

const timeZone = 'Europe/Amsterdam'

/** The label and the fields of a stored alert, and what the mail needs of the environment. */
type Context = {
  address: string
  environment: string
  label: string
  to: string
}

/**
 * Keeps track of the nightly backup (`pnpm db:backup`), which has no database of its own to
 * report to: it opens the database in `DATABASE_URL` for this alone. It never throws.
 */
export async function recordBackupRun(
  outcome: { error: string; ok: false } | { ok: true },
  options: AlertOptions = {},
): Promise<void> {
  const write = options.write ?? console.log
  const run = { label: 'De back-up van de database', subject: 'backup', ...outcome }

  try {
    const { close, db } = connect(readDatabaseEnv(options.env ?? process.env).DATABASE_URL)

    try {
      await recordRun(db, run, { ...options, write })
    } finally {
      await close()
    }
  } catch (error) {
    write(`Alert: could not keep track of ${run.subject}: ${describeProblem(error)}`)
  }
}

/**
 * Keeps track of an import that fails run after run, and mails the owner (`ALERT_MAIL_TO`):
 *
 * - a failed run counts. At `alertAfterFailures` failed runs in a row the owner gets one mail,
 *   with what is wrong, since when and how often;
 * - while it lasts, the owner gets at most one reminder a day;
 * - the first run that works after a mail sends one mail that it works again. A success without
 *   a mail before it sends nothing.
 *
 * The state is in `import_alerts`, so a run every hour does not mail every hour. It never
 * throws and never waits for a mail that can't go out: without `ALERT_MAIL_TO` or without the
 * mailbox it writes a line, and a mail that fails is tried again at the next failed run. The
 * import must never fail or stop because of its alerts.
 */
export async function recordRun(db: Executor, run: AlertRun, options: AlertOptions = {}): Promise<void> {
  const write = options.write ?? console.log

  try {
    await track(db, run, { ...options, write })
  } catch (error) {
    write(`Alert: could not keep track of ${run.subject}: ${describeProblem(error)}`)
  }
}

/**
 * Takes the secrets and the personal data out of an error before it goes in a mail or in the
 * database, and cuts it to what fits. A web address keeps its host and its path without
 * long keys: the user name, the password, the query and the part after `#` go. A text like
 * `password=...` loses its value, an email address becomes a word, and a path on the disk keeps
 * its last part only.
 */
export function scrubError(text: string): string {
  const clean = text
    .replaceAll(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ')
    .replaceAll(/\b[a-z][a-z0-9+.-]*:\/\/[^\s<>"')\]]+/giu, scrubAddress)
    .replaceAll(/[^\s@<>"']+@[^\s@<>"']+\.[^\s@<>"']+/gu, '[e-mailadres]')
    .replaceAll(
      /\b(password|passwd|pwd|secret|token|api[_-]?key|apikey|key|auth|authorization)\b(\s*[=:]\s*)(?:(?:bearer|basic|digest)\s+)?\S+/giu,
      '$1$2…',
    )
    .replaceAll(/(?<![\w:/.…])\/(?:[^\s/:]+\/)+([^\s/:]+)/gu, '…/$1')
    .trim()

  return clean.length > reasonMaxLength ? `${clean.slice(0, reasonMaxLength - 1)}…` : clean
}

/** Sends a mail. True when the mail server took it; false after a line in the log when not. */
async function deliver(
  run: AlertRun,
  options: AlertOptions & Required<Pick<AlertOptions, 'write'>>,
  compose: (context: Context) => Mail,
): Promise<boolean> {
  const context = readContext(run, options)

  if (context === null) {
    return false
  }

  try {
    await (options.send ?? ((mail) => sendMail(mail, options.env ?? process.env)))(compose(context))

    return true
  } catch (error) {
    options.write(`Alert: the mail about ${run.subject} could not be sent: ${describeProblem(error)}`)

    return false
  }
}

/** Why an alert could not be kept or sent, without anything that came with the error. */
function describeProblem(error: unknown): string {
  const cause = error instanceof Error && error.cause instanceof Error ? error.cause : error

  if (cause instanceof Error && 'code' in cause && typeof cause.code === 'string') {
    return `error ${cause.code}`
  }

  return scrubError(cause instanceof Error ? cause.message : String(cause))
}

/** The mail for an import that keeps failing, or the reminder of it. */
function failureMail(
  context: Context,
  failing: { error: null | string; since: Date; times: number },
  reminder: boolean,
) {
  const { label } = context
  const subject = reminder
    ? `[${context.environment}] Herinnering: ${label} staat nog steeds stil sinds ${formatDate(failing.since)}`
    : `[${context.environment}] ${label} staat stil sinds ${formatDate(failing.since)}`

  const text = [
    `${label} is ${failing.times} keer achter elkaar mislukt.`,
    `De eerste mislukte keer was op ${formatDateTime(failing.since)}.`,
    `De laatste foutmelding: ${failing.error ?? 'onbekend'}`,
    '',
    `Omgeving: ${context.environment} (${context.address}).`,
    'Het logboek van de import op de host zegt meer.',
    reminder
      ? 'Dit is een herinnering. Zolang het misgaat, komt er hoogstens één per dag.'
      : 'Zolang het misgaat, komt er hoogstens één herinnering per dag. Gaat het weer goed, dan volgt een laatste mail.',
    '',
  ].join('\n')

  return { subject, text, to: context.to } satisfies Mail
}

/** The date as a supporter reads it, in Dutch time: "1 november 2026". */
function formatDate(time: Date): string {
  return new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone }).format(time)
}

/** The date and the time, in Dutch time: "1 november 2026 om 10:00". */
function formatDateTime(time: Date): string {
  return new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeStyle: 'short', timeZone }).format(time)
}

/**
 * Where the mail goes and what it says about the environment, or null (after a line in the log)
 * when there is nobody to mail or no mailbox to mail with.
 */
function readContext(run: AlertRun, options: AlertOptions & Required<Pick<AlertOptions, 'write'>>): Context | null {
  const env = options.env ?? process.env

  try {
    const { ALERT_MAIL_TO } = readAlertEnv(env)

    if (ALERT_MAIL_TO === undefined) {
      options.write(`Alert: ${run.label} needs a mail, but ALERT_MAIL_TO is not set, so none is sent.`)

      return null
    }

    const { SITE_ENV, SMTP_HOST } = readMailEnv(env)

    if (SMTP_HOST === undefined) {
      options.write(`Alert: ${run.label} needs a mail, but the settings of the mailbox are not set, so none is sent.`)

      return null
    }

    return {
      address: siteOrigins[SITE_ENV],
      environment: environmentNames[SITE_ENV],
      label: run.label.replaceAll(/\s+/gu, ' ').trim(),
      to: ALERT_MAIL_TO,
    }
  } catch (error) {
    options.write(
      `Alert: ${run.label} needs a mail, but the settings are wrong, so none is sent: ${describeProblem(error)}`,
    )

    return null
  }
}

/** The mail for an import that works again. */
function recoveryMail(context: Context, failing: { since: Date; times: number }, now: Date) {
  return {
    subject: `[${context.environment}] ${context.label} werkt weer`,
    text: [
      `${context.label} werkt weer sinds ${formatDateTime(now)}.`,
      `Het ging mis vanaf ${formatDateTime(failing.since)}, ${failing.times} keer achter elkaar.`,
      '',
      `Omgeving: ${context.environment} (${context.address}).`,
      'Je hoeft niets te doen.',
      '',
    ].join('\n'),
    to: context.to,
  } satisfies Mail
}

/** A web address without what can hold a secret. Text that is no address becomes a word. */
function scrubAddress(found: string): string {
  const [, address = found, tail = ''] = /^(.*?)([.,;:!?]*)$/u.exec(found) ?? []

  try {
    const url = new URL(address)
    const path = url.pathname
      .split('/')
      .map((part) => (/^[\w-]{20,}$/u.test(part) && /\d/u.test(part) ? '…' : part))
      .join('/')

    return `${url.protocol}//${url.host}${path === '/' ? '' : path}${tail}`
  } catch {
    return '[adres]'
  }
}

async function track(db: Executor, run: AlertRun, options: AlertOptions & Required<Pick<AlertOptions, 'write'>>) {
  const now = (options.clock ?? (() => new Date()))()
  const [stored] = await db.select().from(importAlerts).where(eq(importAlerts.subject, run.subject))

  if (run.ok) {
    if (stored === undefined) {
      return
    }

    // The row goes first: a mail that can't be sent is not tried again, because the import
    // works and a second failure has to start the count again.
    await db.delete(importAlerts).where(eq(importAlerts.subject, run.subject))

    if (stored.mailedAt !== null) {
      await deliver(run, options, (context) =>
        recoveryMail(context, { since: stored.failingSince, times: stored.failuresInARow }, now),
      )
    }

    return
  }

  const error = scrubError(run.error)
  const times = (stored?.failuresInARow ?? 0) + 1
  const since = stored?.failingSince ?? now

  if (stored === undefined) {
    await db
      .insert(importAlerts)
      .values({ failingSince: since, failuresInARow: times, lastError: error, subject: run.subject })
  } else {
    await db
      .update(importAlerts)
      .set({ failuresInARow: times, lastError: error })
      .where(eq(importAlerts.subject, run.subject))
  }

  const first = stored?.mailedAt === null || stored?.mailedAt === undefined
  const reminderDue = !first && now.getTime() - (stored?.mailedAt?.getTime() ?? 0) >= remindAfterMs

  if (times < alertAfterFailures || !(first || reminderDue)) {
    return
  }

  const sent = await deliver(run, options, (context) => failureMail(context, { error, since, times }, !first))

  if (sent) {
    await db.update(importAlerts).set({ mailedAt: now }).where(eq(importAlerts.subject, run.subject))
  }
}
