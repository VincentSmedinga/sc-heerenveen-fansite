import { and, asc, count, eq, inArray, isNotNull } from 'drizzle-orm'

// The differences in the goals of a player between the squad table and the matches or the
// match reports (`player_stat_differences`, issue 974): finding them, keeping them once, and
// the decision of an editor. The importer compares when it reads the squad, the admin when a
// report is saved as `klaar`.
import type { Database } from './client.ts'
import type { PlayerStatDifference, PlayerStatSource, StatsCompetition } from './schema.ts'

import { recordAction } from './audit-log.ts'
import { findReportGoalDifferences } from './match-reports.ts'
import { matches, matchGoals, players, playerSeasonStats, playerStatDifferences } from './schema.ts'

/** A difference as a comparison found it. */
export type FoundStatDifference = {
  competition: StatsCompetition
  /** The goals counted from the matches or the reports. */
  otherGoals: number
  playerId: number
  /** The goals in the squad table. */
  tableGoals: number
}

/**
 * What a decision came to: `done`; `not-waiting` when the difference was decided already or
 * does not exist; `no-row` when the squad table has no row for the player to change.
 */
export type StatDecisionOutcome = 'done' | 'no-row' | 'not-waiting'

/** A difference that waits, with the name of the player. */
export type WaitingStatDifference = PlayerStatDifference & { name: string }

type Reader = Pick<Database, 'select'>

type Writer = Pick<Database, 'insert' | 'select' | 'update'>

/** What the squad table is compared with, in the words of the admin and the log. */
export const statSourceLabels: Record<PlayerStatSource, string> = { matches: 'wedstrijden', reports: 'verslagen' }

/**
 * Compares the goals of the squad table of a season with the matches and with the match
 * reports, and keeps what differs (`keepPlayerStatDifferences`). Returns how many differences
 * are new.
 */
export async function comparePlayerGoals(db: Writer, season: string, now: Date): Promise<number> {
  return (
    (await keepPlayerStatDifferences(db, season, 'matches', await findMatchGoalDifferences(db, season), now)) +
    (await compareReportGoals(db, season, now))
  )
}

/** Compares the goals of the squad table of a season with the match reports only. */
export async function compareReportGoals(db: Writer, season: string, now: Date): Promise<number> {
  const found = (await findReportGoalDifferences(db, season)).map((difference) => ({
    competition: difference.competition,
    otherGoals: difference.fromReports,
    playerId: difference.playerId,
    tableGoals: difference.fromWikipedia,
  }))

  return keepPlayerStatDifferences(db, season, 'reports', found, now)
}

/** How many differences wait for a decision, in each season that has any. */
export async function countWaitingStatDifferences(db: Reader): Promise<Map<string, number>> {
  const found = await db
    .select({ season: playerStatDifferences.season, total: count() })
    .from(playerStatDifferences)
    .where(eq(playerStatDifferences.status, 'pending'))
    .groupBy(playerStatDifferences.season)

  return new Map(found.map((row) => [row.season, row.total]))
}

/**
 * Decides a difference that waits, in the transaction the caller opened. `take-over` puts the
 * number of the matches or the reports in the squad table and remembers what the table said
 * (`player_season_stats.table_goals`), so the importer leaves the number alone while Wikipedia
 * says the same; `keep` leaves the table. Either way the difference is decided, with a line in
 * the log of the admin for the player.
 */
export async function decidePlayerStatDifference(
  db: Writer,
  id: number,
  decision: { kind: 'keep' | 'take-over'; reason: string; userId: number },
  now: Date,
): Promise<StatDecisionOutcome> {
  const [difference] = await db
    .select()
    .from(playerStatDifferences)
    .where(eq(playerStatDifferences.id, id))
    .for('update')

  if (difference === undefined || difference.status !== 'pending') {
    return 'not-waiting'
  }

  if (decision.kind === 'take-over') {
    const [stats] = await db
      .select()
      .from(playerSeasonStats)
      .where(
        and(
          eq(playerSeasonStats.playerId, difference.playerId),
          eq(playerSeasonStats.season, difference.season),
          eq(playerSeasonStats.competition, difference.competition),
        ),
      )
      .for('update')

    if (stats === undefined) {
      return 'no-row'
    }

    await db
      .update(playerSeasonStats)
      // A number the editors chose before keeps the goals the table had then.
      .set({ goals: difference.otherGoals, tableGoals: stats.tableGoals ?? stats.goals, updatedAt: now })
      .where(eq(playerSeasonStats.id, stats.id))
  }

  await db
    .update(playerStatDifferences)
    .set({ decidedAt: now, resolution: 'person', status: decision.kind === 'take-over' ? 'accepted' : 'rejected' })
    .where(eq(playerStatDifferences.id, difference.id))
  await recordAction(
    db,
    {
      action: decision.kind === 'take-over' ? 'player.stats-take-over' : 'player.stats-keep',
      detail: describeStatDifference(difference),
      itemId: difference.playerId,
      reason: decision.reason,
      userId: decision.userId,
    },
    now,
  )

  return 'done'
}

/** The line for the log: the competition and the season with both numbers. */
export function describeStatDifference(
  difference: Pick<PlayerStatDifference, 'comparedWith' | 'competition' | 'otherGoals' | 'season' | 'tableGoals'>,
): string {
  return `Doelpunten ${difference.competition} ${difference.season}: selectietabel ${difference.tableGoals}, ${statSourceLabels[difference.comparedWith]} ${difference.otherGoals}`
}

