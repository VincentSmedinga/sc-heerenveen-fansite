import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { clubHomeGrounds, clubs, stadiumNames, stadiums } from '@fansite/db/schema'
import { eq, inArray } from 'drizzle-orm'
import path from 'node:path'

/**
 * Made-up home grounds for SV Proefdorp: its sportpark, a ground it played on for a while, with
 * a note, and the sportpark again from a season. The page of the club and the screen of the
 * admin are checked with them (see `/tegenstanders/sv-proefdorp` and
 * `/beheer/stadions/sv-proefdorp` in pages.spec.ts). SV Proefdorp has a cup tie to come and no
 * match played, so its page has the card Stadion only because of these grounds, also with the
 * choice Eredivisie. The rows go straight into the tables, because they are not an action of
 * the admin and no row of the log should outlast the accounts of the checks. It only writes to
 * a database on this computer. The file imports nothing from this folder, because
 * `pnpm --filter site test-data` runs it with Node.
 */
const slug = 'sv-proefdorp'

/** Gives the club its home grounds and returns the function that takes them away again. */
export async function addStadiums() {
  const { DATABASE_URL } = databaseEnv()

  if (!loopback.has(new URL(DATABASE_URL).hostname)) {
    throw new Error('The checks of the stadiums only write to a database on this computer.')
  }

  const { close, db } = connect(DATABASE_URL)
  let clubId: number
  let stadiumIds: number[]

  try {
    const [found] = await db.select({ id: clubs.id }).from(clubs).where(eq(clubs.slug, slug))

    if (found === undefined) {
      throw new Error(`There is no club ${slug} in the database. Did the seed of the made-up matches run?`)
    }

    clubId = found.id
    await db.delete(clubHomeGrounds).where(eq(clubHomeGrounds.clubId, clubId))

    const [{ insertId: sportpark }] = await db.insert(stadiums).values({})
    const [{ insertId: temporary }] = await db.insert(stadiums).values({})

    stadiumIds = [sportpark, temporary]
    await db.insert(stadiumNames).values([
      { name: 'Sportpark Proefdorp', position: 0, stadiumId: sportpark },
      { name: 'Stadion Tijdelijk', position: 0, stadiumId: temporary },
    ])
    await db.insert(clubHomeGrounds).values([
      { clubId, position: 0, stadiumId: sportpark },
      {
        clubId,
        note: 'Proefdorp speelde tijdelijk elders, tijdens de verbouwing van het sportpark.',
        position: 1,
        stadiumId: temporary,
        startDay: '2019-08-10',
      },
      { clubId, position: 2, stadiumId: sportpark, startSeason: '2020/21' },
    ])
  } finally {
    await close()
  }

  return async () => {
    const connection = connect(DATABASE_URL)

    try {
      await connection.db.delete(clubHomeGrounds).where(eq(clubHomeGrounds.clubId, clubId))
      await connection.db.delete(stadiums).where(inArray(stadiums.id, stadiumIds))
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
