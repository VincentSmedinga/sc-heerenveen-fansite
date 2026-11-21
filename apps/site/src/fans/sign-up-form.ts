import type { SignUpErrors } from './sign-up'

import { screenNameMaxLength, screenNameMinLength } from './screen-name'

// What the form of signing up shows: the names of its fields, its state and the words of its
// messages. The design of the chapter Fans gives the words.

/** The names of the fields, which are also their `id`: an error links to the field with it. */
export const signUpFields = { email: 'e-mail', screenName: 'schermnaam' } as const

/** What the form shows after a submit: the values, the errors per field, and a failure. */
export type SignUpState = {
  errors: { email?: string | undefined; screenName?: string | undefined }
  failure?: 'ceiling' | 'limited'
  values: { email: string; screenName: string }
}

export const emptySignUpState: SignUpState = { errors: {}, values: { email: '', screenName: '' } }

export const screenNameHint = `${screenNameMinLength} tot ${screenNameMaxLength} tekens: letters, cijfers, spatie, - en _. Andere supporters zien hem in de standen.`

export const emailHint = 'Hierheen mailen we een link en een code om in te loggen. Niemand anders ziet het.'

/** The words of a limit, the same for the limit of an address and the ceiling of the site. */
export const failureMessage = 'Het lukt nu even niet. Probeer het over een kwartier opnieuw.'

/** The message of a screen name that another supporter confirmed while this one waited. */
export const takenMeanwhileMessage = 'Een ander koos die schermnaam net eerder. Kies een andere.'

/** The words of the errors of the fields. */
export function errorMessages(errors: SignUpErrors): SignUpState['errors'] {
  return { email: emailMessage(errors.email), screenName: screenNameMessage(errors.screenName) }
}

export function screenNameMessage(error: SignUpErrors['screenName']) {
  switch (error?.problem) {
    case 'character':
      return `Gebruik alleen letters, cijfers, een spatie, - of _. Dit teken kan niet: ${error.character}`
    case 'empty':
      return 'Vul een schermnaam in.'
    case 'length':
      return `Een schermnaam heeft ${screenNameMinLength} tot ${screenNameMaxLength} tekens.`
    case 'no-letter':
      return 'Een schermnaam heeft minstens één letter of cijfer.'
    case 'refused':
      return 'Die naam lijkt op de club, de site of de redactie. Kies een andere.'
    case 'spaces':
      return 'Zet niet twee spaties achter elkaar.'
    case 'taken':
      return 'Die schermnaam is al bezet. Kies een andere.'
    case undefined:
      return undefined
  }
}

function emailMessage(error: SignUpErrors['email']) {
  switch (error) {
    case 'empty':
      return 'Vul je e-mailadres in.'
    case 'invalid':
      return 'Dit e-mailadres klopt niet. Kijk of er een @ in staat.'
    case undefined:
      return undefined
  }
}
