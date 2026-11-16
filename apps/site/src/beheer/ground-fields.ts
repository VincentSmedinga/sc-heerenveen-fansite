// What the form of a stadium is made of, with nothing the browser should not load: the form is
// a client component, and it imports this file. The checks are in `ground-form.ts`. The names
// of the stadium are lines as in `stadium-fields.ts`.
import type { StadiumErrors, StadiumRowValues } from './stadium-fields'

/** The fields of a stadium that are not a line of names, in the order of the form. */
export const groundFieldNames = ['plaats', 'breedtegraad', 'lengtegraad', 'straat', 'postcode'] as const

export type GroundFieldName = (typeof groundFieldNames)[number]

/** What the form shows after a button: the errors, the values to put back, a focus, a line. */
export type GroundFormState = {
  errors: StadiumErrors
  focus?: string
  /** What the address button did, in words, when it did not fill anything in. */
  notice?: string
  values: GroundValues
}

/** What an editor filled in for a stadium, as text. */
export type GroundValues = Record<GroundFieldName, string> & { rows: StadiumRowValues[] }

/** The id of the list of errors and of the form of a stadium. */
export const groundSummaryId = 'fouten'

export const groundFormId = 'stadion'
