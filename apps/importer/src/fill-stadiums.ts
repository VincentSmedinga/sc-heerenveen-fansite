// Fills the stadium of the played matches that have none (#1293), mostly those of the old
// fansite: the home ground of the home club on the day of the match. The rule is
// `fillStadiumsFromHomeGrounds` in `@fansite/db/stadiums`; this file is the command around it
// and the lines for the log. The regular import runs it after every other step, so a match
// that arrives without a stadium gets one by itself.
import type { Database } from '@fansite/db/client'
import type { FillResult, FillSkipReason } from '@fansite/db/stadiums'

import { connect } from '@fansite/db/client'
import { lockNameFor, withLock } from '@fansite/db/lock'
import { fillStadiumsFromHomeGrounds } from '@fansite/db/stadiums'

const reasons: Record<FillSkipReason, string> = {
  edited: 'the editors entered its facts',
  neutral: 'a final or another match on neutral ground',
  noGround: 'the home club has no home ground',
  notYet: 'no home ground of the home club had begun by then',
  text: 'the source names a stadium that no stadium answers to',
}

/** The lines of a run for the log: how many it filled, and how many it left, by reason. */
export function describeFill({ filled, skipped }: FillResult): string[] {
  const left = Object.entries(skipped).filter(([, count]) => count > 0) as [FillSkipReason, number][]
  const total = left.reduce((sum, [, count]) => sum + count, 0)

  if (filled === 0 && total === 0) {
    return []
  }

  return [
    `Stadiums of matches: ${filled} filled from the home grounds, ${total} left without.`,
    ...left.map(([reason, count]) => `Stadiums of matches: ${count} left, ${reasons[reason]}.`),
  ]
}

/**
 * Runs the fill on an open database, for the regular import, which holds the lock. It says
 * something only when it filled a match: the matches it leaves stay the same every hour, and
 * the command shows them.
 */
export async function fillStadiums(db: Database): Promise<string[]> {
  const result = await fillStadiumsFromHomeGrounds(db)

  return result.filled === 0 ? [] : describeFill(result)
}

/**
 * The command `pnpm run import:fill-stadiums`, and `import.mjs --fill-stadiums` on the host,
 * under the lock of the import. Returns the exit code.
 */
export async function runFillStadiumsCommand(
  databaseUrl: string,
  { write = console.log }: { write?: (line: string) => void } = {},
): Promise<number> {
  const { close, db, pool } = connect(databaseUrl)

  try {
    const run = await withLock(pool, lockNameFor(databaseUrl, 'import'), 0, async () =>
      describeFill(await fillStadiumsFromHomeGrounds(db)),
    )

    if (!run.ran) {
      write('An import is still running on this database, so this command does nothing. Try again in a few minutes.')

      return 1
    }

    for (const line of run.result.length === 0 ? ['Stadiums of matches: nothing to fill.'] : run.result) {
      write(line)
    }

    return 0
  } finally {
    await close()
  }
}
