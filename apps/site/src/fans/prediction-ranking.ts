import type { Database } from '@fansite/db/client'

import { clubs, matches, predictions, supporters } from '@fansite/db/schema'
import { and, desc, eq, sql } from 'drizzle-orm'

import { cacheForKey } from '#src/cache'
import { getDatabase } from '#src/database'

import { clubsOf } from './prediction'
import { columns, countsInPrognose, hasRankingRow, scored } from './prediction-results'

// The ranking of the game Prognose (issue 1451), per season and per match. The points are never
// stored: they are worked out from the predictions and the results each time the ranking is
// built, by `scored`, so a corrected score corrects the ranking within the five minutes it is
// kept. Who counts is decided by `countsInPrognose` and `hasRankingRow` in prediction-results.

/** A match that was played and has predictions, for the list of the ranking per match. */
export type RankedMatch = {
  away: string
  /** The goals of the away club and of the home club, as written on the line: home–away. */
  awayGoals: number
  home: string
  homeGoals: number
  id: number
  matchDate: string
  season: string
}

/** One row of a ranking: a supporter with a row, and what they scored in the scope. */
export type RankedRow = {
  /** Points per prediction. */
  average: number
  /** The number of predictions in the scope. */
  count: number
  /** The place: equal results share one, and the next place is skipped. */
  place: number
  screenName: string
  supporterId: number
  /** The points. */
  total: number
}

/**
 * A ranking: the rows of the supporters who have one, in order, and how many supporters count
 * all, which includes those who left their name out. `matchCount` is the number of matches that
 * were scored.
 */
export type Ranking = { counted: number; matchCount: number; rows: readonly RankedRow[] }

/** How many rows the table of the page shows before the row of the supporter. */
export const shownRows = 50

/** How many rows the card on the page of the game shows. */
export const topRows = 5

const fiveMinutes = 5 * 60 * 1000

type Entry = {
  count: number
  exactFullTime: number
  exactHalfTime: number
  name: string
  supporterId: number
  total: number
}

/** The order of a ranking: points, then exact full-time scores, then exact half-time scores. */
const keyOf = (entry: Entry) => [entry.total, entry.exactFullTime, entry.exactHalfTime] as const

const sameKey = (one: Entry, other: Entry) => keyOf(one).every((value, index) => value === keyOf(other)[index])

type Scope = { match: number } | { season: string }

/** Builds a ranking from what was read: equal results share a place. */
export function rankingOf(
  found: readonly {
    disabledAt: Date | null
    fullTimeExact: boolean
    halfTimeExact: boolean
    inRankings: boolean | null
    matchId: number
    points: number
    screenName: null | string
    supporterId: null | number
  }[],
): Ranking {
  const counting = found.filter((item) => countsInPrognose(item))
  const entries = new Map<number, Entry>()

  for (const item of counting) {
    const { screenName, supporterId } = item

    if (
      supporterId === null ||
      screenName === null ||
      !hasRankingRow({ ...item, inRankings: item.inRankings ?? false })
    ) {
      continue
    }

    const entry = entries.get(supporterId) ?? {
      count: 0,
      exactFullTime: 0,
      exactHalfTime: 0,
      name: screenName,
      supporterId,
      total: 0,
    }

    entry.count += 1
    entry.total += item.points
    entry.exactFullTime += item.fullTimeExact ? 1 : 0
    entry.exactHalfTime += item.halfTimeExact ? 1 : 0
    entries.set(supporterId, entry)
  }

  const ordered = [...entries.values()].sort(
    (one, other) =>
      other.total - one.total ||
      other.exactFullTime - one.exactFullTime ||
      other.exactHalfTime - one.exactHalfTime ||
      one.name.localeCompare(other.name, 'nl') ||
      one.supporterId - other.supporterId,
  )
  const rows = ordered.map((entry): RankedRow => ({
    average: entry.total / entry.count,
    count: entry.count,
    // Equal results share the place of the first of them, so the next place is skipped.
    place: ordered.findIndex((other) => sameKey(other, entry)) + 1,
    screenName: entry.name,
    supporterId: entry.supporterId,
    total: entry.total,
  }))
  // Everybody who counts, with or without a row. A closed account has no number to tell its
  // predictions apart, so each of them counts once.
  const people = new Set(counting.flatMap((item) => (item.supporterId === null ? [] : [item.supporterId])))
  const closed = counting.filter((item) => item.supporterId === null).length

  return {
    counted: people.size + closed,
    matchCount: new Set(counting.map((item) => item.matchId)).size,
    rows,
  }
}

