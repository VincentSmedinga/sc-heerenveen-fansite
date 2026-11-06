// Works out the chance that the list of players of a season is the whole squad
// (`squadCompleteness`, #745) from what the database holds, and stores it in
// `squad_completeness` (#746). The import calls it at the end of a read of a squad, with the
// sums of the table it just read; `import:completeness` calls it for every season without a
// request, with the sums that were stored. A second calculation with nothing new writes
// nothing.
import type { Database } from '@fansite/db/client'
import type { PlayerSource, SquadCompletenessRow } from '@fansite/db/schema'

import { connect } from '@fansite/db/client'
import { lockNameFor, withLock } from '@fansite/db/lock'
import { matches, matchGoals, players, playerSources, squadCompleteness } from '@fansite/db/schema'
import { and, asc, eq, sql } from 'drizzle-orm'

import type { ImportOptions } from './import-feeds.ts'
import type { CompletenessScorer } from './squad-completeness.ts'

import { nameKey } from './read-squad.ts'
import { squadCompleteness as calculate } from './squad-completeness.ts'

/** What a calculation did to the row of a season. */
export type CompletenessChange =
  | { kind: 'changed'; row: SquadCompletenessRow; was: null | SquadCompletenessRow }
  | { kind: 'none'; removed: boolean; season: string }
  | { kind: 'unchanged'; row: SquadCompletenessRow }

/** What the sums of the table of a season were, or null where the page gave none. */
export type CompletenessTotals = { goalsTotal: null | number; matchesTotal: null | number }

/** One line about a season: the chance, the level, the players and what changed. */
export function describeChange(season: string, change: CompletenessChange): string {
  const head = `Completeness ${season}`

  if (change.kind === 'none') {
    return `${head}: no players${change.removed ? ', the row is removed' : ''}`
  }

  const { level, playerCount, probability } = change.row
  const what = `${probability}% ${level}, ${playerCount} players`

  if (change.kind === 'unchanged') {
    return `${head}: ${what}, unchanged`
  }
  if (change.was === null) {
    return `${head}: ${what}, new`
  }

  return `${head}: ${what}, was ${change.was.probability}% ${change.was.level} with ${change.was.playerCount} players`
}

/**
 * Calculates the chance of every season that has players or a row, from the database and the
 * stored sums, and writes a line for each. It asks nobody. Returns the lines.
 */
export async function recalculateCompleteness(db: Database, now: Date): Promise<string[]> {
  const fromPlayers = await db.selectDistinct({ season: players.season }).from(players)
  const fromRows = await db.select({ season: squadCompleteness.season }).from(squadCompleteness)
  const seasons = [...new Set([...fromPlayers, ...fromRows].map((row) => row.season))].sort()
  const lines: string[] = []

  for (const season of seasons) {
    lines.push(describeChange(season, await storeCompleteness(db, season, undefined, now)))
  }

  lines.push(`Completeness: ${seasons.length} ${seasons.length === 1 ? 'season' : 'seasons'} calculated.`)

  return lines
}

/**
 * The command `pnpm run import:completeness`, and `import.mjs --completeness` on the host. It
 * takes the lock of the import, so it never runs beside a run of cron, and makes no request.
 * Returns the exit code: 0, or 1 when the lock is held.
 */
export async function runCompletenessCommand(
  databaseUrl: string,
  { clock = () => new Date(), write = console.log }: Pick<ImportOptions, 'clock' | 'write'> = {},
): Promise<number> {
  const { close, db, pool } = connect(databaseUrl)

  try {
    const run = await withLock(pool, lockNameFor(databaseUrl, 'import'), 0, () => recalculateCompleteness(db, clock()))

    if (!run.ran) {
      write('An import is still running on this database, so this command does nothing. Try again in a few minutes.')

      return 1
    }

    for (const line of run.result) {
      write(line)
    }

    return 0
  } finally {
    await close()
  }
}

