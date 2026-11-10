// Gives the players of the English Wikipedia a person (issue 1043). A row of the English reader
// has no Dutch page, because the titles of the two Wikipedias differ, so `storePlayers` could
// not find a person for it. Two steps, the cheap one first:
//
// 1. The exact name (`nameKey`) of a person who is on a row of another season: no request.
// 2. The English link of the player. The page information of the English Wikipedia gives the
//    item of Wikidata, and the item gives the title of the Dutch article. That title goes to
//    the person lookup (`lookUpPersonPages`) as it is, so the person book finds or makes the
//    person. A player without a Dutch article gets a person under the English title, marked as
//    such (`persons.english_title`).
//
// An English title that is in `person_pages` already costs no request, as everywhere.
import type { Database } from '@fansite/db/client'

import { knownPersonPages, type PersonName } from '@fansite/db/persons'
import { players } from '@fansite/db/schema'
import { isNotNull } from 'drizzle-orm'

import type { Fetcher } from './fetcher.ts'
import type { MergedPlayer } from './import-past-squad.ts'

import { infoUrl, itemUrl } from './import-person-data.ts'
import { fitsColumns, manualNames, personNameOf } from './person-name.ts'
import { personNames } from './person-names.ts'
import { mostFailuresInARow } from './person-pages.ts'
import { nameKey } from './read-squad.ts'
import { printable } from './text.ts'
import { readArticleInfo, readDutchTitle } from './wikidata-item.ts'

export type EnglishPersonOptions = {
  englishOrigin: string
  /** The milliseconds between two requests. */
  pause: number
  /** Null: no Wikidata to ask, so only the name finds a person. */
  wikidataOrigin: null | string
}

/** What came of finding the persons of the players of the English Wikipedia. */
export type EnglishPersons = {
  /** The English title of each player with a Dutch article, with the title of that article. */
  aliases: Map<string, string>
  /** How many requests it made (pages of information and items). */
  asked: number
  /** The English titles of the players without a Dutch article: no Dutch title to go to. */
  englishOnly: Set<string>
  /** The English titles of the players that `person_pages` knows already. */
  known: Set<string>
  warnings: string[]
}

/**
 * Makes the English titles of the players without a Dutch article persons as they stand, in
 * the answer of the person lookup: the title is its own article, and the name is guessed from
 * it, as for a title that answers 404 (`lookUpPersonPages`).
 */
export function addEnglishOnly(
  lookup: { names: Map<string, PersonName>; redirects: Map<string, string> },
  englishOnly: ReadonlySet<string>,
): void {
  const manual = manualNames(personNames)

  for (const title of englishOnly) {
    const name = personNameOf(title, null, manual)

    lookup.redirects.set(title, title)
    if (fitsColumns(name)) {
      lookup.names.set(title, name)
    }
  }
}

/**
 * Gives the players with an English link and no page a person: by name (step 1, which sets
 * `personId` on the player) or by asking (step 2, which fills the result). It asks once for
 * each title that is not in `person_pages`, pauses between requests, and stops for this run
 * after `mostFailuresInARow` failures in a row, or at once when robots.txt refuses a request or
 * Wikipedia asks us to wait. A title that could not be asked leaves the player without a
 * person until the next run. It never throws for a failed request.
 */
