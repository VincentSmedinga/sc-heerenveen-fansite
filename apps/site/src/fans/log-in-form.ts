// What the form of logging in shows: its state and the words of its messages. The design of the
// chapter Fans gives the words.

/** The field and the parameter that hold the page to go back to after logging in. */
export const returnParameter = 'terug'

/** What the form shows after a submit: the value, the error of the field, and a failure. */
export type LogInState = { error?: string; failure?: 'ceiling' | 'limited'; value: string }

export const emptyLogInState: LogInState = { value: '' }

/** The explanation above the form of logging in. */
export const logInExplanation = 'We mailen je een link en een code.'

/** The words of the errors of the field, the same as when signing up. */
export const logInErrorMessages = {
  empty: 'Vul je e-mailadres in.',
  invalid: 'Dit e-mailadres klopt niet. Kijk of er een @ in staat.',
} as const

/** The words of the limit of one address: 3 mails in 15 minutes. */
export const limitedMessage =
  'Je hebt al 3 keer een link gevraagd. Probeer het over een kwartier opnieuw, of gebruik de laatste mail.'

/** The words on the page to log in for somebody who came from a page that needs an account. */
export const returnMessage = 'Log in om verder te gaan. Daarna kom je meteen terug op de pagina waar je was.'
