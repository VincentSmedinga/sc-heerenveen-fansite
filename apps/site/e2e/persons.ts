import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { persons, players } from '@fansite/db/schema'
import { inArray } from 'drizzle-orm'
import path from 'node:path'

/**
 * Made-up persons who miss a line, a country or both, so the work list of the admin
 * (`/beheer/kwaliteit/personen`, issue 1053) is checked with rows in both of its lists: a
 * person with one season, one with several, one with a Wikipedia article and one who is in no
 * squad. The seasons are old ones, where no other check looks. It only writes to a database on
 * this computer. The file imports nothing from this folder, because
 * `pnpm --filter site test-data` runs it with Node.
 */
const people = [
  { country: null, line: null, name: 'Verzonnen Spits', page: 'Verzonnen Spits', seasons: ['2003/04'] },
  { country: null, line: null, name: 'Bedachte Back', page: null, seasons: ['2001/02', '2002/03', '2003/04'] },
  { country: 'NL', line: null, name: 'Proef de Keeper', page: null, seasons: ['2002/03'] },
  { country: null, line: 'middenvelder', name: 'Nep van der Middenveld', page: null, seasons: ['2001/02', '2002/03'] },
  { country: null, line: null, name: 'Test Zonder Selectie', page: null, seasons: [] },
] as const

/** Puts the persons and their players in and returns the function that takes them out. */
export async function addPersons() {
  const { DATABASE_URL } = databaseEnv()

  if (!loopback.has(new URL(DATABASE_URL).hostname)) {
    throw new Error('The checks of the persons only write to a database on this computer.')
  }

  const remove = async () => {
    const { close, db } = connect(DATABASE_URL)

    try {
      const names = people.map(({ name }) => name)

      await db.delete(players).where(inArray(players.name, names))
      await db.delete(persons).where(inArray(persons.name, names))
    } finally {
      await close()
    }
  }

  // The rows of a run that was stopped halfway go first, so a second run never doubles them.
  await remove()

  const { close, db } = connect(DATABASE_URL)

  try {
    for (const { country, line, name, page, seasons } of people) {
      const [person] = await db
        .insert(persons)
        .values({
          country,
          countrySource: country === null ? null : 'manual',
          line,
          lineSource: line === null ? null : 'manual',
          name,
          wikipediaPage: page,
        })
        .$returningId()

      if (person !== undefined && seasons.length > 0) {
        await db.insert(players).values(
          seasons.map((season) => ({
            name,
            personId: person.id,
            searchTerm: (name.split(' ').at(-1) ?? name).toLowerCase(),
            season,
          })),
        )
      }
    }
  } finally {
    await close()
  }

  return remove
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
