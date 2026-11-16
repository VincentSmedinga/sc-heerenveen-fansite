// What the form of the home grounds of a club is made of, with nothing the browser should not
// load. The checks are in `home-ground-form.ts`.
import type { StadiumErrors } from './stadium-fields'

/** The fields of one line of the home grounds, in the order of the form. */
export const homeGroundFieldNames = ['stadion', 'seizoen', 'dag', 'toelichting'] as const

export type HomeGroundFieldName = (typeof homeGroundFieldNames)[number]

/** What the form shows after a button: the errors, the values to put back and the focus. */
export type HomeGroundFormState = { errors: StadiumErrors; focus?: string; values: HomeGroundRowValues[] }

/** What an editor filled in for one line, as text: `stadion` is the number of the stadium. */
export type HomeGroundRowValues = Record<HomeGroundFieldName, string>

/** The `id` and `name` of a field of a line. Lines are numbered from 1. */
export function homeGroundFieldId(number: number, field: HomeGroundFieldName) {
  return `thuis-${number}-${field}`
}

export const emptyHomeGroundRow: HomeGroundRowValues = { dag: '', seizoen: '', stadion: '', toelichting: '' }

export const homeGroundFormId = 'thuisvelden'

export const homeGroundSummaryId = 'thuisvelden-fouten'

/** The most lines a list has. */
export const mostHomeGroundRows = 20
