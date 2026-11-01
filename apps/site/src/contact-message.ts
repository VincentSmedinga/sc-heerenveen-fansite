import { isMailbox } from '@fansite/shared/mail-env'

import type { Mail } from './mail'

import { email } from './contact'

/**
 * The answers of the Onderwerp list, with the value the form sends and the words the visitor
 * and the editors read.
 */
export const subjects = [
  { label: 'Een bericht laten verwijderen', value: 'verwijderen' },
  { label: 'Een fout in een bericht', value: 'fout' },
  { label: 'Een bron voorstellen', value: 'bron' },
  { label: 'Iets anders', value: 'anders' },
] as const

/** The names of the fields, which are also their `id`: an error links to the field with it. */
export const fieldNames = ['naam', 'e-mail', 'onderwerp', 'link', 'bericht'] as const

export type ContactErrors = Partial<Record<FieldName, string>>

/** What the visitor filled in, as text. A field they left out is an empty string. */
export type ContactValues = Record<FieldName, string>

export type FieldName = (typeof fieldNames)[number]

export const maxLengths = { bericht: 2000, 'e-mail': 254, link: 2000, naam: 100 } as const

/**
 * The values of a form, as the form sends them: text, or nothing if a field is missing or is
 * not text.
 */
export function readValues(formData: FormData): ContactValues {
  const text = (name: string) => {
    const value = formData.get(name)

    return typeof value === 'string' ? value : ''
  }

  return {
    bericht: text('bericht').replaceAll('\r\n', '\n'),
    'e-mail': text('e-mail'),
    link: text('link'),
    naam: text('naam'),
    onderwerp: text('onderwerp'),
  }
}

const newLine = /[\r\n\u2028\u2029]/
const lengthOf = (value: string) => [...value].length

/**
 * The mail for the editors: the visitor's address as the reply address, and their answers in
 * the text. Values must be valid.
 */
export function toMail(values: ContactValues): Mail {
  const subject = subjects.find(({ value }) => value === values.onderwerp)?.label ?? ''
  const naam = values.naam.trim()
  const link = values.link.trim()

  return {
    replyTo: values['e-mail'].trim(),
    subject: `Contact: ${subject}`,
    text: [
      `Naam: ${naam === '' ? '(niet ingevuld)' : naam}`,
      `E-mailadres: ${values['e-mail'].trim()}`,
      `Onderwerp: ${subject}`,
      `Link: ${link === '' ? '(niet ingevuld)' : link}`,
      '',
      values.bericht.trim(),
    ].join('\n'),
    to: email,
  }
}

/**
 * Checks what the visitor filled in, and returns an error in words for each field that is
 * wrong: what is wrong and how to put it right. No errors means the values are fine to send.
 * The values must be as readValues gives them.
 */
export function validate(values: ContactValues): ContactErrors {
  const errors: ContactErrors = {}
  const { bericht, 'e-mail': mail, link, naam, onderwerp } = values

  if (newLine.test(naam)) {
    errors.naam = 'Schrijf je naam op één regel.'
  } else if (lengthOf(naam.trim()) > maxLengths.naam) {
    errors.naam = `Je naam is te lang. Gebruik hoogstens ${maxLengths.naam} tekens.`
  }

  if (mail.trim() === '') {
    errors['e-mail'] = 'Vul je e-mailadres in, zodat we je kunnen antwoorden.'
  } else if (newLine.test(mail) || lengthOf(mail.trim()) > maxLengths['e-mail'] || !isAddress(mail.trim())) {
    errors['e-mail'] = 'Dit is geen e-mailadres. Schrijf het zo: naam@voorbeeld.nl.'
  }

  if (newLine.test(onderwerp) || !subjects.some(({ value }) => value === onderwerp)) {
    errors.onderwerp = 'Kies een onderwerp uit de lijst.'
  }

  if (link.trim() !== '' && (lengthOf(link.trim()) > maxLengths.link || !isLink(link.trim()))) {
    errors.link = 'Dit is geen link. Schrijf het zo: https://voorbeeld.nl/bericht.'
  }

  if (bericht.trim() === '') {
    errors.bericht = 'Schrijf je bericht.'
  } else if (lengthOf(bericht.trim()) > maxLengths.bericht) {
    errors.bericht = `Je bericht is te lang. Het mag hoogstens ${maxLengths.bericht} tekens zijn, en nu zijn het er ${lengthOf(bericht.trim())}.`
  }

  return errors
}

/**
 * An address, without a name in front of it: the visitor gives their address, and nobody
 * else's.
 */
function isAddress(value: string) {
  return isMailbox(value) && !/[<>]/.test(value)
}

function isLink(value: string) {
  if (/\s/.test(value)) {
    return false
  }

  try {
    const { protocol } = new URL(value)

    return protocol === 'http:' || protocol === 'https:'
  } catch {
    return false
  }
}

/** The name of the Honeypot in the form. A robot fills it in, a visitor never sees it. */
export const honeypotName = 'website'

/**
 * The state of the form after a submit: what the visitor filled in, and what went wrong, in
 * words.
 */
export type ContactState = {
  errors: ContactErrors
  /**
   * `send` when the mail could not be sent, `limit` when too many messages came in this hour.
   */
  failure?: 'limit' | 'send'
  values: ContactValues
}

export const emptyState: ContactState = {
  errors: {},
  values: { bericht: '', 'e-mail': '', link: '', naam: '', onderwerp: '' },
}

/**
 * Whether a request comes from our own site: the host of its `Origin` is the host it was sent
 * to. A request without an Origin is refused, because a browser always sends one when it posts
 * a form.
 */
export function isOwnOrigin(origin: null | string, host: null | string) {
  if (origin === null || host === null) {
    return false
  }

  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
