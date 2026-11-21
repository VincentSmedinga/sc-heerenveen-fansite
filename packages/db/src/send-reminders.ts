import type { Mail } from '@fansite/shared/mail'

import { contactEmail } from '@fansite/shared/contact-email'
import { parseEnv } from '@fansite/shared/env'
import { isFansPartOn, readReminderSecret, readReminderSettings } from '@fansite/shared/fans-env'
import { sendMail } from '@fansite/shared/mail'
import { makeReminderCode } from '@fansite/shared/reminder-code'
import { siteEnvSchema, siteOrigins } from '@fansite/shared/site-env'
import { and, count, eq, inArray, isNotNull, isNull, lt } from 'drizzle-orm'

import type { Database } from './client.ts'
import type { PredictionMatch } from './prediction-matches.ts'

import { isOpen, predictionMatches } from './prediction-matches.ts'
import { matches, predictions, supporterReminders, supporters } from './schema.ts'

// The reminder by e-mail for the game Prognose (issue 1461), a step of the run that cron starts
// every quarter of an hour. On the day before a match, from the reminder hour on, it mails the
// supporters who turned the reminder on and did not predict yet. It asks the same question as
// the page which match can be predicted, and sends only while that form is open.

const timeZone = 'Europe/Amsterdam'
const day = 24 * 60 * 60 * 1000

/** How long the record of a sent reminder is kept after the kick-off of its match. */
export const keepRecordDays = 30

export type RemindersOptions = {
  /** The environment variables: the FANS_ settings, SITE_ENV and the mailbox settings. */
  env?: Record<string, string | undefined>
  /** Sends a mail. A test gives a fake one, so nothing real is sent. */
  send?: (mail: Mail) => Promise<void>
}

export type RemindersReport = {
  /** The mails that could not be sent. */
  failed: number
  /** Whether the limit of this run was reached while supporters were still waiting. */
  limited: boolean
  /** The mails that were sent. */
  sent: number
}

/** The Dutch date as `YYYY-MM-DD` and the Dutch hour of a moment. */
export function amsterdamTime(moment: Date) {
  const parts: Record<string, string> = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      day: '2-digit',
      hour: '2-digit',
      hourCycle: 'h23',
      month: '2-digit',
      timeZone,
      year: 'numeric',
    })
      .formatToParts(moment)
      .map(({ type, value }) => [type, value]),
  )

  return { date: `${parts['year']}-${parts['month']}-${parts['day']}`, hour: Number(parts['hour']) }
}

/** The Dutch date after the one of `moment`. */
export function dayAfter(moment: Date) {
  const { date } = amsterdamTime(moment)

  return new Date(Date.parse(`${date}T12:00:00Z`) + day).toISOString().slice(0, 10)
}

const weekday = new Intl.DateTimeFormat('nl-NL', { timeZone, weekday: 'long' })
const clock = new Intl.DateTimeFormat('nl-NL', { hour: 'numeric', hourCycle: 'h23', minute: '2-digit', timeZone })

/** The line for the log of the run: counts, no names, addresses or numbers. */
export function describeReminders({ failed, limited, sent }: RemindersReport) {
  return sent + failed === 0 && !limited
    ? []
    : [`Reminders: ${sent} sent, ${failed} failed${limited ? ', limit of this run reached' : ''}`]
}

/** "Zaterdag 16.45 uur": the kick-off in plain words, in Dutch time. */
export function kickoffWords(kickoffAt: Date) {
  const name = weekday.format(kickoffAt)

  return `${name.charAt(0).toUpperCase()}${name.slice(1)} ${clock.format(kickoffAt).replace(':', '.')} uur`
}

/** The clubs of the match in the order of the line: "sc Heerenveen – FC Twente". */
export function matchTitle(match: Pick<PredictionMatch, 'home' | 'opponent'>) {
  return match.home ? `sc Heerenveen – ${match.opponent}` : `${match.opponent} – sc Heerenveen`
}

/** The mail: plain text, the kick-off first, the link, and the way to turn the reminder off. */
export function reminderMail(match: PredictionMatch, to: string, origin: string, unsubscribeCode: string): Mail {
  return {
    subject: `Voorspel ${matchTitle(match)}`,
    text: [
      `${match.kickoffAt === null ? '' : kickoffWords(match.kickoffAt)} is de aftrap van ${matchTitle(match)}. Tot dan kun je nog voorspellen.`,
      '',
      `Voorspel de rust- en eindstand: ${origin}/fans/prognose`,
      '',
      `Geen herinnering meer? Zet hem uit: ${origin}/fans/herinnering/uitzetten?code=${unsubscribeCode}`,
      '',
    ].join('\n'),
    to,
  }
}

