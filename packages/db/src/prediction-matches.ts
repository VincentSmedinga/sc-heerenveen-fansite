import { and, eq, gt, inArray, isNull, or, sql } from 'drizzle-orm'

import type { Database } from './client.ts'

import { clubs, matches } from './schema.ts'

// Which match the game Prognose is about (issue 1447). It lives here, next to the schema, so
// the importer asks the same question for the reminder by e-mail (issue 1461) as the page does.
// importer can ask the same question for the reminder by e-mail (issue 1461) as the page does.

/**
 * How long after the kick-off a match that has begun stays on the page as "Gesloten": a match
 * with extra time and a shoot-out takes about three hours.
 */
export const closedCardHours = 4

/** The match of a card: what the page shows of it and what the deadline needs. */
export type PredictionMatch = {
  clubSlug: string
  competition: string
  dateText: null | string
  home: boolean
  id: number
  kickoffAt: Date | null
  matchDate: string
  opponent: string
  round: string
  season: string
  status: 'cancelled' | 'played' | 'postponed' | 'scheduled'
}

/**
 * The matches of the page: `next` is the one match that can be predicted now, and `started` is
 * the match that began less than `closedCardHours` ago, shown as closed above it.
 */
export type PredictionMatches = { next?: PredictionMatch; started?: PredictionMatch }

const columns = {
  clubSlug: clubs.slug,
  competition: matches.competition,
  dateText: matches.dateText,
  home: matches.home,
  id: matches.id,
  kickoffAt: matches.kickoffAt,
  matchDate: matches.matchDate,
  opponent: matches.opponent,
  round: matches.round,
  season: matches.season,
  status: matches.status,
}

const hour = 60 * 60 * 1000

/**
 * The first moment of a match, to put the matches in order: the kick-off, or the start of the
 * day while the time is not known, so a match without a time stands after the ones of its day
 * that have one.
 */
const orderOf = (match: PredictionMatch) =>
  `${match.matchDate} ${match.kickoffAt === null ? '99:99' : match.kickoffAt.toISOString().slice(11, 16)}`

/**
 * Which match the form is for. All matches of the first team count: the league, the cup, the
 * play-offs and Europe. A match that is cancelled, or postponed without a new date, doesn't
 * count, so the form moves on to the next one. A match that was postponed and got a new date
 * is the same match, so what was predicted stays. The next match is the first one that has not
 * begun; one without a known time counts while its day is not over. The deadline is the
 * kick-off by the clock of the server (`now`).
 */
export async function predictionMatches(db: Database, now = new Date()): Promise<PredictionMatches> {
  const since = new Date(now.getTime() - closedCardHours * hour)
  const today = now.toISOString().slice(0, 10)
  const found = await db
    .select(columns)
    .from(matches)
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .where(
      and(
        inArray(matches.status, ['scheduled', 'played']),
        or(
          and(sql`${matches.kickoffAt} is not null`, gt(matches.kickoffAt, since)),
          and(isNull(matches.kickoffAt), eq(matches.status, 'scheduled'), sql`${matches.matchDate} >= ${today}`),
        ),
      ),
    )
  const sorted = found.toSorted((a, b) => orderOf(a).localeCompare(orderOf(b)))
  const next = sorted.find(
    (match) => match.status === 'scheduled' && (match.kickoffAt === null || match.kickoffAt.getTime() > now.getTime()),
  )
  const started = sorted.findLast((match) => match.kickoffAt !== null && match.kickoffAt.getTime() <= now.getTime())

  return {
    ...(next === undefined ? {} : { next }),
    ...(started === undefined ? {} : { started }),
  }
}

/** Whether the form of the match is open: its kick-off is known and has not come. */
export const isOpen = (match: Pick<PredictionMatch, 'kickoffAt'>, now = new Date()) =>
  match.kickoffAt !== null && match.kickoffAt.getTime() > now.getTime()
