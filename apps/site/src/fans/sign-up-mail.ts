import { sendFansMail } from '@fansite/shared/fans-env'

import type { ChangeEmailMail } from './change-email'
import type { LogInMail } from './log-in'
import type { SignUpMail } from './sign-up'

import { email as editorsEmail } from '../contact'
import { sendMail } from '../mail'
import { mailsPerQuarter } from './log-in'
import { signUpsPerHour } from './sign-up'
import { supporterKind } from './supporter-login'

const minutes = supporterKind.linkLifetime / 60_000

/** The text of the mail to the new address, with the link and the code to confirm it. */
export function changeEmailMailText({ code, url }: Pick<ChangeEmailMail, 'code' | 'url'>) {
  return mailText(
    'Je wilt dit adres gebruiken voor je account bij Fans op de sc Heerenveen Fansite. Open deze link om het te bevestigen:',
    url,
    code,
  )
}

/**
 * The text of the message to the old address after a change. It doesn't name the new address:
 * whoever reads the old one may no longer be the supporter.
 */
export function emailChangedMailText() {
  return [
    'Het e-mailadres van je account bij Fans op de sc Heerenveen Fansite is gewijzigd.',
    'Vanaf nu log je in met het nieuwe adres. Dit adres gebruiken we niet meer.',
    '',
    `Deed je dit niet zelf? Mail dan meteen de redactie: ${editorsEmail}.`,
    '',
  ].join('\n')
}

/** The text of the mail with the link and the code to log in. */
export function logInMailText({ code, url }: Pick<LogInMail, 'code' | 'url'>) {
  return mailText('Je wilt inloggen bij Fans op de sc Heerenveen Fansite. Open deze link om in te loggen:', url, code)
}

/** The one mail an hour to the editors when the ceiling of sign-ups is reached. */
export async function sendCeilingMail() {
  await sendFansMail('accounts', () =>
    sendMail({
      subject: 'Veel aanmeldingen bij Fans',
      text: [
        `Er kwamen dit uur meer dan ${signUpsPerHour} aanmeldingen voor een account bij Fans.`,
        'De site neemt tot het eind van het uur geen nieuwe aanmeldingen aan.',
        'Kijk in het beheer of de nieuwe accounts kloppen.',
        '',
      ].join('\n'),
      to: editorsEmail,
    }),
  )
}

/** Mails the link and the code to the new address, only while accounts are on. */
export async function sendChangeEmailMail(mail: ChangeEmailMail) {
  await sendFansMail('accounts', () =>
    sendMail({
      subject: 'Bevestig je nieuwe e-mailadres bij de sc Heerenveen Fansite',
      text: changeEmailMailText(mail),
      to: mail.to,
    }),
  )
}

/** Tells the old address that the address of the account changed, while accounts are on. */
export async function sendEmailChangedMail(to: string) {
  await sendFansMail('accounts', () =>
    sendMail({ subject: 'Je e-mailadres bij de sc Heerenveen Fansite is gewijzigd', text: emailChangedMailText(), to }),
  )
}

/** Mails the link and the code to log in, only while accounts are on (see `sendSignUpMail`). */
export async function sendLogInMail(mail: LogInMail) {
  await sendFansMail('accounts', () =>
    sendMail({ subject: 'Inloggen bij de sc Heerenveen Fansite', text: logInMailText(mail), to: mail.to }),
  )
}

/** The one mail a quarter of an hour to the editors when the ceiling of mails is reached. */
export async function sendMailCeilingMail() {
  await sendFansMail('accounts', () =>
    sendMail({
      subject: 'Veel inlogmails bij Fans',
      text: [
        `Supporters vroegen dit kwartier meer dan ${mailsPerQuarter} mails om in te loggen of een account te maken.`,
        'De site stuurt tot het eind van het kwartier geen nieuwe.',
        'Kijk in het logboek of er iets mis is.',
        '',
      ].join('\n'),
      to: editorsEmail,
    }),
  )
}

/**
 * Mails the link and the code, only while accounts are on. Locally, without the settings of a
 * mail server, sendMail writes the mail in the log of `pnpm dev` and sends nothing.
 */
export async function sendSignUpMail(mail: SignUpMail) {
  await sendFansMail('accounts', () =>
    sendMail({
      subject:
        mail.kind === 'sign-up'
          ? 'Bevestig je account bij de sc Heerenveen Fansite'
          : 'Inloggen bij de sc Heerenveen Fansite',
      text: signUpMailText(mail),
      to: mail.to,
    }),
  )
}

/** The text of the mail with the link and the code, for a sign-up or to log in. */
export function signUpMailText({ code, kind, url }: Pick<SignUpMail, 'code' | 'kind' | 'url'>) {
  return mailText(
    kind === 'sign-up'
      ? 'Je maakt een account bij Fans op de sc Heerenveen Fansite. Open deze link om je e-mailadres te bevestigen:'
      : 'Je wilde een account maken bij Fans op de sc Heerenveen Fansite, maar dit e-mailadres heeft er al een. Open deze link om in te loggen:',
    url,
    code,
  )
}

/** A mail with a link and a code: the first line, the link, the code and how long they work. */
function mailText(opening: string, url: string, code: string) {
  return [
    opening,
    '',
    url,
    '',
    'Of vul deze code in op de pagina waar je nu bent:',
    '',
    code,
    '',
    `De link en de code werken ${minutes} minuten en één keer.`,
    'Vroeg je hier niet zelf om? Dan hoef je niets te doen.',
    '',
  ].join('\n')
}
