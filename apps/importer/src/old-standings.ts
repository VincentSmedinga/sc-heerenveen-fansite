// The final tables of the seasons 1990/91 to 2009/10 (#1402), from the Dutch Wikipedia. Those
// seasons have no page of matches that the import of a season knows, but the page of the league
// has the final table, in a wikitable under the heading `Eindstand`. A list in the code says
// per season which page it is and which league the table is of, so no other title is asked for.
// This reads nothing but that table and writes nothing but `standings`.
import type { Database } from '@fansite/db/client'
import type { StandingsCompetition } from '@fansite/db/schema'

import { matches, standings, wikipediaPages } from '@fansite/db/schema'
import { and, desc, eq } from 'drizzle-orm'

import type { Fetcher } from './fetcher.ts'
import type { ReadStandingsRow } from './read-wikipedia.ts'

import { checkStandings } from './check-wikipedia.ts'
import { pageUrl, readStandings } from './read-wikipedia.ts'

/** What the list says about a season: the page, the league and how many clubs played in it. */
export type OldStandingsPage = { clubs: number; competition: StandingsCompetition; title: string }

/**
 * The page of the final table per season. Added by hand, after someone has read the page:
 * a season that is not here is never asked for. sc Heerenveen played in the Eerste divisie in
 * 1991/92 (20 clubs) and 1992/93. The pages of 2007/08 to 2009/10 have `(mannenvoetbal)`.
 */
export const oldStandingsPages: Readonly<Record<string, OldStandingsPage>> = {
  '1990/91': { clubs: 18, competition: 'Eredivisie', title: 'Eredivisie 1990/91' },
  '1991/92': { clubs: 20, competition: 'Eerste divisie', title: 'Eerste divisie 1991/92' },
  '1992/93': { clubs: 18, competition: 'Eerste divisie', title: 'Eerste divisie 1992/93' },
  '1993/94': { clubs: 18, competition: 'Eredivisie', title: 'Eredivisie 1993/94' },
  '1994/95': { clubs: 18, competition: 'Eredivisie', title: 'Eredivisie 1994/95' },
  '1995/96': { clubs: 18, competition: 'Eredivisie', title: 'Eredivisie 1995/96' },
  '1996/97': { clubs: 18, competition: 'Eredivisie', title: 'Eredivisie 1996/97' },
  '1997/98': { clubs: 18, competition: 'Eredivisie', title: 'Eredivisie 1997/98' },
  '1998/99': { clubs: 18, competition: 'Eredivisie', title: 'Eredivisie 1998/99' },
  '1999/00': { clubs: 18, competition: 'Eredivisie', title: 'Eredivisie 1999/00' },
  '2000/01': { clubs: 18, competition: 'Eredivisie', title: 'Eredivisie 2000/01' },
  '2001/02': { clubs: 18, competition: 'Eredivisie', title: 'Eredivisie 2001/02' },
  '2002/03': { clubs: 18, competition: 'Eredivisie', title: 'Eredivisie 2002/03' },
  '2003/04': { clubs: 18, competition: 'Eredivisie', title: 'Eredivisie 2003/04' },
  '2004/05': { clubs: 18, competition: 'Eredivisie', title: 'Eredivisie 2004/05' },
  '2005/06': { clubs: 18, competition: 'Eredivisie', title: 'Eredivisie 2005/06' },
  '2006/07': { clubs: 18, competition: 'Eredivisie', title: 'Eredivisie 2006/07' },
  '2007/08': { clubs: 18, competition: 'Eredivisie', title: 'Eredivisie 2007/08 (mannenvoetbal)' },
  '2008/09': { clubs: 18, competition: 'Eredivisie', title: 'Eredivisie 2008/09 (mannenvoetbal)' },
  '2009/10': { clubs: 18, competition: 'Eredivisie', title: 'Eredivisie 2009/10 (mannenvoetbal)' },
}

/** The seasons of the list, the oldest first. */
export const oldStandingsSeasons = Object.keys(oldStandingsPages)

/** What came of the table of one season. */
export type OldStandingsReport =
  | {
      competition: StandingsCompetition
      kind: 'imported'
      rows: number
      season: string
      validOn: string
      warnings: string[]
    }
  | { kind: 'error'; message: string; season: string }

type OurMatches = { goalsAgainst: number; goalsFor: number; lastDay: null | string; played: number; points: number }

/**
 * Reads the final table of a season from the list and replaces the table of that season in the
 * database, in one transaction. The table must pass `checkStandings` with the number of clubs
 * and the points of that season; a table that does not is an error and nothing is written. A
 * season that is not in the list is an error too, with no request. The row of sc Heerenveen is
 * compared with our own league matches when we have all of them: a difference is a warning,
 * not an error, because the matches of the old fansite may differ from Wikipedia and the table
 * is the one on the page. The page is kept in `wikipedia_pages`, so the card of the season can
 * credit it.
 */
