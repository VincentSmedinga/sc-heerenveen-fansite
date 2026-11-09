// The step `selecties` of the import of the old site (#935): stores the completeness of the
// squad of every season that has players from our match reports (the source `verslag`). The
// step `spelers` makes those rows, but nobody else works out the completeness for a season
// without a better source, so the card Selectie on the site would stay empty. The calculation
// is the one of every other import (`storeCompleteness`): the site reads the row and never
// works it out, and a season with a better source keeps that source as its best one.
import { players } from '@fansite/db/schema'
import { asc, eq } from 'drizzle-orm'

import type { OldSiteDatabase, OldSiteStepReport } from './old-site-step.ts'

import { describeChange, storeCompleteness } from './store-completeness.ts'

/**
 * The step `selecties`: stores the completeness of every season that has a player with the
 * source `verslag`, and says what it did to each row. A second run with nothing new writes
 * nothing. The sums of the table of a Wikipedia page stay as they were.
 */
export async function importOldSiteCompleteness(db: OldSiteDatabase, now: Date): Promise<OldSiteStepReport> {
  const report: OldSiteStepReport = { changed: 0, created: 0, lines: [], skipped: 0, unchanged: 0 }
  const rows = await db
    .selectDistinct({ season: players.season })
    .from(players)
    .where(eq(players.source, 'verslag'))
    .orderBy(asc(players.season))

  for (const { season } of rows) {
    const change = await storeCompleteness(db, season, undefined, now)

    if (change.kind === 'unchanged') {
      report.unchanged += 1
    } else if (change.kind === 'changed') {
      report[change.was === null ? 'created' : 'changed'] += 1
      report.lines.push(describeChange(season, change))
    }
  }

  return report
}
