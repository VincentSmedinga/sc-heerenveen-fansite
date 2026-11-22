import type { Database } from '@fansite/db/client'

import { startOf } from '@fansite/db/rating-window'
import { matches, matchPlayerRatings, oldSeasonRatings, oldSeasonWinners, players } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { gte, sql } from 'drizzle-orm'

import { cacheFor } from '#src/cache'
import { getDatabase } from '#src/database'
import { minimumMatches, minimumRatings } from '#src/player-ratings'

// The ranking of the season ratings that supporters gave the players (issue 1474): the card
// "Cijfers van supporters" on Spelers › Cijfers and the page "Uitblinker van het jaar". It
// works the figures out from the averages that the import keeps, never from one rating. The
// season rating is the average of every rating of the season, as on the page of a player (see
// `playerRatingsOf`), so a match with few ratings weighs as little as it should.

/** A player is Uitblinker of the year with at least this many matches with enough ratings. */
export const winnerMinimumMatches = 6

/** The first season whose Uitblinker of the year is worked out; earlier ones are typed over. */
export const firstWorkedOutSeason = '2006/07'

/** The days after the last match of a season that its window can still be open. */
const windowDays = 7

/** A season rating of 1998/99 to 2000/01, which has no matches and no count. */
export type OldRating = { average: number; name: string; playerId: null | number; season: string }

/** The Uitblinker of the year of 1998/99 to 2005/06, as it was typed over. */
export type OldWinner = { name: string; playerId: null | number; season: string }

/** One row of the ranking of a season. */
export type RankedPlayer = {
  /** The season rating. */
  average: number
  /** The matches that count, or `undefined` where only the season rating is known. */
  matches: number | undefined
  name: string
  /** The place: equal ratings share one. */
  place: number
  playerId: null | number
  /** The number of ratings, or `undefined` as for `matches`. */
  ratings: number | undefined
}

/** Everything the ranking is worked out from. */
export type RatingFigures = {
  figures: readonly SeasonFigure[]
  oldRatings: readonly OldRating[]
  oldWinners: readonly OldWinner[]
  /** The seasons from `firstWorkedOutSeason` that are over, which may have a winner now. */
  overSeasons: ReadonlySet<string>
}

/** What the averages of one player in one season add up to. */
export type SeasonFigure = {
  /** The matches with at least `minimumRatings` ratings. */
  counting: number
  name: string
  /** Whether the averages come from the old fansite. */
  old: boolean
  playerId: number
  /** The number of ratings. */
  ratings: number
  season: string
  /** The sum of each average times its number of ratings. */
  total: number
}

/** One row of the list of Uitblinkers of the year. */
export type YearWinner = {
  /** The season rating of the winner, or `undefined` when we do not have it. */
  average: number | undefined
  /** The name, or `undefined` for a season that is not over. */
  name: string | undefined
  season: string
}

const hundredths = (average: number) => Math.round(average * 100)

/** The order of a ranking: the highest rating first, with an equal one the fewer ratings. */
const byRating = (
  a: { average: number; name: string; ratings: number | undefined },
  b: { average: number; name: string; ratings: number | undefined },
) =>
  hundredths(b.average) - hundredths(a.average) ||
  (a.ratings ?? Number.POSITIVE_INFINITY) - (b.ratings ?? Number.POSITIVE_INFINITY) ||
  a.name.localeCompare(b.name, 'nl')

/**
 * The ranking of one season: every player with at least three matches that count, and every
 * player whose season rating is the only thing known, which stands with a dash for the matches.
 * A player with matches is never replaced by a season rating.
 */
export function rankSeason(data: RatingFigures, season: string): RankedPlayer[] {
  const counted = data.figures
    .filter((figure) => figure.season === season && figure.counting >= minimumMatches)
    .map((figure) => ({
      average: figure.total / figure.ratings,
      matches: figure.counting as number | undefined,
      name: figure.name,
      playerId: figure.playerId as null | number,
      ratings: figure.ratings as number | undefined,
    }))
  const known = new Set(counted.map((row) => row.playerId))
  const seasonOnly = data.oldRatings
    .filter((row) => row.season === season && (row.playerId === null || !known.has(row.playerId)))
    .map((row) => ({
      average: row.average,
      matches: undefined as number | undefined,
      name: row.name,
      playerId: row.playerId,
      ratings: undefined as number | undefined,
    }))
  const sorted = [...counted, ...seasonOnly].toSorted(byRating)
  let place = 0

  return sorted.map((row, index) => {
    const before = sorted[index - 1]

    if (
      before === undefined ||
      hundredths(before.average) !== hundredths(row.average) ||
      before.ratings !== row.ratings
    ) {
      place = index + 1
    }

    return { ...row, place }
  })
}

/** The seasons that have ratings of supporters, the newest first. */
export const ratedSeasons = (data: RatingFigures) =>
  [
    ...new Set([
      ...data.figures.filter((figure) => figure.counting >= minimumMatches).map((figure) => figure.season),
      ...data.oldRatings.map((row) => row.season),
    ]),
  ].toSorted((a, b) => b.localeCompare(a))

/** Whether the ratings of a season come from the old fansite, so the source stands there. */
export const isOldSeason = (data: RatingFigures, season: string) =>
  data.oldRatings.some((row) => row.season === season) ||
  data.figures.some((figure) => figure.season === season && figure.old)

