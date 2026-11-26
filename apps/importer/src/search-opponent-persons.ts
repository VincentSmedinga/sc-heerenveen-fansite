// Looks on the Dutch Wikipedia for the players of opponents that no rule of #1544 can link
// (#1678), and makes a person for the article that fits: the item on Wikidata is a human and
// names the club of the row in that season. It never guesses. Which names are due, and the
// writing, are in `@fansite/db/opponent-persons`; this file asks the two servers and judges the
// answers. The log counts and names nobody.
import type { Database } from '@fansite/db/client'
import type { OpponentName } from '@fansite/db/opponent-persons'

import {
  findOrAddOpponentPerson,
  giveRowsPerson,
  opponentNamesToSearch,
  rememberOpponentSearch,
} from '@fansite/db/opponent-persons'
import { storePersonNames } from '@fansite/db/persons'

import type { Fetcher } from './fetcher.ts'
import type { PartialDate, PlayerItem } from './wikidata-item.ts'

import { lookUpTitles } from './club-pages.ts'
import { infoUrl, itemUrl, pauseBetweenRequests } from './import-person-data.ts'
import { fitsColumns, manualNames, personNameOf } from './person-name.ts'
import { aliasMap, personNames, personTitleAliases } from './person-names.ts'
import { mostFailuresInARow } from './person-pages.ts'
import { readArticleInfo, readPlayerItem } from './wikidata-item.ts'

/** The most names a run looks for: about a minute of requests, and the lock is short. */
export const mostNamesPerRun = 50

/** A name is looked for again when the last search is this many days old. */
export const searchAgainAfterDays = 180

export type OpponentSearchOptions = {
  clock?: () => Date
  /** The list of namesakes. A test gives its own. */
  exceptions?: readonly { club: string; name: string }[]
  /** The most names to look for. */
  limit?: number
  /** The address of the Dutch Wikipedia. */
  origin: string
  /** The wait between two requests in milliseconds. A test gives 0. */
  pause?: number | undefined
  /** The address of Wikidata. */
  wikidata: string
}

/** What a run did, for the log. */
export type OpponentSearchReport = {
  /** Rows of opponents that got a person. */
  linked: number
  /** New persons. */
  made: number
  /** Names looked for to the end. */
  searched: number
  /** The lines for the warnings, without the name of anybody. */
  warnings: string[]
  /** Of the names searched, those for which no article fits any club and season. */
  without: number
}

/** The article that fits, as it takes to make a person. */
type Fit = { article: string; asked: string[]; sortKey: null | string; wikidataId: string; wikipediaPageId: number }

/** A request of a name that failed, or a server or robots.txt that stops the whole run. */
type Stop = 'blocked' | 'failed' | 'wait'

/** The line for the log: counts only. No line when the run looked for nobody. */
export function describeOpponentSearch({ linked, made, searched, warnings, without }: OpponentSearchReport): string[] {
  return searched === 0
    ? warnings
    : [
        ...warnings,
        `Opponents' names: ${searched} searched, ${made} new ${made === 1 ? 'person' : 'persons'}, ${linked} ${linked === 1 ? 'row' : 'rows'} linked, ${without} without a fitting article.`,
      ]
}

/**
 * Runs the step for the regular import. A failure is a warning and no failed import. The
 * message of a database error can hold names, so only its code goes in the log.
 */
export async function importOpponentSearch(
  db: Database,
  fetcher: Fetcher,
  options: OpponentSearchOptions,
): Promise<string[]> {
  try {
    return describeOpponentSearch(await searchOpponentPersons(db, fetcher, options))
  } catch (error) {
    return [`Opponents' names: warning, not searched: ${errorCode(error)}`]
  }
}

/**
 * Whether the item says the person played for the club in a season (`2007/08`, 1 July to 30
 * June). A statement needs a start or an end; a missing one is open. A month or a year counts
 * as all its days.
 */
