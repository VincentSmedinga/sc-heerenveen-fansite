// Gives the clubs without a Wikidata number one, by the name of the club (#1341).
// Wikidata's own search is closed to us: robots.txt disallows `api.php` and `Special:Search`.
// So the importer asks the Dutch and the English Wikipedia for an article with exactly the
// name of the club (the page information, which robots.txt allows), takes the number of the
// item of that article, and reads the item. A number is only written when the evidence is
// certain: exactly one item is left that is a football club (`P31`) in the country the
// editors gave the club (`P17`), and no other club has that number. Everything else is
// logged and left to the editors, who can fill in a number in the admin.
import type { Database } from '@fansite/db/client'

import { connect } from '@fansite/db/client'
import { clubsToSearch, clubWikidataIds, storeClubNameSearch } from '@fansite/db/clubs'
import { lockNameFor, withLock } from '@fansite/db/lock'

import type { Fetcher } from './fetcher.ts'
import type { ImportOptions } from './import-feeds.ts'

import { lookUpTitles } from './club-pages.ts'
import { createFetcher } from './fetcher.ts'
import { englishWikipediaOrigin, wikipediaOrigin } from './import-matches.ts'
import { infoUrl, itemUrl, pauseBetweenRequests, wikidataOrigin } from './import-person-data.ts'
import { wikidataCountryCodes } from './person-countries.ts'
import { mostFailuresInARow } from './person-pages.ts'
import { robotsStoreFor } from './robots-store.ts'
import { printable } from './text.ts'
import { isRedirectInfo, readArticleInfo, readCountryIds, readInstanceIds } from './wikidata-item.ts'

/** The kind `association football club` on Wikidata. */
export const footballClubItem = 'Q476028'

export type ClubSearchOptions = {
  clock?: () => Date
  /** The code of two letters of a country of Wikidata, by Q-number. A test gives its own. */
  countryCodes?: ReadonlyMap<string, string>
  /** The address of the English Wikipedia, or null to ask only the Dutch one. */
  englishOrigin: null | string
  /** The address of the Dutch Wikipedia. */
  origin: string
  /** The wait between two requests in milliseconds. A test gives 0. */
  pause?: number
  /** The address of Wikidata. */
  wikidata: string
}

/** What a run did, for the log. */
export type ClubSearchReport = {
  /** The clubs that got a number. */
  found: number
  /** The clubs searched that got nothing: no candidate, several, or a number that is taken. */
  notFound: number
  /** The clubs searched: stored, whatever they got. */
  searched: number
  /** The lines for the warnings, each starting with `Clubs:`. */
  warnings: string[]
}

type Answer = { kind: 'failed' | 'missing' | 'stopped' } | { kind: 'text'; text: string }

/**
 * The lines for the log. No line for a run that searched nothing, so a second run says nothing.
 */
export function describeClubSearch(report: ClubSearchReport): string[] {
  if (report.searched === 0) {
    return []
  }

  const { found, notFound, searched } = report

  return [
    `clubs (number by name): ${searched} ${searched === 1 ? 'club' : 'clubs'} searched on Wikipedia, ${found} got a number, ${notFound} did not: the editors can fill it in`,
  ]
}

/**
 * The command `pnpm run import:club-numbers`, and `import.mjs --club-numbers` on the host: the
 * search for the clubs without a number, under the lock of the import, without the rest of the
 * import. Returns the exit code: 0, or 1 when the lock is held.
 */
export async function runClubNumbersCommand(
  databaseUrl: string,
  {
    clock = () => new Date(),
    englishOrigin = englishWikipediaOrigin,
    makeFetcher = (robots) => createFetcher({ robots }),
    personDataPause,
    wikidataOrigin: wikidata = wikidataOrigin,
    wikipediaOrigin: origin = wikipediaOrigin,
    write = console.log,
  }: Pick<
    ImportOptions,
    'clock' | 'englishOrigin' | 'makeFetcher' | 'personDataPause' | 'wikidataOrigin' | 'wikipediaOrigin' | 'write'
  > = {},
): Promise<number> {
  const { close, db, pool } = connect(databaseUrl)

  try {
    const run = await withLock(pool, lockNameFor(databaseUrl, 'import'), 0, () =>
      searchClubNumbers(db, makeFetcher(robotsStoreFor(db, clock)), {
        clock,
        englishOrigin,
        origin: origin ?? wikipediaOrigin,
        wikidata: wikidata ?? wikidataOrigin,
        ...(personDataPause === undefined ? {} : { pause: personDataPause }),
      }),
    )

    if (!run.ran) {
      write('An import is still running on this database, so this command does nothing. Try again in a few minutes.')

      return 1
    }

    const lines = [...run.result.warnings, ...describeClubSearch(run.result)]

    for (const line of lines.length === 0 ? ['Clubs: no clubs to search.'] : lines) {
      write(line)
    }

    return 0
  } finally {
    await close()
  }
}

/** Whether the country an item has is the country of the club, as the code of the club says. */
export function sameCountry(clubCountry: string, itemCountryCode: string | undefined): boolean {
  if (itemCountryCode === undefined) {
    return false
  }

  // Wikidata gives the United Kingdom for a club of England, Scotland, Wales or Northern
  // Ireland, and one of those four for some clubs.
  return itemCountryCode === clubCountry || (clubCountry.startsWith('GB-') && itemCountryCode === 'GB')
}

/**
 * Searches the clubs that were not searched yet, once each. Everything goes through the
 * fetcher: our User-Agent, robots.txt, a wait between requests, and a stop after
 * `mostFailuresInARow` failed requests in a row, or at once when robots.txt refuses a request
 * or a server asks us to wait. A request that fails leaves the club unsearched, so the next
 * run tries again. A club without a country is not searched, and a number the editors filled
 * in or took away is never touched (`clubsToSearch`, `storeClubNameSearch`).
 */
