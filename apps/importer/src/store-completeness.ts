// Works out the chance that the list of players of a season is the whole squad
// (`squadCompleteness`, #745) from what the database holds, and stores it in
// `squad_completeness` (#746). The import calls it at the end of a read of a squad, with the
// sums of the table it just read; `import:completeness` calls it for every season without a
// request, with the sums that were stored. A second calculation with nothing new writes
// nothing.
import type { Database } from '@fansite/db/client'
import type { CompletenessChange, CompletenessTotals } from '@fansite/db/store-completeness'

import { connect } from '@fansite/db/client'
import { lockNameFor, withLock } from '@fansite/db/lock'
import { players, squadCompleteness } from '@fansite/db/schema'
import { storeCompleteness } from '@fansite/db/store-completeness'

import type { ImportOptions } from './import-feeds.ts'

export type { CompletenessChange, CompletenessTotals }
export { storeCompleteness }

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