export async function findEnglishPersons(
  db: Pick<Database, 'select'>,
  fetcher: Fetcher,
  found: MergedPlayer[],
  { englishOrigin, pause, wikidataOrigin }: EnglishPersonOptions,
): Promise<EnglishPersons> {
  const result: EnglishPersons = {
    aliases: new Map(),
    asked: 0,
    englishOnly: new Set(),
    known: new Set(),
    warnings: [],
  }
  const without = found.filter((player) => player.page === null && player.englishPage !== null)

  if (without.length === 0) {
    return result
  }

  // Step 1: a name that is of one person only.
  const ofName = new Map<string, Set<number>>()

  for (const row of await db
    .select({ name: players.name, personId: players.personId })
    .from(players)
    .where(isNotNull(players.personId))) {
    ofName.set(nameKey(row.name), (ofName.get(nameKey(row.name)) ?? new Set()).add(row.personId as number))
  }
  for (const player of without) {
    const persons = ofName.get(nameKey(player.name))

    if (persons?.size === 1) {
      player.personId = [...persons][0] ?? null
    }
  }

  // Step 2: the English link.
  const known = await knownPersonPages(db)

  for (const player of without) {
    if (player.personId === null && known.has(player.englishPage ?? '')) {
      result.known.add(player.englishPage ?? '')
    }
  }

  if (wikidataOrigin === null) {
    return result
  }

  const titles = [
    ...new Set(
      without.flatMap((player) =>
        player.personId === null && !known.has(player.englishPage ?? '') ? [player.englishPage ?? ''] : [],
      ),
    ),
  ]
  const failed: string[] = []
  let failuresInARow = 0
  let stopped = false

  type Answer = { kind: 'failed' | 'missing' | 'stopped' } | { kind: 'text'; text: string }

  async function ask(url: string): Promise<Answer> {
    if (result.asked > 0 && pause > 0) {
      await new Promise((resolve) => setTimeout(resolve, pause))
    }

    result.asked++

    const outcome = await fetcher.fetch(url)

    switch (outcome.kind) {
      case 'blocked-by-robots':
        result.warnings.push(
          `Persons: robots.txt does not allow ${printable(outcome.url)}, so no more English titles are asked this run`,
        )
        stopped = true

        return { kind: 'stopped' }
      case 'error':
        if (outcome.reason === 'http-status' && outcome.status === 404) {
          failuresInARow = 0

          return { kind: 'missing' }
        }

        failed.push(`${printable(url)}: ${printable(outcome.message)}`)
        failuresInARow++
        stopped = failuresInARow >= mostFailuresInARow

        return { kind: 'failed' }
      case 'fetched':
        failuresInARow = 0

        return { kind: 'text', text: new TextDecoder('utf-8').decode(outcome.body) }
      case 'not-modified':
        failed.push(`${printable(url)}: the page answered 304 to a request without conditions`)
        failuresInARow++
        stopped = failuresInARow >= mostFailuresInARow

        return { kind: 'failed' }
      case 'wait':
        result.warnings.push(
          `Persons: the server asks us to wait (${printable(outcome.url)}), so no more English titles are asked this run`,
        )
        stopped = true

        return { kind: 'stopped' }
    }
  }

  for (const title of titles) {
    if (stopped) {
      break
    }

    const info = await ask(infoUrl(englishOrigin, title))

    if (info.kind === 'failed' || info.kind === 'stopped') {
      continue
    }

    const article = info.kind === 'text' ? readArticleInfo(info.text) : 'missing'

    if (article === null) {
      failed.push(`${printable(title)}: the page information has no page number`)
      failuresInARow++
      stopped = failuresInARow >= mostFailuresInARow

      continue
    }
    if (article === 'missing') {
      // No article even on the English Wikipedia: nothing to build a person on.
      continue
    }
    if (article.wikidataId === null) {
      result.englishOnly.add(title)

      continue
    }

    const item = await ask(itemUrl(wikidataOrigin, article.wikidataId))

    if (item.kind === 'failed' || item.kind === 'stopped') {
      continue
    }

    const dutch = item.kind === 'text' ? readDutchTitle(item.text) : null

    if (dutch === null) {
      result.englishOnly.add(title)
    } else {
      result.aliases.set(title, dutch)
    }
  }

  if (failed.length > 0) {
    result.warnings.unshift(
      `Persons: ${failed.length} English ${failed.length === 1 ? 'title' : 'titles'} could not be asked, so their players have no person until the next run: ${printable(failed.slice(0, 3).join('; '))}`,
    )
  }

  return result
}
