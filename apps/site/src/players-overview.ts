import { persons, players } from '@fansite/db/schema'
import { foldLetters } from '@fansite/db/slug-letters'
import { countryName } from '@fansite/design-system'
import { eq, isNotNull } from 'drizzle-orm'

import { cacheFor } from './cache'
import { getDatabase } from './database'
import { personNameParts, personSortName, splitPersonName, textSortName } from './player-name'
import { periodsOf } from './player-page'

/** The address of the overview of all players, by name, and by country. */
export const overviewPath = '/spelers/overzicht'
export const overviewCountryPath = '/spelers/overzicht/land'

/** One player of the overview: his name in two parts and what puts him in order. */
export type OverviewPlayer = {
  /** The country as a code of two letters, or undefined when we do not know it. */
  country: string | undefined
  /** The given name, for putting players with one family name in order. */
  givenName: string
  /** The id of the person. */
  id: number
  /** His line as a word, such as `Verdediger`. */
  line: string | undefined
  /** The given name with the prefix behind it, which follows the surname. */
  rest: string
  /** His seasons with us, such as `2013/14`. */
  seasons: string[]
  /** The address of his page, or undefined for a player who has none. */
  slug: string | undefined
  /** The family name without the prefix, which the list is put in order by. */
  sortName: string
  /** The family name, which the row shows in the stronger weight. */
  surname: string
}

/** What the overview reads: the players and the first year of the oldest season. */
export type PlayersOverview = {
  players: OverviewPlayer[]
  /** The first year of the oldest season of any player, such as `1990`. */
  since: string
}

type Row = {
  country: null | string
  familyName: null | string
  familyNamePrefix: null | string
  givenName: null | string
  id: number
  line: null | string
  name: null | string
  rowName: string
  season: string
  slug: null | string
}

/** The line as a word with a capital, such as `Aanvaller`. */
const lineWord = (line: null | string) =>
  line === null ? undefined : `${line.charAt(0).toUpperCase()}${line.slice(1)}`

/**
 * The players of the overview from the rows of `players` joined to their person: one player for
 * each person, with the seasons of all his rows. The name is that of the importer (`persons`),
 * or without one the name as text of his newest row.
 */
export function overviewOf(rows: readonly Row[]): PlayersOverview {
  const byPerson = new Map<number, Row[]>()

  for (const row of rows) {
    byPerson.set(row.id, [...(byPerson.get(row.id) ?? []), row])
  }

  const result: OverviewPlayer[] = []

  for (const [id, own] of byPerson) {
    const [first] = own

    if (first === undefined) {
      continue
    }

    const newest = [...own].sort((a, b) => b.season.localeCompare(a.season))[0] ?? first
    const name = {
      personFamilyName: first.familyName,
      personFamilyNamePrefix: first.familyNamePrefix,
      personGivenName: first.givenName,
    }
    const parts = personNameParts(name)
    let surname: string
    let rest: string
    let sortName: string
    let givenName: string

    if (parts !== undefined) {
      const family = (first.familyName ?? '').trim()

      // A person without a family name is shown and put in order by his given name.
      surname = family === '' ? (parts.givenName ?? '') : family
      givenName = family === '' ? '' : (first.givenName ?? '').trim()
      rest =
        family === '' ? '' : [givenName, (first.familyNamePrefix ?? '').trim()].filter((part) => part !== '').join(' ')
      sortName = personSortName(name)
    } else {
      const text = (first.name ?? '').trim() || newest.rowName
      const split = splitPersonName(text)

      sortName = textSortName(text)
      surname = sortName
      givenName = split.givenName ?? ''
      const prefix = split.surname.slice(0, split.surname.length - sortName.length).trim()

      rest = [givenName, prefix].filter((part) => part !== '').join(' ')
    }

    result.push({
      country: first.country ?? undefined,
      givenName,
      id,
      line: lineWord(first.line),
      rest,
      seasons: [...new Set(own.map((row) => row.season))].sort(),
      slug: first.slug ?? undefined,
      sortName,
      surname,
    })
  }

  const firstSeason = result.flatMap((player) => player.seasons).sort()[0]

  return { players: result, since: firstSeason === undefined ? '' : firstSeason.slice(0, 4) }
}

const collator = new Intl.Collator('nl')

