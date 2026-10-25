'use server'

import { headers } from 'next/headers'
import { redirect } from 'next/navigation'

import { type ContactState, honeypotName, isOwnOrigin, readValues, toMail, validate } from '../../contact-message'
import { MailError, sendMail } from '../../mail'
import { createLimit } from '../../rate-limit'

// At most ten messages an hour for the whole form, counted in the memory of the server.
const limit = createLimit({ max: 10, perMilliseconds: 60 * 60 * 1000 })

/**
 * Handles the contact form: it checks that the request comes from our own site, drops a robot's
 * message without a word, checks every answer again, and mails what is left to the editors. It
 * returns the state the form shows when something is wrong, and sends the visitor to the page
 * with the confirmation when the mail is sent, so reloading that page sends nothing.
 *
 * It never logs a visitor's answers, not even when something fails, and never throws what the
 * visitor wrote.
 */
export async function sendContactMessage(_previous: ContactState, formData: FormData): Promise<ContactState> {
  const values = readValues(formData)
  const failed = { errors: {}, failure: 'send', values } as const
  const requestHeaders = await headers()

  if (
    !isOwnOrigin(requestHeaders.get('origin'), requestHeaders.get('x-forwarded-host') ?? requestHeaders.get('host'))
  ) {
    return failed
  }

  // A robot filled in the trap. It gets the same confirmation as a visitor, so it learns
  // nothing, and nothing is sent.
  const trap = formData.get(honeypotName)

  if (trap !== null && trap !== '') {
    redirect('/contact/verstuurd')
  }

  const errors = validate(values)

  if (Object.keys(errors).length > 0) {
    return { errors, values }
  }

  if (!limit.take()) {
    return { errors: {}, failure: 'limit', values }
  }

  try {
    await sendMail(toMail(values))
  } catch (error) {
    // The message of a MailError never holds an address or any text. Anything else may, so it
    // is not logged.
    console.error(
      error instanceof MailError
        ? `The contact form could not send its mail: ${error.message}`
        : 'The contact form could not send its mail.',
    )

    return failed
  }

  redirect('/contact/verstuurd')
}
