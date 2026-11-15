import type { Database } from '@fansite/db/client'

import { resolveBritishCountry } from '@fansite/db/british-places'
import {
  britishCountryIds,
  clubsOfCountryItem,
  clubsToRead,
  clubWikidataIds,
  knownWikidataPlaces,
  refreshClubCountries,
  rememberClubWikidataId,
  storeClubItem,
  storeWikidataPlace,
} from '@fansite/db/clubs'
import { knownWikidataLabels, storeWikidataLabel } from '@fansite/db/persons'

import type { Fetcher } from './fetcher.ts'

import { infoUrl, itemUrl, pauseBetweenRequests } from './import-person-data.ts'
import { wikidataCountryCodes } from './person-countries.ts'
import { mostFailuresInARow } from './person-pages.ts'
import { printable } from './text.ts'
import { readArticleInfo, readCountryIds, readLabel, readPlaceIds } from './wikidata-item.ts'

export type ClubDataOptions = {
  clock?: () => Date
  /** The code of two letters of a country of Wikidata, by Q-number. A test gives its own. */
  countryCodes?: ReadonlyMap<string, string>
  /** The address of the Dutch Wikipedia. */
  origin: string
  /** The wait between two requests in milliseconds. A test gives 0. */
  pause?: number
  /** The address of Wikidata. */
  wikidata: string
}

/** What a run did, for the log. */
export type ClubDataReport = {
  /** Of those, the clubs that got England, Wales, Scotland or Northern Ireland (#1278). */
  countriesBritish: number
  /** The clubs that got a country from Wikidata this run. */
  countriesFilled: number
  /** The items of Wikidata it asked about: clubs and countries. */
  itemsAsked: number
  /** Clubs read this run: stored, whatever they got. */
  read: number
  /** The lines for the warnings, each starting with `Clubs:`. */
  warnings: string[]
  /** All clubs that have no country now. */
  withoutCountry: number
}

/**
 * The lines for the log about the countries of the clubs. No line for a run that read and
 * filled in nothing, so a second run without changes says nothing.
 */
export function describeClubData(report: ClubDataReport): string[] {
  if (report.read === 0 && report.countriesFilled === 0) {
    return []
  }

  const { countriesFilled: filled, withoutCountry: without } = report
  const british =
    report.countriesBritish > 0 ? ` (${report.countriesBritish} in England, Wales, Scotland or Northern Ireland)` : ''

  return [
    `clubs (country): ${report.read} ${report.read === 1 ? 'club' : 'clubs'} read from Wikidata, ${filled} ${filled === 1 ? 'club' : 'clubs'} got a country${british}, ${without} ${without === 1 ? 'club has' : 'clubs have'} none yet; ${report.itemsAsked} items asked`,
  ]
}

/**
 * Gives the clubs a country from Wikidata (#1264). For each club with an article that was not
 * read yet it asks the Dutch Wikipedia for the Q-number of the article, then Wikidata for the
 * item and, once for each Q-number, for the label of its country (`P17`). A club without an
 * article gets no request: the editors fill in its country. Everything goes through the
 * fetcher: our User-Agent, robots.txt, a wait between requests, and a stop after
 * `mostFailuresInARow` failed requests in a row, or at once when robots.txt refuses a request
 * or a server asks us to wait. A club is read once; a request that fails leaves it unread,
 * with a warning, and the next run tries again.
 *
 * After that, every run works out the countries again without a request
 * (`refreshClubCountries`): the country of the item through the list of countries of the
 * persons. A club with the source `manual` stays as it is, and a country that is not in the
 * list is a warning, with no guess.
 */