export function playedFor(item: PlayerItem, clubId: string, season: string): boolean {
  const year = Number(season.slice(0, 4))
  const seasonStart = year * 10_000 + 701
  const seasonEnd = (year + 1) * 10_000 + 630

  return item.teams.some(
    ({ end, start, teamId }) =>
      teamId === clubId &&
      (start !== null || end !== null) &&
      (start === null || dayNumber(start, 1, 1) <= seasonEnd) &&
      (end === null || dayNumber(end, 12, 31) >= seasonStart),
  )
}

/** The moment before which a search is old enough to do again. */
export function searchedBefore(now: Date): Date {
  return new Date(now.getTime() - searchAgainAfterDays * 86_400_000)
}

/**
 * Looks for at most `limit` names, those with the most rows first. For each it asks the article
 * of the name, following redirects, and when a club and season stay unfitted, the article
 * "Name (voetballer)". A club and season takes the first article that fits it. The rows get the
 * person, and every club and season of the name is remembered as searched. A name of which a
 * request fails is left as it was; after `mostFailuresInARow` failures in a row, or when
 * robots.txt refuses or a server asks us to wait, the run stops. Requests have a pause between
 * them and go through the fetcher.
 */
export async function searchOpponentPersons(
  db: Database,
  fetcher: Fetcher,
  {
    clock = () => new Date(),
    exceptions,
    limit = mostNamesPerRun,
    origin,
    pause = pauseBetweenRequests,
    wikidata,
  }: OpponentSearchOptions,
): Promise<OpponentSearchReport> {
  const report: OpponentSearchReport = { linked: 0, made: 0, searched: 0, warnings: [], without: 0 }
  const { names } = await opponentNamesToSearch(db, {
    ...(exceptions === undefined ? {} : { exceptions }),
    limit,
    searchedBefore: searchedBefore(clock()),
  })
  const paced = pacedFetcher(fetcher, pause)
  let failed = 0
  let failuresInARow = 0

  for (const one of names) {
    const fits = await findArticles(paced, origin, wikidata, one, () => {
      failuresInARow = 0
    })

    if (fits === 'blocked' || fits === 'wait') {
      report.warnings.push(
        `Opponents' names: warning, ${fits === 'wait' ? 'a server asks us to wait' : 'robots.txt does not allow a request'}, so the search stops for this run`,
      )
      break
    }
    if (fits === 'failed') {
      failed += 1
      failuresInARow += 1

      if (failuresInARow >= mostFailuresInARow) {
        break
      }

      continue
    }

    await store(db, one, fits, clock(), report)
  }

  if (failed > 0) {
    report.warnings.push(
      `Opponents' names: warning, a request failed for ${failed} ${failed === 1 ? 'name' : 'names'}, which a next run searches again`,
    )
  }

  return report
}

/** A day as a number to compare, with the month and day to take when the date has none. */
function dayNumber({ day, month, year }: PartialDate, noMonth: number, noDay: number): number {
  return year * 10_000 + (month ?? noMonth) * 100 + (day ?? noDay)
}

/** The code of a database error, or the kind of the error: never its message. */
function errorCode(error: unknown): string {
  const cause = error instanceof Error && error.cause !== undefined ? error.cause : error
  const code = (cause as null | { code?: unknown })?.code

  return typeof code === 'string' ? code : error instanceof Error ? error.name : 'unknown error'
}

