// The results of the league for every club, as the import stores them next to the table: the
// names are made the ones of the table, the rows of a season are replaced at once, and the
// matches each club has played are checked against what the table says. See `league_results`
// in the database package.
import type { Database } from '@fansite/db/client'

import { leagueResults } from '@fansite/db/schema'
import { eq } from 'drizzle-orm'

import type { ReadResult, ReadStandingsRow } from './read-wikipedia.ts'

import { clubFullNames } from './club-names.ts'

/** How many results the import added, changed, left as they were and removed. */
export type ResultCounts = { added: number; removed: number; unchanged: number; updated: number }

/**
 * Makes the clubs of the results the clubs of the table, so the two can be joined on the name.
 * A name is the club of the table when the two are the same apart from the case, or when
 * `club-names.ts` has them as one club: `Excelsior` for `Excelsior Rotterdam`. That list is
 * the one place where a difference in spelling is put right. A name the table does not have
 * stays as the page writes it, and comes back as a stranger.
 */
export function matchClubNames(
  results: ReadResult[],
  rows: Pick<ReadStandingsRow, 'club'>[],
): { results: ReadResult[]; strangers: string[] } {
  const inTable = new Map(rows.map((row) => [clubKey(row.club), row.club]))
  const strangers = new Set<string>()
  const named = (name: string) => {
    const club = inTable.get(clubKey(name))

    if (club === undefined) {
      strangers.add(name)
    }

    return club ?? name
  }

  return {
    results: results.map((result) => ({
      ...result,
      awayClub: named(result.awayClub),
      homeClub: named(result.homeClub),
    })),
    strangers: [...strangers].sort((a, b) => a.localeCompare(b, 'nl')),
  }
}

/**
 * Makes the results of the season in the database the ones we found, in one go: the rows of
 * the season are replaced, like the table. Returns how many results are new, changed, as they
 * were and gone, for the log. When nothing differs nothing is written. The rows of another
 * season are not touched.
 */
export async function storeResults(
  db: Pick<Database, 'delete' | 'insert' | 'select'>,
  season: string,
  found: ReadResult[],
): Promise<ResultCounts> {
  const stored = new Map(
    (await db.select().from(leagueResults).where(eq(leagueResults.season, season))).map((row) => [
      keyOf(row.homeClub, row.awayClub),
      row,
    ]),
  )
  const counts = { added: 0, removed: 0, unchanged: 0, updated: 0 }

  for (const result of found) {
    const before = stored.get(keyOf(result.homeClub, result.awayClub))

    stored.delete(keyOf(result.homeClub, result.awayClub))
    if (before === undefined) {
      counts.added++
    } else if (
      before.round === result.round &&
      before.playedOn === result.playedOn &&
      before.homeGoals === result.homeGoals &&
      before.awayGoals === result.awayGoals
    ) {
      counts.unchanged++
    } else {
      counts.updated++
    }
  }
  counts.removed = stored.size

  if (counts.added + counts.updated + counts.removed > 0) {
    await db.delete(leagueResults).where(eq(leagueResults.season, season))
    if (found.length > 0) {
      await db.insert(leagueResults).values(found.map((result) => ({ ...result, season })))
    }
  }

  return counts
}

/** The name of a club as the table and the results compare it: the full name, in lower case. */
function clubKey(name: string): string {
  const lower = name.toLowerCase()
  const known = clubFullNames.find((club) =>
    [club.name, ...club.aliases].some((other) => other.toLowerCase() === lower),
  )

  return (known?.name ?? name).toLowerCase()
}

function keyOf(homeClub: string, awayClub: string): string {
  return `${homeClub}|${awayClub}`.toLowerCase()
}
