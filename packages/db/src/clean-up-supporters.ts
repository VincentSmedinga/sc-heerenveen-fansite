import type { Mail } from '@fansite/shared/mail'

import { parseEnv } from '@fansite/shared/env'
import { isFansPartOn } from '@fansite/shared/fans-env'
import { sendMail } from '@fansite/shared/mail'
import { siteEnvSchema, siteOrigins } from '@fansite/shared/site-env'
import { and, asc, gte, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'

import type { Database } from './client.ts'

import { closeAccount } from './close-account.ts'
import { supporterLoginLinks, supporters } from './schema.ts'

// The clean-up of the accounts of supporters (issue 1460), a step of the run that cron starts
// every quarter of an hour. An account that was not visited for 24 months gets one mail, and is
// closed 30 days later with `closeAccount`, unless the supporter visits in between. The same
// step removes the sign-ups nobody confirmed once they have expired.

/** How many months without a visit make an account unused. */
export const unusedMonths = 24

/** How many days after the mail the account is closed. */
export const graceDays = 30

/** The most mails a day, so a large group doesn't reach the limit of the host. */
export const mailsPerDay = 20

export type CleanUpOptions = {
  /** The environment variables: the FANS_ settings, SITE_ENV and the mailbox settings. */
  env?: Record<string, string | undefined>
  /** Sends a mail. A test gives a fake one, so nothing real is sent. */
  send?: (mail: Mail) => Promise<void>
}

export type CleanUpReport = {
  /** The accounts that were closed. */
  closed: number
  /** The mails that could not be sent. */
  failed: number
  /** The accounts that got the mail. */
  mailed: number
  /** The sign-ups nobody confirmed that were removed. */
  signUpsRemoved: number
}

/**
 * Mails the accounts that are unused and closes the ones whose mail is 30 days old. It does
 * nothing while accounts are off: no mail and no closing, and the 30 days of an account start
 * at its mail, which only goes out while accounts are on. It never closes an account without a
 * mail that was sent 30 days before, and it counts a mail as sent only after the mail server
 * took it, so a failed mail is tried again by the next run. It gives only counts.
 */
export async function cleanUpSupporters(
  db: Database,
  now: Date,
  { env = process.env, send = (mail) => sendMail(mail, env) }: CleanUpOptions = {},
): Promise<CleanUpReport> {
  const report: CleanUpReport = { closed: 0, failed: 0, mailed: 0, signUpsRemoved: await removeExpiredSignUps(db, now) }

  if (!isFansPartOn('accounts', env)) {
    return report
  }

  // The accounts whose mail is 30 days old and that were not visited since: the day of the
  // mail is the latest visit that still counts as before it.
  const due = await db
    .select({ id: supporters.id })
    .from(supporters)
    .where(
      and(
        isNotNull(supporters.unusedMailSentAt),
        lt(supporters.unusedMailSentAt, daysBefore(now, graceDays)),
        or(isNull(supporters.lastVisitOn), sql`${supporters.lastVisitOn} <= DATE(${supporters.unusedMailSentAt})`),
      ),
    )

  for (const { id } of due) {
    if (await closeAccount(db, id, now)) {
      report.closed += 1
    }
  }

  const startOfDay = new Date(now)

  startOfDay.setUTCHours(0, 0, 0, 0)

  const [sentToday] = await db
    .select({ count: sql<number>`COUNT(*)` })
    .from(supporters)
    .where(gte(supporters.unusedMailSentAt, startOfDay))
  const room = mailsPerDay - Number(sentToday?.count ?? 0)

  if (room <= 0) {
    return report
  }

  const origin = siteOrigins[parseEnv(siteEnvSchema, env).SITE_ENV]
  const unused = await db
    .select({ email: supporters.email, id: supporters.id })
    .from(supporters)
    .where(
      and(
        isNull(supporters.unusedMailSentAt),
        sql`COALESCE(${supporters.lastVisitOn}, DATE(${supporters.createdAt})) < ${dayMonthsBefore(now, unusedMonths)}`,
      ),
    )
    .orderBy(asc(sql`COALESCE(${supporters.lastVisitOn}, DATE(${supporters.createdAt}))`), asc(supporters.id))
    .limit(room)

  for (const { email, id } of unused) {
    try {
      await send({ subject: 'Je account bij Fans verdwijnt over 30 dagen', text: unusedMailText(origin), to: email })
    } catch {
      report.failed += 1

      continue
    }

    await db
      .update(supporters)
      .set({ unusedMailSentAt: now })
      .where(sql`${supporters.id} = ${id}`)
    report.mailed += 1
  }

  return report
}

/** The line for the log of the run: counts, no names, addresses or numbers. */
export function describeCleanUp({ closed, failed, mailed, signUpsRemoved }: CleanUpReport) {
  if (closed + failed + mailed + signUpsRemoved === 0) {
    return []
  }

  return [
    `Supporter accounts: ${mailed} mailed about being unused, ${closed} closed, ${failed} mails failed; ${signUpsRemoved} unconfirmed sign-ups removed`,
  ]
}

/**
 * Removes the sign-ups nobody confirmed and that have expired: the rows with an address and a
 * screen name and no account in the table of links. It runs with every run, so such an address
 * is there a day at most, whether or not accounts are on (see the privacy page). It gives how
 * many it removed.
 */
export async function removeExpiredSignUps(db: Database, now: Date) {
  const [result] = await db
    .delete(supporterLoginLinks)
    .where(and(isNull(supporterLoginLinks.userId), lt(supporterLoginLinks.expiresAt, now)))

  return result.affectedRows
}

/** The text of the mail: what goes, what stays without a name, and how to keep the account. */
export function unusedMailText(origin: string) {
  return [
    'Je account bij Fans op de sc Heerenveen Fansite is twee jaar niet gebruikt.',
    'Over 30 dagen verdwijnt hij.',
    '',
    `Wil je hem houden? Log dan één keer in: ${origin}/fans/inloggen`,
    '',
    'Dan blijft je account en begint er een nieuwe termijn van twee jaar.',
    '',
    'Wat er verdwijnt: je schermnaam, je e-mailadres en je sessies.',
    'Wat je in de spellen hebt ingevuld, blijft staan zonder je naam of je adres erbij.',
    '',
    'Dit is het enige bericht hierover.',
    '',
  ].join('\n')
}

/** The day that is `months` months before `now`, as `YYYY-MM-DD`. */
function dayMonthsBefore(now: Date, months: number) {
  const day = new Date(now)

  day.setUTCMonth(day.getUTCMonth() - months)

  return day.toISOString().slice(0, 10)
}

/** The moment `days` days before `now`. */
function daysBefore(now: Date, days: number) {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
}
