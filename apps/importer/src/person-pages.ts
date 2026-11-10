import type { Database } from '@fansite/db/client'

import { fillPlayerFrom, mergePersons, mergePlayerInto } from '@fansite/db/person-merge'
import {
  knownPersonPages,
  type PersonName,
  type PersonNameCounts,
  personNamesBySource,
  rememberedPersonArticles,
} from '@fansite/db/persons'
import { isOfEditors } from '@fansite/db/player-field-differences'
import { type Player, players, playerSources } from '@fansite/db/schema'
import { eq, inArray } from 'drizzle-orm'

import type { Fetcher } from './fetcher.ts'

import { lookUpTitles } from './club-pages.ts'
import { oldSiteNameCorrections } from './old-site-names.ts'
import { fitsColumns, manualNames, nameOfTitle, personNameOf } from './person-name.ts'
import { personNames, type PersonTitleAlias, personTitleAliases } from './person-names.ts'
import { nameKey, searchTerm } from './read-squad.ts'
import { printable } from './text.ts'

// The page Kwaliteit of the admin lists the same groups, so the function is in the database
// package; the import and the status keep finding it here.
export { similarPersons } from '@fansite/db/persons'

/** The most requests in a row that may fail before the import stops asking for this run. */
export const mostFailuresInARow = 3

/** A player that is in a season twice and stays so, with the reason. */
export type DoublePlayer = { name: string; reason: string; season: string }

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

