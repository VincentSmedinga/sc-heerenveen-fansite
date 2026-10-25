import type { LoginMail } from './login'

import { sendMail } from '../mail'
import { linkLifetime } from './sessions'

/** The mail with the login link. */
export function loginMailText(url: string) {
  return [
    'Je vroeg om een link om in te loggen bij het beheer van de sc Heerenveen Fansite.',
    '',
    url,
    '',
    `De link werkt ${linkLifetime / 60_000} minuten en één keer.`,
    'Vroeg je er niet om? Dan hoef je niets te doen.',
    '',
  ].join('\n')
}

/**
 * Mails the login link. Locally, without the settings of a mail server, sendMail writes the mail in the log of `pnpm dev`
 * and sends nothing, which is how a developer gets the link.
 */
export async function sendLoginMail({ to, url }: LoginMail) {
  await sendMail({ subject: 'Inloggen bij het beheer van de sc Heerenveen Fansite', text: loginMailText(url), to })
}