/**
 * Sends the reminders that are due, and removes the records of old matches. It sends nothing
 * while the game is off, and for a match only when it is the match of the form, the form is
 * open, its kick-off is tomorrow in Dutch time and the Dutch hour is the reminder hour or
 * later.
 * A supporter gets it only with the reminder on, not blocked and without a prediction for the
 * match. The record of a mail is made just before it goes out and removed when it fails, so a
 * run that is repeated sends nothing twice and a mail that did not go out is tried again. It
 * gives only counts, and throws when the secret for the link is missing.
 */
export async function sendReminders(
  db: Database,
  now: Date,
  { env = process.env, send = (mail) => sendMail(mail, env) }: RemindersOptions = {},
): Promise<RemindersReport> {
  const report: RemindersReport = { failed: 0, limited: false, sent: 0 }

  if (!isFansPartOn('prognose', env)) {
    return report
  }

  const { hour, limit } = readReminderSettings(env)

  await db.delete(supporterReminders).where(
    inArray(
      supporterReminders.matchId,
      db
        .select({ id: matches.id })
        .from(matches)
        .where(
          and(isNotNull(matches.kickoffAt), lt(matches.kickoffAt, new Date(now.getTime() - keepRecordDays * day))),
        ),
    ),
  )

  const { next } = await predictionMatches(db, now)
  const time = amsterdamTime(now)

  if (
    next === undefined ||
    next.kickoffAt === null ||
    !isOpen(next, now) ||
    amsterdamTime(next.kickoffAt).date !== dayAfter(now) ||
    time.hour < hour
  ) {
    return report
  }

  const [already] = await db
    .select({ count: count() })
    .from(supporterReminders)
    .where(eq(supporterReminders.matchId, next.id))
  const due = await db
    .select({ email: supporters.email, id: supporters.id })
    .from(supporters)
    .leftJoin(predictions, and(eq(predictions.supporterId, supporters.id), eq(predictions.matchId, next.id)))
    .leftJoin(
      supporterReminders,
      and(eq(supporterReminders.supporterId, supporters.id), eq(supporterReminders.matchId, next.id)),
    )
    .where(
      and(
        eq(supporters.remindByEmail, true),
        isNull(supporters.disabledAt),
        isNull(predictions.id),
        isNull(supporterReminders.id),
      ),
    )
    .orderBy(supporters.id)
    .limit(limit + 1)

  if (due.length === 0) {
    return report
  }

  // Only now: a server without the secret says so when there is something to send.
  const secret = readReminderSecret(env)

  report.limited = due.length > limit

  const origin = siteOrigins[parseEnv(siteEnvSchema, env).SITE_ENV]

  for (const { email, id } of due.slice(0, limit)) {
    const [claimed] = await db.insert(supporterReminders).ignore().values({ matchId: next.id, supporterId: id })

    if (claimed.affectedRows === 0) {
      continue
    }

    try {
      await send(reminderMail(next, email, origin, makeReminderCode(id, secret, now)))
      report.sent += 1
    } catch {
      await db
        .delete(supporterReminders)
        .where(and(eq(supporterReminders.supporterId, id), eq(supporterReminders.matchId, next.id)))
      report.failed += 1
    }
  }

  // One mail to the editors, from the run that begins the reminders of this match, so it
  // doesn't come every quarter of an hour.
  if (report.limited && (already?.count ?? 0) === 0) {
    await send(limitMail(limit)).catch(() => undefined)
  }

  return report
}

/** The mail to the editors when the limit of a run is reached. */
function limitMail(limit: number): Mail {
  return {
    subject: 'Herinneringen voor de Prognose: de limiet is bereikt',
    text: [
      `Een run van de import stuurde ${limit} herinneringen en er wachten nog meer supporters.`,
      'De rest volgt bij de volgende runs. Is dat te langzaam, verhoog dan FANS_REMINDER_LIMIT,',
      'maar kijk eerst naar de zendlimiet per uur van de hosting.',
      '',
    ].join('\n'),
    to: contactEmail,
  }
}
