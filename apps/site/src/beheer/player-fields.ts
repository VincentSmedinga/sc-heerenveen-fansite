// What the form of a player is made of, with nothing the browser should not load: the form is
// a client component, and it imports this file. The checks are in `players.ts`.

/** The names of the fields of the form, in the order of the form, also their `id`. */
export const playerFieldNames = [
  'persoon',
  'voornaam',
  'tussenvoegsel',
  'achternaam',
  'wikipedia',
  'linie',
  'land',
  'overleden',
  'rugnummer',
  'vorigrugnummer',
  'rugnummervanaf',
  'positie',
] as const

/** The errors by the `id` of the field. `algemeen` is an error that belongs to no field. */
export type PlayerErrors = Partial<Record<'algemeen' | PlayerFieldName, string>>

export type PlayerFieldName = (typeof playerFieldNames)[number]

/**
 * What the form shows after a save that did not work: the errors and the values. `merge` is
 * the link to the page that merges two persons, under the field of the Wikipedia page, for a
 * page that belongs to another person (issue 977).
 */
export type PlayerFormState = {
  errors: PlayerErrors
  merge?: { href: string; label: string }
  values: PlayerValues
}

/** What an editor filled in, as text. A field left out is an empty string. */
export type PlayerValues = Record<PlayerFieldName, string>

/** The value of `persoon` that says the person is a new one, named in the fields below it. */
export const newPersonChoice = 'nieuw'

/** The form without answers: a new person. */
export const emptyPlayerValues: PlayerValues = Object.fromEntries(
  playerFieldNames.map((name) => [name, name === 'persoon' ? newPersonChoice : '']),
) as PlayerValues

/** The sides to choose from, seen in the direction of the attack, with the word of the form. */
export const sideChoices = [
  { label: 'Links', value: 'links' },
  { label: 'Midden', value: 'midden' },
  { label: 'Rechts', value: 'rechts' },
] as const

/** The lines to choose from, in the order of the pitch, with the word the form shows. */
export const positionChoices = [
  { label: 'Doelman', value: 'doelman' },
  { label: 'Verdediger', value: 'verdediger' },
  { label: 'Middenvelder', value: 'middenvelder' },
  { label: 'Aanvaller', value: 'aanvaller' },
] as const
