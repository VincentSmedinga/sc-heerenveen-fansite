// What the form of a person is made of (issue 1164), with nothing the browser should not load:
// the form is a client component, and it imports this file. The checks are in `person-form.ts`.

/** The names of the fields of the form, in the order of the form, also their `id`. */
export const personFieldNames = [
  'voornaam',
  'tussenvoegsel',
  'achternaam',
  'wikipedia',
  'geboren',
  'overleden',
  'land',
  'linie',
  'kant',
  'reden',
] as const

export type PersonFieldName = (typeof personFieldNames)[number]

/** The parts of the form, in its order: each has an address of its own. */
export const personParts = ['naam', 'leven', 'land', 'linie'] as const

export type PersonPart = (typeof personParts)[number]

/** What the navigation and the heading of a part say. */
export const personPartLabels: Record<PersonPart, string> = {
  land: 'Land',
  leven: 'Leven',
  linie: 'Linie',
  naam: 'Naam',
}

/** The fields of each part. The reason is on every page. */
export const personPartFields: Record<PersonPart, readonly PersonFieldName[]> = {
  land: ['land'],
  leven: ['geboren', 'overleden'],
  linie: ['linie', 'kant'],
  naam: ['voornaam', 'tussenvoegsel', 'achternaam', 'wikipedia'],
}

/** The errors by the `id` of the field. `algemeen` is an error that belongs to no field. */
export type PersonErrors = Partial<Record<'algemeen' | PersonFieldName, string>>

/**
 * What the form shows after a save that did not work: the errors and the values. `merge` is the
 * link to the page that merges two persons, for a page that belongs to another person.
 */
export type PersonFormState = {
  errors: PersonErrors
  merge?: { href: string; label: string }
  values: PersonValues
}

/** What an editor filled in, as text. A field left out is an empty string. */
export type PersonValues = Record<PersonFieldName, string>

/** Whether a name is one of the parts, also a name such as `constructor` that is no part. */
export function isPersonPart(name: string): name is PersonPart {
  return Object.hasOwn(personPartLabels, name)
}