export async function importOldStandings(
  db: Database,
  fetcher: Fetcher,
  season: string,
  origin: string,
  now: Date = new Date(),
): Promise<OldStandingsReport> {
  const page = Object.hasOwn(oldStandingsPages, season) ? oldStandingsPages[season] : undefined

  if (page === undefined) {
    return {
      kind: 'error',
      message: `there is no page of a final table for ${season}; the seasons are ${oldStandingsSeasons[0]} to ${oldStandingsSeasons.at(-1)}`,
      season,
    }
  }

  const outcome = await fetcher.fetch(pageUrl(origin, page.title))

  switch (outcome.kind) {
    case 'blocked-by-robots':
      return { kind: 'error', message: `${page.title}: robots.txt does not allow ${outcome.url}`, season }
    case 'error':
      return { kind: 'error', message: `${page.title}: ${outcome.message}`, season }
    case 'fetched':
      break
    case 'not-modified':
      return { kind: 'error', message: `${page.title}: the page answered 304 to a request without conditions`, season }
    case 'wait':
      return {
        kind: 'error',
        message: `${page.title}: Wikipedia asks us to wait ${outcome.retryAfterSeconds} seconds`,
        season,
      }
  }

  const table = readStandings(new TextDecoder('utf-8').decode(outcome.body))

  if (table.kind === 'error') {
    return { kind: 'error', message: `${page.title}: ${table.message}`, season }
  }

  const problems = checkStandings(table.rows, undefined, { clubs: page.clubs, pointsPerWin: pointsPerWinIn(season) })

  if (problems.length > 0) {
    return { kind: 'error', message: `${page.title}: ${problems.join('; ')}`, season }
  }

  const ours = await ourMatches(db, season, page.competition)
  const validOn = ours.lastDay ?? `${Number(season.slice(0, 4)) + 1}-06-30`
  const warnings = compareWithMatches(table.rows, ours, season)

  await db.transaction(async (transaction) => {
    await transaction.delete(standings).where(eq(standings.season, season))
    await transaction
      .insert(standings)
      .values(table.rows.map((row) => ({ ...row, competition: page.competition, season, validOn })))

    const values = { kind: 'standings', language: 'nl', readAt: now, season, version: outcome.lastModified } as const

    await transaction
      .insert(wikipediaPages)
      .values({ title: page.title, ...values })
      .onDuplicateKeyUpdate({ set: values })
  })

  return { competition: page.competition, kind: 'imported', rows: table.rows.length, season, validOn, warnings }
}

/** A win earned two points until 1994/95, and three from 1995/96 on. */
export function pointsPerWinIn(season: string): number {
  return Number(season.slice(0, 4)) < 1995 ? 2 : 3
}

/** A warning for each way our row differs from our matches, if we have all of them. */
function compareWithMatches(rows: ReadStandingsRow[], ours: OurMatches, season: string): string[] {
  const row = rows.find((candidate) => candidate.club.toLowerCase() === 'sc heerenveen')

  if (row === undefined || ours.played === 0) {
    return []
  }
  if (ours.played !== row.played) {
    return [
      `${season}: we have ${ours.played} of the ${row.played} matches of the table, so it was not compared with them`,
    ]
  }

  const points = ours.points - row.pointsDeducted

  return row.goalsFor === ours.goalsFor && row.goalsAgainst === ours.goalsAgainst && row.points === points
    ? []
    : [
        `${season}: the row of sc Heerenveen (${row.goalsFor}-${row.goalsAgainst}, ${row.points} points) differs from our matches (${ours.goalsFor}-${ours.goalsAgainst}, ${points} points)`,
      ]
}

/** The league matches of ours that are played, and the day of the last one. */
async function ourMatches(db: Database, season: string, competition: StandingsCompetition): Promise<OurMatches> {
  const rows = await db
    .select({ date: matches.matchDate, goalsAgainst: matches.goalsAgainst, goalsFor: matches.goalsFor })
    .from(matches)
    .where(and(eq(matches.season, season), eq(matches.competition, competition), eq(matches.status, 'played')))
    .orderBy(desc(matches.matchDate))
  const perWin = pointsPerWinIn(season)
  const total = { goalsAgainst: 0, goalsFor: 0, lastDay: rows[0]?.date ?? null, played: rows.length, points: 0 }

  for (const row of rows) {
    const [goalsFor, goalsAgainst] = [row.goalsFor ?? 0, row.goalsAgainst ?? 0]

    total.goalsFor += goalsFor
    total.goalsAgainst += goalsAgainst
    total.points += goalsFor > goalsAgainst ? perWin : goalsFor === goalsAgainst ? 1 : 0
  }

  return total
}
