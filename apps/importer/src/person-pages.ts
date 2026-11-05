import type { Database } from '@fansite/db/client'

import { knownPersonPages, rememberedPersonArticles } from '@fansite/db/persons'
import { persons } from '@fansite/db/schema'
import { asc } from 'drizzle-orm'

import type { Fetcher } from './fetcher.ts'

import { lookUpTitles } from './club-pages.ts'
import { printable } from './text.ts'

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
   * Each title it asked about, redirects on the way included, with the title of the article the
   * redirects end in: the title itself when it is no redirect, and when it has no article.
   */
  redirects: Map<string, string>
  /** The lines for the warnings of the run, in English, each starting with `Persons:`. */
  warnings: string[]
}

/**
 * The line for the log about the persons of a run: the titles asked of Wikipedia, the persons
 * made and the titles remembered. No lines when it asked and made nothing, so a run that has
 * nothing new says nothing.
 */
export function describePersons(asked: number, counts: { people: number; titles: number }): string[] {
  const plural = (count: number, word: string) => `${count} ${count === 1 ? word : `${word}s`}`

  return asked === 0 && counts.people === 0
    ? []
    : [
        `persons: ${plural(asked, 'title')} asked, ${plural(counts.people, 'new person')}, ${plural(counts.titles, 'title')} remembered`,
      ]
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
  const redirects = new Map<string, string>()
  const warnings: string[] = []
  const wanted = [
    ...new Set(titles.filter((title) => !known.has(title)).map((title) => aliases.get(title) ?? title)),
  ].filter((title) => !known.has(title))
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
        }

        break
      case 'found':
        failuresInARow = 0

        for (const [one, end] of lookup.redirects) {
          redirects.set(one, end)
          articles.set(one, end)
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

  return { asked, redirects, warnings }
}

/**
 * The persons whose titles are the same without accents, capitals, hyphens, spaces and
 * apostrophes, the addition between brackets included (`Johnny Jansen (1952)` and `(1975)` are
 * not alike). Each group lists the titles of the persons, in the order of their `id`. The
 * import warns about them and merges nothing: two players can have the same name. Join them
 * with `personTitleAliases` when they are one person.
 */
export async function similarPersons(db: Pick<Database, 'select'>): Promise<string[][]> {
  const groups = new Map<string, string[]>()

  for (const { wikipediaPage } of await db.select().from(persons).orderBy(asc(persons.id))) {
    const key = normalisePersonTitle(wikipediaPage)

    groups.set(key, [...(groups.get(key) ?? []), wikipediaPage])
  }

  return [...groups.values()].filter((titles) => titles.length > 1)
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

/** A title as a computer compares it: no accents, capitals, hyphens, spaces or apostrophes. */
function normalisePersonTitle(title: string): string {
  return title
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]/gu, '')
}
