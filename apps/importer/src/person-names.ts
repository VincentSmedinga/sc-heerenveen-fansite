import type { PersonTitleAlias } from '@fansite/db/person-merge'

import type { PersonNameEntry } from './person-name.ts'

// The names that look alike and are different people. The list is in the database package,
// because the page Kwaliteit of the admin leaves them out too (`similarPersons`).
export { personsWhoDiffer } from '@fansite/db/persons'
export type { PersonTitleAlias }

/**
 * Two or more titles of Wikipedia that are one person while no redirect says so, each with the
 * title that stays and the other titles. The importer looks a title up here before it asks
 * Wikipedia: an other title is the person of the title that stays, and costs no request.
 *
 * `Persons:` in the log of the import warns when two persons look alike (`similarPersons`).
 * Add a person here only after you checked that it is one person: two players with the same
 * name are two persons, and their titles differ by the addition between brackets. Two who
 * look alike and are two people go in `personsWhoDiffer`. The redirects on Wikipedia join the
 * other titles we know of.
 *
 * An other title that is a person of its own already is merged into the person of the title
 * that stays, at the start of every import of matches or of a squad (`mergeListedPersons`).
 * The owner decided these four on 10 November 2026 (issue 1027).
 *
 * Example: `{ aliases: ['Jan Jansen (voetballer)'], title: 'Jan Jansen (voetballer, 1990)' }`.
 */
export const personTitleAliases: readonly PersonTitleAlias[] = [
  { aliases: ['Jan-Harm Schippers'], title: 'Jan Harm Schippers' },
  { aliases: ['Radoslav Samardzic'], title: 'Radoslav Samardžić' },
  { aliases: ['Robert van der Berg'], title: 'Robert van den Berg' },
  { aliases: ['Ugur Yıldırım'], title: 'Uğur Yıldırım' },
]

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
