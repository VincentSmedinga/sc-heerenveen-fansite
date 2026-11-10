import type { PersonTitleAlias } from '@fansite/db/person-merge'
import type { PersonName } from '@fansite/db/persons'

import { personTitleAliases } from '@fansite/db/persons'

import { manualNames, nameOfTitle, type PersonNameEntry } from './person-name.ts'

// The names that look alike and are different people. The list is in the database package,
// because the page Kwaliteit of the admin leaves them out too (`similarPersons`).
export { personsWhoDiffer } from '@fansite/db/persons'
export type { PersonTitleAlias }

// The titles that are one person, for the same reason: the page Kwaliteit leaves them out of
// the check against the list of players (`playerListReport`). The explanation is there.
export { personTitleAliases }

/** The map for `createPersonBook` and `lookUpPersonPages`: a title to the one that stays. */
export function aliasMap(list: readonly PersonTitleAlias[]): Map<string, string> {
  return new Map(list.flatMap(({ aliases, title }) => aliases.map((alias) => [alias, title] as const)))
}

/**
 * The name and the page of a player of a squad table, in the spelling that stays. A table of
 * Wikipedia can keep linking or writing an other title of `personTitleAliases`; stored as it
 * stands it would be a second row next to the player of the title that stays, and bring the
 * old spelling back. A page that is an other title becomes the title that stays, and so does a
 * name that is one, when it has no link or links to one of the two titles: a link to another
 * article is another person. Anything else comes back as it is.
 */
export function chosenSpelling(
  name: string,
  page: null | string,
  aliases: ReadonlyMap<string, string> = aliasMap(personTitleAliases),
  names: ReadonlyMap<string, PersonName> = manualNames(personNames),
): { name: string; page: null | string } {
  const ofPage = page === null ? undefined : aliases.get(page)
  const ofName = [...aliases].find(([alias]) => nameOfTitle(alias) === name)?.[1]
  const samePerson = page === null || page === ofName || ofPage === ofName
  const chosen = {
    name: ofName !== undefined && samePerson ? nameOfTitle(ofName) : name,
    page: ofPage ?? page,
  }

  return { name: listedName(chosen.name, chosen.page, aliases, names) ?? chosen.name, page: chosen.page }
}

/**
 * The name `personNames` gives a player whose row says the title of the person, or an other
 * title, in words: the title is `Igor Kornejev` and the name `Igor Korneev`. A name the table
 * shows in its own way (`R. van der Berg`) stays. A row without a page gets the name when it
 * says the name of a listed title.
 */
export function listedName(
  name: string,
  page: null | string,
  aliases: ReadonlyMap<string, string> = aliasMap(personTitleAliases),
  names: ReadonlyMap<string, PersonName> = manualNames(personNames),
): string | undefined {
  const spellings = (title: string) => [
    nameOfTitle(title),
    ...[...aliases].filter(([, stays]) => stays === title).map(([alias]) => nameOfTitle(alias)),
  ]
  const title =
    page === null ? [...names.keys()].find((one) => spellings(one).includes(name)) : (aliases.get(page) ?? page)

  return title !== undefined && spellings(title).includes(name) ? names.get(title)?.name : undefined
}

/**
 * The name of a person, by his title, for a name that neither the sort key of the article nor
 * the guess of the import gets right. It goes before everything and is never replaced. The
 * import writes a warning with `Persons:` for each name it guessed, and the ones that are wrong
 * go here after you checked them. A name the owner chose that is no title of Wikipedia goes
 * here too, and the row of a player gets it as well (`listedName`).
 *
 * Example:
 * `{ familyName: 'Vaart', familyNamePrefix: 'van der', givenName: 'Rafael',
 * title: 'Rafael van der Vaart' }`.
 */
export const personNames: readonly PersonNameEntry[] = [
  { familyName: 'Radomski', givenName: 'Arek', title: 'Arkadiusz Radomski' },
  { familyName: 'Nørregaard', givenName: 'Hjalte Bo', title: 'Hjalte Bo Nørregaard' },
  { familyName: 'Korneev', givenName: 'Igor', title: 'Igor Kornejev' },
  { familyName: 'Gușatu', givenName: 'Radu', title: 'Mugur Radu Gușatu' },
]