export async function readClubData(
  db: Database,
  fetcher: Fetcher,
  {
    clock = () => new Date(),
    countryCodes = wikidataCountryCodes,
    origin,
    pause = pauseBetweenRequests,
    wikidata,
  }: ClubDataOptions,
): Promise<ClubDataReport> {
  const report: ClubDataReport = {
    countriesBritish: 0,
    countriesFilled: 0,
    itemsAsked: 0,
    read: 0,
    warnings: [],
    withoutCountry: 0,
  }
  const todo = await clubsToRead(db)
  const failures: string[] = []

  let asked = 0
  let failuresInARow = 0
  let stopped = false

  type Answer = { kind: 'failed' | 'missing' | 'stopped' } | { kind: 'text'; text: string }

  async function ask(url: string): Promise<Answer> {
    if (asked > 0 && pause > 0) {
      await new Promise((resolve) => setTimeout(resolve, pause))
    }

    asked++

    const outcome = await fetcher.fetch(url)

    switch (outcome.kind) {
      case 'blocked-by-robots':
        report.warnings.push(
          `Clubs: robots.txt does not allow ${printable(outcome.url)}, so no more clubs are read this run`,
        )
        stopped = true

        return { kind: 'stopped' }
      case 'error':
        if (outcome.reason === 'http-status' && outcome.status === 404) {
          failuresInARow = 0

          return { kind: 'missing' }
        }

        failures.push(`${printable(url)}: ${printable(outcome.message)}`)
        failuresInARow++
        stopped = failuresInARow >= mostFailuresInARow

        return { kind: 'failed' }
      case 'fetched':
        failuresInARow = 0

        return { kind: 'text', text: new TextDecoder('utf-8').decode(outcome.body) }
      case 'not-modified':
        failures.push(`${printable(url)}: the page answered 304 to a request without conditions`)
        failuresInARow++
        stopped = failuresInARow >= mostFailuresInARow

        return { kind: 'failed' }
      case 'wait':
        report.warnings.push(
          `Clubs: the server asks us to wait (${printable(outcome.url)}), so no more clubs are read this run`,
        )
        stopped = true

        return { kind: 'stopped' }
    }
  }

  if (todo.length > 0) {
    const labels = await knownWikidataLabels(db)
    const owners = await clubWikidataIds(db)
    for (const club of todo) {
      if (stopped) {
        break
      }

      let wikidataId = club.wikidataId

      if (wikidataId === null) {
        const answer = await ask(infoUrl(origin, club.wikipediaPage))

        if (answer.kind === 'failed' || answer.kind === 'stopped') {
          continue
        }

        const info = answer.kind === 'text' ? readArticleInfo(answer.text) : 'missing'

        if (info === null) {
          failures.push(`${printable(club.wikipediaPage)}: the page information has no page number`)
          failuresInARow++
          stopped = failuresInARow >= mostFailuresInARow

          continue
        }
        if (info === 'missing' || info.wikidataId === null) {
          // No article, or an article without an item: nothing to read, and nothing to guess.
          await storeClubItem(db, club.id, { countryItemId: null, readAt: clock(), wikidataId: null })
          report.read++

          continue
        }

        wikidataId = info.wikidataId
      }

      const owner = owners.get(wikidataId)

      if (owner !== undefined && owner !== club.id) {
        report.warnings.push(
          `Clubs: '${printable(club.wikipediaPage)}' has the item ${wikidataId} that another club has, so it gets no country`,
        )
        await storeClubItem(db, club.id, { countryItemId: null, readAt: clock(), wikidataId: null })
        report.read++

        continue
      }

      report.itemsAsked++

      const answer = await ask(itemUrl(wikidata, wikidataId))

      if (answer.kind === 'stopped') {
        continue
      }
      if (answer.kind === 'failed' || (answer.kind === 'text' && !answer.text.includes('"entities"'))) {
        if (answer.kind === 'text') {
          failures.push(`${printable(itemUrl(wikidata, wikidataId))}: the answer is not an item`)
          failuresInARow++
          stopped = failuresInARow >= mostFailuresInARow
        }

        // Keep the Q-number, so the next run asks for the item and not for the article.
        await rememberClubWikidataId(db, club.id, wikidataId)
        owners.set(wikidataId, club.id)

        continue
      }

      const countryIds = answer.kind === 'text' ? readCountryIds(answer.text) : []
      // The first country that is in the list, else the first one, so the warning names it.
      // One of the four countries of the United Kingdom goes before the United Kingdom itself.
      const britishId = countryIds.filter((id) => countryCodes.get(id)?.startsWith('GB-') === true)
      const countryId =
        (britishId.length === 1 ? britishId[0] : undefined) ??
        countryIds.find((id) => countryCodes.has(id)) ??
        countryIds[0] ??
        null

      if (countryId !== null && !labels.has(countryId)) {
        report.itemsAsked++

        const labelAnswer = await ask(itemUrl(wikidata, countryId))

        if (labelAnswer.kind === 'failed' || labelAnswer.kind === 'stopped') {
          await rememberClubWikidataId(db, club.id, wikidataId)
          owners.set(wikidataId, club.id)

          continue
        }

        const label = labelAnswer.kind === 'text' ? readLabel(labelAnswer.text) : null
        const stored = (label ?? countryId).slice(0, 255)

        await storeWikidataLabel(db, countryId, stored)
        labels.set(countryId, stored)
      }

      owners.set(wikidataId, club.id)
      await storeClubItem(db, club.id, { countryItemId: countryId, readAt: clock(), wikidataId })
      report.read++
    }
  }

  // The clubs of the United Kingdom, one place at a time up to a country of the four (#1278).
  const britishIds = britishCountryIds(countryCodes)
  const places = await knownWikidataPlaces(db)

  if (!stopped && britishIds.size > 0) {
    const ukItem = [...countryCodes].find(([, code]) => code === 'GB')?.[0]

    for (const club of ukItem === undefined ? [] : await clubsOfCountryItem(db, ukItem)) {
      let resolution = resolveBritishCountry(club.wikidataId, places, britishIds)

      while (resolution.kind === 'missing' && !stopped) {
        for (const id of resolution.ids) {
          if (stopped) {
            break
          }

          report.itemsAsked++

          const answer = await ask(itemUrl(wikidata, id))
          const parents = answer.kind === 'text' ? readPlaceIds(answer.text) : null

          if (answer.kind === 'missing' || parents !== null) {
            // An item that is gone has no places: remember that too, so nobody asks again.
            await storeWikidataPlace(db, id, parents ?? [])
            places.set(id, parents ?? [])
          } else if (answer.kind === 'text') {
            failures.push(`${printable(itemUrl(wikidata, id))}: the answer is not an item`)
            failuresInARow++
            stopped = failuresInARow >= mostFailuresInARow
          }
        }

        const fetched = resolution.ids
        resolution = fetched.every((id) => places.has(id))
          ? resolveBritishCountry(club.wikidataId, places, britishIds)
          : { kind: 'none' }
      }
    }
  }

  const { filled, filledBritish, unknown, withoutCountry } = await refreshClubCountries(db, countryCodes, places)

  report.countriesBritish = filledBritish
  report.countriesFilled = filled
  report.withoutCountry = withoutCountry

  if (failures.length > 0) {
    report.warnings.unshift(
      `Clubs: ${failures.length} ${failures.length === 1 ? 'request' : 'requests'} to read clubs failed, so those clubs are tried again next run: ${printable(failures.slice(0, 3).join('; '))}`,
    )
  }
  for (const item of unknown) {
    report.warnings.push(
      `Clubs: ${item.id} (${printable(item.label)}) is not in the list of countries, so no country is filled in for ${item.clubs.map((name) => printable(name)).join(', ')}`,
    )
  }

  return report
}
