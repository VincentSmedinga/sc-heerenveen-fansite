import type { Database } from '@fansite/db/client'

import { persons, players } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { eq, isNotNull } from 'drizzle-orm'

import type { PersonPart } from './person-fields'

import { letterOf, overviewOf, sortPlayers, yearsOf } from '../players-overview'
import { qualityPath } from './quality'

// The work table of the persons on the page Kwaliteit (issue 1165): for each person who stood
// in our squad in at least one season, what he still misses, in one column for each fact. A
// cell holds `?` for a fact that is missing; a complete fact has no sign. The persons stand
// under the first letter of their family name without its prefix, as on the list of all
// players (`letterOf`), so van den Berg is under B.

/** The columns, in order, with the letter of the header on a phone. */
export const personGapColumns = [
  { key: 'naam', letter: 'N', name: 'Naam' },
  { key: 'wikipedia', letter: 'P', name: 'Wikipedia' },
  { key: 'geboren', letter: 'B', name: 'Geboren' },
  { key: 'land', letter: 'L', name: 'Land' },
  { key: 'linie', letter: 'I', name: 'Linie' },
] as const

export type PersonGapColumn = (typeof personGapColumns)[number]['key']

/** The part of the form of a person that each column leads to (issue 1164). */
export const personColumnParts = {
  geboren: 'leven',
  land: 'land',
  linie: 'linie',
  naam: 'naam',
  wikipedia: 'naam',
} as const satisfies Record<PersonGapColumn, PersonPart>

/** A person with what he misses, by column. A column without a gap is not in `gaps`. */
export type PersonGaps = {
  gaps: Partial<Record<PersonGapColumn, true>>
  id: number
  letter: string
  /** The name as the row shows it: "Berg, Pieter van den". */
  name: string
  /** His years in our squad: `2004–2007`. */
  years: string
}

/** The address of the overview of the persons. */
export const personQualityPath = `${qualityPath}/personen`

/** The address of the page with the names that look alike and the list of Wikipedia. */
export const namesQualityPath = `${qualityPath}/namen`

/** For each letter, how many persons it has and how many of them have a gap in each column. */
export function countPersonGapsByLetter(rows: readonly PersonGaps[]) {
  const letters = new Map<string, { columns: Record<PersonGapColumn, number>; persons: number }>()

  for (const row of rows) {
    const letter = letters.get(row.letter) ?? {
      columns: Object.fromEntries(personGapColumns.map(({ key }) => [key, 0])) as Record<PersonGapColumn, number>,
      persons: 0,
    }

    letter.persons += 1

    for (const { key } of personGapColumns) {
      if (row.gaps[key] === true) {
        letter.columns[key] += 1
      }
    }

    letters.set(row.letter, letter)
  }

  return letters
}

/** Whether a word from the address is a column of the table of persons. */
export function isPersonGapColumn(value: unknown): value is PersonGapColumn {
  return personGapColumns.some((column) => column.key === value)
}

/** The letter of an address: `b` is B, and `overig` is the persons without a letter (`#`). */
export function letterFromSlug(slug: string): string | undefined {
  return slug === 'overig' ? '#' : /^[a-z]$/u.test(slug) ? slug.toUpperCase() : undefined
}

/**
 * The address of a letter of the table, with one column chosen and what the last action left
 * to say: `/beheer/kwaliteit/personen/b?kolom=land`.
 */
export function letterTablePath(letter: string, column?: PersonGapColumn, done?: string) {
  const query = new URLSearchParams()

  if (column !== undefined) {
    query.set('kolom', column)
  }
  if (done !== undefined) {
    query.set('gedaan', done)
  }

  const path = `${personQualityPath}/${letter === '#' ? 'overig' : letter.toLowerCase()}`

  return query.size === 0 ? path : `${path}?${query}`
}

/**
 * Every person with a row in `players`, with what he misses, in the order of the list of all
 * players: by letter, then by family name without its prefix and given name. A person who
 * misses nothing is in the list too, with no gaps, so the caller can count the persons of a
 * letter.
 */
export async function readPersonGaps(db: Pick<Database, 'select'>, now = new Date()): Promise<PersonGaps[]> {
  const rows = await db
    .select({
      birthDate: persons.birthDate,
      country: persons.country,
      familyName: persons.familyName,
      familyNamePrefix: persons.familyNamePrefix,
      givenName: persons.givenName,
      id: persons.id,
      line: persons.line,
      name: persons.name,
      rowName: players.name,
      season: players.season,
      slug: persons.slug,
      wikipediaPage: persons.wikipediaPage,
    })
    .from(players)
    .innerJoin(persons, eq(persons.id, players.personId))
    .where(isNotNull(players.personId))
  const factsOf = new Map(rows.map((row) => [row.id, row]))
  const current = seasonOf(now)

  return sortPlayers(overviewOf(rows).players)
    .map((player) => {
      const facts = factsOf.get(player.id)
      const gaps: Partial<Record<PersonGapColumn, true>> = {}

      if ((facts?.givenName ?? '').trim() === '') {
        gaps.naam = true
      }
      if (facts?.wikipediaPage === null) {
        gaps.wikipedia = true
      }
      if (facts?.birthDate === null) {
        gaps.geboren = true
      }
      if (facts?.country === null) {
        gaps.land = true
      }
      if (facts?.line === null) {
        gaps.linie = true
      }

      return {
        gaps,
        id: player.id,
        letter: letterOf(player),
        name: player.rest === '' ? player.surname : `${player.surname}, ${player.rest}`,
        years: yearsOf(player.seasons, current),
      }
    })
    .sort((a, b) =>
      a.letter === b.letter ? 0 : a.letter === '#' ? 1 : b.letter === '#' ? -1 : a.letter < b.letter ? -1 : 1,
    )
}
