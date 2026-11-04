import { describe, expect, it } from 'vitest'

import { articleJsonMaxLength, readArticleDocument, safeAddress } from './article-document.ts'

const text = (value: string, marks?: unknown[]) => ({ text: value, type: 'text', ...(marks ? { marks } : {}) })
const paragraph = (...content: unknown[]) => ({ content, type: 'paragraph' })
const doc = (...content: unknown[]) => JSON.stringify({ content, type: 'doc' })

const everything = doc(
  paragraph(
    text('Een '),
    text('vet', [{ type: 'bold' }]),
    text(' en '),
    text('cursief', [{ type: 'italic' }]),
    text('link', [{ attrs: { href: 'https://www.lc.nl/sport' }, type: 'link' }]),
    text('eigen', [{ attrs: { href: '/bronnen' }, type: 'link' }]),
  ),
  { attrs: { level: 2 }, content: [text('Kop')], type: 'heading' },
  { content: [{ content: [paragraph(text('Punt'))], type: 'listItem' }], type: 'bulletList' },
  { type: 'paragraph' },
)

describe('readArticleDocument', () => {
  it('accepts a document with every part the editor makes, and gives it back as it was', () => {
    const result = readArticleDocument(everything)

    expect(result.ok && JSON.parse(result.json)).toEqual(JSON.parse(everything))
  })

  it('counts the characters of the visible text and not those of the JSON', () => {
    const result = readArticleDocument(everything)

    expect(result).toMatchObject({ ok: true, textLength: 'Een vet en cursieflinkeigenKopPunt'.length })
  })

  it('counts a character outside the basic plane as one', () => {
    expect(readArticleDocument(doc(paragraph(text('🗞️')))).ok && true).toBe(true)
    expect(readArticleDocument(doc(paragraph(text('🗞'))))).toMatchObject({ textLength: 1 })
  })

  it('writes the keys and the marks in a fixed order', () => {
    const shuffled = JSON.stringify({
      content: [
        {
          content: [{ marks: [{ attrs: { href: '/a' }, type: 'link' }, { type: 'bold' }], text: 'x', type: 'text' }],
          type: 'paragraph',
        },
      ],
      type: 'doc',
    })

    expect(readArticleDocument(shuffled)).toMatchObject({
      json: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","marks":[{"type":"bold"},{"type":"link","attrs":{"href":"/a"}}],"text":"x"}]}]}',
      ok: true,
    })
  })

  it('drops a text without characters and turns a control character into a space', () => {
    expect(readArticleDocument(doc(paragraph(text(''), text('a\u0000b\nc'))))).toMatchObject({
      json: '{"type":"doc","content":[{"type":"paragraph","content":[{"type":"text","text":"a b c"}]}]}',
    })
  })

  it('accepts a document without content', () => {
    expect(readArticleDocument('{"type":"doc"}')).toMatchObject({ ok: true, textLength: 0 })
  })

  it.each([
    ['an image', doc({ attrs: { src: 'https://x.test/a.png' }, type: 'image' })],
    ['a table', doc({ content: [], type: 'table' })],
    ['an ordered list', doc({ content: [], type: 'orderedList' })],
    ['a code block', doc({ content: [text('x')], type: 'codeBlock' })],
    ['a heading of level 3', doc({ attrs: { level: 3 }, content: [text('x')], type: 'heading' })],
    ['a heading without a level', doc({ content: [text('x')], type: 'heading' })],
    ['a script as a node', doc({ content: [text('alert(1)')], type: 'script' })],
    [
      'a list in a list',
      doc({ content: [{ content: [{ content: [], type: 'bulletList' }], type: 'listItem' }], type: 'bulletList' }),
    ],
    [
      'two paragraphs in a list item',
      doc({
        content: [{ content: [paragraph(text('a')), paragraph(text('b'))], type: 'listItem' }],
        type: 'bulletList',
      }),
    ],
    ['an empty list', doc({ content: [], type: 'bulletList' })],
    ['a mark of another kind', doc(paragraph(text('x', [{ type: 'code' }])))],
    ['a style on a mark', doc(paragraph(text('x', [{ attrs: { style: 'x' }, type: 'bold' }])))],
    ['the same mark twice', doc(paragraph(text('x', [{ type: 'bold' }, { type: 'bold' }])))],
    ['an attribute on a paragraph', doc({ attrs: { class: 'x' }, type: 'paragraph' })],
    ['an extra key on a text', doc(paragraph({ onclick: 'alert(1)', text: 'x', type: 'text' }))],
    ['a text that is not text', doc(paragraph({ text: 5, type: 'text' }))],
    ['a node that is not an object', doc('paragraph')],
    ['a document in a document', doc({ content: [], type: 'doc' })],
    ['a __proto__ key', '{"type":"doc","content":[],"__proto__":{"x":1}}'],
    [
      'an extra attribute on a link',
      doc(paragraph(text('x', [{ attrs: { href: '/a', target: '_blank' }, type: 'link' }]))),
    ],
  ])('refuses %s', (_name, json) => {
    expect(readArticleDocument(json)).toEqual({ ok: false, problem: 'component' })
  })

  it.each([
    'javascript:alert(1)',
    'JAVASCRIPT:alert(1)',
    'data:text/html;base64,PHNjcmlwdD4=',
    '//evil.example',
    '/\\evil.example',
    'http://www.lc.nl',
    'www.lc.nl',
    'mailto:iemand@example.test',
    'https://user:pw@www.lc.nl',
    '#kop',
    'https://www.lc.nl/"onmouseover="alert(1)',
  ])('refuses a link to %s', (href) => {
    expect(readArticleDocument(doc(paragraph(text('x', [{ attrs: { href }, type: 'link' }]))))).toEqual({
      ok: false,
      problem: 'link',
    })
  })

  it.each(['', 'niet json', '[]', 'null', '"tekst"', '5', '{"type":"paragraph"}', '{"content":[]}'])(
    'refuses %j as unreadable',
    (json) => {
      expect(readArticleDocument(json)).toMatchObject({ ok: false })
      expect(readArticleDocument(json)).not.toMatchObject({ problem: 'too-large' })
    },
  )

  it('accepts a script in the text as text, which the page escapes', () => {
    const result = readArticleDocument(doc(paragraph(text('<script>alert(1)</script>'))))

    expect(result).toMatchObject({ ok: true, textLength: 25 })
  })

  it('refuses JSON of more than the limit before it reads it', () => {
    expect(readArticleDocument(doc(paragraph(text('a'.repeat(articleJsonMaxLength)))))).toEqual({
      ok: false,
      problem: 'too-large',
    })
  })

  it('refuses a text of a million characters', () => {
    expect(readArticleDocument(doc(paragraph(text('a'.repeat(1_000_000)))))).toEqual({
      ok: false,
      problem: 'too-large',
    })
  })

  it('refuses a deep nesting without running out of stack', () => {
    const depth = 100_000
    const nested = `{"type":"doc","content":[${'{"type":"bulletList","content":[{"type":"listItem","content":['.repeat(depth / 100)}`
    const start = performance.now()

    expect(readArticleDocument(nested)).toMatchObject({ ok: false })
    expect(readArticleDocument(`${'['.repeat(900_000)}${']'.repeat(900_000)}`)).toMatchObject({ ok: false })
    expect(
      readArticleDocument(`{"type":"doc","content":${'{"content":'.repeat(80_000)}[]${'}'.repeat(80_000)}}`),
    ).toEqual({
      ok: false,
      problem: 'component',
    })
    expect(performance.now() - start).toBeLessThan(5000)
  })
})

describe('safeAddress', () => {
  it('knows an address of another site from a page of ours', () => {
    expect(safeAddress('https://www.lc.nl/sport?a=1#b')).toBe('external')
    expect(safeAddress('/bronnen')).toBe('internal')
  })

  it('refuses an address of a million characters in a moment', () => {
    const start = performance.now()

    expect(safeAddress(`https://www.lc.nl/${'a'.repeat(1_000_000)}`)).toBeUndefined()
    expect(safeAddress(`/${'a'.repeat(1_000_000)}`)).toBeUndefined()
    expect(performance.now() - start).toBeLessThan(5000)
  })
})