export async function searchClubNumbers(
  db: Database,
  fetcher: Fetcher,
  {
    clock = () => new Date(),
    countryCodes = wikidataCountryCodes,
    englishOrigin,
    origin,
    pause = pauseBetweenRequests,
    wikidata,
  }: ClubSearchOptions,
): Promise<ClubSearchReport> {
  const report: ClubSearchReport = { found: 0, notFound: 0, searched: 0, warnings: [] }
  const todo = await clubsToSearch(db)

  if (todo.length === 0) {
    return report
  }

  const owners = await clubWikidataIds(db)
  const failures: string[] = []
  const items = new Map<string, Answer>()

  let asked = 0
  let failuresInARow = 0
  let stopped = false

  async function ask(url: string): Promise<Answer> {
    if (asked > 0 && pause > 0) {
      await new Promise((resolve) => setTimeout(resolve, pause))
    }

    asked++

    const outcome = await fetcher.fetch(url)

    switch (outcome.kind) {
      case 'blocked-by-robots':
        report.warnings.push(
          `Clubs: robots.txt does not allow ${printable(outcome.url)}, so no more clubs are searched this run`,
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
          `Clubs: the server asks us to wait (${printable(outcome.url)}), so no more clubs are searched this run`,
        )
        stopped = true

        return { kind: 'stopped' }
    }
  }

  for (const club of todo) {
    if (stopped) {
      break
    }

    // The items of the articles with the name of the club, from the Dutch and the English one.
    const candidates = new Set<string>()
    let complete = true

    for (const wikipedia of [origin, englishOrigin]) {
      if (wikipedia === null) {
        continue
      }

      let title = club.name
      let answer = await ask(infoUrl(wikipedia, title))

      // A redirect has no item: the title of the club may redirect to its article, as
      // `West Ham United` does on the English Wikipedia. The redirect is followed as the book
      // of clubs does, and the page information of the article gives the item.
      if (answer.kind === 'text' && isRedirectInfo(answer.text)) {
        const lookup = await lookUpTitles(fetcher, wikipedia, [title], new Map())

        asked++

        if (lookup.kind === 'blocked-by-robots' || lookup.kind === 'wait') {
          report.warnings.push(
            `Clubs: ${lookup.kind === 'wait' ? 'the server asks us to wait' : 'robots.txt does not allow'} ${printable(lookup.url)}, so no more clubs are searched this run`,
          )
          stopped = true
          complete = false

          break
        }
        if (lookup.kind === 'error' && lookup.missing === undefined) {
          failures.push(lookup.message)
          failuresInARow++
          stopped = failuresInARow >= mostFailuresInARow
          complete = false

          break
        }

        failuresInARow = 0
        title = lookup.kind === 'found' ? (lookup.redirects.get(title) ?? title) : title
        answer = title === club.name ? { kind: 'missing' } : await ask(infoUrl(wikipedia, title))
      }
      if (answer.kind === 'failed' || answer.kind === 'stopped') {
        complete = false

        break
      }

      const info = answer.kind === 'text' ? readArticleInfo(answer.text) : 'missing'

      if (info === null) {
        failures.push(`${printable(club.name)}: the page information has no page number`)
        failuresInARow++
        stopped = failuresInARow >= mostFailuresInARow
        complete = false

        break
      }
      if (info !== 'missing' && info.wikidataId !== null) {
        candidates.add(info.wikidataId)
      }
    }

    // The items that are a football club in the country of the club.
    const certain: string[] = []

    for (const id of complete ? candidates : []) {
      let answer = items.get(id)

      if (answer === undefined) {
        answer = await ask(itemUrl(wikidata, id))

        if (answer.kind === 'text' || answer.kind === 'missing') {
          items.set(id, answer)
        }
      }
      if (answer.kind === 'failed' || answer.kind === 'stopped') {
        complete = false

        break
      }
      if (answer.kind === 'text' && !answer.text.includes('"entities"')) {
        failures.push(`${printable(itemUrl(wikidata, id))}: the answer is not an item`)
        failuresInARow++
        stopped = failuresInARow >= mostFailuresInARow
        complete = false

        break
      }
      if (
        answer.kind === 'text' &&
        readInstanceIds(answer.text).includes(footballClubItem) &&
        readCountryIds(answer.text).some((country) => sameCountry(club.country, countryCodes.get(country)))
      ) {
        certain.push(id)
      }
    }

    if (!complete) {
      continue
    }

    const [only] = certain
    const name = printable(club.name)

    report.searched++

    if (certain.length !== 1 || only === undefined) {
      report.notFound++
      report.warnings.push(
        `Clubs: '${name}' has ${certain.length} candidates on Wikipedia (${candidates.size} articles with this name), so it gets no number`,
      )
      await storeClubNameSearch(db, club.id, { searchedAt: clock(), wikidataId: null })

      continue
    }

    const owner = owners.get(only)

    if (owner !== undefined && owner !== club.id) {
      report.notFound++
      report.warnings.push(`Clubs: '${name}' has the candidate ${only} that another club has, so it gets no number`)
      await storeClubNameSearch(db, club.id, { searchedAt: clock(), wikidataId: null })

      continue
    }

    report.found++
    owners.set(only, club.id)
    await storeClubNameSearch(db, club.id, { searchedAt: clock(), wikidataId: only })
  }

  if (failures.length > 0) {
    report.warnings.unshift(
      `Clubs: ${failures.length} ${failures.length === 1 ? 'request' : 'requests'} to search clubs failed, so those clubs are tried again next run: ${printable(failures.slice(0, 3).join('; '))}`,
    )
  }

  return report
}
