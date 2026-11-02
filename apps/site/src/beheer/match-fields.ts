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
export const goalFieldNames = ['minuut', 'extra', 'soort', 'kant', 'speler', 'naam'] as const

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

/** Who scored decides which field asks for the player: the squad, or a name. */
export type ScorerForm = 'name' | 'squad'

/** The `id` and the `name` of a field of a goal. Goals are numbered from 1. */
export function goalFieldId(number: number, field: GoalFieldName) {
  return `doelpunt-${number}-${field}`
}

/**
 * The field that asks for the scorer. A player of ours scored a goal of ours, or an own goal
 * that the opponent made, and then the player is chosen from the squad. Every other goal was
 * scored by a player of the opponent, and then the form asks for the name. Before a team is
 * chosen it asks for the squad, which is the usual goal.
 */
export function scorerFormOf(kant: string, soort: string): ScorerForm {
  if (kant !== 'wij' && kant !== 'zij') {
    return 'squad'
  }

  return (kant === 'wij') !== (soort === 'eigen') ? 'squad' : 'name'
}

/** A goal without answers. */
export const emptyGoal: GoalValues = { extra: '', kant: '', minuut: '', naam: '', soort: 'gewoon', speler: '' }

/** The fields of a match, empty. */
export const emptyFields: Record<MatchFieldName, string> = Object.fromEntries(
  matchFieldNames.map((name) => [name, '']),
) as Record<MatchFieldName, string>

/** The id of the button that adds a goal, which gets the focus after the last goal goes. */
export const addGoalId = 'doelpunt-toevoegen'

/** The most rows the result gives, so a typing mistake does not fill the screen with goals. */
const mostGoalRows = 20

/**
 * The number of goals the end result asks for: the two scores added up. It is `undefined` while
 * the end result is not two whole numbers.
 */
export function goalTotalOf(velden: Record<'uitslag-wij' | 'uitslag-zij', string>): number | undefined {
  const wij = scoreOf(velden['uitslag-wij'])
  const zij = scoreOf(velden['uitslag-zij'])

  return wij === undefined || zij === undefined ? undefined : Math.min(wij + zij, mostGoalRows)
}

/** Whether nothing was filled in for a goal: every field is as a new goal has it. */
export function isUntouchedGoal(goal: GoalValues): boolean {
  return goalFieldNames.every((field) => goal[field] === emptyGoal[field])
}

/**
 * The values with as many goals as the end result asks for, the goals that are there first and
 * empty ones after them. A form that has more goals than that keeps them: only the editor
 * removes a goal.
 */
export function padGoals(values: MatchValues): MatchValues {
  const total = goalTotalOf(values.velden)

  return total === undefined || values.doelpunten.length >= total
    ? values
    : {
        ...values,
        doelpunten: [
          ...values.doelpunten,
          ...Array.from({ length: total - values.doelpunten.length }, () => ({ ...emptyGoal })),
        ],
      }
}

/** A score as a whole number of one or two digits, or `undefined`. */
function scoreOf(text: string): number | undefined {
  return /^\d{1,2}$/u.test(text) ? Number(text) : undefined
}
