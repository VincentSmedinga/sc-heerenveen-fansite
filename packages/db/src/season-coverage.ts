import { and, count, eq, gt, isNull, sql } from 'drizzle-orm'

import type { Database } from './client.ts'
import type { MatchDataSource, PlayerSource, SquadCompletenessLevel } from './schema.ts'

import { matchDataSources, matches, matchGoals, matchReports, players, squadCompleteness, standings } from './schema.ts'
import { seasonOf } from './season.ts'

/** The first season the old fansite and the site have data for. */
export const firstCoverageSeason = '1990/91'

/** What we have of one season, in numbers. A season without matches has zeros. */
export type SeasonCoverage = {
  /** Goals of our players that have no player in `players`. */
  goalsWithoutPlayer: number
  /** Whether the season has a league table. */
  hasStanding: boolean
  /** The matches, by where they came from. */
  matchesBySource: Record<MatchDataSource, number>
  /** All matches of the season. */
  matchesTotal: number
  /** The matches with the status played. */
  played: number
  /** Played matches with goals in the result and no row in `match_goals`. */
  playedWithoutGoalList: number
  /** The players of the season, and what `squad_completeness` says of the squad, if it does. */
  playerCount: number
  /** Match reports, and how many of them are finished (`klaar`). */
  reports: number
  reportsDone: number
  season: string
  squad: null | { bestSource: PlayerSource; level: SquadCompletenessLevel }
  /** Matches with an attendance and with a referee. */
  withAttendance: number
  withReferee: number
}

/**
 * What we have of each season since 1990/91 up to the current one, the oldest first. The list
 * of seasons is made here and not read from `matches`, so a season without matches is in it
 * with zeros. It only reads, and changes nothing.
 */
export async function readSeasonCoverage(db: Database, now: Date = new Date()): Promise<SeasonCoverage[]> {
  const bySeason = new Map<string, SeasonCoverage>(
    seasonsBetween(firstCoverageSeason, seasonOf(now)).map((season) => [
      season,
      {
        goalsWithoutPlayer: 0,
        hasStanding: false,
        matchesBySource: Object.fromEntries(matchDataSources.map((source) => [source, 0])) as Record<
          MatchDataSource,
          number
        >,
        matchesTotal: 0,
        played: 0,
        playedWithoutGoalList: 0,
        playerCount: 0,
        reports: 0,
        reportsDone: 0,
        season,
        squad: null,
        withAttendance: 0,
        withReferee: 0,
      },
    ]),
  )

  const matchRows = await db
    .select({
      attendance: sql<number>`sum(${matches.attendance} is not null)`.mapWith(Number),
      dataSource: matches.dataSource,
      played: sql<number>`sum(${matches.status} = 'played')`.mapWith(Number),
      referee: sql<number>`sum(${matches.referee} is not null)`.mapWith(Number),
      season: matches.season,
      total: count(),
    })
    .from(matches)
    .groupBy(matches.season, matches.dataSource)

  for (const row of matchRows) {
    const coverage = bySeason.get(row.season)

    if (coverage !== undefined) {
      coverage.matchesBySource[row.dataSource] = row.total
      coverage.matchesTotal += row.total
      coverage.played += row.played
      coverage.withAttendance += row.attendance
      coverage.withReferee += row.referee
    }
  }

  const withoutGoalList = await db
    .select({ season: matches.season, total: count() })
    .from(matches)
    .where(
      and(
        eq(matches.status, 'played'),
        gt(sql`${matches.goalsFor} + ${matches.goalsAgainst}`, 0),
        sql`not exists (select 1 from ${matchGoals} where ${matchGoals.matchId} = ${matches.id})`,
      ),
    )
    .groupBy(matches.season)
  const reportRows = await db
    .select({
      done: sql<number>`sum(${matchReports.status} = 'klaar')`.mapWith(Number),
      season: matches.season,
      total: count(),
    })
    .from(matchReports)
    .innerJoin(matches, eq(matches.id, matchReports.matchId))
    .groupBy(matches.season)
  const playerRows = await db.select({ season: players.season, total: count() }).from(players).groupBy(players.season)
  const squadRows = await db.select().from(squadCompleteness)
  // A goal of ours: ours and not an own goal, or an own goal listed under the opponent.
  const unlinkedGoals = await db
    .select({ season: matches.season, total: count() })
    .from(matchGoals)
    .innerJoin(matches, eq(matches.id, matchGoals.matchId))
    .where(and(isNull(matchGoals.playerId), sql`${matchGoals.ours} <> ${matchGoals.ownGoal}`))
    .groupBy(matches.season)
  const standingRows = await db.select({ season: standings.season }).from(standings).groupBy(standings.season)

  for (const row of withoutGoalList) {
    const coverage = bySeason.get(row.season)

    if (coverage !== undefined) {
      coverage.playedWithoutGoalList = row.total
    }
  }
  for (const row of reportRows) {
    const coverage = bySeason.get(row.season)

    if (coverage !== undefined) {
      coverage.reports = row.total
      coverage.reportsDone = row.done
    }
  }
  for (const row of playerRows) {
    const coverage = bySeason.get(row.season)

    if (coverage !== undefined) {
      coverage.playerCount = row.total
    }
  }
  for (const row of squadRows) {
    const coverage = bySeason.get(row.season)

    if (coverage !== undefined) {
      coverage.squad = { bestSource: row.bestSource, level: row.level }
    }
  }
  for (const row of unlinkedGoals) {
    const coverage = bySeason.get(row.season)

    if (coverage !== undefined) {
      coverage.goalsWithoutPlayer = row.total
    }
  }
  for (const row of standingRows) {
    const coverage = bySeason.get(row.season)

    if (coverage !== undefined) {
      coverage.hasStanding = true
    }
  }

  return [...bySeason.values()]
}

/** The seasons from `from` up to and including `to`: `1990/91`, `1991/92` and so on. */
export function seasonsBetween(from: string, to: string): string[] {
  const seasons: string[] = []

  for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year++) {
    seasons.push(`${year}/${String((year + 1) % 100).padStart(2, '0')}`)
  }

  return seasons
}
