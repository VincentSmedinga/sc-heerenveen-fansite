import { sendFansMail } from '@fansite/shared/fans-env'

import type { SignUpMail } from './sign-up'

import { email as editorsEmail } from '../contact'
import { sendMail } from '../mail'
import { signUpsPerHour } from './sign-up'
import { supporterKind } from './supporter-login'

const minutes = supporterKind.linkLifetime / 60_000

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
  return [
    kind === 'sign-up'
      ? 'Je maakt een account bij Fans op de sc Heerenveen Fansite. Open deze link om je e-mailadres te bevestigen:'
      : 'Je wilde een account maken bij Fans op de sc Heerenveen Fansite, maar dit e-mailadres heeft er al een. Open deze link om in te loggen:',
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
