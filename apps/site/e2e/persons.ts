import { connect } from '@fansite/db/client'
import { withClubs } from '@fansite/db/clubs'
import { readDatabaseEnv } from '@fansite/db/env'
import { updatePlayerAddresses } from '@fansite/db/person-slugs'
import {
  matchAppearances,
  matchCards,
  matches,
  matchGoals,
  matchReports,
  persons,
  personSlugs,
  players,
} from '@fansite/db/schema'
import { and, eq, inArray } from 'drizzle-orm'
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
  // A goalkeeper and a forward with figures (see playerFigures): complete, so the lists of the
  // admin that look for a missing line or country do not hold them.
  { country: 'NL', line: 'doelman', name: 'Verzonnen Doelman', page: null, seasons: ['2001/02', '2002/03'] },
  { country: 'NL', line: 'aanvaller', name: 'Verzonnen Aanvaller', page: null, seasons: ['2001/02', '2002/03'] },
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

      await db.delete(matches).where(eq(matches.opponent, figuresOpponent))
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
      // An old address of a player of ours, and an address of a person in no squad, as a
      // player of an opponent who was ours once would have (see playerPages).
      if (person !== undefined && name === 'Proef de Keeper') {
        await db.insert(personSlugs).values({ personId: person.id, slug: playerPages.old.slice('/spelers/'.length) })
      }
      if (person !== undefined && name === 'Test Zonder Selectie') {
        await db
          .insert(personSlugs)
          .values({ personId: person.id, slug: playerPages.opponent.slice('/spelers/'.length) })
      }
    }

    await addFigures(db)
    // The site gives the addresses when it starts, before these persons were there.
    await updatePlayerAddresses(db)
  } finally {
    await close()
  }

  return remove
}

const figuresOpponent = 'Cijfers AZ'

/**
 * Two played matches of 2002/03 with a report and line-ups, in which the goalkeeper and the
 * forward play, so their pages have a table Per seizoen with figures from the line-ups (#1082):
 * the forward scores in both and gives an assist in one, the goalkeeper keeps one clean sheet
 * and gets a card, and 2001/02 has nothing, so it is a row of dashes.
 */
async function addFigures(db: ReturnType<typeof connect>['db']) {
  const named = async (name: string) => {
    const [row] = await db
      .select({ id: players.id, personId: players.personId })
      .from(players)
      .where(and(eq(players.name, name), eq(players.season, '2002/03')))

    if (row === undefined) {
      throw new Error(`There is no made-up player ${name} in 2002/03.`)
    }

    return row
  }
  const keeper = await named('Verzonnen Doelman')
  const forward = await named('Verzonnen Aanvaller')

  for (const [index, goalsAgainst] of [0, 2].entries()) {
    const day = `2002-09-${String(index + 1).padStart(2, '0')}`
    const [{ insertId: matchId }] = await db.insert(matches).values(
      await withClubs(db, [
        {
          competition: 'Eredivisie' as const,
          goalsAgainst,
          goalsFor: 1,
          home: true,
          kickoffAt: new Date(`${day}T12:30:00Z`),
          matchDate: day,
          opponent: figuresOpponent,
          round: `Speelronde ${index + 90}`,
          season: '2002/03',
          status: 'played' as const,
        },
      ]),
    )

    await db.insert(matchReports).values({ matchId, status: 'klaar' })

    const [{ insertId: keeperAppearance }] = await db
      .insert(matchAppearances)
      .values({ matchId, name: 'Verzonnen Doelman', ours: true, playerId: keeper.id, shirtNumber: 1, starter: true })
    const [{ insertId: forwardAppearance }] = await db.insert(matchAppearances).values({
      matchId,
      name: 'Verzonnen Aanvaller',
      ours: true,
      playerId: forward.id,
      shirtNumber: 9,
      starter: true,
    })

    await db.insert(matchGoals).values({
      appearanceId: forwardAppearance,
      assistAppearanceId: index === 0 ? keeperAppearance : null,
      matchId,
      ours: true,
      player: 'Aanvaller',
    })

    if (index === 1) {
      await db.insert(matchCards).values({ appearanceId: keeperAppearance, kind: 'geel', matchId, ours: true })
    }
  }
}

/**
 * The pages of the made-up players (#1079): the page of a player of ours, an old address of
 * his, and the address of a person in no squad of ours, which is "niet gevonden".
 */
export const playerPages = {
  forward: '/spelers/verzonnen-aanvaller',
  goalkeeper: '/spelers/verzonnen-doelman',
  old: '/spelers/proef-keeper',
  opponent: '/spelers/test-zonder-selectie',
  player: '/spelers/proef-de-keeper',
}

/**
 * The numbers of two of the made-up persons, for the page that merges two persons (issue 977):
 * one with a Wikipedia article and one without, who both have a row in 2003/04.
 */
export async function mergePair() {
  const { DATABASE_URL } = databaseEnv()

  if (!loopback.has(new URL(DATABASE_URL).hostname)) {
    throw new Error('The checks of the persons only read a database on this computer.')
  }

  const { close, db } = connect(DATABASE_URL)

  try {
    const idOf = async (name: string) => {
      const [row] = await db.select({ id: persons.id }).from(persons).where(eq(persons.name, name))

      if (row === undefined) {
        throw new Error(`There is no made-up person ${name} in the database. Did the global setup run?`)
      }

      return row.id
    }

    return { other: await idOf('Verzonnen Spits'), person: await idOf('Bedachte Back') }
  } finally {
    await close()
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
