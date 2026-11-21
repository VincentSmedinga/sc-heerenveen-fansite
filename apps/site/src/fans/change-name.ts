import type { Database } from '@fansite/db/client'

import { supporters } from '@fansite/db/schema'
import { and, eq, isNull, lt, or } from 'drizzle-orm'

import type { ScreenNameProblem } from './screen-name'

import { checkScreenName } from './screen-name'
import { isDuplicate } from './sign-up'

// Changing the screen name of a supporter (issue 1452), with the rules of signing up, at most
// once in 30 days. The site keeps no old names: the new one is everywhere at once, and the old
// one is free for somebody else.

/** The page of changing the name. */
export const changeNamePath = '/fans/mijn-account/schermnaam'

/** How many days after a change the name can be changed again. */
export const daysBetweenChanges = 30

const timeZone = 'Europe/Amsterdam'
const day = 24 * 60 * 60 * 1000
const dayFormat = new Intl.DateTimeFormat('nl-NL', { day: 'numeric', month: 'long', timeZone: 'UTC' })

/**
 * What a change of name leads to: the change, the same name as before (nothing changes), an
 * error of the field, or the wait until the name can be changed again.
 */
export type ChangeNameResult =
  | { answer: 'changed' | 'unchanged' }
  | { answer: 'invalid'; error: ScreenNameProblem | { problem: 'taken' } }
  | { answer: 'wait'; wait: NameWait }

/** When the name was changed last, and the first day it can be changed again, in Dutch. */
export type NameWait = { changedOn: string; from: string }

/**
 * Changes the name of a supporter, with the rules, the refused names and the look-alikes of
 * signing up. Only other capitals, accents or spaces is a change too, and counts. The name of
 * another account is taken; the own name is not. The database refuses the change within 30
 * days, also when two requests come at the same moment.
 */
export async function changeScreenName(
  db: Database,
  supporterId: number,
  value: string,
  now = new Date(),
): Promise<ChangeNameResult> {
  const [account] = await db
    .select({ changedAt: supporters.screenNameChangedAt, screenName: supporters.screenName })
    .from(supporters)
    .where(eq(supporters.id, supporterId))

  if (account === undefined) {
    return { answer: 'unchanged' }
  }

  const wait = nameWait(account.changedAt, now)

  if (wait !== undefined) {
    return { answer: 'wait', wait }
  }

  const name = checkScreenName(value)

  if (name.problem) {
    return { answer: 'invalid', error: name }
  }

  if (name.name === account.screenName) {
    return { answer: 'unchanged' }
  }

  const [other] = await db.select({ id: supporters.id }).from(supporters).where(eq(supporters.screenNameKey, name.key))

  if (other !== undefined && other.id !== supporterId) {
    return { answer: 'invalid', error: { problem: 'taken' } }
  }

  try {
    const [updated] = await db
      .update(supporters)
      .set({ screenName: name.name, screenNameChangedAt: now, screenNameKey: name.key })
      .where(
        and(
          eq(supporters.id, supporterId),
          or(isNull(supporters.screenNameChangedAt), lt(supporters.screenNameChangedAt, latestChange(now))),
        ),
      )

    if (updated.affectedRows !== 1) {
      return { answer: 'unchanged' }
    }
  } catch (error) {
    if (isDuplicate(error)) {
      return { answer: 'invalid', error: { problem: 'taken' } }
    }

    throw error
  }

  console.info(`Supporter ${supporterId} changed the screen name.`)

  return { answer: 'changed' }
}

/**
 * The wait before the name can be changed again, or `undefined` when it can be changed now. The
 * days are days of the calendar in the Netherlands: a name changed on 4 December can be changed
 * again from 3 January, at any hour.
 */
export function nameWait(changedAt: Date | null, now = new Date()): NameWait | undefined {
  if (changedAt === null) {
    return undefined
  }

  const changedOn = dayOf(changedAt)
  const from = changedOn + daysBetweenChanges * day

  return dayOf(now) >= from
    ? undefined
    : { changedOn: dayFormat.format(new Date(changedOn)), from: dayFormat.format(new Date(from)) }
}

/** The day in the Netherlands of a moment, as the time of midnight UTC of that date. */
function dayOf(moment: Date) {
  const [year, month, date] = moment.toLocaleDateString('en-CA', { timeZone }).split('-').map(Number)

  return Date.UTC(year ?? 0, (month ?? 1) - 1, date ?? 1)
}

/**
 * The last moment a change may have been made for a change now to be allowed: the end of the
 * day in the Netherlands 30 days before today. A change before it is at least 30 days ago.
 */
function latestChange(now: Date) {
  const limit = new Date(dayOf(now) - (daysBetweenChanges - 1) * day)
  // Midnight of that date in the Netherlands: the offset of that moment, an hour or two.
  const offset = Number(limit.toLocaleString('en-US', { hour: 'numeric', hourCycle: 'h23', timeZone })) * 60 * 60 * 1000

  return new Date(limit.getTime() - offset)
}
