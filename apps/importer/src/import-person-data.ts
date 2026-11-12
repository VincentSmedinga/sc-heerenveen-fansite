import type { Database } from '@fansite/db/client'
import type { PersonData, PersonToRead } from '@fansite/db/persons'
import type { PersonLineSource, PlayerPosition } from '@fansite/db/schema'

import {
  applyManualLines,
  knownWikidataLabels,
  personsByWikidataId,
  personsToRead,
  refreshPersonCountries,
  refreshPersonLines,
  rememberWikidataId,
  squadLines,
  storePersonData,
  storeWikidataLabel,
} from '@fansite/db/persons'

import type { Fetcher } from './fetcher.ts'

import { wikidataCountryCodes } from './person-countries.ts'
import { lineMap, personLines, wikidataPositionLines } from './person-lines.ts'
import { mostFailuresInARow } from './person-pages.ts'
import { printable } from './text.ts'
import { lineOfPositions, readArticleInfo, readItem, readLabel } from './wikidata-item.ts'

/** The address of Wikidata, where the items of the persons are. */
export const wikidataOrigin = 'https://www.wikidata.org'

/**
 * The most persons a run reads, so the first round goes over several runs and the lock is
 * short.
 */
export const mostPersonsPerRun = 200

/**
 * A person without a date of death is read again when his last reading is this many days old,
 * so a death shows within a month (#1147).
 */
export const rereadAfterDays = 30

/** The wait between two requests, in milliseconds, to leave the servers alone. */
export const pauseBetweenRequests = 250

export type PersonDataOptions = {
  clock?: () => Date
  /** The code of two letters of a country of Wikidata, by Q-number. A test gives its own. */
  countryCodes?: ReadonlyMap<string, string>
  /** The most persons to read. */
  limit?: number
  /** The list of lines of our own. A test gives its own. */
  lines?: ReadonlyMap<string, PlayerPosition>
  /** The address of the Dutch Wikipedia. */
  origin: string
  /** The wait between two requests in milliseconds. A test gives 0. */
  pause?: number
  /** The address of Wikidata. */
  wikidata: string
}

/** What a run read, for the log. */
export type PersonDataReport = {
  /** The articles of the Dutch Wikipedia it asked about. */
  articlesAsked: number
  /** With a birth date. */
  birthDate: number
  /** The persons that got their country from the first nationality of Wikidata this run. */
  countriesFilled: number
  /** The persons that got their country from the first flag in the list of players this run. */
  countriesFromList: number
  /** The persons that got their country from their rows of the squad lists this run. */
  countriesFromSquad: number
  /** Persons without an article or without an item: read, with nothing from Wikidata. */
  empty: number
  /** The items of Wikidata it asked about: persons, countries, places and positions. */
  itemsAsked: number
  /** The persons that got a line, by where it came from. */
  lines: Record<PersonLineSource, number>
  /**
   * The persons whose line was worked out again this run, among all persons and not only those
   * read: the ones that got a line from the squad or from Wikidata, and the ones that lost it.
   */
  linesAgain: { cleared: number; squad: number; wikidata: number }
  /** With at least one nationality. */
  nationality: number
  /** Persons read: stored, whatever they got. */
  read: number
  /** Of those, persons read before that had no date of death yet (#1147). */
  reread: number
  /** The lines for the warnings, each starting with `Persons:`. */
  warnings: string[]
}

/**
 * The lines for the log about the persons: what the run read from Wikidata, and whose line or
 * country it filled in again. No line for what did not happen, so a run with nothing new says
 * nothing.
 */
