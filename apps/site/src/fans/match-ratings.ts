import type { Database } from '@fansite/db/client'

import {
  coachRatings,
  matchAppearances,
  matchCoachRatings,
  matches,
  matchPlayerRatings,
  playerRatings,
  players,
  staff,
  supporters,
} from '@fansite/db/schema'
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm'

import { cacheFor, cacheForKey } from '#src/cache'
import { getDatabase } from '#src/database'

// What supporters rated the players of one match (issues 1467 and 1472): the card Uitblinker on
// the page of a match, the table of the standing and the winners of a season. It holds averages
// and counts of a group and never a person who rated.

/** A player counts for the Uitblinker of a match with at least this many ratings. */
export const ratingMinimum = 5

/**
 * The ratings of one match, in the order of `orderRatings`: the highest average first, then the
 * players without an average (fewer than `ratingMinimum` ratings), each group in the order of
 * the line-up.
 */
export type MatchRatings = {
  /** The head coach, with the average of his ratings, or nothing when nobody rated him. */
  coach?: RatedCoach
  players: RatedPlayer[]
  /** How many supporters rated the match: the most ratings any player has. */
  supporters: number
  /** The Uitblinker, or nothing when no player has `ratingMinimum` ratings. */
  winner?: RatedPlayer
}

/** The head coach of a match with the average of his ratings (1479), never the Uitblinker. */
export type RatedCoach = {
  average: number
  count: number
  name: string
}

/** One player of a match with the average of his ratings. */
export type RatedPlayer = {
  /** The row of the player in the line-up of the report, or `null` when the report has none. */
  appearanceId: null | number
  average: number
  count: number
  name: string
  playerId: number
}

const hundredths = (average: number) => Math.round(average * 100)

/**
 * The ratings that visitors of the old fansite gave in one match, 2001 to 2007, from the
 * averages that the import keeps. A match without ratings has none (`undefined`). The players
 * stand in the order of `orderRatings`; where that leaves them equal, they stand in the order
 * of the line-up of the report, and a player the report does not have, such as one who is no
 * longer in the squad of the season, stands last, by name. The name is the one of the table of
 * players, which keeps a player who left the squad.
 */
export const loadOldMatchRatings = (db: Database, matchId: number) => loadMatchRatings(db, matchId, 'oude-fansite')

/**
 * Puts the rows of a match in the order of the line-up: the players the report has, by their
 * place in it, and then the others as they came, which is by name.
 */
export function inLineUpOrder<T extends { appearanceId: null | number }>(rows: readonly T[]): T[] {
  return [...rows.filter((row) => row.appearanceId !== null), ...rows.filter((row) => row.appearanceId === null)]
}

/**
 * The averages that the import keeps for one match and one source: `oude-fansite` for the
 * visitors of the old fansite, `fans` for the supporters of the game Uitblinker, which the
 * closing of the window writes. The rest is as for `loadOldMatchRatings`.
 */
export async function loadMatchRatings(
  db: Database,
  matchId: number,
  source: 'fans' | 'oude-fansite',
): Promise<MatchRatings | undefined> {
  const rows = await db
    .select({
      appearanceId: matchAppearances.id,
      average: matchPlayerRatings.average,
      count: matchPlayerRatings.ratingCount,
      name: players.name,
      playerId: matchPlayerRatings.playerId,
    })
    .from(matchPlayerRatings)
    .innerJoin(players, eq(players.id, matchPlayerRatings.playerId))
    .leftJoin(
      matchAppearances,
      and(
        eq(matchAppearances.matchId, matchPlayerRatings.matchId),
        eq(matchAppearances.playerId, matchPlayerRatings.playerId),
        eq(matchAppearances.ours, true),
      ),
    )
    .where(and(eq(matchPlayerRatings.matchId, matchId), eq(matchPlayerRatings.source, source)))
    .orderBy(asc(matchAppearances.id), asc(players.name))

  if (rows.length === 0) {
    return undefined
  }

  const rated = orderRatings(inLineUpOrder(rows).map((row) => ({ ...row, average: Number(row.average) })))
  const winner = uitblinkerOf(rated)
  const coach = await loadCoachRatings(db, matchId, source)

  return {
    ...(coach === undefined ? {} : { coach }),
    players: rated,
    supporters: Math.max(...rated.map((player) => player.count)),
    ...(winner === undefined ? {} : { winner }),
  }
}

