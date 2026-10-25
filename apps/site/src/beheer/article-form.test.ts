import { articleLimits } from '@fansite/db/schema'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { slugMaxLength } from './article-fields'
import { bodyMaxLength, cleanBody, readValues, reservedSlugs, validate } from './article-form'

const form = (fields: Record<string, string>) => {
  const formData = new FormData()

  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value)
  }

  return formData
}

const good = {
  adres: 'welkom-bij-de-fansite',
  auteur: 'de redactie',
  intro: 'We stellen ons voor.',
  tekst: 'Een alinea.',
  titel: 'Welkom bij de Fansite',
}

describe('the limits', () => {
  it('match the columns of the table', () => {
    expect(slugMaxLength).toBe(articleLimits.slug)
  })
})

describe('readValues', () => {
  it('reads the five fields', () => {
    expect(readValues(form(good))).toEqual(good)
  })

  it('reads a field that is missing, or is a file, as empty', () => {
    const formData = form({ titel: 'Titel' })

    formData.set('tekst', new File(['x'], 'x.txt'))

    expect(readValues(formData)).toEqual({ adres: 'titel', auteur: '', intro: '', tekst: '', titel: 'Titel' })
  })

  it('makes a title, an intro and an author one line, without control characters', () => {
    expect(
      readValues(
        form({
          ...good,
          auteur: '  de \t redactie\u0000 ',
          intro: 'Eén.\r\nTwee.\n\nDrie.',
          titel: ' Kop\nmet  regels ',
        }),
      ),
    ).toMatchObject({
      auteur: 'de redactie',
      intro: 'Eén. Twee. Drie.',
      titel: 'Kop met regels',
    })
  })

  it('proposes an address from the title when the address is empty, and keeps the one that is typed', () => {
    expect(readValues(form({ ...good, adres: '   ', titel: 'Wij zijn terug!' })).adres).toBe('wij-zijn-terug')
    expect(readValues(form({ ...good, adres: ' Eigen Adres ' })).adres).toBe('Eigen Adres')
  })
})

describe('cleanBody', () => {
  it('turns every kind of line break into \\n and keeps blank lines, tabs and spaces inside', () => {
    expect(cleanBody('Een\r\n\r\nTwee\rDrie Vier\t  vijf')).toBe('Een\n\nTwee\nDrie\nVier\t  vijf')
  })

  it('drops control characters other than a line break and a tab, and trims the ends', () => {
    expect(cleanBody('\n\n  Tekst\u0000 met\u0007 \u001b[31mbesturing\u007f  \n\n')).toBe('Tekst met [31mbesturing')
  })

  it('keeps accents, quotes, emoji, other scripts and the characters of the format as they are', () => {
    const text =
      '## Één “kop” – ‘nu’ 🙂 ø\n\n- **vet** en *cursief*\n- [de LC](https://www.lc.nl/sport?a=1&b=2#x)\n\n<b>geen html</b> Це текст'

    expect(cleanBody(text)).toBe(text)
  })

  it('changes nothing in a text it has cleaned already', () => {
    const once = cleanBody('Eerste\r\n\r\n\r\nTweede  \r\n')

    expect(cleanBody(once)).toBe(once)
  })
})

describe('validate', () => {
  it('finds nothing wrong with good values', () => {
    expect(validate(good)).toEqual({})
  })

  it('asks for every field', () => {
    const errors = validate({ adres: '', auteur: '', intro: '', tekst: '', titel: '' })

    expect(Object.keys(errors).toSorted()).toEqual(['adres', 'auteur', 'intro', 'tekst', 'titel'])
    expect(errors.titel).toBe('Schrijf een titel.')
  })

  it('accepts a field of exactly the longest length and refuses one more, counted in characters', () => {
    expect(validate({ ...good, titel: '🙂'.repeat(articleLimits.title) })).toEqual({})
    expect(validate({ ...good, titel: '🙂'.repeat(articleLimits.title + 1) }).titel).toContain(
      'hoogstens 120 tekens, nu zijn het er 121',
    )
    expect(validate({ ...good, intro: 'x'.repeat(articleLimits.intro) })).toEqual({})
    expect(validate({ ...good, intro: 'x'.repeat(articleLimits.intro + 1) }).intro).toContain('hoogstens 300 tekens')
    expect(validate({ ...good, auteur: 'x'.repeat(articleLimits.author + 1) }).auteur).toContain('hoogstens 100 tekens')
    expect(validate({ ...good, adres: 'x'.repeat(articleLimits.slug) })).toEqual({})
    expect(validate({ ...good, adres: 'x'.repeat(articleLimits.slug + 1) }).adres).toContain('hoogstens 80 tekens')
  })

  it('limits the text to 20.000 characters and says how many there are', () => {
    expect(bodyMaxLength).toBe(20_000)
    expect(validate({ ...good, tekst: 'x'.repeat(bodyMaxLength) })).toEqual({})
    expect(validate({ ...good, tekst: 'x'.repeat(bodyMaxLength + 5) }).tekst).toBe(
      'De tekst is te lang. Gebruik hoogstens 20.000 tekens, nu zijn het er 20.005.',
    )
  })

  it.each([
    'Welkom',
    'welkom bij',
    'welkom--bij',
    '-welkom',
    'welkom-',
    'wélkom',
    'welkom/bij',
    'welkom_bij',
    '../beheer',
    'a.b',
    '%2e',
    '<b>',
  ])('refuses %j as an address', (adres) => {
    expect(validate({ ...good, adres }).adres).toContain('kleine letters, cijfers en enkele streepjes')
  })

  it.each(['a', '1', 'welkom', 'welkom-bij-de-fansite', '2026-seizoen', 'a1-b2-c3'])(
    'accepts %j as an address',
    (adres) => {
      expect(validate({ ...good, adres })).toEqual({})
    },
  )

  it.each(['beheer', 'bronnen', 'privacy', 'redactie', 'api', 'over-ons'])(
    'refuses %j, an address of another page',
    (adres) => {
      expect(validate({ ...good, adres }).adres).toBe(
        'Dit adres hoort bij een andere pagina van de site. Kies een ander adres.',
      )
    },
  )

  it('gives each error in words that say how to put it right', () => {
    for (const message of Object.values(
      validate({ adres: 'Fout adres', auteur: '', intro: '', tekst: '', titel: '' }),
    )) {
      expect(message).toMatch(/^[A-Z“]/u)
      expect(message).toMatch(/[.”]$/u)
    }
  })
})

describe('the reserved addresses', () => {
  const app = path.resolve(import.meta.dirname, '../app')

  it('name every page and route at the top of the site, so a new one fails here until it is added', () => {
    const names = readdirSync(app, { withFileTypes: true })
      .filter((entry) => !/^[_([]/u.test(entry.name))
      .map((entry) => entry.name.replace(/\.(?:test\.)?tsx?$/u, ''))
      .filter((name) => !['error', 'layout', 'not-found', 'page'].includes(name) && !name.includes('.'))

    expect(names.length).toBeGreaterThan(5)
    expect(names.filter((name) => !reservedSlugs.includes(name))).toEqual([])
  })

  it('are lowercase addresses the form would accept otherwise', () => {
    for (const slug of reservedSlugs) {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u)
    }
  })
})