/**
 * Works out the chance of one season and stores it when it differs from the row that is there.
 * The sums of the table come from the caller, who has just read the page; without them the
 * sums that were stored stay. A season without players has no row: one that is there is
 * removed, since the players it was about are gone. It writes nothing when the chance, the
 * level, the checks and the sums are the same as before, so the moment of the calculation is
 * the moment something changed.
 */
export async function storeCompleteness(
  db: Pick<Database, 'delete' | 'insert' | 'select'>,
  season: string,
  totals: CompletenessTotals | undefined,
  now: Date,
): Promise<CompletenessChange> {
  const [was] = await db.select().from(squadCompleteness).where(eq(squadCompleteness.season, season))
  const list = await db
    .select({ name: players.name, personId: players.personId, source: players.source })
    .from(players)
    .where(eq(players.season, season))

  if (list.length === 0) {
    if (was !== undefined) {
      await db.delete(squadCompleteness).where(eq(squadCompleteness.season, season))
    }

    return { kind: 'none', removed: was !== undefined, season }
  }

  const playersPerSource: Partial<Record<PlayerSource, number>> = {}

  for (const player of list) {
    playersPerSource[player.source] = (playersPerSource[player.source] ?? 0) + 1
  }

  const matchesTotal = totals === undefined ? (was?.matchesTotal ?? null) : totals.matchesTotal
  const goalsTotal = totals === undefined ? (was?.goalsTotal ?? null) : totals.goalsTotal
  const result = calculate({
    goalsTotal,
    matchesTotal,
    players: list,
    playersPerSource,
    scorers: await scorersOf(db, season),
  })
  const bestSource = playerSources.find((source) => (playersPerSource[source] ?? 0) > 0) ?? 'selectie'
  const row: SquadCompletenessRow = {
    bestSource,
    calculatedAt: now,
    checks: result.checks,
    goalsTotal,
    level: result.level,
    matchesTotal,
    playerCount: list.length,
    probability: result.probability,
    season,
  }

  if (was !== undefined && sameOutcome(was, row)) {
    return { kind: 'unchanged', row: was }
  }

  await db
    .insert(squadCompleteness)
    .values(row)
    .onDuplicateKeyUpdate({ set: { ...row, season: sql`${squadCompleteness.season}` } })

  return { kind: 'changed', row, was: was ?? null }
}

function sameOutcome(a: SquadCompletenessRow, b: SquadCompletenessRow): boolean {
  return (
    a.probability === b.probability &&
    a.level === b.level &&
    a.playerCount === b.playerCount &&
    a.bestSource === b.bestSource &&
    a.matchesTotal === b.matchesTotal &&
    a.goalsTotal === b.goalsTotal &&
    JSON.stringify(a.checks) === JSON.stringify(b.checks)
  )
}

/**
 * The players who scored for us this season, with their goals, own goals left out, or null when
 * the season has no such goal in the database. A goal belongs to the person of its page, or of
 * the player it is linked to, or else to the name.
 */
async function scorersOf(db: Pick<Database, 'select'>, season: string): Promise<CompletenessScorer[] | null> {
  const goals = await db
    .select({
      name: matchGoals.player,
      personId: matchGoals.personId,
      playerName: players.name,
      playerPersonId: players.personId,
    })
    .from(matchGoals)
    .innerJoin(matches, eq(matchGoals.matchId, matches.id))
    .leftJoin(players, eq(matchGoals.playerId, players.id))
    .where(and(eq(matches.season, season), eq(matchGoals.ours, true), eq(matchGoals.ownGoal, false)))
    .orderBy(asc(matchGoals.id))
  const scorers = new Map<string, CompletenessScorer>()

  for (const goal of goals) {
    const personId = goal.personId ?? goal.playerPersonId
    const name = goal.playerName ?? goal.name
    const key = personId === null ? `name:${nameKey(name)}` : `person:${personId}`
    const scorer = scorers.get(key)

    if (scorer === undefined) {
      scorers.set(key, { goals: 1, name, personId })
    } else {
      scorer.goals++
    }
  }

  return scorers.size === 0 ? null : [...scorers.values()]
}
