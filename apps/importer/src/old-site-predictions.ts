import { matches, matchPredictionCounts, type PredictionCountKind } from '@fansite/db/schema'
import { eq } from 'drizzle-orm'

import type { OldSiteData, OldSitePredictionScore } from './old-site-file.ts'
import type { OldSiteDatabase, OldSiteStepReport } from './old-site-step.ts'

import { deriveOldSiteMatches, matchKey, oldSiteSeason, oldSiteSource } from './old-site-matches.ts'

/** The source of the counts this file writes, as `predictionCountSources` has it. */
export const oldSitePredictionSource = 'oude-fansite'

type Wanted = { away: number; count: number; home: number; kind: PredictionCountKind; matchId: number }

const rowKey = (row: Pick<Wanted, 'away' | 'home' | 'kind' | 'matchId'>) =>
  `${row.matchId}|${row.kind}|${row.home}-${row.away}`

/**
 * The step `voorspellingen` (#1457): how many visitors of the old fansite predicted each
 * full-time score and each half-time score of a match, in `match_prediction_counts` with the
 * source `oude-fansite`. The match is found as the other steps find it (the season, the
 * competition and the round). Counts for a match that is not in the database are skipped, with
 * a line. The table holds counts only. A second run changes nothing, and a row that the files
 * no longer have is removed.
 */
export async function importOldSitePredictions(db: OldSiteDatabase, data: OldSiteData): Promise<OldSiteStepReport> {
  const report: OldSiteStepReport = { changed: 0, created: 0, lines: [], skipped: 0, unchanged: 0 }
  const derived = new Map(
    deriveOldSiteMatches(data.matches).map((one) => [`${one.match.season}/${one.match.code}`, one]),
  )
  const stored = new Map<string, number>()

  for (const row of await db.select().from(matches).where(eq(matches.dataSource, oldSiteSource))) {
    stored.set(matchKey(row), row.id)
  }

  const wanted = new Map<string, Wanted>()

  for (const prediction of data.predictions) {
    const values = derived.get(`${prediction.season}/${prediction.matchCode}`)?.values ?? null
    const matchId = values === null ? undefined : stored.get(matchKey(values))

    if (matchId === undefined) {
      report.skipped += 1
      report.lines.push(
        `skipped the predictions in ${oldSiteSeason(prediction.season)} ${prediction.matchCode}: the match is not in the database as a match of the old fansite`,
      )
      continue
    }

    const kinds: [PredictionCountKind, readonly OldSitePredictionScore[]][] = [
      ['full_time', prediction.fullTime],
      ['half_time', prediction.halfTime],
    ]

    for (const [kind, scores] of kinds) {
      for (const { away, count, home } of scores) {
        wanted.set(rowKey({ away, home, kind, matchId }), { away, count, home, kind, matchId })
      }
    }
  }

  const have = new Map<string, typeof matchPredictionCounts.$inferSelect>()

  for (const row of await db
    .select()
    .from(matchPredictionCounts)
    .where(eq(matchPredictionCounts.source, oldSitePredictionSource))) {
    have.set(rowKey(row), row)
  }

  const fresh: (typeof matchPredictionCounts.$inferInsert)[] = []

  for (const [key, one] of wanted) {
    const row = have.get(key)

    have.delete(key)

    if (row === undefined) {
      fresh.push({
        away: one.away,
        home: one.home,
        kind: one.kind,
        matchId: one.matchId,
        predictionCount: one.count,
        source: oldSitePredictionSource,
      })
    } else if (row.predictionCount !== one.count) {
      await db
        .update(matchPredictionCounts)
        .set({ predictionCount: one.count })
        .where(eq(matchPredictionCounts.id, row.id))
      report.changed += 1
    } else {
      report.unchanged += 1
    }
  }

  for (let start = 0; start < fresh.length; start += 500) {
    await db.insert(matchPredictionCounts).values(fresh.slice(start, start + 500))
  }
  report.created = fresh.length

  for (const row of have.values()) {
    await db.delete(matchPredictionCounts).where(eq(matchPredictionCounts.id, row.id))
    report.changed += 1
    report.lines.push(`removed a count that the files no longer have (match ${row.matchId}, ${row.kind})`)
  }

  return report
}
