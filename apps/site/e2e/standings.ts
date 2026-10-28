import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { standings } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { count, eq } from 'drizzle-orm'
import path from 'node:path'

/**
 * A made-up league table for the checks of /wedstrijden, which have no importer: without it the
 * card Stand says the table is not found, and has no button for an image. It is not in the
 * seed, which also runs on acceptance. A database that already holds a table for this season (a
 * development database that imported one) keeps it, and the checks use that one. The checks put
 * the rows in before the first test and take them out after the last one.
 */
const clubs = [
  { club: 'Testclub Oost', drawn: 1, goalsAgainst: 4, goalsFor: 11, lost: 0, won: 3 },
  { club: 'sc Heerenveen', drawn: 2, goalsAgainst: 5, goalsFor: 8, lost: 1, won: 1 },
  { club: 'Proefstad SV', drawn: 1, goalsAgainst: 7, goalsFor: 6, lost: 2, won: 1 },
]

/**
 * Puts the made-up table in the database and returns the function that takes it out again. It
 * returns a function that does nothing when the database already has a table for the season.
 */
export async function addStandings() {
  const { close, db } = connectToDatabase()
  const season = seasonOf(new Date())

  try {
    const [existing] = await db.select({ rows: count() }).from(standings).where(eq(standings.season, season))

    if ((existing?.rows ?? 0) > 0) {
      return async () => {}
    }

    await db.insert(standings).values(
      clubs.map((row, index) => ({
        ...row,
        goalDifference: row.goalsFor - row.goalsAgainst,
        played: row.won + row.drawn + row.lost,
        points: row.won * 3 + row.drawn,
        position: index + 1,
        season,
        validOn: new Date().toISOString().slice(0, 10),
      })),
    )
  } finally {
    await close()
  }

  return async () => {
    const connection = connectToDatabase()

    try {
      await connection.db.delete(standings).where(eq(standings.season, season))
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
