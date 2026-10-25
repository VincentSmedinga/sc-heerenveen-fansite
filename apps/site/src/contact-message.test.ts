import { describe, expect, it } from 'vitest'

import { type ContactValues, isOwnOrigin, readValues, subjects, toMail, validate } from './contact-message'

const valid: ContactValues = {
  bericht: 'Dit artikel staat er zonder toestemming op.',
  'e-mail': 'jan@example.org',
  link: 'https://example.org/artikel',
  naam: 'Jan de Vries',
  onderwerp: 'verwijderen',
}

describe('readValues', () => {
  it('reads the five fields as text, and an empty string for what is missing or is a file', () => {
    const formData = new FormData()
    formData.set('naam', 'Jan')
    formData.set('bericht', 'a\r\nb')
    formData.set('link', new File(['x'], 'x.txt'))

    expect(readValues(formData)).toEqual({ bericht: 'a\nb', 'e-mail': '', link: '', naam: 'Jan', onderwerp: '' })
  })
})

describe('validate', () => {
  it('accepts a complete message', () => {
    expect(validate(valid)).toEqual({})
  })

  it('accepts a message with only the required fields', () => {
    expect(validate({ ...valid, link: '', naam: '' })).toEqual({})
  })

  it('asks for the email address, the subject and the message when they are empty, in words that say what to do', () => {
    const errors = validate({ bericht: ' ', 'e-mail': '', link: '', naam: '', onderwerp: '' })

    expect(Object.keys(errors).sort()).toEqual(['bericht', 'e-mail', 'onderwerp'])
    expect(errors['e-mail']).toBe('Vul je e-mailadres in, zodat we je kunnen antwoorden.')
    expect(errors.onderwerp).toBe('Kies een onderwerp uit de lijst.')
    expect(errors.bericht).toBe('Schrijf je bericht.')
  })

  it.each([
    'jan',
    'jan@',
    'jan@example',
    'jan@example.org, piet@example.org',
    'Jan <jan@example.org>',
    'jan @example.org',
  ])('refuses %j as an email address, and shows the way it should be written', (address) => {
    expect(validate({ ...valid, 'e-mail': address })['e-mail']).toBe(
      'Dit is geen e-mailadres. Schrijf het zo: naam@voorbeeld.nl.',
    )
  })

  it.each([
    ['naam', 'Jan\nBcc: piet@example.org'],
    ['e-mail', 'jan@example.org\nBcc: piet@example.org'],
    ['onderwerp', 'verwijderen\nBcc: piet@example.org'],
  ] as const)('refuses a new line in %s', (field, value) => {
    expect(validate({ ...valid, [field]: value })[field]).toBeDefined()
  })

  it('refuses a subject that is not in the list', () => {
    expect(validate({ ...valid, onderwerp: 'reclame' }).onderwerp).toBe('Kies een onderwerp uit de lijst.')
  })

  it('accepts every subject of the list', () => {
    for (const { value } of subjects) {
      expect(validate({ ...valid, onderwerp: value })).toEqual({})
    }
  })

  it.each(['example.org', 'ftp://example.org/a', 'javascript:alert(1)', 'https://example.org/a b'])(
    'refuses %j as a link, and shows the way it should be written',
    (link) => {
      expect(validate({ ...valid, link }).link).toBe('Dit is geen link. Schrijf het zo: https://voorbeeld.nl/bericht.')
    },
  )

  it('accepts a message of 2000 characters and refuses one of 2001, and says how long it is', () => {
    expect(validate({ ...valid, bericht: 'a'.repeat(2000) })).toEqual({})
    expect(validate({ ...valid, bericht: 'a'.repeat(2001) }).bericht).toBe(
      'Je bericht is te lang. Het mag hoogstens 2000 tekens zijn, en nu zijn het er 2001.',
    )
  })

  it('counts a character with an emoji as one character', () => {
    expect(validate({ ...valid, bericht: '⚽'.repeat(2000) })).toEqual({})
  })

  it('refuses a name of more than 100 characters', () => {
    expect(validate({ ...valid, naam: 'a'.repeat(101) }).naam).toBe('Je naam is te lang. Gebruik hoogstens 100 tekens.')
  })
})

describe('toMail', () => {
  it('goes to the editors, with the address of the visitor as the reply address and the subject as the subject', () => {
    expect(toMail(valid)).toEqual({
      replyTo: 'jan@example.org',
      subject: 'Contact: Een bericht laten verwijderen',
      text: [
        'Naam: Jan de Vries',
        'E-mailadres: jan@example.org',
        'Onderwerp: Een bericht laten verwijderen',
        'Link: https://example.org/artikel',
        '',
        'Dit artikel staat er zonder toestemming op.',
      ].join('\n'),
      to: 'fansite@heerenveen.org',
    })
  })

  it('says so when the name and the link are left out, and trims what the visitor typed', () => {
    const { text } = toMail({ ...valid, bericht: '  Hallo  ', 'e-mail': ' jan@example.org ', link: '', naam: '' })

    expect(text).toContain('Naam: (niet ingevuld)')
    expect(text).toContain('E-mailadres: jan@example.org\n')
    expect(text).toContain('Link: (niet ingevuld)')
    expect(text.endsWith('\n\nHallo')).toBe(true)
  })
})

describe('isOwnOrigin', () => {
  it('accepts an Origin with the host the request was sent to', () => {
    expect(isOwnOrigin('https://sc.heerenveen.org', 'sc.heerenveen.org')).toBe(true)
    expect(isOwnOrigin('http://localhost:3000', 'localhost:3000')).toBe(true)
  })

  it('refuses another host, another port, a missing Origin and a broken one', () => {
    expect(isOwnOrigin('https://example.org', 'sc.heerenveen.org')).toBe(false)
    expect(isOwnOrigin('http://localhost:3001', 'localhost:3000')).toBe(false)
    expect(isOwnOrigin(null, 'sc.heerenveen.org')).toBe(false)
    expect(isOwnOrigin('https://sc.heerenveen.org', null)).toBe(false)
    expect(isOwnOrigin('null', 'sc.heerenveen.org')).toBe(false)
  })
})
