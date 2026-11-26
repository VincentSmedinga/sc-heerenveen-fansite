import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { players, squadCompleteness } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { asc, eq, inArray } from 'drizzle-orm'
import path from 'node:path'

import { earlierSeason } from './earlier-season.ts'

/** The made-up players of the season before who are not in the squad of this season. */
const gone = [
  { name: 'Teun Vertrekker', position: 'verdediger', searchTerm: 'Vertrekker' },
  { name: 'Bram Oudgediende', position: 'aanvaller', searchTerm: 'Oudgediende' },
] as const

/** How many players of this season the made-up squad of the season before leaves out. */
const newThisSeason = 3

/**
 * Gives the season before the current one a made-up squad that is nearly complete, so /spelers
 * shows the card Veranderingen in de selectie with both lists and its warning. It is the squad
 * of this season without a few players, and two who are gone. It adds nothing when that season
 * has players or a level already, or when this season has no players. The function it returns
 * takes out what this run added.
 */
export async function addEarlierSquad() {
  const { close, db } = connectToDatabase()
  const season = earlierSeason()
  let added = false

  try {
    const current = await db
      .select()
      .from(players)
      .where(eq(players.season, seasonOf(new Date())))
      .orderBy(asc(players.id))
    const [player] = await db.select({ id: players.id }).from(players).where(eq(players.season, season)).limit(1)
    const [level] = await db.select().from(squadCompleteness).where(eq(squadCompleteness.season, season))

    if (current.length > newThisSeason && player === undefined && level === undefined) {
      const rows = [
        ...current.slice(newThisSeason).map(({ name, personId, position, searchTerm, shirtNumber }) => ({
          name,
          personId,
          position,
          searchTerm,
          season,
          shirtNumber,
        })),
        ...gone.map((made) => ({ ...made, season })),
      ]

      await db.insert(players).values(rows)
      await db.insert(squadCompleteness).values({
        bestSource: 'selectie',
        calculatedAt: new Date(),
        checks: [],
        level: 'bijna',
        playerCount: rows.length,
        probability: 70,
        season,
      })
      added = true
    }
  } finally {
    await close()
  }

  return async () => {
    const connection = connectToDatabase()

    try {
      const made = await connection.db
        .select({ season: players.season })
        .from(players)
        .where(
          inArray(
            players.name,
            gone.map(({ name }) => name),
          ),
        )

      // The made-up players who are gone mark a squad of ours, also one an earlier run left.
      if (added || made.some((row) => row.season === season)) {
        await connection.db.delete(players).where(eq(players.season, season))
        await connection.db.delete(squadCompleteness).where(eq(squadCompleteness.season, season))
      }
    } finally {
      await connection.close()
    }
  }
}

/** Connects with the DATABASE_URL of the environment or the .env in the root. */
function connectToDatabase() {
  try {
    process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'))
  } catch {
    // No .env: CI sets DATABASE_URL itself.
  }

  return connect(readDatabaseEnv().DATABASE_URL)
}
