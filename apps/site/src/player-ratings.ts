import type { Competition, RatingSource } from '@fansite/db/schema'

import { clubs, matches, matchPlayerRatings, oldSeasonRatings, players } from '@fansite/db/schema'
import { isFansPartOn } from '@fansite/shared/fans-env'
import { and, eq, gte, inArray, max } from 'drizzle-orm'
import { cache } from 'react'

import { getDatabase } from './database'

// The ratings that supporters gave a player, for the card on his page (issue 1466). The
// numbers of a match come from `match_player_ratings`, the season ratings of 1998/99 to
// 2000/01 from `old_season_ratings`. This module is the one place that works the figures out,
// so the card only shows them (see _De spelerspagina toont de cijfers van de fans, per
// seizoen en per wedstrijd_ in docs/beslissingen/site.md).

/** A match counts for the card from this number of ratings. */
export const minimumRatings = 5

/** A season counts for the card from this number of matches that count. */
export const minimumMatches = 3

/** The last matches the card lists. */
export const lastMatchesShown = 5

/** A season rating without matches, as the old fansite kept it for 1998/99 to 2000/01. */
export type OldSeasonRow = { average: number; season: string }

/** What the card shows, or `undefined` when there is nothing to show. */
export type PlayerRatings = {
  last: RatingMatch[]
  /** Whether the numbers come from the old fansite, so the source line stands under them. */
  oldSource: boolean
  /** Whether a season has only a season rating, so the legend says so. */
  seasonOnly: boolean
  seasons: RatingSeason[]
}

/** One match of the list "De laatste wedstrijden". */
export type RatingMatch = {
  average: string
  competition: Competition
  id: number
  /** The match in words, from our side: `sc Heerenveen – Sparta Rotterdam 3–1`. */
  label: string
  round: string
  season: string
  /** Whether he had the highest average of the match: the Uitblinker. */
  winner: boolean
}

/** One average of a player in one match, as it is stored. */
export type RatingRow = {
  average: number
  clubSlug: string
  competition: Competition
  goalsAgainst: number
  goalsFor: number
  home: boolean
  matchDate: string
  matchId: number
  opponent: string
  ratingCount: number
  round: string
  season: string
  source: RatingSource
}

/** One season of the card. A season of only a season rating has no matches and no count. */
export type RatingSeason = {
  /** The average of every rating of the season, with a decimal comma: `7,2`. */
  average: string
  /** The number of ratings, or `undefined` where only the season rating is known. */
  count: number | undefined
  /** The matches with at least five ratings, or `undefined` as for `count`. */
  matches: number | undefined
  season: string
}

/** A number with one decimal and a comma, as supporters write a rating: `7,2`. */
export const gradeText = (value: number) => value.toFixed(1).replace('.', ',')

/** The match from our side, with the score: `Ajax – sc Heerenveen 2–2`. */
const matchLabel = (row: Pick<RatingRow, 'goalsAgainst' | 'goalsFor' | 'home' | 'opponent'>) =>
  row.home
    ? `sc Heerenveen – ${row.opponent} ${row.goalsFor}–${row.goalsAgainst}`
    : `${row.opponent} – sc Heerenveen ${row.goalsAgainst}–${row.goalsFor}`

/**
 * What the card shows, from the averages of a player. The season rating is the average of
 * every rating of the season, so a match with few ratings weighs as little as it should and
 * the average of the match averages is never used. A season shows from three matches with five
 * ratings or more, whether it is old or new. A season of 1998/99 to 2000/01 has only its
 * season rating, with no matches and no count. The top of a match (`tops`, by match) is the
 * highest average among the players with five ratings or more.
 */
