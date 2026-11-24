// Fills the result of a match of the old fansite that has none, from the cross table of the
// season on the Dutch Wikipedia (#1621). The old fansite goes first (10 November 2026), but a
// match without a result has nothing to go first with, so Wikipedia only fills the gap: a
// result that is there is never overwritten, a result the editors filled in stays, and the
// goals, the time of the result and the score after ninety minutes stay empty, because a cross
// table has none of them. A second run changes nothing: the match has a result by then.
import type { Database } from '@fansite/db/client'
import type { Competition } from '@fansite/db/schema'

import { lockedFields } from '@fansite/db/match-edits'
import { matchEdits, matches } from '@fansite/db/schema'
import { and, eq, inArray, isNull } from 'drizzle-orm'

import type { Fetcher } from './fetcher.ts'
import type { CrossTableSeason } from './old-site-cross-tables.ts'

import { wikipediaOrigin } from './import-matches.ts'
import { crossTableKey, crossTableSeasons, fetchCrossTables, readCrossTableScores } from './old-site-cross-tables.ts'

const leagues: readonly Competition[] = ['Eredivisie', 'Eerste divisie']

/** What a fill did: how many matches got a result, and the lines for the log, in English. */
export type FillReport = { filled: number; lines: string[] }

/** Whether a season has a cross table on Wikipedia to fill from. */
export const hasCrossTable = (season: string) => season >= crossTableSeasons.first && season <= crossTableSeasons.last

/**
 * Asks Wikipedia for the cross tables of a season and gives every match of the old fansite in
 * it that has no result the score of the table. A match is found by its season, competition,
 * club and who was at home. A match that the table has no score for gets a line in the log and
 * nothing else. A season that is not one of the old fansite, or has no such match, asks
 * nothing. A table that can't be read leaves the matches as they are, with a line.
 */
export async function fillResultsFromCrossTables(
  db: Database,
  fetcher: Fetcher,
  season: string,
  { origin = wikipediaOrigin, pause }: { origin?: string; pause?: number } = {},
): Promise<FillReport> {
  const report: FillReport = { filled: 0, lines: [] }

  if (!hasCrossTable(season)) {
    return report
  }

  const gaps = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.season, season),
        eq(matches.dataSource, 'oude-fansite'),
        inArray(matches.competition, [...leagues]),
        inArray(matches.status, ['scheduled', 'result_unknown']),
        isNull(matches.goalsFor),
        isNull(matches.goalsAgainst),
      ),
    )

  if (gaps.length === 0) {
    return report
  }

  const seasons: CrossTableSeason[] = [...new Set(gaps.map((match) => match.competition))].map((competition) => ({
    competition,
    season,
    title: `${competition} ${season}`,
  }))
  const tables = await fetchCrossTables(fetcher, origin, seasons, pause)
  const { readable, scores } = await readCrossTableScores(db, tables)
  const edits = new Map(
    (
      await db
        .select()
        .from(matchEdits)
        .where(
          inArray(
            matchEdits.matchId,
            gaps.map((match) => match.id),
          ),
        )
    ).map((edit) => [edit.matchId, edit]),
  )

  for (const match of gaps) {
    const label = `${season} ${match.competition} ${match.round} against ${match.opponent} (match ${match.id})`

    if (lockedFields(edits.get(match.id)).includes('goalsFor')) {
      continue
    }
    if (!readable.has(`${season}|${match.competition}`)) {
      report.lines.push(`${label}: left without a result, the cross table could not be read`)
      continue
    }

    const score = scores.get(crossTableKey(match))
    const twins = gaps.filter((other) => other.clubId === match.clubId && other.competition === match.competition)

    if (twins.filter((other) => other.home === match.home).length > 1) {
      report.lines.push(`${label}: left without a result, a second match without one is against the same club`)
      continue
    }

    if (score === undefined) {
      report.lines.push(`${label}: left without a result, the cross table has no score for it`)
      continue
    }

    // The same conditions again in the update, so a result that arrived in the meantime stays.
    await db
      .update(matches)
      .set({ goalsAgainst: score.against, goalsFor: score.for, status: 'played' })
      .where(and(eq(matches.id, match.id), isNull(matches.goalsFor), isNull(matches.goalsAgainst)))
    report.filled += 1
    report.lines.push(`${label}: result ${score.for}-${score.against} filled from the cross table of Wikipedia`)
  }

  return report
}