/**
 * The ratings of the head coach that are coming in while a window is open, as
 * `loadRunningRatings` does for the players: ratings of a blocked account do not count.
 */
export async function loadRunningCoachRating(db: Database, matchId: number): Promise<RatedCoach | undefined> {
  const [row] = await db
    .select({
      average: sql<string>`avg(${coachRatings.grade})`,
      count: sql<number>`count(*)`,
      name: staff.name,
    })
    .from(coachRatings)
    .innerJoin(staff, eq(staff.id, coachRatings.staffId))
    .leftJoin(supporters, eq(supporters.id, coachRatings.supporterId))
    .where(and(eq(coachRatings.matchId, matchId), eq(coachRatings.blocked, false), isNull(supporters.disabledAt)))
    .groupBy(coachRatings.staffId, staff.name)
    .limit(1)

  return row === undefined || Number(row.count) === 0
    ? undefined
    : { average: Number(row.average), count: Number(row.count), name: row.name }
}

/**
 * The ratings that are coming in while a window is open, for one match: an average and a count
 * for each player with at least one rating, worked out from the ratings themselves. Ratings of
 * a blocked account do not count, as in the averages that the closing of the window writes.
 * Only a page that shows them to a supporter who rated, or counts the supporters, may call it.
 */
export async function loadRunningRatings(db: Database, matchId: number): Promise<RatedPlayer[]> {
  const rows = await db
    .select({
      appearanceId: matchAppearances.id,
      average: sql<string>`avg(${playerRatings.grade})`,
      count: sql<number>`count(*)`,
      name: matchAppearances.name,
      playerId: matchAppearances.playerId,
    })
    .from(playerRatings)
    .innerJoin(matchAppearances, eq(matchAppearances.id, playerRatings.appearanceId))
    .leftJoin(supporters, eq(supporters.id, playerRatings.supporterId))
    .where(and(eq(matchAppearances.matchId, matchId), eq(playerRatings.blocked, false), isNull(supporters.disabledAt)))
    .groupBy(matchAppearances.id, matchAppearances.name, matchAppearances.playerId)

  return rows.flatMap((row) =>
    row.playerId === null
      ? []
      : [
          {
            appearanceId: row.appearanceId,
            average: Number(row.average),
            count: Number(row.count),
            name: row.name,
            playerId: row.playerId,
          },
        ],
  )
}

/**
 * The order of the table of a match, for every table of averages of a match: the players with
 * at least `ratingMinimum` ratings first, the highest average first, and with an equal average
 * (to two decimals) the player with more ratings. Players that are still equal, and the players
 * with too few ratings, keep the order they came in, which is the order of the line-up. The
 * Uitblinker is the first of the list when he has enough ratings, so the order and the winner
 * are one rule.
 */
export function orderRatings<T extends { average: number; count: number }>(rated: readonly T[]): T[] {
  const enough = rated.filter((player) => player.count >= ratingMinimum)
  const others = rated.filter((player) => player.count < ratingMinimum)

  return [...enough.toSorted((a, b) => hundredths(b.average) - hundredths(a.average) || b.count - a.count), ...others]
}

/**
 * The Uitblinker of a match: the first of `orderRatings`, when he has at least `ratingMinimum`
 * ratings: the highest average, and with an equal average the player with more ratings, as in
 * issue 1558. With those equal too, the one who comes first in `rated`, the line-up.
 */
export function uitblinkerOf<T extends { average: number; count: number }>(rated: readonly T[]): T | undefined {
  const [first] = orderRatings(rated)

  return first !== undefined && first.count >= ratingMinimum ? first : undefined
}

/** The average of the head coach of one match, from the averages that are kept for a source. */
async function loadCoachRatings(db: Database, matchId: number, source: 'fans' | 'oude-fansite') {
  const [row] = await db
    .select({ average: matchCoachRatings.average, count: matchCoachRatings.ratingCount, name: staff.name })
    .from(matchCoachRatings)
    .innerJoin(staff, eq(staff.id, matchCoachRatings.staffId))
    .where(and(eq(matchCoachRatings.matchId, matchId), eq(matchCoachRatings.source, source)))
    .limit(1)

  return row === undefined ? undefined : { average: Number(row.average), count: row.count, name: row.name }
}

/** The number of supporters who rated a match so far: each one rates every player. */
export const supportersIn = (running: readonly RatedPlayer[]) => Math.max(0, ...running.map((player) => player.count))

