import type { Database } from '@fansite/db/client'

import { matches, matchReports } from '@fansite/db/schema'
import { and, asc, desc, eq, isNotNull, notInArray } from 'drizzle-orm'

import { qualityPath } from './quality'

// The matches whose formation of ours is not an ordinary one (issue 1191): a list to read on
// the page Kwaliteit, not a gap to fill in. An unusual formation is often a mistake: one
// derived from the lines of the old fansite, or a typing error in a report.

/** The address of the page with the unusual formations. */
export const unusualFormationsPath = `${qualityPath}/formaties`

/** The formations we played almost always. Add one here when a new one becomes ordinary. */
export const usualFormations = ['4-3-3', '4-2-3-1'] as const

export type UnusualFormation = {
  formation: string
  home: boolean
  id: number
  matchDate: string
  opponent: string
  season: string
  /** Where the report comes from, such as "Oude fansite". Empty when it has no source. */
  source: null | string
}

/**
 * The matches with a formation of ours that is not in `usualFormations`, the newest season
 * first and the oldest match of a season first. A match without a formation is not in the
 * list: that is a gap, which the table of the page Kwaliteit already shows.
 */
export async function readUnusualFormations(db: Pick<Database, 'select'>): Promise<UnusualFormation[]> {
  const found = await db
    .select({
      formation: matchReports.formationOurs,
      home: matches.home,
      id: matches.id,
      matchDate: matches.matchDate,
      opponent: matches.opponent,
      season: matches.season,
      source: matchReports.source,
    })
    .from(matchReports)
    .innerJoin(matches, eq(matches.id, matchReports.matchId))
    .where(and(isNotNull(matchReports.formationOurs), notInArray(matchReports.formationOurs, [...usualFormations])))
    .orderBy(desc(matches.season), asc(matches.matchDate), asc(matches.id))

  return found.map((row) => ({ ...row, formation: row.formation ?? '' }))
}
