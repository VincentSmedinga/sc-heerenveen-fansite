import { seasonOf } from '@fansite/db/season'

/**
 * The parts of the site that choose a season, for every page that shows one. A page gives its
 * base address (`/wedstrijden`), the current season and the seasons that have data, and gets
 * the addresses, the choices for the season picker and the answer for the route that handles
 * it.
 */

/** A choice in the season picker: what it says (`2025/26`) and what it sends (`2025-26`). */
export type SeasonChoice = { label: string; value: string }

const slugPattern = /^(\d{4})-(\d{2})$/

/** The season of an address part, `2025-26` becoming `2025/26`, or undefined. */
export function seasonFromSlug(slug: string | undefined): string | undefined {
  const match = slug === undefined ? null : slugPattern.exec(slug)

  if (match === null) {
    return undefined
  }

  const season = seasonOf(new Date(Date.UTC(Number(match[1]), 7, 1)))

  return season.replace('/', '-') === slug ? season : undefined
}

/** The part of an address for a season, `2025/26` becoming `2025-26`. */
export const seasonSlug = (season: string) => season.replace('/', '-')

/**
 * The address of a season under a base address: the base address itself for the current season,
 * so a season has one address, and `<base>/2025-26` for another.
 */
export const seasonAddress = (base: string, season: string, current: string) =>
  season === current ? base : `${base}/${seasonSlug(season)}`

/** The choices of the season picker, in the order given, the address part as value. */
export const seasonChoices = (seasons: readonly string[]): SeasonChoice[] =>
  seasons.map((season) => ({ label: season, value: seasonSlug(season) }))

/**
 * The address part of "Alle seizoenen", the second scope of a page with figures: `/alle` under
 * the base address. It is no season, so `seasonFromSlug` never reads it as one.
 */
export const allSeasonsSlug = 'alle'

/** The choice "Alle seizoenen" of the season picker, which comes first. */
export const allSeasonsChoice: SeasonChoice = { label: 'Alle seizoenen', value: allSeasonsSlug }

/** The address of the page with all seasons under a base address: `<base>/alle`. */
export const allSeasonsAddress = (base: string) => `${base}/${allSeasonsSlug}`

/**
 * The choices of the season picker of a page that can count all seasons: "Alle seizoenen"
 * first. With fewer than two seasons all seasons is the one season, so there is nothing to
 * add and the picker, which is nothing below two choices, stays away as it did.
 */
export const seasonChoicesWithAll = (seasons: readonly string[]): SeasonChoice[] =>
  seasons.length < 2 ? seasonChoices(seasons) : [allSeasonsChoice, ...seasonChoices(seasons)]

/**
 * Where the route behind the season picker sends a visitor: to the address of the season that
 * was asked for, and to the base address for a value that isn't a season or a season without
 * data. The current season is the base address too. A page that can count all seasons
 * (`allSeasons`) sends the value `alle` to `<base>/alle`.
 */
export function pickedAddress(
  base: string,
  value: string | undefined,
  { allSeasons = false, current, seasons }: { allSeasons?: boolean; current: string; seasons: readonly string[] },
) {
  if (allSeasons && value === allSeasonsSlug) {
    return allSeasonsAddress(base)
  }

  const season = seasonFromSlug(value)

  return season !== undefined && seasons.includes(season) ? seasonAddress(base, season, current) : base
}