/** The Uitblinker of one match of a season, with the match he played, for the side card. */
export type SeasonWinner = {
  average: number
  goalsAgainst: null | number
  goalsFor: null | number
  home: boolean
  matchId: number
  name: string
  opponent: string
}

/** The match with the newest closed ratings of supporters, with its ratings, or nothing. */
export async function loadLatestResult(db: Database) {
  const [latest] = await db
    .select({
      goalsAgainst: matches.goalsAgainst,
      goalsFor: matches.goalsFor,
      home: matches.home,
      id: matches.id,
      opponent: matches.opponent,
    })
    .from(matchPlayerRatings)
    .innerJoin(matches, eq(matches.id, matchPlayerRatings.matchId))
    .where(eq(matchPlayerRatings.source, 'fans'))
    .orderBy(desc(matches.matchDate), desc(matches.id))
    .limit(1)

  if (latest === undefined) {
    return undefined
  }

  const ratings = await loadMatchRatings(db, latest.id, 'fans')

  return ratings === undefined ? undefined : { match: latest, ratings }
}

/**
 * The Uitblinkers of a season, the newest match first: one for each match whose window closed
 * with a player on at least `ratingMinimum` ratings. A match without one has no row.
 */
export async function loadSeasonWinners(db: Database, season: string): Promise<SeasonWinner[]> {
  const rows = await db
    .select({
      average: matchPlayerRatings.average,
      count: matchPlayerRatings.ratingCount,
      goalsAgainst: matches.goalsAgainst,
      goalsFor: matches.goalsFor,
      home: matches.home,
      matchId: matches.id,
      name: players.name,
      opponent: matches.opponent,
      playerId: matchPlayerRatings.playerId,
    })
    .from(matchPlayerRatings)
    .innerJoin(matches, eq(matches.id, matchPlayerRatings.matchId))
    .innerJoin(players, eq(players.id, matchPlayerRatings.playerId))
    .where(and(eq(matches.season, season), eq(matchPlayerRatings.source, 'fans')))
    .orderBy(desc(matches.matchDate), desc(matches.id))

  const found: SeasonWinner[] = []

  for (const matchId of new Set(rows.map((row) => row.matchId))) {
    const ofMatch = rows
      .filter((row) => row.matchId === matchId)
      .map((row) => ({ ...row, appearanceId: null, average: Number(row.average) }))
    const winner = uitblinkerOf(ofMatch)
    const first = ofMatch[0]

    if (winner !== undefined && first !== undefined) {
      found.push({
        average: winner.average,
        goalsAgainst: first.goalsAgainst,
        goalsFor: first.goalsFor,
        home: first.home,
        matchId,
        name: winner.name,
        opponent: first.opponent,
      })
    }
  }

  return found
}

/** The line under a winner: "Thuis tegen Sparta Rotterdam, 3–1", the home club first. */
export function resultLine(match: Pick<SeasonWinner, 'goalsAgainst' | 'goalsFor' | 'home' | 'opponent'>) {
  const { goalsAgainst, goalsFor } = match
  const score =
    goalsFor === null || goalsAgainst === null
      ? ''
      : `, ${match.home ? goalsFor : goalsAgainst}–${match.home ? goalsAgainst : goalsFor}`

  return `${match.home ? 'Thuis' : 'Uit'} tegen ${match.opponent}${score}`
}

const getOldMatchRatings = cacheForKey(60 * 1000, (key) => loadOldMatchRatings(getDatabase().db, Number(key)))

/** The ratings of an old match, read once a minute for each match, like `oldMatchCrowd`. */
export const oldMatchRatings = (matchId: number) => getOldMatchRatings(String(matchId))

const getFansMatchRatings = cacheForKey(60 * 1000, (key) => loadMatchRatings(getDatabase().db, Number(key), 'fans'))

/** The averages of supporters for a match whose window closed, read once a minute. */
export const fansMatchRatings = (matchId: number) => getFansMatchRatings(String(matchId))

const getSeasonWinners = cacheForKey(60 * 1000, (season) => loadSeasonWinners(getDatabase().db, season))

/** The Uitblinkers of a season, read once a minute for each season. */
export const seasonWinners = (season: string) => getSeasonWinners(season)

export const latestResult = cacheFor(60 * 1000, () => loadLatestResult(getDatabase().db))
