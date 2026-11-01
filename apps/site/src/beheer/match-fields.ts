// What the form of a match is made of, with nothing the browser should not load: the form is a
// client component, and it imports this file. The checks are in `match-form.ts`.

/** The names of the fields that are not goals, in the order of the form, also their `id`. */
export const matchFieldNames = [
  'aftrap-datum',
  'aftrap-tijd',
  'aftrap-tekst',
  'status',
  'uitslag-wij',
  'uitslag-zij',
  'verlenging',
  'na90-wij',
  'na90-zij',
  'strafschoppen-wij',
  'strafschoppen-zij',
] as const

export type MatchFieldName = (typeof matchFieldNames)[number]

/** The fields of one goal, in the order of the form. */
export const goalFieldNames = ['kant', 'minuut', 'extra', 'soort', 'speler', 'naam'] as const

export type GoalFieldName = (typeof goalFieldNames)[number]

/** What an editor filled in for one goal, as text. */
export type GoalValues = Record<GoalFieldName, string>

/** The errors by the `id` of the field: `status`, `doelpunt-2-minuut` or `reden`. */
export type MatchErrors = {
  [id: string]: string | undefined
  doelpunten?: string
  reden?: string
  status?: string
  verlenging?: string
}

/**
 * What the form shows after a button: the errors, the values to put back, and the `id` of the
 * element that gets the focus, such as the first field of a goal that was just added.
 */
export type MatchFormState = { errors: MatchErrors; focus?: string; values: MatchValues }

/** What an editor filled in for a match, as text. A field left out is an empty string. */
export type MatchValues = {
  doelpunten: GoalValues[]
  reden: string
  velden: Record<MatchFieldName, string>
}

/** The option that stands for a scorer who is not one of our players. */
export const otherPlayer = 'andere'

/** The `id` and the `name` of a field of a goal. Goals are numbered from 1. */
export function goalFieldId(number: number, field: GoalFieldName) {
  return `doelpunt-${number}-${field}`
}

/** A goal without answers. */
export const emptyGoal: GoalValues = { extra: '', kant: '', minuut: '', naam: '', soort: 'gewoon', speler: '' }

/** The fields of a match, empty. */
export const emptyFields: Record<MatchFieldName, string> = Object.fromEntries(
  matchFieldNames.map((name) => [name, '']),
) as Record<MatchFieldName, string>

/** The id of the button that adds a goal, which gets the focus after the last goal goes. */
export const addGoalId = 'doelpunt-toevoegen'
