import type { NameWait } from './change-name'

import { logInErrorMessages } from './log-in-form'
import { screenNameMaxLength, screenNameMinLength } from './screen-name'

// What the pages of Mijn account show: the state of their forms and the words of their
// messages (issue 1452). The design of the chapter Fans gives the words.

/** The page Mijn account, where the forms of a change go back to. */
export const accountPath = '/fans/mijn-account'

/** The names of the fields, which are also their `id`: an error links to the field with it. */
export const accountFields = {
  email: 'e-mail',
  inRankings: 'in-de-standen',
  remindByEmail: 'herinnering',
  screenName: 'schermnaam',
} as const

/**
 * What a form of one field on Mijn account shows after a submit: the value, the error of the
 * field and, for a new address, a limit.
 */
export type AccountFormState = { error?: string | undefined; failure?: 'limited' | undefined; value: string }

/** What the switch "Naam in de standen" shows after a submit: the choice and what was saved. */
export type RankingsState = { on: boolean; saved?: boolean }

/** The hint of the field of a new name: the rules of signing up, and the 30 days. */
export const changeNameHint = `${screenNameMinLength} tot ${screenNameMaxLength} tekens: letters, cijfers, spatie, - en _. Daarna kun je hem 30 dagen niet wijzigen.`

/** The words of the errors of the field of a new address. */
export const changeEmailErrorMessages = {
  ...logInErrorMessages,
  same: 'Dit is al het e-mailadres van je account. Vul een ander adres in.',
} as const

/** The words of a limit of a new address, the same for every limit. */
export const changeEmailLimitedMessage = 'Het lukt nu even niet. Probeer het over een kwartier opnieuw.'

/** The notices on Mijn account after a change, by the word in the address of the page. */
export const accountMessages = {
  'e-mailadres': 'Je e-mailadres is gewijzigd. Je logt voortaan in met het nieuwe adres.',
  'herinnering-aan': 'De herinnering staat aan.',
  'herinnering-uit': 'De herinnering staat uit.',
  schermnaam: 'Je schermnaam is gewijzigd.',
} as const

/** The message of a notice on Mijn account, or `undefined` for any other value. */
export function accountMessageOf(value: unknown) {
  return typeof value === 'string' && Object.hasOwn(accountMessages, value)
    ? accountMessages[value as keyof typeof accountMessages]
    : undefined
}

/** The error at the field when the server refuses a change within the 30 days. */
export function nameWaitError({ from }: NameWait) {
  return `Je kunt je naam pas vanaf ${from} weer wijzigen.`
}

/** The notice above the form while the name can't be changed. */
export function nameWaitMessage({ changedOn, from }: NameWait) {
  return `Je wijzigde je naam op ${changedOn}. Vanaf ${from} kun je hem weer wijzigen.`
}

/** What the switch says after it saved the choice, for a screen reader too. */
export function rankingsMessage(on: boolean) {
  return on ? 'Je naam staat in de standen.' : 'Je naam staat niet meer in de standen.'
}
