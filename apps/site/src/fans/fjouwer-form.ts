import { type FjouwerLine, lineWords, maxUsesPerSeason, type PickErrors } from './fjouwer-rules'

// What the form of Fjouwer sends and shows. This module imports nothing from the database, so
// the form (a client component) can use it.

/** The address of the page of the game. */
export const fjouwerPath = '/fans/fjouwer'

/** The name of the button that saves the form: its value is the number of the match. */
export const matchField = 'wedstrijd'

/** The name each ticked player is sent under: the value is the id of the player. */
export const playerField = 'speler'

/** The `id` of the group of a line, which a link in the summary of errors goes to. */
export const groupId = (line: FjouwerLine) => `fjouwer-${lineWords[line].plural}`

/** What the form shows after a submit: the ticked players, the errors, and what came of it. */
export type FjouwerFormState = {
  errors: PickErrors
  failure?: 'closed'
  /** Set when the four was stored, with the moment it closes in words ("za 16.45"). */
  saved?: { until: string }
  /** The ids of the players that were ticked, as the form sent them. */
  values: string[]
}

export const emptyFjouwerState = (values: string[]): FjouwerFormState => ({
  errors: { general: [], lines: {} },
  values,
})

/** The words of a form that was submitted after the match closed. */
export const closedMessage = 'Deze wedstrijd is al begonnen of het formulier is dicht. Je vier is niet opgeslagen.'

/** The notice above a stored form: "Je vier staan. Je kunt ze wijzigen tot za 16.45 uur." */
export const savedMessage = (until: string) => `Je vier staan. Je kunt ze wijzigen tot ${until} uur.`

/** The line under the match while the hour of the kick-off is not known. */
export const unknownHourMessage =
  'Het uur van de aftrap is nog niet bekend. Tot dat bekend is, sluit je keuze om 00.00 uur op de dag van de wedstrijd.'

/** The line for an inherited four of which every player still counts. */
export const inheritedOkMessage = 'Dit zijn je vier van vorige keer. Je kunt ze wijzigen tot de aftrap.'

/** The line behind a name: "31 punten · nog 3 keer". */
export const playerLine = (points: number, usesLeft: number) =>
  `${points} ${points === 1 ? 'punt' : 'punten'} · nog ${usesLeft} keer`

/** The groups of the form with the players in them, as the page gives them to the form. */
export type FormPlayer = {
  id: number
  line: FjouwerLine
  name: string
  /** What he scored this season in all matches with a finished report, for everybody alike. */
  points: number
  surname: string
  /** How many times the supporter can still use him this season (0 to 10). */
  usesLeft: number
}

/**
 * The notice for an inherited four with players who have their ten: it names them and their
 * line, and says what to do. "Je vier van vorige keer staan nog. Dirk Proper is al 10 keer
 * gekozen en telt niet mee. Kies een andere middenvelder, dan heb je er weer vier."
 */
export function inheritedNotice(notCounting: readonly { line: FjouwerLine; name: string }[]): string {
  const names = notCounting.map((player) => player.name)
  const who =
    names.length === 1
      ? `${names[0]} is al ${maxUsesPerSeason} keer gekozen en telt niet mee.`
      : `${names.slice(0, -1).join(', ')} en ${names.at(-1)} zijn al ${maxUsesPerSeason} keer gekozen en tellen niet mee.`
  const lines = [...new Set(notCounting.map((player) => player.line))]
  const advice =
    notCounting.length === 1
      ? `Kies een andere ${lineWords[lines[0] as FjouwerLine].singular}, dan heb je er weer vier.`
      : 'Kies andere spelers, dan heb je er weer vier.'

  return `Je vier van vorige keer staan nog. ${who} ${advice}`
}
