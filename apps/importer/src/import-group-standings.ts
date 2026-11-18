// The import of the table of a European group stage (#1405). Our own matches of these
// tournaments are in `matches`, but the other clubs of the group and their results are not, so
// the table comes from the page of the tournament on the Dutch Wikipedia. The pages are listed
// by hand, after someone has read each one: a season that is not in `groupStages` is never
// asked for. It runs with the import of a season that is over (`import:season`).
import type { Database } from '@fansite/db/client'
import type { Competition } from '@fansite/db/schema'

import { createClubBook } from '@fansite/db/clubs'
import { groupStandings } from '@fansite/db/schema'
import { and, asc, eq } from 'drizzle-orm'

import type { Fetcher } from './fetcher.ts'
import type { ReadGroupClub } from './read-group-standings.ts'

import { clubFullNames } from './club-names.ts'
import { lookUpClubPages } from './club-pages.ts'
import { checkGroupStandings, isOwnClub, readGroupStandings } from './read-group-standings.ts'
import { pageUrl } from './read-wikipedia.ts'

export type GroupStage = {
  competition: Competition
  /** The title of the page of the Dutch Wikipedia with the groups. */
  page: string
  season: string
}

/** What the import of the group stages of one season did, as lines for the log. */
export type GroupStageReport = {
  lines: string[]
  /** False when a table could not be read or stored; the table that was there stays. */
  ok: boolean
}

/** The name of sc Heerenveen, which is no club of `clubs` and has no `club_id`. */
export const ownClubName = 'sc Heerenveen'

/**
 * The seasons with a group stage we have matches of, and the page that has the groups. The
 * Intertoto Cup had groups from 1995 to 1997; from 1998 on it was a knock-out tournament.
 */
export const groupStages: readonly GroupStage[] = [
  { competition: 'Intertoto Cup', page: 'UEFA Intertoto Cup 1995', season: '1995/96' },
  { competition: 'Intertoto Cup', page: 'UEFA Intertoto Cup 1996', season: '1996/97' },
  { competition: 'Intertoto Cup', page: 'UEFA Intertoto Cup 1997', season: '1997/98' },
  { competition: 'Champions League', page: 'UEFA Champions League 2000/01', season: '2000/01' },
  { competition: 'UEFA Cup', page: 'UEFA Cup 2004/05', season: '2004/05' },
  { competition: 'UEFA Cup', page: 'UEFA Cup 2005/06', season: '2005/06' },
  { competition: 'UEFA Cup', page: 'UEFA Cup 2006/07', season: '2006/07' },
  { competition: 'UEFA Cup', page: 'UEFA Cup 2008/09', season: '2008/09' },
  { competition: 'Europa League', page: 'UEFA Europa League 2009/10', season: '2009/10' },
]

/** The group stages of a season: none for most seasons, which then cost no request. */
export function groupStagesOf(season: string): GroupStage[] {
  return groupStages.filter((stage) => stage.season === season)
}

/**
 * Reads the group stages of a season and stores the tables, each in one transaction that
 * replaces the table of the group. A page that cannot be fetched, has no table with sc
 * Heerenveen, or has numbers that do not add up (`checkGroupStandings`) is a line in the log
 * and changes nothing. A second run of a page that did not change writes the same rows.
 */
