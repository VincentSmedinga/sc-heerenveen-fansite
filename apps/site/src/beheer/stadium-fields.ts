// What the form of the stadiums of a club is made of, with nothing the browser should not
// load: the form is a client component, and it imports this file. The checks are in
// `stadium-form.ts`.

/** The fields of one line of the list, in the order of the form. */
export const stadiumFieldNames = ['naam', 'seizoen', 'dag', 'toelichting'] as const

/** The errors by the `id` of the field, such as `regel-2-seizoen`, or `regels` for the list. */
export type StadiumErrors = Record<string, string | undefined>

export type StadiumFieldName = (typeof stadiumFieldNames)[number]

/** What the form shows after a button: the errors, the values to put back and the focus. */
export type StadiumFormState = { errors: StadiumErrors; focus?: string; values: StadiumRowValues[] }

/** What an editor filled in for one line, as text. */
export type StadiumRowValues = Record<StadiumFieldName, string>

/** The `id` and the `name` of a field of a line. Lines are numbered from 1. */
export function stadiumFieldId(number: number, field: StadiumFieldName) {
  return `regel-${number}-${field}`
}

/** A line without answers. */
export const emptyRow: StadiumRowValues = { dag: '', naam: '', seizoen: '', toelichting: '' }

/** The id of the list of the errors, and the `id` of the form the sidebar belongs to. */
export const stadiumSummaryId = 'fouten'

export const stadiumFormId = 'stadions'

/** The id of the button that adds a line, which gets the focus after the last line goes. */
export const addRowId = 'regel-toevoegen'

/** The most lines a list has: enough for any stadium, and a limit on what a request holds. */
export const mostStadiumRows = 20
