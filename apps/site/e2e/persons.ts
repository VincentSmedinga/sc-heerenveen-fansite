import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { updatePlayerAddresses } from '@fansite/db/person-slugs'
import { matches, matchGoals, persons, personSlugs, players, playerSeasonStats } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { and, asc, eq, inArray } from 'drizzle-orm'
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

      await db.delete(matchGoals).where(eq(matchGoals.player, forwardGoalName))
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
    await addGoals(db)
    // The site gives the addresses when it starts, before these persons were there.
    await updatePlayerAddresses(db)
  } finally {
    await close()
  }

  return remove
}

/**
 * The table of Wikipedia for 2002/03 for the goalkeeper and the forward, so their pages have a
 * table Per seizoen with figures (#1082). It adds no match, and so no season to the pickers of
 * the site; 2001/02 has nothing, so it is a row of dashes. The lines of the match reports are
 * tested with a database in `player-seasons-database.test.ts`.
 */
async function addFigures(db: ReturnType<typeof connect>['db']) {
  const stats = [
    { appearances: 30, assists: 0, goals: 0, name: 'Verzonnen Doelman' },
    { appearances: 28, assists: 5, goals: 11, name: 'Verzonnen Aanvaller' },
  ]

  for (const { name, ...figures } of stats) {
    const [row] = await db
      .select({ id: players.id })
      .from(players)
      .where(and(eq(players.name, name), eq(players.season, '2002/03')))

    if (row === undefined) {
      throw new Error(`There is no made-up player ${name} in 2002/03.`)
    }

    await db
      .insert(playerSeasonStats)
      .values({ ...figures, competition: 'Eredivisie', playerId: row.id, season: '2002/03' })
  }
}

/** The name the made-up goals of the forward carry, so they can be taken out again. */
const forwardGoalName = 'Verzonnen Aanvaller (doelpunt)'

/**
 * Goals of the forward in the matches of the season before the current one (the made-up season
 * of `earlier-season.ts`, which is in before the persons), so the side column of his page
 * (#1086) has its cards to check: two goals against one club and one against another, and one
 * goal against us. Nothing is added when that season has no matches, as in a development
 * database without the made-up season.
 */
async function addGoals(db: ReturnType<typeof connect>['db']) {
  const now = new Date()
  // The season of `earlierSeason()` in earlier-season.ts, which this file does not import.
  const season = seasonOf(new Date(Date.UTC(now.getUTCFullYear() - 1, now.getUTCMonth(), now.getUTCDate())))
  const played = await db
    .select({ clubId: matches.clubId, competition: matches.competition, id: matches.id })
    .from(matches)
    .where(and(eq(matches.season, season), eq(matches.status, 'played')))
    .orderBy(asc(matches.clubId), asc(matches.id))
  const [person] = await db.select({ id: persons.id }).from(persons).where(eq(persons.name, 'Verzonnen Aanvaller'))
  // The first club with two played matches, and two other matches against other clubs.
  const twice = played.find((match) => played.filter((other) => other.clubId === match.clubId).length >= 2)
  const [first, second] = played.filter((match) => match.clubId === twice?.clubId)
  const rest = played.filter((match) => match.clubId !== twice?.clubId)
  const [other, last] = [rest.find((match) => match.clubId !== rest.at(-1)?.clubId), rest.at(-1)]

  if (
    person === undefined ||
    first === undefined ||
    second === undefined ||
    other === undefined ||
    last === undefined
  ) {
    return
  }

  await db.insert(players).values({ name: 'Verzonnen Aanvaller', personId: person.id, searchTerm: 'aanvaller', season })

  const goal = (matchId: number, minute: number, ours: boolean) => ({
    matchId,
    minute,
    ours,
    personId: person.id,
    player: forwardGoalName,
  })

  await db
    .insert(matchGoals)
    .values([goal(first.id, 12, true), goal(second.id, 34, true), goal(other.id, 77, true), goal(last.id, 5, false)])
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
