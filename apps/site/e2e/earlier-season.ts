import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { matches, standings, wikipediaPages } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { madeUpMatches, seedMatches } from '@fansite/db/seed'
import { eq } from 'drizzle-orm'
import path from 'node:path'

/**
 * The season before the current one, such as `2025/26` while the current season is `2026/27`.
 * /wedstrijden/<this season> is the page of an earlier season that the checks open.
 */
export function earlierSeason() {
  return seasonOf(aYearAgo())
}

const aYearAgo = () => {
  const now = new Date()

  return new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate()))
}

/** The address of that season in a path, `2025-26`. */
export const earlierSeasonSlug = () => earlierSeason().replace('/', '-')

/**
 * Puts made-up matches, goals, a league table and the pages they credit in the database for the
 * season before the current one, so the checks of /wedstrijden/<season> have an earlier season
 * to show: the matches page lists the seasons that have matches, and answers "niet gevonden"
 * for the others. A database that already holds matches or a table for that season (a
 * development database that imported one) keeps them, and the checks use those. The checks put
 * the rows in before the first test and take them out after the last one.
 */
export async function addEarlierSeason() {
  const { close, db } = connectToDatabase()
  const season = earlierSeason()
  let added = false

  try {
    added = await seedMatches(db, aYearAgo())
  } finally {
    await close()
  }

  return async () => {
    const connection = connectToDatabase()

    try {
      // Rows that this run put in, and made-up rows that an earlier run left behind, which is
      // what `pnpm --filter site test-data --remove` meets. Real matches of that season, from
      // an import, are never taken out: only a season whose matches are all made up goes.
      if (added || (await holdsOnlyMadeUpMatches(connection.db, season))) {
        // The goals of the matches go with them.
        await connection.db.delete(matches).where(eq(matches.season, season))
        await connection.db.delete(standings).where(eq(standings.season, season))
        await connection.db.delete(wikipediaPages).where(eq(wikipediaPages.season, season))
      }
    } finally {
      await connection.close()
    }
  }
}

/**
 * Connects with the DATABASE_URL of the environment or the .env in the root, like the server of
 * the check does.
 */
function connectToDatabase() {
  try {
    process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'))
  } catch {
    // No .env: CI sets DATABASE_URL itself.
  }

  return connect(readDatabaseEnv().DATABASE_URL)
}

/**
 * Whether the season has matches and every one of them is a made-up match (the same
 * competition, round and opponent as in `madeUpMatches`), so the season came from the seed and
 * not from an import.
 */
async function holdsOnlyMadeUpMatches(db: ReturnType<typeof connectToDatabase>['db'], season: string) {
  const key = (match: { competition: string; opponent: string; round: string }) =>
    `${match.competition}|${match.round}|${match.opponent}`
  const madeUp = new Set(madeUpMatches(aYearAgo()).map(key))
  const rows = await db.select().from(matches).where(eq(matches.season, season))

  return rows.length > 0 && rows.every((match) => madeUp.has(key(match)))
}
