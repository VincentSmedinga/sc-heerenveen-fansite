import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { clubNamePeriods, clubs } from '@fansite/db/schema'
import { eq } from 'drizzle-orm'
import path from 'node:path'

/**
 * A made-up list of names of its own for SV Proefdorp, with an older name and a note, so the
 * page of the club and the screen of the admin are checked with one (see
 * `/tegenstanders/sv-proefdorp` and `/beheer/clubnamen/sv-proefdorp` in
 * pages.spec.ts). The rows go straight into the table, because they are not an action of the
 * admin and no row of the log should outlast the accounts of the checks, and they leave
 * `club_names` alone. It only writes to a database on this computer. The file imports nothing
 * from this folder, because `pnpm --filter site test-data` runs it with Node.
 */
const slug = 'sv-proefdorp'

const lines = [
  { name: 'Proefdorp Boys', note: null, startDay: null, startSeason: null },
  {
    name: 'SV Proefdorp',
    note: 'De club koos een nieuwe naam, en de bond keurde hem goed op 5 juni 2012.',
    startDay: null,
    startSeason: '2012/13',
  },
] as const

/** Gives the club its list and returns the function that takes it away again. */
export async function addClubNames() {
  const { DATABASE_URL } = databaseEnv()

  if (!loopback.has(new URL(DATABASE_URL).hostname)) {
    throw new Error('The checks of the club names only write to a database on this computer.')
  }

  const { close, db } = connect(DATABASE_URL)
  let clubId: number

  try {
    const [found] = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.slug, slug))

    if (found === undefined) {
      throw new Error(`There is no club ${slug} in the database. Did the seed of the made-up matches run?`)
    }

    clubId = found.id
    await db.delete(clubNamePeriods).where(eq(clubNamePeriods.clubId, clubId))
    await db.insert(clubNamePeriods).values(lines.map((line, position) => ({ ...line, clubId, position })))
  } finally {
    await close()
  }

  return async () => {
    const connection = connect(DATABASE_URL)

    try {
      await connection.db.delete(clubNamePeriods).where(eq(clubNamePeriods.clubId, clubId))
    } finally {
      await connection.close()
    }
  }
}

const loopback = new Set(['127.0.0.1', '::1', '[::1]', 'localhost'])

/**
 * The DATABASE_URL of the environment or the .env in the root, like the server of the check
 * uses.
 */
function databaseEnv() {
  try {
    process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'))
  } catch {
    // No .env: CI sets DATABASE_URL itself.
  }

  return readDatabaseEnv()
}
