import { connect } from '@fansite/db/client'
import { withClubs } from '@fansite/db/clubs'
import { readDatabaseEnv } from '@fansite/db/env'
import { matches } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { and, eq, inArray } from 'drizzle-orm'
import path from 'node:path'

/**
 * Three made-up home matches against Testdorp FC in the Eredivisie, two, three and four years
 * before this season, a draw, a loss and a win. With the one of this season and the one of the
 * season before (see earlier-season.ts) Testdorp FC has five played matches, so its page has
 * the row Laatste wedstrijden. Voorbeeld United has four and FC Maquette two, so their pages
 * have no row. Each is at home with no stadium, so the card Stadion stays away.
 */
const meetings = [
  { goalsAgainst: 2, goalsFor: 2, yearsAgo: 2 },
  { goalsAgainst: 1, goalsFor: 0, yearsAgo: 3 },
  { goalsAgainst: 0, goalsFor: 3, yearsAgo: 4 },
] as const

const day = (yearsAgo: number) => {
  const now = new Date()

  return new Date(Date.UTC(now.getUTCFullYear() - yearsAgo, now.getUTCMonth(), now.getUTCDate(), 18, 45))
}

const seasons = meetings.map(({ yearsAgo }) => seasonOf(day(yearsAgo)))

/**
 * Puts the three matches in the database, in the seasons that hold no match yet (a development
 * database that imported one keeps it), and returns the function that takes them out again:
 * only a match that is exactly one of these, so never an imported one.
 */
export async function addOlderMeetings() {
  const { close, db } = connectToDatabase()

  try {
    const held = new Set(
      (await db.select({ season: matches.season }).from(matches).where(inArray(matches.season, seasons))).map(
        ({ season }) => season,
      ),
    )
    const rows = meetings
      .filter(({ yearsAgo }) => !held.has(seasonOf(day(yearsAgo))))
      .map(({ goalsAgainst, goalsFor, yearsAgo }) => ({
        ...madeUp,
        goalsAgainst,
        goalsFor,
        kickoffAt: day(yearsAgo),
        matchDate: day(yearsAgo).toISOString().slice(0, 10),
        season: seasonOf(day(yearsAgo)),
      }))

    if (rows.length > 0) {
      await db.insert(matches).values(await withClubs(db, rows))
    }
  } finally {
    await close()
  }

  return async () => {
    const connection = connectToDatabase()

    try {
      await connection.db
        .delete(matches)
        .where(
          and(
            inArray(matches.season, seasons),
            eq(matches.competition, madeUp.competition),
            eq(matches.opponent, madeUp.opponent),
            eq(matches.round, madeUp.round),
          ),
        )
    } finally {
      await connection.close()
    }
  }
}

const madeUp = {
  competition: 'Eredivisie',
  home: true,
  opponent: 'Testdorp FC',
  round: 'Speelronde 1',
  status: 'played',
} as const

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