/**
 * The players whose goals in the squad table of a season differ from the goals of the matches,
 * for each competition the table has a row for. The goals of the matches are those of ours
 * that are linked to the player and are not own goals. A match page that did not name the
 * scorers yet or a table that runs a round behind shows up here. A season without a match that
 * was played has nothing to compare with.
 */
export async function findMatchGoalDifferences(db: Reader, season: string): Promise<FoundStatDifference[]> {
  const [played] = await db
    .select({ total: count() })
    .from(matches)
    .where(and(eq(matches.season, season), eq(matches.status, 'played')))

  if (played === undefined || played.total === 0) {
    return []
  }

  const counted = await db
    .select({ competition: matches.competition, goals: count(), playerId: matchGoals.playerId })
    .from(matchGoals)
    .innerJoin(matches, eq(matchGoals.matchId, matches.id))
    .where(
      and(
        eq(matches.season, season),
        eq(matchGoals.ours, true),
        eq(matchGoals.ownGoal, false),
        isNotNull(matchGoals.playerId),
      ),
    )
    .groupBy(matches.competition, matchGoals.playerId)
  const fromMatches = new Map(counted.map((row) => [`${row.playerId}/${row.competition}`, row.goals]))
  const table = await db
    .select()
    .from(playerSeasonStats)
    .where(eq(playerSeasonStats.season, season))
    .orderBy(asc(playerSeasonStats.id))

  return table.flatMap((row) => {
    const otherGoals = fromMatches.get(`${row.playerId}/${row.competition}`) ?? 0

    return otherGoals === row.goals
      ? []
      : [{ competition: row.competition, otherGoals, playerId: row.playerId, tableGoals: row.goals }]
  })
}

/**
 * Keeps the differences a comparison of a season found, and returns how many are new.
 *
 * - The same difference (the same player, competition and two numbers) is kept once: one that
 *   waits is seen again, and one a person decided does not come back while both numbers stay
 *   the same.
 * - A difference whose numbers changed replaces the one that waits (`replaced`).
 * - A difference that waits and was not found any more closes itself (`reverted`).
 */
export async function keepPlayerStatDifferences(
  db: Writer,
  season: string,
  comparedWith: PlayerStatSource,
  found: readonly FoundStatDifference[],
  now: Date,
): Promise<number> {
  const rows = await db
    .select()
    .from(playerStatDifferences)
    .where(and(eq(playerStatDifferences.season, season), eq(playerStatDifferences.comparedWith, comparedWith)))
    .orderBy(asc(playerStatDifferences.id))
  const waiting = new Set(rows.filter((row) => row.status === 'pending'))
  let added = 0
  const close = async (closed: PlayerStatDifference[], resolution: 'replaced' | 'reverted') => {
    if (closed.length > 0) {
      await db
        .update(playerStatDifferences)
        .set({ decidedAt: now, resolution, status: 'rejected' })
        .where(
          inArray(
            playerStatDifferences.id,
            closed.map((row) => row.id),
          ),
        )
    }
  }

  for (const difference of found) {
    const ofPlayer = rows.filter(
      (row) => row.playerId === difference.playerId && row.competition === difference.competition,
    )
    const isSame = (row: PlayerStatDifference) =>
      row.tableGoals === difference.tableGoals && row.otherGoals === difference.otherGoals
    const seen = ofPlayer.find((row) => waiting.has(row) && isSame(row))
    const replaced = ofPlayer.filter((row) => waiting.has(row) && row !== seen)

    await close(replaced, 'replaced')
    for (const row of [...replaced, ...(seen === undefined ? [] : [seen])]) {
      waiting.delete(row)
    }

    if (seen !== undefined) {
      await db.update(playerStatDifferences).set({ lastSeenAt: now }).where(eq(playerStatDifferences.id, seen.id))
      continue
    }
    // Only a decision of a person counts: a difference that lapsed by itself may come back.
    if (ofPlayer.some((row) => row.resolution === 'person' && isSame(row))) {
      continue
    }

    await db.insert(playerStatDifferences).values({
      comparedWith,
      competition: difference.competition,
      firstSeenAt: now,
      lastSeenAt: now,
      otherGoals: difference.otherGoals,
      playerId: difference.playerId,
      season,
      status: 'pending',
      tableGoals: difference.tableGoals,
    })
    added++
  }

  await close([...waiting], 'reverted')

  return added
}

/** The differences of a season that wait, by the name of the player and the competition. */
export async function listWaitingStatDifferences(db: Reader, season: string): Promise<WaitingStatDifference[]> {
  const found = await db
    .select({ difference: playerStatDifferences, name: players.name })
    .from(playerStatDifferences)
    .innerJoin(players, eq(playerStatDifferences.playerId, players.id))
    .where(and(eq(playerStatDifferences.season, season), eq(playerStatDifferences.status, 'pending')))
    .orderBy(asc(playerStatDifferences.id))

  return found
    .map((row) => ({ ...row.difference, name: row.name }))
    .toSorted(
      (a, b) =>
        a.name.localeCompare(b.name, 'nl') ||
        a.competition.localeCompare(b.competition) ||
        a.comparedWith.localeCompare(b.comparedWith),
    )
}
