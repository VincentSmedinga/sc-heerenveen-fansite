import type { Database } from '@fansite/db/client'
import type { PlayerPosition } from '@fansite/db/schema'

import { setEditorsPersonFacts } from '@fansite/db/persons'
import { persons, players } from '@fansite/db/schema'
import { asc, count, desc, eq, isNotNull, isNull, max, min, sql } from 'drizzle-orm'

import { recordAction } from './audit-log'
import { qualityPath } from './quality'

// The work list of the admin that fills in the line and the country of persons (issue 1053):
// the persons without one of the two, and the choice of an editor for one person. A choice and
// its row in the log of the admin are one transaction.

/** What a person can miss, as the address names the list: `?lijst=land`. */
export type PersonFact = (typeof personFacts)[number]

/** A person of the work list. */
export type PersonWithoutFact = Awaited<ReturnType<typeof listPersonsWithout>>[number]

export const personFacts = ['linie', 'land'] as const

/** How many persons one part of the list shows. */
export const personListLength = 50

export const personFactsPath = `${qualityPath}/personen`

/** The name of a person in the list: the name, the title of the article or a player's name. */
const listedName = sql<string>`COALESCE(${persons.name}, ${persons.wikipediaPage}, MAX(${players.name}), CONCAT('Persoon ', ${persons.id}))`

/** The name of a person as the log shows it: the name, or else the title of the article. */
const shownName = sql<string>`COALESCE(${persons.name}, ${persons.wikipediaPage}, CONCAT('Persoon ', ${persons.id}))`

/** The column of each list. */
const columns = { land: persons.country, linie: persons.line } as const

/**
 * What a choice did: `done` gave the person the value; `filled` found a value already, of an
 * import or of another editor, and left it; `missing` found no such person.
 */
export type PersonFactOutcome =
  { name: string; status: 'done' } | { name: string; status: 'filled' } | { status: 'missing' }

/**
 * Gives a person without a line a line, or a person without a country a country, with the
 * source `manual` (`setEditorsPersonFacts`), which no import replaces, and writes `person.edit`
 * in the log. A person who has the fact already keeps it and nothing is written: the list only
 * fills in what is empty, so the second of two choices for one row changes nothing.
 */
export async function choosePersonFact(
  db: Database,
  userId: number,
  personId: number,
  choice: { country: string } | { line: PlayerPosition },
  now = new Date(),
): Promise<PersonFactOutcome> {
  return db.transaction(async (transaction) => {
    const [person] = await transaction
      .select({ country: persons.country, line: persons.line, name: shownName })
      .from(persons)
      .where(eq(persons.id, personId))
      .for('update')

    if (person === undefined) {
      return { status: 'missing' }
    }
    if (('line' in choice ? person.line : person.country) !== null) {
      return { name: person.name, status: 'filled' }
    }

    await setEditorsPersonFacts(transaction, personId, choice)
    await recordAction(
      transaction,
      {
        action: 'person.edit',
        detail: `${person.name}, ${'line' in choice ? `linie: geen → ${choice.line}` : `land: geen → ${choice.country}`}`,
        itemId: personId,
        userId,
      },
      now,
    )

    return { name: person.name, status: 'done' }
  })
}

/** How many persons have no line, and how many have no country. */
export async function countPersonsWithout(db: Pick<Database, 'select'>): Promise<Record<PersonFact, number>> {
  const [row] = await db
    .select({
      land: sql<number>`CAST(SUM(${persons.country} IS NULL) AS UNSIGNED)`,
      linie: sql<number>`CAST(SUM(${persons.line} IS NULL) AS UNSIGNED)`,
    })
    .from(persons)

  return { land: Number(row?.land ?? 0), linie: Number(row?.linie ?? 0) }
}

/**
 * The persons without a line (`linie`) or without a country (`land`): the name, the first and
 * the last season in which the person is a player, and the Wikipedia article. The persons of
 * the newest seasons come first, then by name; a person who is in no squad comes last.
 */
export async function listPersonsWithout(
  db: Pick<Database, 'select'>,
  fact: PersonFact,
  { limit = personListLength, offset = 0 }: { limit?: number; offset?: number } = {},
) {
  return db
    .select({
      englishTitle: persons.englishTitle,
      firstSeason: min(players.season),
      id: persons.id,
      lastSeason: max(players.season),
      name: listedName,
      wikipediaPage: persons.wikipediaPage,
    })
    .from(persons)
    .leftJoin(players, eq(players.personId, persons.id))
    .where(isNull(columns[fact]))
    .groupBy(persons.id)
    .orderBy(desc(max(players.season)), asc(listedName), asc(persons.id))
    .limit(limit)
    .offset(offset)
}

/** The codes of the countries our persons have, the most used first. */
export async function ourCountries(db: Pick<Database, 'select'>): Promise<string[]> {
  const rows = await db
    .select({ country: persons.country })
    .from(persons)
    .where(isNotNull(persons.country))
    .groupBy(persons.country)
    .orderBy(desc(count()), asc(persons.country))

  return rows.flatMap(({ country }) => (country === null ? [] : [country]))
}