/** The text of a count: one match, two matches. */
export const matchesText = (count: number) => (count === 1 ? '1 wedstrijd' : `${count} wedstrijden`)

/** What is read: the figures of every season, the old season ratings and the old winners. */
export async function readRatingFigures(db: Database, now = new Date()): Promise<RatingFigures> {
  const [figures, oldRatings, oldWinners, matchRows] = await Promise.all([
    db
      .select({
        counting: sql<number>`sum(${matchPlayerRatings.ratingCount} >= ${minimumRatings})`,
        name: players.name,
        old: sql<number>`max(${matchPlayerRatings.source} = 'oude-fansite')`,
        playerId: matchPlayerRatings.playerId,
        ratings: sql<number>`sum(${matchPlayerRatings.ratingCount})`,
        season: matches.season,
        total: sql<string>`sum(${matchPlayerRatings.average} * ${matchPlayerRatings.ratingCount})`,
      })
      .from(matchPlayerRatings)
      .innerJoin(matches, sql`${matches.id} = ${matchPlayerRatings.matchId}`)
      .innerJoin(players, sql`${players.id} = ${matchPlayerRatings.playerId}`)
      .groupBy(matches.season, matchPlayerRatings.playerId, players.name),
    db.select().from(oldSeasonRatings),
    db.select().from(oldSeasonWinners),
    db
      .select({
        kickoffAt: matches.kickoffAt,
        matchDate: matches.matchDate,
        season: matches.season,
        status: matches.status,
      })
      .from(matches)
      .where(gte(matches.season, firstWorkedOutSeason)),
  ])

  const over = seasonsOver(matchRows, now)

  return {
    figures: figures.map((row) => ({
      counting: Number(row.counting),
      name: row.name,
      old: Number(row.old) === 1,
      playerId: row.playerId,
      ratings: Number(row.ratings),
      season: row.season,
      total: Number(row.total),
    })),
    oldRatings: oldRatings.map((row) => ({
      average: Number(row.average),
      name: row.name,
      playerId: row.playerId,
      season: row.season,
    })),
    oldWinners: oldWinners.map((row) => ({ name: row.name, playerId: row.playerId, season: row.season })),
    overSeasons: over,
  }
}

/**
 * Whether a season is over: no match of it is still to be played and the window of the last one
 * has closed (see `closesAt` in `@fansite/db/rating-window`). A season before the current one
 * is over once its last window has closed, whatever a match that was never played says.
 */
export function seasonsOver(
  rows: readonly { kickoffAt: Date | null; matchDate: string; season: string; status: string }[],
  now: Date,
): Set<string> {
  const current = seasonOf(now)
  const bySeason = new Map<string, (typeof rows)[number][]>()

  for (const row of rows) {
    bySeason.set(row.season, [...(bySeason.get(row.season) ?? []), row])
  }

  const over = new Set<string>()

  for (const [season, found] of bySeason) {
    const open = found.some((row) => row.status === 'scheduled' || row.status === 'postponed')
    const last = Math.max(...found.map((row) => startOf(row).getTime()))

    if ((!open || season < current) && last + windowDays * 24 * 60 * 60 * 1000 <= now.getTime()) {
      over.add(season)
    }
  }

  return over
}

/**
 * The Uitblinkers of the year, the newest season first. The seasons before 2006/07 come from
 * the names that were typed over, and a season without a name has no row. From 2006/07 the
 * winner is the player with the highest season rating among those with at least six matches
 * that count; with an equal rating the one with fewer ratings goes first. A season gets its
 * winner only when it is over. The current season always has a row, with no name until then.
 * Nobody is derived from a top that was not typed over: a list without names stays short.
 */
export function yearWinners(data: RatingFigures, now: Date): YearWinner[] {
  const current = seasonOf(now)
  const rows = new Map<string, YearWinner>()

  for (const winner of data.oldWinners) {
    rows.set(winner.season, {
      average: ratingOf(data, winner.season, winner),
      name: winner.name,
      season: winner.season,
    })
  }

  const workedOut = new Set(data.figures.map((figure) => figure.season).filter((s) => s >= firstWorkedOutSeason))

  for (const season of workedOut) {
    if (!data.overSeasons.has(season)) {
      continue
    }

    const [top] = data.figures
      .filter((figure) => figure.season === season && figure.counting >= winnerMinimumMatches)
      .map((figure) => ({ average: figure.total / figure.ratings, name: figure.name, ratings: figure.ratings }))
      .toSorted(byRating)

    if (top !== undefined) {
      rows.set(season, { average: top.average, name: top.name, season })
    }
  }

  if (!data.overSeasons.has(current) && !rows.has(current)) {
    rows.set(current, { average: undefined, name: undefined, season: current })
  }

  return [...rows.values()].toSorted((a, b) => b.season.localeCompare(a.season))
}

/** The season rating of a player in one season, from the ranking, or `undefined`. */
function ratingOf(data: RatingFigures, season: string, who: { name: string; playerId: null | number }) {
  return rankSeason(data, season).find((row) =>
    who.playerId === null ? row.name === who.name : row.playerId === who.playerId,
  )?.average
}

/** The figures, read once a minute: the pages that show them stay cacheable. */
export const ratingFigures = cacheFor(60 * 1000, () => readRatingFigures(getDatabase().db))
