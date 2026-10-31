import { seasonOf } from '@fansite/db/season'
import { notFound, redirect } from 'next/navigation'
import { cache } from 'react'

import { reasonOf } from './errors'
import { getMatchData, getMatchSeasons } from './matches'
import { pickedAddress, seasonFromSlug } from './seasons'

/**
 * What the pages of a season share: Wedstrijden, Statistieken and its page Spelers all show the
 * data of one season, with a picker for the season, an address for each season
 * (`/wedstrijden/2025-26`, `/statistieken/2025-26`, `/statistieken/spelers/2025-26`) and the
 * route behind the picker (`/wedstrijden/kies`). Each page gives its base address and gets the
 * same answers, so the pages never differ.
 */

export type SearchParams = Record<string, string | string[] | undefined>

/** The base address of the matches page, which is the address of its current season. */
export const matchesPath = '/wedstrijden'

/** The base address of the statistics page, which is the address of its current season. */
export const statisticsPath = '/statistieken'

/**
 * The base address of the page Spelers under Statistieken, which is the address of its current
 * season. It has the picker and the addresses of a season that the other pages have.
 */
export const playersPath = '/statistieken/spelers'

/**
 * The matches, the table and the Wikipedia pages of a season, and the seasons to choose from,
 * or what went wrong. A page that throws gets an empty page with a 500 from Next.js, and the
 * text only after JavaScript runs. So the page catches the error and shows the error page
 * itself, in the HTML. The season is checked against the seasons that have matches before its
 * data is asked for, because the data is cached for each season that is asked for and a visitor
 * can make up any address. `cache` makes the page and its metadata share one call per request.
 * `path` is the base address of the page, for the log.
 */
export const loadSeasonPage = cache(async (season: string, path: string) => {
  try {
    const seasons = await getMatchSeasons()

    if (!seasons.includes(season)) {
      return { kind: 'unknown' } as const
    }

    return { data: await getMatchData(season), kind: 'found', seasons } as const
  } catch (error) {
    console.error(`Could not read the matches and the table for ${path}: ${reasonOf(error)}`)

    return { kind: 'error' } as const
  }
})

/** The route that sends the season picker of a page on to its season (`<path>/kies`). */
export const pickerPathOf = (path: string) => `${path}/kies`

/**
 * The answer of the route behind the button "Toon" of the season picker of a page, such as
 * `/wedstrijden/kies?seizoen=2025-26`: it sends the visitor on (303) to the address of that
 * season. A value that isn't a season, one that is given twice and a season without matches go
 * back to the base address, and so does a database that can't be read: the page itself shows
 * what is wrong. The address is relative, so it keeps the host the visitor came to.
 */
export async function pickedSeasonResponse(request: Request, path: string) {
  const values = new URL(request.url).searchParams.getAll('seizoen')
  let seasons: string[] = []

  try {
    seasons = await getMatchSeasons()
  } catch (error) {
    console.error(`Could not read the seasons for ${pickerPathOf(path)}: ${reasonOf(error)}`)
  }

  const address = pickedAddress(path, values.length === 1 ? values[0] : undefined, {
    current: seasonOf(new Date()),
    seasons,
  })

  return new Response(null, { headers: { Location: address }, status: 303 })
}

/**
 * The season of the address part of a page of another season, or the page "niet gevonden" for
 * an address that isn't a season. The current season has one address, the base address, so this
 * one goes there for now. The redirect is not permanent: from 1 July the season that is the
 * current one now is an address of its own.
 */
export function seasonOfAddress(slug: string, path: string) {
  const season = seasonFromSlug(slug)

  if (season === undefined) {
    notFound()
  }

  if (season === seasonOf(new Date())) {
    redirect(path)
  }

  return season
}
