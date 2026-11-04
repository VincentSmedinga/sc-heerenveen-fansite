import { articleLimits } from '@fansite/db/schema'
import { type ArticleDocument, serialiseArticleDocument } from '@fansite/shared/article-document'
import { readdirSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

import { slugMaxLength } from './article-fields'
import { bodyMaxLength, readValues, reservedSlugs, validate } from './article-form'

const form = (fields: Record<string, string>) => {
  const formData = new FormData()

  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value)
  }

  return formData
}

const paragraph = (text: string) => ({ content: [{ text, type: 'text' }], type: 'paragraph' })
// The text as the server stores it: the keys in the order of Tiptap.
const doc = (...content: unknown[]) => serialiseArticleDocument({ content, type: 'doc' } as unknown as ArticleDocument)

const good = {
  adres: 'welkom-bij-de-fansite',
  auteur: 'de redactie',
  intro: 'We stellen ons voor.',
  tekst: doc(paragraph('Een alinea.')),
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

describe('the text', () => {
  it('is stored as the checked JSON, with the keys in their fixed order', () => {
    const shuffled = '{"content":[{"content":[{"text":"Een","type":"text"}],"type":"paragraph"}],"type":"doc"}'

    expect(readValues(form({ ...good, tekst: shuffled })).tekst).toBe(
      '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"Een"}]}]}',
    )
  })

  it('stays as it was sent when it is refused, so the form can give it back', () => {
    const refused = doc({ attrs: { src: 'https://www.lc.nl/foto.jpg' }, type: 'image' })

    expect(readValues(form({ ...good, tekst: refused })).tekst).toBe(refused)
    expect(readValues(form({ ...good, tekst: 'niet json' })).tekst).toBe('niet json')
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

  it('limits the visible text to 20.000 characters, not the JSON, and says how many there are', () => {
    expect(bodyMaxLength).toBe(20_000)
    expect(validate({ ...good, tekst: doc(paragraph('x'.repeat(bodyMaxLength))) })).toEqual({})
    expect(validate({ ...good, tekst: doc(paragraph('x'.repeat(bodyMaxLength + 5))) }).tekst).toBe(
      'De tekst is te lang. Gebruik hoogstens 20.000 tekens, nu zijn het er 20.005.',
    )
  })

  it('counts the text of marks and lists, and not the JSON around them', () => {
    const bold = { marks: [{ type: 'bold' }], text: 'x'.repeat(bodyMaxLength), type: 'text' }

    expect(validate({ ...good, tekst: doc({ content: [bold], type: 'paragraph' }) })).toEqual({})
    expect(
      validate({ ...good, tekst: doc({ content: [bold, { text: 'y', type: 'text' }], type: 'paragraph' }) }).tekst,
    ).toContain('nu zijn het er 20.001')
  })

  it.each([
    ['an empty text', ''],
    ['a document without text', '{"type":"doc","content":[{"type":"paragraph"}]}'],
    ['a document of spaces', doc(paragraph('   '))],
  ])('asks for the text when it is %s', (_name, tekst) => {
    expect(validate({ ...good, tekst }).tekst).toBe('Schrijf de tekst van het artikel.')
  })

  it.each([
    ['a node that is not on the list', doc({ attrs: { src: 'x' }, type: 'image' }), 'iets wat in een artikel niet kan'],
    ['a script as a node', doc({ content: [], type: 'script' }), 'iets wat in een artikel niet kan'],
    [
      'a link to javascript:',
      doc({
        content: [{ marks: [{ attrs: { href: 'javascript:alert(1)' }, type: 'link' }], text: 'x', type: 'text' }],
        type: 'paragraph',
      }),
      'Een link wijst naar een adres dat niet kan',
    ],
    [
      'a link to //evil.example',
      doc({
        content: [{ marks: [{ attrs: { href: '//evil.example' }, type: 'link' }], text: 'x', type: 'text' }],
        type: 'paragraph',
      }),
      'Een link wijst naar een adres dat niet kan',
    ],
    ['JSON that is far too big', doc(paragraph('a'.repeat(1_000_000))), 'De tekst is te groot'],
    ['something that is no JSON', '<script>alert(1)</script>', 'De tekst is niet goed aangekomen'],
  ])('refuses %s, at the field', (_name, tekst, message) => {
    expect(validate({ ...good, tekst }).tekst).toContain(message)
  })

  it('refuses a text with a million characters, and one nested very deep', () => {
    expect(validate({ ...good, tekst: doc(paragraph('a'.repeat(1_000_000))) }).tekst).toBeDefined()
    expect(
      validate({ ...good, tekst: `{"type":"doc","content":${'[{"content":'.repeat(50_000)}[]` }).tekst,
    ).toBeDefined()
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
      // Not an address: a private folder (_), a route group, a dynamic segment or a slot (@).
      .filter((entry) => !/^[_(@[]/u.test(entry.name))
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