export function playerRatingsOf(
  rows: readonly RatingRow[],
  oldSeasons: readonly OldSeasonRow[],
  tops: ReadonlyMap<number, number>,
): PlayerRatings | undefined {
  const bySeason = new Map<string, RatingRow[]>()

  for (const row of rows) {
    bySeason.set(row.season, [...(bySeason.get(row.season) ?? []), row])
  }

  const derived = [...bySeason]
    .map(([season, found]) => {
      const counting = found.filter((row) => row.ratingCount >= minimumRatings)
      const count = found.reduce((total, row) => total + row.ratingCount, 0)
      const sum = found.reduce((total, row) => total + row.average * row.ratingCount, 0)

      return { average: sum / count, count, matches: counting.length, oldSource: found.some(isOld), season }
    })
    .filter(({ matches: counting }) => counting >= minimumMatches)
  const known = new Set(derived.map(({ season }) => season))
  const seasonOnly = oldSeasons.filter(({ season }) => !known.has(season))
  const seasons: (RatingSeason & { oldSource: boolean })[] = [
    ...derived.map(({ average, count, matches: counting, oldSource, season }) => ({
      average: gradeText(average),
      count,
      matches: counting,
      oldSource,
      season,
    })),
    ...seasonOnly.map(({ average, season }) => ({
      average: gradeText(average),
      count: undefined,
      matches: undefined,
      oldSource: true,
      season,
    })),
  ].toSorted((a, b) => b.season.localeCompare(a.season))

  if (seasons.length === 0) {
    return undefined
  }

  const last = rows
    .filter((row) => row.ratingCount >= minimumRatings)
    .toSorted((a, b) => b.matchDate.localeCompare(a.matchDate) || b.matchId - a.matchId)
    .slice(0, lastMatchesShown)

  return {
    last: last.map((row) => ({
      average: gradeText(row.average),
      competition: row.competition,
      id: row.matchId,
      label: matchLabel(row),
      round: row.round,
      season: row.season,
      winner: row.average >= (tops.get(row.matchId) ?? Number.POSITIVE_INFINITY),
    })),
    oldSource: seasons.some((season) => season.oldSource) || last.some(isOld),
    seasonOnly: seasons.some((season) => season.matches === undefined),
    seasons: seasons.map(({ average, count, matches: counting, season }) => ({
      average,
      count,
      matches: counting,
      season,
    })),
  }
}

const isOld = (row: Pick<RatingRow, 'source'>) => row.source === 'oude-fansite'

/** The source line under the card, for numbers of the old fansite. */
export const oldSourceLine = 'Cijfers van bezoekers van de Fansite, 2001 tot 2007.'

/**
 * What is read for a person: the averages of his matches, his season ratings and the top of
 * each match he is listed for. It throws when the database fails, and the block that asks
 * logs it and leaves itself out.
 */
export async function readPlayerRatings(personId: number): Promise<PlayerRatings | undefined> {
  const { db } = getDatabase()
  const ids = (await db.select({ id: players.id }).from(players).where(eq(players.personId, personId))).map(
    ({ id }) => id,
  )

  if (ids.length === 0) {
    return undefined
  }

  const [found, old] = await Promise.all([
    db
      .select({
        average: matchPlayerRatings.average,
        clubSlug: clubs.slug,
        competition: matches.competition,
        goalsAgainst: matches.goalsAgainst,
        goalsFor: matches.goalsFor,
        home: matches.home,
        matchDate: matches.matchDate,
        matchId: matches.id,
        opponent: matches.opponent,
        ratingCount: matchPlayerRatings.ratingCount,
        round: matches.round,
        season: matches.season,
        source: matchPlayerRatings.source,
      })
      .from(matchPlayerRatings)
      .innerJoin(matches, eq(matches.id, matchPlayerRatings.matchId))
      .innerJoin(clubs, eq(clubs.id, matches.clubId))
      .where(inArray(matchPlayerRatings.playerId, ids)),
    db
      .select({ average: oldSeasonRatings.average, season: oldSeasonRatings.season })
      .from(oldSeasonRatings)
      .where(inArray(oldSeasonRatings.playerId, ids)),
  ])
  const rows: RatingRow[] = found.map((row) => ({
    ...row,
    average: Number(row.average),
    goalsAgainst: row.goalsAgainst ?? 0,
    goalsFor: row.goalsFor ?? 0,
  }))
  const shown = rows
    .filter((row) => row.ratingCount >= minimumRatings)
    .toSorted((a, b) => b.matchDate.localeCompare(a.matchDate) || b.matchId - a.matchId)
    .slice(0, lastMatchesShown)
  const tops =
    shown.length === 0
      ? []
      : await db
          .select({ id: matchPlayerRatings.matchId, top: max(matchPlayerRatings.average) })
          .from(matchPlayerRatings)
          .where(
            and(
              inArray(
                matchPlayerRatings.matchId,
                shown.map((row) => row.matchId),
              ),
              gte(matchPlayerRatings.ratingCount, minimumRatings),
            ),
          )
          .groupBy(matchPlayerRatings.matchId)

  return playerRatingsOf(
    rows,
    old.map((row) => ({ average: Number(row.average), season: row.season })),
    new Map(tops.map(({ id, top }) => [id, Number(top)])),
  )
}

/**
 * The ratings of a person, once per request, or nothing while the Uitblinker is switched off:
 * the card, the bar and the page then are as they were without it.
 */
export const loadPlayerRatings = cache(async (personId: number): Promise<PlayerRatings | undefined> => {
  return isFansPartOn('uitblinker') ? readPlayerRatings(personId) : undefined
})
