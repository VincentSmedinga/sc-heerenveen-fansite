import type { Person, PlayerPosition } from '@fansite/db/schema'

import { findPlayerBySlug, playerSlugs } from '@fansite/db/person-slugs'
import { players, wikidataItems } from '@fansite/db/schema'
import { asc, desc, eq } from 'drizzle-orm'
import { cache } from 'react'

import { getDatabase } from './database'
import { reasonOf } from './errors'
import { type NameParts, personNameParts, splitPersonName } from './player-name'

/**
 * What the page of a player (`/spelers/<naam>`, #1079) shows. The later blocks of the page
 * (#1082 to #1086) add their own data next to this; the head and the credit read only this.
 */
export type PlayerPage = {
  /**
   * His age in whole years, worked out from the full date of birth, which never leaves this
   * module. `undefined` when we do not have the full date (only the year or the month).
   */
  age: number | undefined
  /** The place of birth, as Wikidata names it. */
  birthPlace: string | undefined
  /** The year of birth. The full date is a personal datum and never leaves this module. */
  birthYear: string | undefined
  /** The country as a code of two letters (`NL`). */
  country: string | undefined
  /** Whether the editors set his name, line or country themselves. */
  edited: boolean
  /** The line, as `playerPositions` names it. */
  line: PlayerPosition | undefined
  /** The whole name, for the title and the description. */
  name: string
  /** The name in the two parts `PlayerName` shows. */
  nameParts: NameParts
  /** The id of the person, for the blocks that read more about him. */
  personId: number
  /** When the importer last read his article and Wikidata, or undefined when it has not. */
  readAt: Date | undefined
  /** His seasons with us, the oldest first, such as `2004/05`. */
  seasons: string[]
  /** His slug of now: the page is `/spelers/<slug>`. */
  slug: string
  /** His article on Wikipedia, or undefined for a player of the editors without one. */
  wikipedia: undefined | { language: 'en' | 'nl'; title: string }
}

/** What `loadPlayerPage` found for an address. */
export type PlayerPageLoad =
  | { kind: 'error'; reason: string }
  | { kind: 'found'; page: PlayerPage }
  | { kind: 'moved'; slug: string }
  | { kind: 'unknown' }

/** The last season of the archive of the old fansite: older data comes from there. */
export const lastArchiveSeason = '2006/07'

/**
 * The page of a player at the slug of an address: `moved` for an old slug, which leads to the
 * slug of now, and `unknown` for a slug of no person with a row in `players`. A database that
 * fails is `error`. `cache` makes the page and its metadata share one reading per request.
 */
export const loadPlayerPage = cache(async (slug: string): Promise<PlayerPageLoad> => {
  try {
    const { db } = getDatabase()
    const found = await findPlayerBySlug(db, slug)

    if (found === undefined) {
      return { kind: 'unknown' }
    }
    if (found.slug !== slug) {
      return { kind: 'moved', slug: found.slug }
    }

    const { person } = found
    const rows = await db
      .select({ name: players.name, season: players.season })
      .from(players)
      .where(eq(players.personId, person.id))
      .orderBy(desc(players.season), asc(players.id))
    const [place] =
      person.birthPlaceId === null
        ? []
        : await db
            .select({ label: wikidataItems.label })
            .from(wikidataItems)
            .where(eq(wikidataItems.id, person.birthPlaceId))

    return { kind: 'found', page: playerPageOf(person, rows, place?.label) }
  } catch (error) {
    return { kind: 'error', reason: reasonOf(error) }
  }
})

/** The slugs of now of every player with a page, for the sitemap. */
export async function getPlayerSlugs(): Promise<string[]> {
  return playerSlugs(getDatabase().db)
}

export { playerAddress } from './player-address'

/** The season after a season: `2003/04` after `2002/03`, `2000/01` after `1999/00`. */
export function nextSeason(season: string): string {
  const start = Number(season.slice(0, 4)) + 1

  return `${start}/${String((start + 1) % 100).padStart(2, '0')}`
}

/**
 * The seasons as periods of seasons that follow each other: `2002/03` and `2003/04` are one
 * period, and a season without a row between two is a gap.
 */
export function periodsOf(seasons: readonly string[]): { first: string; last: string }[] {
  const periods: { first: string; last: string }[] = []

  for (const season of [...new Set(seasons)].sort()) {
    const period = periods.at(-1)

    if (period !== undefined && nextSeason(period.last) === season) {
      period.last = season
    } else {
      periods.push({ first: season, last: season })
    }
  }

  return periods
}

/**
 * What the page shows of a person, from his row and his rows in `players` (the newest first).
 * The name is that of the person, or without one that of his newest row.
 */
export function playerPageOf(
  person: Person,
  rows: readonly { name: string; season: string }[],
  birthPlace: string | undefined,
  today = new Date(),
): PlayerPage {
  const name = person.name ?? rows[0]?.name ?? ''
  const parts = personNameParts({
    personFamilyName: person.familyName,
    personFamilyNamePrefix: person.familyNamePrefix,
    personGivenName: person.givenName,
  })

  return {
    age: ageOf(person, today),
    birthPlace,
    birthYear: person.birthDate?.slice(0, 4),
    country: person.country ?? undefined,
    edited: person.nameSource === 'redactie' || person.lineSource === 'manual' || person.countrySource === 'manual',
    line: person.line ?? undefined,
    name,
    nameParts: parts ?? splitPersonName(name),
    personId: person.id,
    readAt: person.wikidataReadAt ?? undefined,
    seasons: [...new Set(rows.map((row) => row.season))].sort(),
    slug: person.slug ?? '',
    wikipedia:
      person.wikipediaPage === null
        ? undefined
        : { language: person.englishTitle ? 'en' : 'nl', title: person.wikipediaPage },
  }
}

const dayFormat = new Intl.DateTimeFormat('en-CA', {
  day: '2-digit',
  month: '2-digit',
  timeZone: 'Europe/Amsterdam',
  year: 'numeric',
})

/**
 * His age in whole years on a day in the Netherlands, from his full date of birth. A birth date
 * that Wikidata only knows by month or by year gives no age, and nor does a person without one.
 * We keep no date of death, so the age of a player who has died is not left out here (#1099).
 */
export function ageOf(person: Pick<Person, 'birthDate' | 'birthDatePrecision'>, today: Date): number | undefined {
  const { birthDate, birthDatePrecision } = person

  if (birthDate === null || birthDatePrecision !== 'day') {
    return undefined
  }

  const [year, month, day] = birthDate.split('-').map(Number)
  const [nowYear, nowMonth, nowDay] = dayFormat.format(today).split('-').map(Number)

  if (year === undefined || month === undefined || day === undefined) {
    return undefined
  }
  if (nowYear === undefined || nowMonth === undefined || nowDay === undefined) {
    return undefined
  }

  const age = nowYear - year - (nowMonth < month || (nowMonth === month && nowDay < day) ? 1 : 0)

  return age < 0 ? undefined : age
}
