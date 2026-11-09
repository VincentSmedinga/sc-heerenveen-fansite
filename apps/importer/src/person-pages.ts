import type { Database } from '@fansite/db/client'

import {
  knownPersonPages,
  type PersonName,
  type PersonNameCounts,
  personNamesBySource,
  rememberedPersonArticles,
} from '@fansite/db/persons'

import type { Fetcher } from './fetcher.ts'

import { lookUpTitles } from './club-pages.ts'
import { fitsColumns, manualNames, personNameOf } from './person-name.ts'
import { personNames } from './person-names.ts'
import { printable } from './text.ts'

// The page Kwaliteit of the admin lists the same groups, so the function is in the database
// package; the import and the status keep finding it here.
export { similarPersons } from '@fansite/db/persons'

/** The most requests in a row that may fail before the import stops asking for this run. */
export const mostFailuresInARow = 3

/** What came of asking Wikipedia about the titles of persons. */
export type PersonLookup = {
  /**
   * How many titles the import looked up on Wikipedia. A title that is a redirect costs one
   * request more for each step, and a title that a redirect already led to costs none.
   */
  asked: number
  /**
   * The name of each article it learnt about, by the title of the article: from the sort key,
   * guessed, or from the list `personNames`. It has the persons without a name too, and the
   * persons whose name the list gives; `storePersonNames` keeps the rest of the rules.
   */
  names: Map<string, PersonName>
  /**
   * Each title it asked about, redirects on the way included, with the title of the article the
   * redirects end in: the title itself when it is no redirect, and when it has no article.
   */
  redirects: Map<string, string>
  /** The lines for the warnings of the run, in English, each starting with `Persons:`. */
  warnings: string[]
}

/**
 * The line for the log about the persons of a run: the titles asked of Wikipedia, the persons
 * made, the titles remembered and the names stored, by source. No lines when it asked and made
 * nothing, so a run that has nothing new says nothing.
 */
export function describePersons(
  asked: number,
  counts: { people: number; titles: number },
  names: PersonNameCounts = { guess: 0, manual: 0, sort_key: 0 },
): string[] {
  const plural = (count: number, word: string) => `${count} ${count === 1 ? word : `${word}s`}`
  const named = names.sort_key + names.guess + names.manual

  return asked === 0 && counts.people === 0 && named === 0
    ? []
    : [
        `persons: ${plural(asked, 'title')} asked, ${plural(counts.people, 'new person')}, ${plural(counts.titles, 'title')} remembered` +
          (named === 0
            ? ''
            : `, ${plural(named, 'name')} stored (${names.sort_key} from a sort key, ${names.guess} guessed, ${names.manual} from the list)`),
      ]
}

/** The warnings of a run for the names it guessed: the title and what came of it. */
export function guessedNameWarnings(guessed: readonly { name: PersonName; title: string }[]): string[] {
  return guessed.map(
    ({ name, title }) =>
      `Persons: guessed the name of '${printable(title)}': given name '${printable(name.givenName ?? '')}', prefix '${printable(name.familyNamePrefix ?? '')}', family name '${printable(name.familyName)}'`,
  )
}

/**
 * Asks Wikipedia once about each title of a person that the database does not know yet
 * (`knownPersonPages`), and about no other: a title that is in `person_pages` costs no request.
 * It uses `lookUpTitles` for each title on its own, so one title that fails does not take the
 * answers of the others with it:
 *
 * - a title that answers 404 has no article. It is a person under the title as it stands.
 * - a request that fails gives no answer for that title. The goal or player stays without a
 *   person until the next run, and a line says so. After `mostFailuresInARow` failures in a row
 *   the import stops asking for this run.
 * - robots.txt that refuses a request, and Wikipedia asking us to wait, stop it at once.
 *
 * It never throws for a failed request: a season must not fall on one player of an opponent.
 * `aliases` maps a title to the title that stays (`personTitleAliases`); the title that stays
 * is the one that is asked.
 */
export async function lookUpPersonPages(
  db: Pick<Database, 'select'>,
  fetcher: Fetcher,
  origin: string,
  titles: readonly string[],
  aliases: ReadonlyMap<string, string> = new Map(),
): Promise<PersonLookup> {
  const known = await knownPersonPages(db)
  const articles = await rememberedPersonArticles(db)
  const sources = await personNamesBySource(db)
  const manual = manualNames(personNames)
  const redirects = new Map<string, string>()
  const names = new Map<string, PersonName>()
  const warnings: string[] = []
  // A person who has no name yet is asked about once more, to read the sort key of his article.
  const nameless = [...sources].flatMap(([title, source]) => (source === null ? [title] : []))
  const wanted = [
    ...new Set(titles.filter((title) => !known.has(title)).map((title) => aliases.get(title) ?? title)),
    ...nameless,
  ].filter((title, index, all) => all.indexOf(title) === index && (!known.has(title) || nameless.includes(title)))

  // A name from the list goes before every other, also on a person who has one already.
  for (const [title, name] of manual) {
    if (sources.has(title) && sources.get(title) !== 'manual') {
      names.set(title, name)
    }
  }

  const nameArticle = (article: string, sortKey: null | string) => {
    const name = personNameOf(article, sortKey, manual)

    if (fitsColumns(name)) {
      names.set(article, name)
    } else {
      warnings.push(`Persons: the name of '${printable(article)}' is too long to store`)
    }
  }
  const failed: string[] = []
  let asked = 0
  let failuresInARow = 0
  let stopped = false

  for (const title of wanted) {
    if (redirects.has(title)) {
      continue
    }

    asked++

    const lookup = await lookUpTitles(fetcher, origin, [title], articles)

    switch (lookup.kind) {
      case 'blocked-by-robots':
        warnings.push(
          `Persons: robots.txt does not allow ${printable(lookup.url)}, so no more titles are asked this run`,
        )
        stopped = true
        break
      case 'error':
        if (lookup.missing === undefined) {
          failed.push(lookup.message)
          failuresInARow++
          stopped = failuresInARow >= mostFailuresInARow
        } else {
          // The title has no article: it is a person as it stands.
          failuresInARow = 0
          redirects.set(title, title)
          articles.set(title, title)
          nameArticle(title, null)
        }

        break
      case 'found':
        failuresInARow = 0

        for (const [one, end] of lookup.redirects) {
          redirects.set(one, end)
          articles.set(one, end)
        }
        for (const article of new Set(lookup.redirects.values())) {
          nameArticle(article, lookup.sortKeys.get(article) ?? null)
        }

        break
      case 'wait':
        warnings.push(
          `Persons: Wikipedia asks us to wait (${printable(lookup.url)}), so no more titles are asked this run`,
        )
        stopped = true
        break
    }

    if (stopped) {
      break
    }
  }

  if (failed.length > 0) {
    warnings.unshift(
      `Persons: ${failed.length} ${failed.length === 1 ? 'title' : 'titles'} could not be asked, so their goals and players have no person until the next run: ${printable(failed.slice(0, 3).join('; '))}`,
    )
  }

  return { asked, names, redirects, warnings }
}

/** The warning for `similarPersons`, or undefined when no persons look alike. */
export function similarPersonsWarning(groups: readonly (readonly string[])[]): string | undefined {
  if (groups.length === 0) {
    return undefined
  }

  const shown = groups
    .slice(0, 5)
    .map((titles) => titles.map((title) => `'${title}'`).join(' and '))
    .join(', ')

  return `Persons: ${groups.length} ${groups.length === 1 ? 'group' : 'groups'} of persons look alike and are not merged: ${printable(shown)}${groups.length > 5 ? ', …' : ''}`
}
