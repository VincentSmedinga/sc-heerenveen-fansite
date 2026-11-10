import type { Database } from '@fansite/db/client'

import { matchChanges, matches, matchGoals, matchReports } from '@fansite/db/schema'
import { and, asc, count, eq, gt, inArray, isNotNull, isNull, sql } from 'drizzle-orm'

import { seasonSlug } from '../seasons'

// The work lists of the page Kwaliteit of the admin: for one season, the matches that miss
// something an editor can fill in. Each list counts what `readSeasonCoverage`
// (@fansite/db/season-coverage) counts for the season, so the number in the table and the
// length of the list are the same; quality.test.ts holds them to that.

/** A work list, as the address names it. */
export type WorkList = (typeof workLists)[number]

/** One match of a work list, with how many things of the list it has. */
export type WorkListMatch = Awaited<ReturnType<typeof listWork>>[number]

export const workLists = [
  'zonder-doelpunten',
  'verslagen-bezig',
  'doelpunten-zonder-speler',
  'wachtende-wijzigingen',
] as const

export const qualityPath = '/beheer/kwaliteit'

/**
 * The address of the page with the players of a season of whom the import read another value
 * than the editors set: `/beheer/kwaliteit/2026-27/spelersgegevens`.
 */
export function fieldDifferencesPath(season: string) {
  return `${qualityPath}/${seasonSlug(season)}/spelersgegevens`
}

/**
 * The matches of a work list in a season, the oldest first:
 *
 * - `zonder-doelpunten`: played, with goals in the result and no row in `match_goals`;
 * - `verslagen-bezig`: with a report that is not finished;
 * - `doelpunten-zonder-speler`: with a goal of ours that has no player;
 * - `wachtende-wijzigingen`: with a change of Wikipedia, a difference with an entry of the
 *   editors or a difference between two sources that waits for a decision.
 *
 * `total` is how many goals or changes the match has in the list, and 1 in the first two.
 */
export async function listWork(db: Pick<Database, 'select'>, season: string, list: WorkList) {
  const totals = await totalsOf(db, season, list)

  if (totals.size === 0) {
    return []
  }

  const found = await db
    .select({
      competition: matches.competition,
      goalsAgainst: matches.goalsAgainst,
      goalsFor: matches.goalsFor,
      home: matches.home,
      id: matches.id,
      kickoffAt: matches.kickoffAt,
      matchDate: matches.matchDate,
      opponent: matches.opponent,
      round: matches.round,
      status: matches.status,
    })
    .from(matches)
    .where(inArray(matches.id, [...totals.keys()]))
    .orderBy(asc(matches.matchDate), asc(matches.kickoffAt), asc(matches.id))

  return found.map((match) => ({ ...match, total: totals.get(match.id) ?? 1 }))
}

/**
 * The address of the page with the players of a season whose numbers differ between the squad
 * table and the matches or the reports: `/beheer/kwaliteit/2026-27/spelerscijfers`.
 */
export function statDifferencesPath(season: string) {
  return `${qualityPath}/${seasonSlug(season)}/spelerscijfers`
}

/**
 * How many changes wait for a decision in each season that has any: the changes of Wikipedia
 * that the importer holds back, the differences with an entry of the editors and the
 * differences between two sources, of a match that still exists. `readSeasonCoverage` does not
 * count them.
 */
export async function waitingChangesBySeason(db: Pick<Database, 'select'>): Promise<Map<string, number>> {
  const found = await db
    .select({ season: matchChanges.season, total: count() })
    .from(matchChanges)
    .where(and(eq(matchChanges.status, 'pending'), isNotNull(matchChanges.matchId)))
    .groupBy(matchChanges.season)

  return new Map(found.map((row) => [row.season, row.total]))
}

/** The address of a work list of a season: `/beheer/kwaliteit/2005-06/zonder-doelpunten`. */
export function workListPath(season: string, list: WorkList) {
  return `${qualityPath}/${seasonSlug(season)}/${list}`
}

/** The matches of a work list, by their `id`, with how many things of the list each has. */
async function totalsOf(db: Pick<Database, 'select'>, season: string, list: WorkList): Promise<Map<number, number>> {
  const found = await {
    'doelpunten-zonder-speler': () =>
      db
        .select({ id: matches.id, total: count() })
        .from(matchGoals)
        .innerJoin(matches, eq(matches.id, matchGoals.matchId))
        // A goal of ours: ours and not an own goal, or an own goal listed under the opponent.
        .where(
          and(
            eq(matches.season, season),
            isNull(matchGoals.playerId),
            sql`${matchGoals.ours} <> ${matchGoals.ownGoal}`,
          ),
        )
        .groupBy(matches.id),
    'verslagen-bezig': () =>
      db
        .select({ id: matches.id, total: count() })
        .from(matchReports)
        .innerJoin(matches, eq(matches.id, matchReports.matchId))
        .where(and(eq(matches.season, season), eq(matchReports.status, 'bezig')))
        .groupBy(matches.id),
    'wachtende-wijzigingen': () =>
      db
        .select({ id: matches.id, total: count() })
        .from(matchChanges)
        .innerJoin(matches, eq(matches.id, matchChanges.matchId))
        .where(and(eq(matchChanges.season, season), eq(matchChanges.status, 'pending')))
        .groupBy(matches.id),
    'zonder-doelpunten': () =>
      db
        .select({ id: matches.id, total: count() })
        .from(matches)
        .where(
          and(
            eq(matches.season, season),
            eq(matches.status, 'played'),
            gt(sql`${matches.goalsFor} + ${matches.goalsAgainst}`, 0),
            sql`not exists (select 1 from ${matchGoals} where ${matchGoals.matchId} = ${matches.id})`,
          ),
        )
        .groupBy(matches.id),
  }[list]()

  return new Map(found.map((row) => [row.id, row.total]))
}