export function describePersonData(report: PersonDataReport): string[] {
  const { lines, linesAgain } = report
  const described: string[] = []

  if (report.read > 0 || report.articlesAsked > 0 || report.itemsAsked > 0) {
    const withLine = lines.wikidata + lines.squad + lines.manual + lines['old-site']
    const person = report.read === 1 ? 'person' : 'persons'
    const again = report.reread > 0 ? ` (${report.reread} read again)` : ''

    described.push(
      `persons (Wikidata): ${report.read} ${person} read${again}, ${report.birthDate} with a birth date, ${report.nationality} with a nationality, ${withLine} with a line (${lines.wikidata} from Wikidata, ${lines.squad} from the squad, ${lines['old-site']} from the old fansite, ${lines.manual} set by hand), ${report.empty} left empty; ${report.articlesAsked} articles and ${report.itemsAsked} items asked`,
    )
  }
  const { countriesFilled: countries, countriesFromList: fromList, countriesFromSquad: fromSquad } = report

  if (linesAgain.squad + linesAgain.wikidata + linesAgain.cleared + countries + fromList + fromSquad > 0) {
    described.push(
      `persons (line and country): ${linesAgain.squad} ${linesAgain.squad === 1 ? 'line' : 'lines'} from the squad, ${linesAgain.wikidata} from Wikidata, ${linesAgain.cleared} taken away; ${countries} ${countries === 1 ? 'country' : 'countries'} from Wikidata, ${fromList} from the list of players, ${fromSquad} from the squad`,
    )
  }

  return described
}

/** The address of the page information of an article: its number and its item. */
export function infoUrl(origin: string, title: string): string {
  return `${origin}/wiki/${encodeURIComponent(title.replaceAll(' ', '_'))}?action=info`
}

/**
 * The address of the item of Wikidata: the one file robots.txt allows under
 * `Special:EntityData`.
 */
export function itemUrl(origin: string, id: string): string {
  return `${origin}/wiki/Special:EntityData/${id}.json`
}

/**
 * Reads the persons that were not read yet: for each, the Q-number and the number of the
 * article from the page information on the Dutch Wikipedia, and then the item on Wikidata. The
 * names of the countries, places and positions come from their own items, once for each
 * Q-number (`wikidata_items`). Everything goes through the fetcher: our User-Agent, robots.txt,
 * a wait between requests, and a stop after `mostFailuresInARow` failed requests in a row, or
 * at once when robots.txt refuses a request or a server asks us to wait.
 *
 * A person is read once. A person without an article, or without an item, gets no data and is
 * marked read too, so the next run asks nothing about him. A request that fails leaves him
 * unread, with a warning, and the next run tries again (with the Q-number we have, so only the
 * item). A run reads at most `limit` persons. It never throws for a failed request.
 *
 * After that, every run works out two things again for all persons, without a request (#1051):
 * the line of a person who has none or has the one of the squad (`refreshPersonLines`), and
 * the country of a person from his first nationality, the list of players or the squad
 * (`refreshPersonCountries`, #1052). What the editors set stays. A first nationality that is
 * not in the list of countries is a warning.
 */
export async function readPersonData(
  db: Database,
  fetcher: Fetcher,
  options: PersonDataOptions,
): Promise<PersonDataReport> {
  const report = await readUnreadPersons(db, fetcher, options)

  report.linesAgain = await refreshPersonLines(db, wikidataPositionLines)

  const { filled, list, squad, unknown } = await refreshPersonCountries(
    db,
    options.countryCodes ?? wikidataCountryCodes,
  )

  report.countriesFilled = filled
  report.countriesFromList = list
  report.countriesFromSquad = squad

  if (unknown.length > 0) {
    const persons = unknown.reduce((sum, item) => sum + item.persons, 0)

    report.warnings.push(
      `Persons: ${persons} ${persons === 1 ? 'person has' : 'persons have'} a first nationality that is not in the list of countries, so no country is filled in: ${unknown.map((item) => `${item.id} (${printable(item.label)}, ${item.persons})`).join(', ')}`,
    )
  }

  return report
}