/** The article that fits each club and season of a name, by the position of the pair. */
async function findArticles(
  fetcher: Fetcher,
  origin: string,
  wikidata: string,
  { name, pairs }: OpponentName,
  succeeded: () => void,
): Promise<Map<number, Fit> | Stop> {
  const fits = new Map<number, Fit>()
  // MediaWiki starts every title with a capital.
  const title = name.charAt(0).toLocaleUpperCase('nl') + name.slice(1)

  // A character that no title can have: there is no article to ask for.
  if (/[#<>?[\]{|}]|^\.{1,2}$/u.test(title)) {
    return fits
  }

  for (const asked of [title, `${title} (voetballer)`]) {
    if (fits.size === pairs.length) {
      break
    }

    const lookup = await lookUpTitles(fetcher, origin, [asked], new Map())

    if (lookup.kind === 'blocked-by-robots') {
      return 'blocked'
    }
    if (lookup.kind === 'wait') {
      return 'wait'
    }
    if (lookup.kind === 'error') {
      if (lookup.missing === undefined && lookup.brokenRedirect !== true) {
        return 'failed'
      }

      succeeded()
      continue
    }

    succeeded()

    const article = lookup.redirects.get(asked) ?? asked
    const page = await read(fetcher, infoUrl(origin, article))

    if (typeof page !== 'object') {
      return page
    }

    succeeded()

    if (page.text === null) {
      continue
    }

    const info = readArticleInfo(page.text)

    if (info === null) {
      return 'failed'
    }
    if (info === 'missing' || info.wikidataId === null) {
      continue
    }

    const answer = await read(fetcher, itemUrl(wikidata, info.wikidataId))

    if (typeof answer !== 'object') {
      return answer
    }

    succeeded()

    if (answer.text === null) {
      continue
    }

    const item = readPlayerItem(answer.text)

    if (item === null) {
      return 'failed'
    }
    if (!item.human) {
      continue
    }

    for (const [index, pair] of pairs.entries()) {
      if (!fits.has(index) && playedFor(item, pair.clubWikidataId, pair.season)) {
        fits.set(index, {
          article,
          asked: [...lookup.redirects.keys()],
          sortKey: lookup.sortKeys.get(article) ?? null,
          wikidataId: item.id,
          wikipediaPageId: info.pageId,
        })
      }
    }
  }

  return fits
}

/** A fetcher that waits `pause` milliseconds between two requests. */
function pacedFetcher(fetcher: Fetcher, pause: number): Fetcher {
  let asked = 0

  return {
    ...fetcher,
    async fetch(...request) {
      if (asked++ > 0 && pause > 0) {
        await new Promise((resolve) => setTimeout(resolve, pause))
      }

      return fetcher.fetch(...request)
    },
  }
}

/** The text of a page, null when it does not exist (404), or why the name stops here. */
async function read(fetcher: Fetcher, url: string): Promise<Stop | { text: null | string }> {
  const outcome = await fetcher.fetch(url)

  switch (outcome.kind) {
    case 'blocked-by-robots':
      return 'blocked'
    case 'error':
      return outcome.reason === 'http-status' && outcome.status === 404 ? { text: null } : 'failed'
    case 'fetched':
      return { text: new TextDecoder('utf-8').decode(outcome.body) }
    case 'not-modified':
      return 'failed'
    case 'wait':
      return 'wait'
  }
}

/** Writes what a search found, whole or not at all: persons, names, rows and the search. */
async function store(
  db: Database,
  { name, pairs }: OpponentName,
  fits: ReadonlyMap<number, Fit>,
  now: Date,
  report: OpponentSearchReport,
): Promise<void> {
  const aliases = aliasMap(personTitleAliases)
  const manual = manualNames(personNames)
  const counts = await db.transaction(async (tx) => {
    let linked = 0
    let made = 0

    for (const [index, fit] of fits) {
      const person = await findOrAddOpponentPerson(tx, { ...fit, aliases })

      if (person === null) {
        continue
      }
      if (person.created) {
        made += 1

        const title = aliases.get(fit.article) ?? fit.article
        const personName = personNameOf(title, fit.sortKey, manual)

        if (fitsColumns(personName)) {
          await storePersonNames(tx, new Map([[title, personName]]))
        }
      }

      linked += await giveRowsPerson(tx, pairs[index]?.rowIds ?? [], person.id)
    }

    await rememberOpponentSearch(tx, name, pairs, now)

    return { linked, made }
  })

  report.linked += counts.linked
  report.made += counts.made
  report.searched += 1
  report.without += counts.linked === 0 ? 1 : 0
}
