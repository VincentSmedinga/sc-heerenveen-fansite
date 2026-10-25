import { createTransport } from 'nodemailer'

import { email } from './contact'
import { readMailEnv } from './env'
import { isMailbox } from './mail-env'

/** A plain text mail. `from` is MAIL_FROM unless the caller names another address. */
export type Mail = {
  from?: string
  replyTo?: string
  subject: string
  text: string
  to: string
}

/**
 * Why a mail was not sent. The message never holds the password, an address or any of the text,
 * because callers log it and the text may be a visitor's message. `code` is the code of the
 * mail library or the mail server, such as EAUTH for a wrong password, ECONNECTION for a server
 * that can't be reached, or EENVELOPE when the server refused an address.
 */
export class MailError extends Error {
  readonly code: string | undefined

  constructor(message: string, code?: string) {
    super(code === undefined ? message : `${message} (${code})`)
    this.name = 'MailError'
    this.code = code
  }
}

const tenSeconds = 10_000

/**
 * Sends a plain text mail through the mail server in the environment variables (SMTP_HOST and
 * the others), over TLS: port 465 starts with TLS, any other port must switch to it, and a
 * server that can't is not used. It rejects with a `MailError` when the mail is wrong or the
 * server doesn't take it, so the caller can catch that. It tries once.
 *
 * Without those variables, which only the local environment allows, it writes the mail to the
 * log of the developer and sends nothing. That log holds the whole text, so it must never be
 * where visitors' messages end up.
 *
 * A new line in the addresses and the subject is refused, so nobody can add headers of their
 * own, and each address must be exactly one mailbox, so nobody can add recipients.
 */
export async function sendMail(mail: Mail, source: Record<string, string | undefined> = process.env) {
  const settings = readMailEnv(source)
  const from = mail.from ?? settings.MAIL_FROM ?? email

  for (const [field, value] of [
    ['from', from],
    ['to', mail.to],
    ['replyTo', mail.replyTo],
  ] as const) {
    if (value !== undefined && !isMailbox(value)) {
      throw new MailError(`The ${field} address of the mail is not exactly one email address`)
    }
  }

  if (/[\r\n]/.test(mail.subject)) {
    throw new MailError('The subject of the mail has a new line')
  }

  const { SMTP_HOST, SMTP_PASSWORD, SMTP_PORT, SMTP_USER } = settings

  if (SMTP_HOST === undefined || SMTP_PASSWORD === undefined || SMTP_PORT === undefined || SMTP_USER === undefined) {
    console.log(
      [
        'No mail was sent: the SMTP settings are not set, which only the local environment allows. This is the mail:',
        `From: ${from}`,
        `To: ${mail.to}`,
        ...(mail.replyTo === undefined ? [] : [`Reply-To: ${mail.replyTo}`]),
        `Subject: ${mail.subject}`,
        '',
        mail.text,
      ].join('\n'),
    )

    return
  }

  const transport = createTransport({
    auth: { pass: SMTP_PASSWORD, user: SMTP_USER },
    connectionTimeout: tenSeconds,
    greetingTimeout: tenSeconds,
    host: SMTP_HOST,
    port: SMTP_PORT,
    requireTLS: SMTP_PORT !== 465,
    secure: SMTP_PORT === 465,
    socketTimeout: 3 * tenSeconds,
  })

  try {
    await transport.sendMail({ from, replyTo: mail.replyTo, subject: mail.subject, text: mail.text, to: mail.to })
  } catch (error) {
    // Not the error itself, and not as a cause: its message can quote the address of the
    // recipient and the reply of the server.
    const code = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined

    throw new MailError('Could not send the mail', typeof code === 'string' && /^[A-Z]+$/.test(code) ? code : undefined)
  } finally {
    transport.close()
  }
}
