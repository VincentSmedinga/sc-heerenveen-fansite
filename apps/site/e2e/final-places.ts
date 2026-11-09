import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { standings } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { eq } from 'drizzle-orm'
import path from 'node:path'

/**
 * Our row in the league table of two and three years ago, the older one with two points taken
 * off, and the row of Testdorp FC below it, so the card "De plek van <club> en de onze" on
 * the page of that club has three seasons. With the made-up table of this season (see
 * standings.ts) and of the season before it (see earlier-season.ts) the card "Onze plek door
 * de jaren" of /cijfers has four seasons, so the checks of axe and the page look at a real
 * line. A season that already has a table (a development database that imported one) keeps
 * it. The checks put the rows in before the first test and take them out after the last one.
 */
const seasonsAgo = [
  { pointsDeducted: 0, position: 3, theirs: 12, yearsAgo: 2 },
  { pointsDeducted: 2, position: 5, theirs: 9, yearsAgo: 3 },
] as const

const dayOf = (yearsAgo: number) => {
  const now = new Date()

  return new Date(Date.UTC(now.getUTCFullYear() - yearsAgo, now.getUTCMonth(), now.getUTCDate()))
}

/** Puts the two rows in and returns the function that takes them out again. */
export async function addFinalPlaces() {
  const { close, db } = connectToDatabase()
  const added: string[] = []

  try {
    for (const { pointsDeducted, position, theirs, yearsAgo } of seasonsAgo) {
      const day = dayOf(yearsAgo)
      const season = seasonOf(day)
      const [existing] = await db
        .select({ club: standings.club })
        .from(standings)
        .where(eq(standings.season, season))
        .limit(1)

      if (existing !== undefined) {
        continue
      }

      const row = {
        drawn: 6,
        goalDifference: 20,
        goalsAgainst: 40,
        goalsFor: 60,
        lost: 10,
        played: 34,
        season,
        validOn: day.toISOString().slice(0, 10),
        won: 18,
      }

      await db.insert(standings).values([
        { ...row, club: 'sc Heerenveen', points: 60 - pointsDeducted, pointsDeducted, position },
        { ...row, club: 'Testdorp FC', points: 60, pointsDeducted: 0, position: theirs },
      ])
      added.push(season)
    }
  } finally {
    await close()
  }

  return async () => {
    const connection = connectToDatabase()

    try {
      for (const season of added) {
        await connection.db.delete(standings).where(eq(standings.season, season))
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
