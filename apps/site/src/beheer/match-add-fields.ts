// What the form that adds a match is made of, with nothing the browser should not load: the
// form is a client component, and it imports this file. The checks are in `match-additions.ts`.

/** The names of the fields of the form, in the order of the form, also their `id`. */
export const addFieldNames = [
  'seizoen',
  'competitie',
  'ronde',
  'tegenstander',
  'nieuwe-club',
  'thuis',
  'aftrap-datum',
  'aftrap-tijd',
  'aftrap-tekst',
  'status',
  'uitslag-wij',
  'uitslag-zij',
  'bron',
] as const

/** The errors by the `id` of the field. `algemeen` is an error that belongs to no field. */
export type AddErrors = Partial<Record<'algemeen' | AddFieldName, string>>

export type AddFieldName = (typeof addFieldNames)[number]

/** What the form shows after a save that did not work: the errors and the values. */
export type AddFormState = { errors: AddErrors; values: AddValues }

/** What an editor filled in, as text. A field left out is an empty string. */
export type AddValues = Record<AddFieldName, string>

/** The value of `tegenstander` that says the club is a new one, named in `nieuwe-club`. */
export const newClubChoice = 'nieuw'

/** The form without answers: the match is at home and played, which is the usual one. */
export const emptyAddValues: AddValues = Object.fromEntries(
  addFieldNames.map((name) => [name, name === 'thuis' ? 'thuis' : name === 'status' ? 'played' : '']),
) as AddValues
