// What the form of the names of a club is made of, with nothing the browser should not
// load: the form is a client component, and it imports this file. The checks are in
// `club-name-form.ts`.

/** The fields of one line of the list, in the order of the form. */
export const nameFieldNames = ['naam', 'seizoen', 'dag', 'toelichting'] as const

/** The errors by the `id` of the field, such as `regel-2-seizoen`, or `regels` for the list. */
export type NameErrors = Record<string, string | undefined>

export type NameFieldName = (typeof nameFieldNames)[number]

/** What the form shows after a button: the errors, the values to put back and the focus. */
export type NameFormState = { errors: NameErrors; focus?: string; values: NameRowValues[] }

/** What an editor filled in for one line, as text. */
export type NameRowValues = Record<NameFieldName, string>

/** The `id` and the `name` of a field of a line. Lines are numbered from 1. */
export function nameFieldId(number: number, field: NameFieldName) {
  return `regel-${number}-${field}`
}

/** A line without answers. */
export const emptyNameRow: NameRowValues = { dag: '', naam: '', seizoen: '', toelichting: '' }

/** The id of the list of the errors, and the `id` of the form the sidebar belongs to. */
export const nameSummaryId = 'fouten'

export const nameFormId = 'clubnamen'

/** The id of the button that adds a line, which gets the focus after the last line goes. */
export const addNameRowId = 'regel-toevoegen'

/** The most lines a list has: enough for any club, and a limit on what a request holds. */
export const mostNameRows = 20
