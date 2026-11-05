import type { PersonNameEntry } from './person-name.ts'

/**
 * Two or more titles of Wikipedia that are one person while no redirect says so, each with the
 * title that stays and the other titles. The importer looks a title up here before it asks
 * Wikipedia: an other title is the person of the title that stays, and costs no request.
 *
 * `Persons:` in the log of the import warns when two persons look alike (`similarPersons`).
 * Add a person here only after you checked that it is one person: two players with the same
 * name are two persons, and their titles differ by the addition between brackets. The list
 * starts empty because the redirects on Wikipedia join the titles we know of.
 *
 * Example: `{ aliases: ['Jan Jansen (voetballer)'], title: 'Jan Jansen (voetballer, 1990)' }`.
 */
export const personTitleAliases: readonly PersonTitleAlias[] = []

/** The title that stays and the other titles that are the same person. */
export type PersonTitleAlias = {
  /** The other titles. They are never the title of a person of their own. */
  aliases: readonly string[]
  /** The title that stays: the article of the person, or the title of a person without one. */
  title: string
}

/** The map for `createPersonBook` and `lookUpPersonPages`: a title to the one that stays. */
export function aliasMap(list: readonly PersonTitleAlias[]): Map<string, string> {
  return new Map(list.flatMap(({ aliases, title }) => aliases.map((alias) => [alias, title] as const)))
}

/**
 * The name of a person, by his title, for a name that neither the sort key of the article nor
 * the guess of the import gets right. It goes before everything and is never replaced. The
 * list starts empty: the import writes a warning with `Persons:` for each name it guessed, and
 * the ones that are wrong go here after you checked them.
 *
 * Example:
 * `{ familyName: 'Vaart', familyNamePrefix: 'van der', givenName: 'Rafael',
 * title: 'Rafael van der Vaart' }`.
 */
export const personNames: readonly PersonNameEntry[] = []
