import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { clubs, clubStadiums } from '@fansite/db/schema'
import { eq } from 'drizzle-orm'
import path from 'node:path'

/**
 * A made-up list of stadiums of its own for SV Proefdorp, with a name that starts on a day and
 * a note, so the page of the club and the screen of the admin are checked with one (see
 * `/statistieken/tegenstanders/sv-proefdorp` and `/beheer/stadions/sv-proefdorp` in
 * pages.spec.ts). SV Proefdorp has a cup tie to come and no match played, so its page has the
 * card Stadion only because of this list, also with the choice Eredivisie. The rows go straight
 * into the table, because they are not an action of the admin and no row of the log should
 * outlast the accounts of the checks. It only writes to a database on this computer. The file
 * imports nothing from this folder, because `pnpm --filter site test-data` runs it with Node.
 */
const slug = 'sv-proefdorp'

const lines = [
  { name: 'Sportpark Proefdorp', note: null, startDay: null, startSeason: null },
  {
    name: 'Stadion Tijdelijk',
    note: 'Proefdorp speelde tijdelijk elders, tijdens de verbouwing van het sportpark.',
    startDay: '2019-08-10',
    startSeason: null,
  },
  { name: 'Sportpark Proefdorp', note: null, startDay: null, startSeason: '2020/21' },
] as const

/** Gives the club its list and returns the function that takes it away again. */
export async function addStadiums() {
  const { DATABASE_URL } = databaseEnv()

  if (!loopback.has(new URL(DATABASE_URL).hostname)) {
    throw new Error('The checks of the stadiums only write to a database on this computer.')
  }

  const { close, db } = connect(DATABASE_URL)
  let clubId: number

  try {
    const [found] = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.slug, slug))

    if (found === undefined) {
      throw new Error(`There is no club ${slug} in the database. Did the seed of the made-up matches run?`)
    }

    clubId = found.id
    await db.delete(clubStadiums).where(eq(clubStadiums.clubId, clubId))
    await db.insert(clubStadiums).values(lines.map((line, position) => ({ ...line, clubId, position })))
  } finally {
    await close()
  }

  return async () => {
    const connection = connect(DATABASE_URL)

    try {
      await connection.db.delete(clubStadiums).where(eq(clubStadiums.clubId, clubId))
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