export async function importGroupStages(
  db: Database,
  fetcher: Fetcher,
  season: string,
  origin: string,
  now: Date,
): Promise<GroupStageReport> {
  const lines: string[] = []
  let ok = true

  for (const stage of groupStagesOf(season)) {
    const head = `Group stage ${stage.competition} ${season}`
    const outcome = await fetcher.fetch(pageUrl(origin, stage.page))

    if (outcome.kind !== 'fetched') {
      lines.push(`${head}: not read, ${describeOutcome(stage.page, outcome)}`)
      ok = false
      continue
    }

    const read = readGroupStandings(new TextDecoder('utf-8').decode(outcome.body))

    if (read.kind !== 'read') {
      lines.push(
        `${head}: no table stored, ${read.kind === 'error' ? read.message : `the page ${stage.page} has no table of a group with sc Heerenveen`}`,
      )
      ok = false
      continue
    }

    const faults = checkGroupStandings(read.rows)

    if (faults.length > 0) {
      lines.push(`${head}: no table stored, ${faults.join('; ')}`)
      ok = false
      continue
    }

    // Wikipedia is asked before the transaction, as the import of matches does: the articles
    // of the clubs, so a title that redirects (`Sporting Lissabon`) is the club we have.
    const lookup = await lookUpClubPages(
      db,
      fetcher,
      origin,
      read.rows.flatMap((row) => (row.page === null || isOwnClub(row.club) ? [] : [row.page])),
    )

    if (lookup.kind !== 'found') {
      lines.push(`${head}: not read, the articles of the clubs could not be asked`)
      ok = false
      continue
    }

    const events: string[] = []
    const changed = await storeGroup(db, stage, read.group, read.rows, events, now, lookup.redirects)

    lines.push(
      `${head}: ${read.group}, ${read.rows.length} clubs, ${changed ? 'stored' : 'unchanged'}`,
      ...events.map((event) => `  ${event}`),
    )
  }

  return { lines, ok }
}

/** What went wrong with a request, in a few words. */
function describeOutcome(page: string, outcome: Awaited<ReturnType<Fetcher['fetch']>>): string {
  switch (outcome.kind) {
    case 'blocked-by-robots':
      return `robots.txt does not allow ${page}`
    case 'error':
      return `${page}: ${outcome.message}`
    case 'fetched':
      return page
    case 'not-modified':
      return `${page} answered 304 to a request without conditions`
    case 'wait':
      return `Wikipedia asked us to wait for ${page}`
  }
}

/** The rows of a group in the order of the page, with the club of each as `clubs` has it. */
async function rowsOf(
  db: Database,
  stage: GroupStage,
  group: string,
  rows: readonly ReadGroupClub[],
  events: string[],
  readAt: Date,
  redirects: ReadonlyMap<string, string>,
) {
  const book = await createClubBook(db, { fullNames: clubFullNames, redirects })
  const found = []

  for (const row of rows) {
    let clubId: null | number = null

    if (!isOwnClub(row.club)) {
      const resolved = await book.resolve({ name: row.club, page: row.page })

      events.push(...resolved.events)
      clubId = resolved.id
    }
    found.push({
      clubId,
      competition: stage.competition,
      drawn: row.drawn,
      goalDifference: row.goalDifference,
      goalsAgainst: row.goalsAgainst,
      goalsFor: row.goalsFor,
      groupName: group,
      language: 'nl',
      lost: row.lost,
      played: row.played,
      points: row.points,
      position: row.position,
      readAt,
      season: stage.season,
      sourcePage: stage.page,
      won: row.won,
    })
  }

  return found
}

/** Whether a row in the database is the row we read. */
function sameRow(stored: Record<string, unknown>, read: Record<string, unknown> | undefined): boolean {
  return read !== undefined && Object.entries(read).every(([key, value]) => key === 'readAt' || stored[key] === value)
}

/** Replaces the table of the group; true when a row changed, false when nothing did. */
async function storeGroup(
  db: Database,
  stage: GroupStage,
  group: string,
  rows: readonly ReadGroupClub[],
  events: string[],
  now: Date,
  redirects: ReadonlyMap<string, string>,
): Promise<boolean> {
  const next = await rowsOf(db, stage, group, rows, events, now, redirects)
  const where = and(eq(groupStandings.season, stage.season), eq(groupStandings.competition, stage.competition))
  const before = await db.select().from(groupStandings).where(where).orderBy(asc(groupStandings.position))

  if (before.length === next.length && before.every((row, index) => sameRow(row, next[index]))) {
    // The table is as it was: only the day it was read changes.
    await db.update(groupStandings).set({ readAt: now }).where(where)

    return false
  }

  await db.transaction(async (transaction) => {
    await transaction.delete(groupStandings).where(where)
    await transaction.insert(groupStandings).values(next)
  })

  return true
}