async function readUnreadPersons(
  db: Database,
  fetcher: Fetcher,
  {
    clock = () => new Date(),
    limit = mostPersonsPerRun,
    lines = lineMap(personLines),
    origin,
    pause = pauseBetweenRequests,
    wikidata,
  }: PersonDataOptions,
): Promise<PersonDataReport> {
  const report: PersonDataReport = {
    articlesAsked: 0,
    birthDate: 0,
    countriesFilled: 0,
    countriesFromList: 0,
    countriesFromSquad: 0,
    empty: 0,
    itemsAsked: 0,
    lines: { manual: 0, 'old-site': 0, squad: 0, wikidata: 0 },
    linesAgain: { cleared: 0, squad: 0, wikidata: 0 },
    nationality: 0,
    read: 0,
    reread: 0,
    warnings: [],
  }

  // A list of our own goes before everything, also for a person that was read earlier.
  await applyManualLines(db, lines)

  const todo = await personsToRead(db, limit, new Date(clock().getTime() - rereadAfterDays * 86_400_000))

  if (todo.length === 0) {
    return report
  }

  const labels = await knownWikidataLabels(db)
  const owners = await personsByWikidataId(db)
  const fromSquad = await squadLines(
    db,
    todo.map((person) => person.id),
  )
  /** The Q-numbers without a label in Dutch or English, so we warn and ask once. */
  const unlabelled = new Set<string>()
  const failures: string[] = []
  let failuresInARow = 0
  let stopped = false
  let asked = 0

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
          `Persons: robots.txt does not allow ${printable(outcome.url)}, so no more persons are read this run`,
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
          `Persons: the server asks us to wait (${printable(outcome.url)}), so no more persons are read this run`,
        )
        stopped = true

        return { kind: 'stopped' }
    }
  }

  /** Makes sure the label of an item is in `wikidata_items`. False when a request failed. */
  async function labelOf(id: string): Promise<boolean> {
    if (labels.has(id) || unlabelled.has(id)) {
      return true
    }

    report.itemsAsked++

    const answer = await ask(itemUrl(wikidata, id))

    if (answer.kind === 'failed' || answer.kind === 'stopped') {
      return false
    }

    const label = answer.kind === 'text' ? readLabel(answer.text) : null

    if (label === null) {
      unlabelled.add(id)
      report.warnings.push(`Persons: ${id} has no label in Dutch or English, so it is skipped`)
    } else {
      await storeWikidataLabel(db, id, label.slice(0, 255))
      labels.set(id, label.slice(0, 255))
    }

    return true
  }

  for (const person of todo) {
    if (stopped) {
      break
    }

    let wikidataId = person.wikidataId
    let pageId = person.wikipediaPageId

    if (wikidataId === null) {
      report.articlesAsked++

      const answer = await ask(infoUrl(origin, person.wikipediaPage))

      if (answer.kind === 'failed' || answer.kind === 'stopped') {
        continue
      }

      const info = answer.kind === 'text' ? readArticleInfo(answer.text) : 'missing'

      if (info === null) {
        failures.push(`${printable(person.wikipediaPage)}: the page information has no page number`)
        failuresInARow++
        stopped = failuresInARow >= mostFailuresInARow

        continue
      }
      if (info === 'missing' || info.wikidataId === null) {
        // No article, or an article without an item: nothing to read, and nothing to guess.
        await finish(person, {
          birthDate: null,
          birthPlaceId: null,
          nationalityIds: [],
          positionIds: [],
          wikidataId: null,
          wikipediaPageId: info === 'missing' ? null : info.pageId,
        })

        continue
      }

      wikidataId = info.wikidataId
      pageId = info.pageId
    }

    const owner = owners.get(wikidataId)

    if (owner !== undefined && owner !== person.wikipediaPage) {
      report.warnings.push(
        `Persons: '${printable(person.wikipediaPage)}' and '${printable(owner)}' have the same item ${wikidataId}, so only the first keeps it`,
      )
      await finish(person, {
        birthDate: null,
        birthPlaceId: null,
        nationalityIds: [],
        positionIds: [],
        wikidataId: null,
        wikipediaPageId: pageId,
      })

      continue
    }

    report.itemsAsked++

    const answer = await ask(itemUrl(wikidata, wikidataId))

    if (answer.kind === 'stopped') {
      continue
    }
    if (answer.kind === 'failed') {
      // Keep the Q-number, so the next run asks for the item and not for the article.
      await rememberWikidataId(db, person.id, wikidataId, pageId)
      owners.set(wikidataId, person.wikipediaPage)

      continue
    }

    const item = answer.kind === 'text' ? readItem(answer.text) : null

    if (answer.kind === 'text' && item === null) {
      failures.push(`${printable(itemUrl(wikidata, wikidataId))}: the answer is not an item`)
      failuresInARow++
      stopped = failuresInARow >= mostFailuresInARow
      await rememberWikidataId(db, person.id, wikidataId, pageId)
      owners.set(wikidataId, person.wikipediaPage)

      continue
    }
    if (item === null) {
      // The item is gone (404): the person stays without data.
      await finish(person, {
        birthDate: null,
        birthPlaceId: null,
        nationalityIds: [],
        positionIds: [],
        wikidataId: null,
        wikipediaPageId: pageId,
      })

      continue
    }

    // The labels of the place, the countries and the positions. One that cannot be asked leaves
    // the person unread, with the Q-number kept.
    const wanted = [
      ...new Set([...(item.placeId === null ? [] : [item.placeId]), ...item.nationalityIds, ...item.positionIds]),
    ]
    let complete = true

    for (const id of wanted) {
      if (stopped || !(await labelOf(id))) {
        complete = false

        break
      }
    }

    if (!complete) {
      await rememberWikidataId(db, person.id, wikidataId, pageId)
      owners.set(wikidataId, person.wikipediaPage)

      continue
    }

    const known = (id: string) => labels.has(id)
    owners.set(item.id, person.wikipediaPage)
    await finish(
      person,
      {
        birthDate: item.birth,
        birthPlaceId: item.placeId !== null && known(item.placeId) ? item.placeId : null,
        nationalityIds: item.nationalityIds.filter(known),
        positionIds: item.positionIds.filter(known),
        wikidataId: item.id,
        wikipediaPageId: pageId,
      },
      lineOfPositions(item.positionIds),
      item.death,
    )
  }

  if (failures.length > 0) {
    report.warnings.unshift(
      `Persons: ${failures.length} ${failures.length === 1 ? 'request' : 'requests'} to read persons failed, so those persons are tried again next run: ${printable(failures.slice(0, 3).join('; '))}`,
    )
  }

  return report

  /**
   * Stores a person whole and counts him. His line is the one of our list, else the one of the
   * positions on Wikidata, else the one he has from the old fansite (#1052), else the one of
   * the squad lists, else none. A line the editors set in the admin before he was read stays
   * as it is.
   */
  async function finish(
    person: PersonToRead,
    data: Omit<PersonData, 'birthDate' | 'deathDate' | 'line'> & {
      birthDate: Exclude<PersonData['birthDate'], 'keep'>
    },
    positionLine: null | PlayerPosition = null,
    death: PersonData['deathDate'] = null,
  ): Promise<void> {
    const manual = lines.get(person.wikipediaPage)
    const squad = fromSquad.get(person.id)
    const line =
      manual !== undefined
        ? { line: manual, source: 'manual' as const }
        : positionLine !== null
          ? { line: positionLine, source: 'wikidata' as const }
          : squad !== undefined
            ? { line: squad, source: 'squad' as const }
            : null

    const kept =
      manual === undefined &&
      (person.lineSource === 'manual' || (person.lineSource === 'old-site' && positionLine === null))
        ? person.lineSource
        : null
    const stored = kept === null ? line : ('keep' as const)

    await db.transaction((transaction) =>
      storePersonData(
        transaction,
        person.id,
        {
          ...data,
          // A date the editors set in the admin stays (#1147, #1164).
          birthDate: person.birthDateSource === 'manual' ? 'keep' : data.birthDate,
          deathDate: person.deathDateSource === 'manual' ? 'keep' : death,
          line: stored,
        },
        clock(),
      ),
    )
    report.read++

    if (person.readAt !== null) {
      report.reread++
    }

    if (data.birthDate !== null) {
      report.birthDate++
    }
    if (data.nationalityIds.length > 0) {
      report.nationality++
    }
    if (kept !== null) {
      report.lines[kept]++
    } else if (line !== null) {
      report.lines[line.source]++
    }
    if (data.wikidataId === null) {
      report.empty++
    }
  }
}