/** The players that are in a season twice and that the import did not merge, with why. */
export async function doublePlayers(db: Pick<Database, 'select'>): Promise<DoublePlayer[]> {
  return planDoublePlayers(await db.select().from(players)).left
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

/**
 * Merges the persons the owner said are one person (`personTitleAliases`), before an import
 * asks Wikipedia about its titles: see `mergePersons`. A person that gets the title that stays
 * gets the name the import guesses from that title, or the one of the list `personNames`.
 * Returns the lines for the warnings of the run, each starting with `Persons:`: one for each
 * person merged or renamed, and one for what two merged persons had and differed. A run with
 * nothing to merge returns none.
 */
export async function mergeListedPersons(
  db: Pick<Database, 'select' | 'transaction'>,
  list: readonly PersonTitleAlias[] = personTitleAliases,
): Promise<string[]> {
  const manual = manualNames(personNames)
  const names = new Map(
    list.flatMap(({ title }) => {
      const name = personNameOf(title, null, manual)

      return fitsColumns(name) ? [[title, name] as const] : []
    }),
  )
  const { merged, warnings } = await mergePersons(db, list, names)
  const spellings = [...(await chooseListedPlayerSpellings(db, list)), ...(await mergeDoublePlayers(db))]

  return [
    ...merged.map((line) => printable(`Persons: ${line}`)),
    ...warnings.map((line) => printable(line)),
    ...spellings.map((line) => printable(`Players: ${line}`)),
  ]
}

/**
 * Plans which rows of `players` are one player twice in a season (issue 1042). Two rows are
 * one player when they have the same person, or the same name after `oldSiteNameCorrections`
 * and `nameKey`. Two rows with the same name and two different persons are two players, and a
 * row without a person is not given to one of several persons: they stay and are in `left`.
 * Of two rows the one the editors added or changed stays, then the one of the better source
 * (`playerSources`), then the older one. Pure: it reads `rows` and changes nothing.
 */
export function planDoublePlayers(rows: readonly Player[]): {
  left: DoublePlayer[]
  merges: { gone: Player; stays: Player }[]
} {
  const merges: { gone: Player; stays: Player }[] = []
  const left: DoublePlayer[] = []
  const rank = (row: Player) => (isOfEditors(row) ? 0 : playerSources.length) + playerSources.indexOf(row.source)
  const best = (group: Player[]) => group.toSorted((a, b) => rank(a) - rank(b) || a.id - b.id)
  const bySeason = groupBy(rows, (row) => row.season)

  for (const [season, all] of bySeason) {
    let kept = all

    // The same person first, so that a person with two spellings is one row.
    for (const group of groupBy(
      kept.filter((row) => row.personId !== null),
      (row) => row.personId,
    ).values()) {
      const [stays, ...gone] = best(group)

      merges.push(...gone.map((row) => ({ gone: row, stays: stays! })))
      kept = kept.filter((row) => !gone.includes(row))
    }

    for (const group of groupBy(kept, (row) => nameKey(oldSiteNameCorrections.get(row.name) ?? row.name)).values()) {
      if (group.length < 2) {
        continue
      }

      const [stays, ...gone] = best(group)

      if (new Set(group.flatMap((row) => (row.personId === null ? [] : [row.personId]))).size > 1) {
        left.push({
          name: stays!.name,
          reason: 'the rows are of different persons, or one has no person and could be either',
          season,
        })
        continue
      }
      merges.push(...gone.map((row) => ({ gone: row, stays: stays! })))
    }
  }

  return { left, merges }
}

/**
 * The search term of a player whose row gets an other spelling of his name: the surname of the
 * old name in the new spelling (`Samardžić`), or the new surname.
 */
export function renamedSearchTerm(row: { name: string; searchTerm: string }, name: string): string {
  return name.length === row.name.length && nameKey(row.name).endsWith(nameKey(row.searchTerm))
    ? name.slice(-row.searchTerm.length)
    : nameKey(name).endsWith(` ${nameKey(row.searchTerm)}`)
      ? row.searchTerm
      : searchTerm(name)
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

/**
 * Gives a player whose page is an other title of the list the title that stays (issue 1036).
 * A scorer that Wikipedia links under a redirect (`Filip Djuričić`) already has the person of
 * the title that stays, because the person book follows the redirect, so `mergePersons` finds
 * nothing to merge, but his row of the season keeps the page and the name of the redirect.
 * The row gets the page, the name and the search term of the title that stays; when the season
 * has a row with that page already, the two become one (`mergePlayerInto`). A page that is no
 * other title costs one query, so a second run changes and says nothing.
 */
async function chooseListedPlayerSpellings(
  db: Pick<Database, 'select' | 'transaction'>,
  list: readonly PersonTitleAlias[],
): Promise<string[]> {
  const lines: string[] = []
  const aliases = list.flatMap((entry) => entry.aliases)

  if (aliases.length === 0) {
    return lines
  }

  const rows = await db.select().from(players).where(inArray(players.wikipediaPage, aliases))

  for (const { aliases: others, title } of list) {
    for (const row of rows.filter((one) => one.wikipediaPage !== null && others.includes(one.wikipediaPage))) {
      const name = nameOfTitle(title)

      await db.transaction(async (tx) => {
        const same = (await tx.select().from(players).where(eq(players.season, row.season))).find(
          (one) => one.id !== row.id && (one.wikipediaPage === title || one.name === name),
        )

        if (same !== undefined) {
          await mergePlayerInto(tx, row.id, same.id)
          lines.push(`${row.name} (${row.season}) is merged into ${same.name}`)

          return
        }

        await tx
          .update(players)
          .set({ name, searchTerm: renamedSearchTerm(row, name), wikipediaPage: title })
          .where(eq(players.id, row.id))
        lines.push(`${row.name} (${row.season}) is now ${name}`)
      })
    }
  }

  return lines
}

function groupBy<Key>(rows: readonly Player[], key: (row: Player) => Key): Map<Key, Player[]> {
  const groups = new Map<Key, Player[]>()

  for (const row of rows) {
    groups.set(key(row), [...(groups.get(key(row)) ?? []), row])
  }

  return groups
}

/**
 * Makes two rows of one player in a season one (`planDoublePlayers`), with `mergePlayerInto`:
 * the goals, the appearances and the numbers go to the row that stays, and what that row lacks
 * (the page, the person, the shirt number) comes from the other, except what the editors set.
 * Returns a line for each row merged; a second run finds none.
 */
async function mergeDoublePlayers(db: Pick<Database, 'select' | 'transaction'>): Promise<string[]> {
  const { merges } = planDoublePlayers(await db.select().from(players))
  const lines: string[] = []

  for (const { gone, stays } of merges) {
    await db.transaction(async (tx) => {
      await mergePlayerInto(tx, gone.id, stays.id)
      await fillPlayerFrom(tx, stays, gone)
    })
    lines.push(`${gone.name} (${gone.season}) is merged into ${stays.name}`)
  }

  return lines
}
