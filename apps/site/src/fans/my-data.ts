import type { Database } from '@fansite/db/client'
import type { FansPart } from '@fansite/shared/fans-env'

import { supporterReminders, supporters } from '@fansite/db/schema'
import { isFansPartOn } from '@fansite/shared/fans-env'
import { count, eq } from 'drizzle-orm'

import { fansGames } from '../fans-paths'
import { predictionData } from './prediction-results'
import { ratingData } from './rating-data'

// Everything the site keeps of a supporter, for the page "Alles wat we van je bewaren" and the
// card "Wat je speelde" on Mijn account (issue 1454). Each game has a fixed place here; the
// issue that builds a game fills it. A test (my-data.test.ts) fails for a table that refers to
// a supporter and has no place here, so no game can forget its data.

/** The page "Alles wat we van je bewaren". */
export const myDataPath = '/fans/mijn-account/gegevens'

/**
 * The tables that belong to the account itself and go with it when it is closed
 * (`ON DELETE CASCADE`): the sessions, the links and codes, the requests for a new address and
 * the record of the reminders that were sent. The page shows only the last one, as a count of
 * matches; the others are there for a few minutes or are the session itself.
 */
export const accountTables = [
  'supporter_reminders',
  'supporter_email_changes',
  'supporter_login_links',
  'supporter_sessions',
] as const

/** What a game shows of a supporter: a summary for Mijn account and a table for the page. */
export type GameData = {
  /** The headers of the columns, the first one for the row (such as the match). */
  columns: readonly string[]
  /** One row per thing filled in: its header (such as the match) and the other cells. */
  rows: readonly { cells: readonly string[]; header: string }[]
  /** A short line for Mijn account, such as "13 voorspellingen, 371 punten". */
  summary: string
}

/**
 * The place of a game: its part, the tables in which it keeps what a supporter filled in, and
 * how it reads them. A table of a game refers to the supporter with `ON DELETE SET NULL`, so
 * what was filled in stays without a link to a person when the account goes. Fantest keeps
 * nothing of a supporter, so it has no place.
 */
export type GamePlace = {
  label: string
  /** Gives what the supporter filled in, or `undefined` for nothing. */
  load: (db: Database, supporterId: number) => Promise<GameData | undefined>
  part: Exclude<FansPart, 'accounts' | 'fantest'>
  tables: readonly string[]
}

/**
 * What each game keeps of a supporter: the table and how to read it. A game that keeps nothing
 * yet has no entry; the issue that builds it adds one.
 */
const kept: Partial<Record<GamePlace['part'], Pick<GamePlace, 'load' | 'tables'>>> = {
  prognose: { load: predictionData, tables: ['predictions'] },
  uitblinker: { load: ratingData, tables: ['player_ratings'] },
}

/** The places of the games, in the order of the bar of games. */
export const gamePlaces: readonly GamePlace[] = fansGames.flatMap(({ label, part }) =>
  part === 'fantest' ? [] : [{ label, load: () => Promise.resolve(undefined), part, tables: [], ...kept[part] }],
)

/** What the account itself holds, for the first card of the page. */
export type AccountData = {
  /** When the editors blocked the account, and why, or `null` for an account that isn't. */
  blockedAt: Date | null
  blockedReason: null | string
  createdAt: Date
  email: string
  inRankings: boolean
  lastVisitOn: null | string
  remindByEmail: boolean
  /** For how many matches a reminder by e-mail was sent. */
  remindersSent: number
  screenName: string
  screenNameChangedAt: Date | null
}

/** A game that is on, with what the supporter filled in there, or `undefined` for nothing. */
export type PlayedGame = { data: GameData | undefined; href: string; label: string }

/** The row of the account, or `undefined` when it is gone. */
export async function accountData(db: Database, supporterId: number): Promise<AccountData | undefined> {
  const [account] = await db
    .select({
      blockedAt: supporters.disabledAt,
      blockedReason: supporters.disabledReason,
      createdAt: supporters.createdAt,
      email: supporters.email,
      inRankings: supporters.inRankings,
      lastVisitOn: supporters.lastVisitOn,
      remindByEmail: supporters.remindByEmail,
      screenName: supporters.screenName,
      screenNameChangedAt: supporters.screenNameChangedAt,
    })
    .from(supporters)
    .where(eq(supporters.id, supporterId))

  if (account === undefined) {
    return undefined
  }

  const [sent] = await db
    .select({ count: count() })
    .from(supporterReminders)
    .where(eq(supporterReminders.supporterId, supporterId))

  return { ...account, remindersSent: sent?.count ?? 0 }
}

/** The games that are on, each with what the supporter filled in. */
export async function playedGames(
  db: Database,
  supporterId: number,
  source?: Record<string, string | undefined>,
): Promise<PlayedGame[]> {
  const on = gamePlaces.filter(({ part }) => isFansPartOn(part, source))

  return Promise.all(
    on.map(async (place) => ({
      data: await place.load(db, supporterId),
      href: fansGames.find(({ part }) => part === place.part)?.href ?? '/fans',
      label: place.label,
    })),
  )
}

/** The anchor of the card of a game on the page "Alles wat we van je bewaren". */
export function slugOf(label: string) {
  return label.toLowerCase().replaceAll(/[^a-z0-9]+/g, '-')
}
