import type { Database } from '@fansite/db/client'

import { supporters } from '@fansite/db/schema'
import { readReminderSecret } from '@fansite/shared/fans-env'
import { readReminderCode } from '@fansite/shared/reminder-code'
import { eq } from 'drizzle-orm'

// The choice "Herinnering per e-mail" of a supporter (issue 1459): one message the day before a
// match, for a supporter who didn't predict yet. It is off until the supporter turns it on. The
// message comes from a step of the run of the importer (issue 1461, send-reminders in
// `@fansite/db`); this keeps the choice and turns it off with the code from the message.

/** Turns the reminder of a supporter on or off; at once, both ways. */
export async function setReminder(db: Database, supporterId: number, on: boolean) {
  await db.update(supporters).set({ remindByEmail: on }).where(eq(supporters.id, supporterId))
  console.info(`Supporter ${supporterId} changed the choice for the reminder.`)
}

/** The page with the button that turns the reminder off, and the page after it. */
export const reminderOffPaths = {
  done: '/fans/herinnering/uitzetten?klaar=1',
  page: '/fans/herinnering/uitzetten',
} as const

/**
 * The number of the supporter in the code of the link of a mail, or `undefined` for a code that
 * is wrong, has expired or can't be checked because the server has no secret.
 */
export function supporterOfReminderCode(
  code: unknown,
  now = new Date(),
  source: Record<string, string | undefined> = process.env,
) {
  if (typeof code !== 'string') {
    return undefined
  }

  try {
    return readReminderCode(code, readReminderSecret(source), now)
  } catch {
    return undefined
  }
}

/**
 * Turns the reminder off for the supporter in a code from the link of a mail, without logging
 * in. It says whether the code was good; a wrong or expired code changes nothing.
 */
export async function turnOffWithCode(
  db: Database,
  code: unknown,
  now = new Date(),
  source: Record<string, string | undefined> = process.env,
) {
  const supporterId = supporterOfReminderCode(code, now, source)

  if (supporterId === undefined) {
    return false
  }

  await setReminder(db, supporterId, false)

  return true
}