/** One section of the view by country. */
export type CountryGroup = {
  /** The code of two letters, or undefined for a player without a country. */
  country: string | undefined
  /** The name of the country, or `Land onbekend`. */
  name: string
  players: OverviewPlayer[]
}

/** The players under their first letter, from A to Z, a letter without players left out. */
export function byLetter(list: readonly OverviewPlayer[]): { letter: string; players: OverviewPlayer[] }[] {
  const groups = new Map<string, OverviewPlayer[]>()

  for (const player of sortPlayers(list)) {
    const letter = letterOf(player)

    groups.set(letter, [...(groups.get(letter) ?? []), player])
  }

  return [...groups]
    .sort(([a], [b]) => (a === '#' ? 1 : b === '#' ? -1 : a.localeCompare(b)))
    .map(([letter, group]) => ({ letter, players: group }))
}

/** The letter a player stands under: that of his folded family name (`Đuričić` is D). */
export function letterOf(player: Pick<OverviewPlayer, 'sortName'>): string {
  const letter = [...foldLetters(player.sortName)].find((candidate) => /[a-z]/u.test(candidate))

  return letter === undefined ? '#' : letter.toUpperCase()
}

/** The players in the order of the list: family name without prefix, then given name. */
export function sortPlayers(list: readonly OverviewPlayer[]): OverviewPlayer[] {
  return [...list].sort(
    (a, b) =>
      collator.compare(foldLetters(a.sortName), foldLetters(b.sortName)) ||
      collator.compare(foldLetters(a.givenName), foldLetters(b.givenName)) ||
      a.id - b.id,
  )
}

/** The name of a country, or the code when the design system does not know it. */
export const nameOfCountry = (code: string) => countryName(code) ?? code

/**
 * The players under their country, the largest first and, for as many players, by the name of
 * the country. Players without a country come last, in the section `Land onbekend`.
 */
export function byCountry(list: readonly OverviewPlayer[]): CountryGroup[] {
  const groups = new Map<string | undefined, OverviewPlayer[]>()

  for (const player of sortPlayers(list)) {
    groups.set(player.country, [...(groups.get(player.country) ?? []), player])
  }

  const known = [...groups]
    .flatMap(([country, group]) =>
      country === undefined ? [] : [{ country, name: nameOfCountry(country), players: group }],
    )
    .sort((a, b) => b.players.length - a.players.length || collator.compare(a.name, b.name))
  const unknown = groups.get(undefined)

  return unknown === undefined ? known : [...known, { country: undefined, name: 'Land onbekend', players: unknown }]
}

/**
 * The anchor of a section of a country: `land-nederland`. The id follows the name of the
 * country, folded to small letters, digits and hyphens.
 */
export function countryAnchor(group: Pick<CountryGroup, 'name'>): string {
  return `land-${foldLetters(group.name)
    .replace(/[^a-z0-9]+/gu, '-')
    .replace(/^-+|-+$/gu, '')}`
}

/** The five countries of the card `Ze komen uit het noorden`, in the order of its sentence. */
export const northernCountries = ['DK', 'SE', 'NO', 'IS', 'FI'] as const

/**
 * The years of a player in a line: `2013–2017, 2021–2023`. A period of one season is the season
 * (`2024/25`), and a period that holds the current season ends in `sinds 2024`. The end of a
 * period is the year in which its last season ends.
 */
export function yearsOf(seasons: readonly string[], current: string): string {
  return periodsOf(seasons)
    .map(({ first, last }) => {
      if (last === current) {
        return `sinds ${first.slice(0, 4)}`
      }

      return first === last ? first : `${first.slice(0, 4)}–${Number(last.slice(0, 4)) + 1}`
    })
    .join(', ')
}

/** What a row says under the name: the line and the years, left out when unknown. */
export const factsOf = (player: Pick<OverviewPlayer, 'line' | 'seasons'>, current: string): string =>
  [player.line, yearsOf(player.seasons, current)].filter((part) => part !== undefined && part !== '').join(' · ')

/** The rows of every person with a row in `players`, read at most once in five minutes. */
export const getPlayersOverview = cacheFor(5 * 60 * 1000, async (): Promise<PlayersOverview> => {
  const { db } = getDatabase()
  const rows = await db
    .select({
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
    })
    .from(players)
    .innerJoin(persons, eq(persons.id, players.personId))
    .where(isNotNull(players.personId))

  return overviewOf(rows)
})