/** Reads the predictions of a scope with their points, only of matches that were played. */
async function readScope(db: Database, scope: Scope) {
  const rows = await db
    .select({
      ...columns,
      disabledAt: supporters.disabledAt,
      inRankings: supporters.inRankings,
      screenName: supporters.screenName,
      supporterId: predictions.supporterId,
    })
    .from(predictions)
    .leftJoin(supporters, eq(supporters.id, predictions.supporterId))
    .innerJoin(matches, eq(matches.id, predictions.matchId))
    .innerJoin(clubs, eq(clubs.id, matches.clubId))
    .where(
      and(
        eq(matches.status, 'played'),
        'match' in scope ? eq(matches.id, scope.match) : eq(matches.season, scope.season),
      ),
    )
  const now = new Date()

  return rankingOf(
    rows.map((row) => {
      const { points } = scored(row, now)

      return {
        disabledAt: row.disabledAt,
        fullTimeExact: points.fullTime?.exact === true,
        halfTimeExact: points.halfTime?.exact === true,
        inRankings: row.inRankings,
        matchId: row.id,
        points: points.total,
        screenName: row.screenName,
        supporterId: row.supporterId,
      }
    }),
  )
}

/** The ranking of a season, read without the cache. */
export const loadSeasonRanking = (db: Database, season: string) => readScope(db, { season })

/** The ranking of one match, read without the cache. */
export const loadMatchRanking = (db: Database, match: number) => readScope(db, { match })

/** The matches that were played and have predictions, the newest first. */
export async function loadRankedMatches(db: Database): Promise<RankedMatch[]> {
  const rows = await db
    .selectDistinct({
      goalsAgainst: matches.goalsAgainst,
      goalsFor: matches.goalsFor,
      home: matches.home,
      id: matches.id,
      kickoffAt: matches.kickoffAt,
      matchDate: matches.matchDate,
      opponent: matches.opponent,
      season: matches.season,
    })
    .from(predictions)
    .innerJoin(matches, eq(matches.id, predictions.matchId))
    .where(
      and(eq(matches.status, 'played'), sql`${matches.goalsFor} is not null and ${matches.goalsAgainst} is not null`),
    )
    .orderBy(desc(matches.matchDate), desc(matches.kickoffAt), desc(matches.id))

  return rows.map((row) => ({
    ...clubsOf(row),
    awayGoals: (row.home ? row.goalsAgainst : row.goalsFor) ?? 0,
    homeGoals: (row.home ? row.goalsFor : row.goalsAgainst) ?? 0,
    id: row.id,
    matchDate: row.matchDate,
    season: row.season,
  }))
}

/** The seasons that have predictions of a match that was played, the newest first. */
export async function loadRankedSeasons(db: Database): Promise<string[]> {
  const rows = await db
    .selectDistinct({ season: matches.season })
    .from(predictions)
    .innerJoin(matches, eq(matches.id, predictions.matchId))
    .where(eq(matches.status, 'played'))
    .orderBy(desc(matches.season))

  return rows.map((row) => row.season)
}

const getRanking = cacheForKey(fiveMinutes, (key) => {
  const { db } = getDatabase()
  const [kind, value = ''] = key.split(':')

  return kind === 'match' ? loadMatchRanking(db, Number(value)) : loadSeasonRanking(db, value)
})
const getSeasons = cacheForKey(fiveMinutes, () => loadRankedSeasons(getDatabase().db))
const getMatches = cacheForKey(fiveMinutes, () => loadRankedMatches(getDatabase().db))

/**
 * The ranking of a season, kept five minutes. The caller asks only for a season it has checked
 * against `rankedSeasons`, because the cache keeps an entry for each key (see `cacheForKey`).
 */
export const seasonRanking = (season: string) => getRanking(`season:${season}`)

/** The ranking of a match, kept five minutes; the match is one that has predictions. */
export const matchRanking = (matchId: number) => getRanking(`match:${matchId}`)

/** The seasons that have a ranking, kept five minutes. */
export const rankedSeasons = () => getSeasons('')

/** The matches that have a ranking, kept five minutes. */
export const rankedMatches = () => getMatches('')

/** The row of a supporter in a ranking, or `undefined`: no predictions, or no row by choice. */
export const rowOf = (ranking: Ranking, supporterId: number | undefined) =>
  supporterId === undefined ? undefined : ranking.rows.find((row) => row.supporterId === supporterId)

/** A place in words: "9e". */
export const placeText = (place: number) => `${place}e`

/**
 * A place as a key figure of the card with the points: "9e" with the note "van 54 bij deze
 * wedstrijd", or a dash with "niet in de stand" for a supporter who has no row (they chose to
 * stay out of the standings). `where` finishes the note: "bij deze wedstrijd" or "in de stand".
 */
export function placeFigure(ranking: Ranking, supporterId: number, where: string) {
  const row = rowOf(ranking, supporterId)

  return row === undefined
    ? { figure: '–', label: 'plek', note: `niet in de stand, ${ranking.counted} doen mee ${where}` }
    : { figure: placeText(row.place), label: 'plek', note: `van ${ranking.counted} ${where}` }
}
