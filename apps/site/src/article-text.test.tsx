import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { type Block, parseArticleText, safeAddress } from './article-text'
import { ArticleText } from './ArticleText'
import { withoutIcons } from './without-icons'

const html = (text: string) => withoutIcons(renderToStaticMarkup(<ArticleText text={text} />))

describe('parseArticleText', () => {
  it('makes a paragraph of each part between blank lines', () => {
    expect(parseArticleText('Eerste.\n\nTweede.\n\n\n   \nDerde.')).toEqual([
      { children: [{ text: 'Eerste.', type: 'text' }], type: 'paragraph' },
      { children: [{ text: 'Tweede.', type: 'text' }], type: 'paragraph' },
      { children: [{ text: 'Derde.', type: 'text' }], type: 'paragraph' },
    ])
  })

  it('joins the lines of a paragraph with a space, and accepts Windows line endings', () => {
    expect(parseArticleText('Eerste regel\r\ntweede regel\r\n\r\nNieuwe alinea')).toEqual([
      { children: [{ text: 'Eerste regel tweede regel', type: 'text' }], type: 'paragraph' },
      { children: [{ text: 'Nieuwe alinea', type: 'text' }], type: 'paragraph' },
    ])
  })

  it('gives nothing for an empty text or a text of white space', () => {
    expect(parseArticleText('')).toEqual([])
    expect(parseArticleText('  \n\n \t \n')).toEqual([])
  })

  it('makes a heading of level 2 of a single line that starts with ## ', () => {
    expect(parseArticleText('## Wie we zijn')).toEqual([{ text: 'Wie we zijn', type: 'heading' }])
  })

  it.each(['# Kop', '### Kop', '##Kop', '## ', '##', '## Kop\nmet tekst eronder'])(
    'shows %j as a paragraph and not as a heading',
    (text) => {
      expect(parseArticleText(text).map((block) => block.type)).toEqual(['paragraph'])
    },
  )

  it('makes a list of a part in which every line starts with - ', () => {
    expect(parseArticleText('- een\n- twee *drie*')).toEqual([
      {
        items: [
          [{ text: 'een', type: 'text' }],
          [
            { text: 'twee ', type: 'text' },
            { children: [{ text: 'drie', type: 'text' }], type: 'italic' },
          ],
        ],
        type: 'list',
      },
    ])
  })

  it.each(['- een\ntwee', '-een', '- ', '- een\n- ', '* een\n* twee', '1. een\n2. twee'])(
    'shows %j as a paragraph and not as a list',
    (text) => {
      expect(parseArticleText(text).map((block) => block.type)).toEqual(['paragraph'])
    },
  )

  it('makes bold and italic of text between ** and between *', () => {
    expect(parseArticleText('a **vet** b *cursief* c')).toEqual([
      {
        children: [
          { text: 'a ', type: 'text' },
          { children: [{ text: 'vet', type: 'text' }], type: 'bold' },
          { text: ' b ', type: 'text' },
          { children: [{ text: 'cursief', type: 'text' }], type: 'italic' },
          { text: ' c', type: 'text' },
        ],
        type: 'paragraph',
      },
    ])
  })

  it('allows italic and a link inside bold', () => {
    expect(parseArticleText('**een *schuine* [link](/bronnen)**')).toEqual([
      {
        children: [
          {
            children: [
              { text: 'een ', type: 'text' },
              { children: [{ text: 'schuine', type: 'text' }], type: 'italic' },
              { text: ' ', type: 'text' },
              { external: false, href: '/bronnen', text: 'link', type: 'link' },
            ],
            type: 'bold',
          },
        ],
        type: 'paragraph',
      },
    ])
  })

  it('makes a link to another site external, and a link to a page of ours not', () => {
    const [block] = parseArticleText('[LC](https://www.lc.nl/sport) en [bronnen](/bronnen)') as [Block]

    expect(block).toEqual({
      children: [
        { external: true, href: 'https://www.lc.nl/sport', text: 'LC', type: 'link' },
        { text: ' en ', type: 'text' },
        { external: false, href: '/bronnen', text: 'bronnen', type: 'link' },
      ],
      type: 'paragraph',
    })
  })

  it.each([
    '**niet gesloten',
    '*niet gesloten',
    'gesloten** niet geopend',
    '2 * 3 * 4',
    '** **',
    '****',
    '**',
    '*',
    '[tekst](https://www.lc.nl',
    '[tekst] (https://www.lc.nl)',
    '[tekst]',
    '[](https://www.lc.nl)',
    '(https://www.lc.nl)',
    ']()[',
  ])('keeps %j as plain text', (text) => {
    expect(parseArticleText(text)).toEqual([{ children: [{ text, type: 'text' }], type: 'paragraph' }])
  })

  it('does not nest bold inside italic, and shows the markers that stay as they are', () => {
    const [block] = parseArticleText('*a **b** c*') as [Block]

    expect(JSON.stringify(block)).not.toContain('"italic"')
  })

  it('does not take markers in a heading or in the text of a link', () => {
    expect(parseArticleText('## Een *kop* met **tekens**')).toEqual([
      { text: 'Een *kop* met **tekens**', type: 'heading' },
    ])
    expect(parseArticleText('[een *link*](/x)')).toEqual([
      { children: [{ external: false, href: '/x', text: 'een *link*', type: 'link' }], type: 'paragraph' },
    ])
  })
})

describe('safeAddress', () => {
  it.each([
    ['https://www.lc.nl', 'external'],
    ['https://www.lc.nl/sport/sc-heerenveen/?a=1&b=2#kop', 'external'],
    ['https://localhost:3000/x', 'external'],
    ['/', 'internal'],
    ['/bronnen', 'internal'],
    ['/redactie/wie-zijn-wij?a=1#kop', 'internal'],
  ])('accepts %s', (address, kind) => {
    expect(safeAddress(address)).toBe(kind)
  })

  it.each([
    'javascript:alert(1)',
    'JavaScript:alert(1)',
    ' javascript:alert(1)',
    'java\tscript:alert(1)',
    'data:text/html,<script>alert(1)</script>',
    'vbscript:msgbox(1)',
    'http://www.lc.nl',
    'HTTPS://www.lc.nl',
    'https:www.lc.nl',
    'https:/www.lc.nl',
    'https://',
    'https:///www.lc.nl',
    'https://user:password@www.lc.nl',
    'https://www.lc.nl@evil.example',
    'https://www.lc.nl\\@evil.example',
    'https://www.lc .nl',
    'https://www.lc.nl/\nx',
    'mailto:iemand@example.test',
    'www.lc.nl',
    'lc.nl/sport',
    '//evil.example',
    '//evil.example/pad',
    '/\\evil.example',
    '/\\\\evil.example',
    '/ /evil.example',
    '/\t/evil.example',
    '/\n/evil.example',
    '',
    '#kop',
    '?a=1',
    './bronnen',
    '../bronnen',
  ])('refuses %j', (address) => {
    expect(safeAddress(address)).toBeUndefined()
  })
})

describe('the output of ArticleText', () => {
  it('renders paragraphs, an h2, a list, bold, italic and links as elements of the design system', () => {
    const output = html(
      [
        'Een alinea met **vet**, *cursief* en [de LC](https://www.lc.nl/sport) en [onze bronnen](/bronnen).',
        '## Een kop',
        '- een\n- twee',
      ].join('\n\n'),
    )

    expect(output).toBe(
      [
        '<p>Een alinea met <strong>vet</strong>, <em>cursief</em> en ',
        '<a href="https://www.lc.nl/sport" rel="noopener">de LC</a> en ',
        '<a href="/bronnen">onze bronnen</a>.</p>',
        '<h2 class="hf-heading-2">Een kop</h2>',
        '<ul><li>een</li><li>twee</li></ul>',
      ].join(''),
    )
  })

  it('gives a link to another site the icon for an external link, and a link of ours none', () => {
    const output = renderToStaticMarkup(<ArticleText text="[LC](https://www.lc.nl) en [wij](/bronnen)" />)
    const [external, internal] = output.split('</a>')

    expect(external).toContain('<svg')
    expect(internal).not.toContain('<svg')
  })

  it('renders raw HTML as text that the browser does not run', () => {
    const output = html('<script>alert(1)</script>\n\n<img src=x onerror=alert(1)>\n\n**<b>vet</b>**')

    expect(output).not.toMatch(/<script|<img|<b>/)
    expect(output).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(output).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(output).toContain('<strong>&lt;b&gt;vet&lt;/b&gt;</strong>')
  })

  it('does not let a quote or a tag in a link or its text out of the attribute', () => {
    const output = html('[x" onclick="alert(1)](https://www.lc.nl/"onmouseover="alert(1))')

    expect(output).not.toMatch(/<a [^>]*\sonclick=/)
    expect(output).not.toMatch(/<a [^>]*\sonmouseover=/)
  })

  it.each([
    '[klik](javascript:alert(1))',
    '[klik](JAVASCRIPT:alert(1))',
    '[klik](data:text/html;base64,PHNjcmlwdD4=)',
    '[klik](//evil.example)',
    '[klik](/\\evil.example)',
    '[klik](http://www.lc.nl)',
    '[klik](www.lc.nl)',
    '[klik](mailto:iemand@example.test)',
    '[klik](https://user:pw@www.lc.nl)',
    '[klik](#kop)',
  ])('shows %s as text, without a link', (text) => {
    const output = html(text)

    expect(output).not.toContain('<a ')
    expect(output).not.toContain('href=')
  })

  it('shows an image as text, since the format has no images', () => {
    const output = html('![alt](https://www.lc.nl/foto.jpg)')

    expect(output).not.toContain('<img')
    expect(output).toContain('!<a href="https://www.lc.nl/foto.jpg"')
  })

  it('renders an empty text as nothing', () => {
    expect(html('')).toBe('')
  })

  it('has no dangerouslySetInnerHTML in its source', async () => {
    const { readFileSync } = await import('node:fs')
    const source = [
      readFileSync(new URL('./ArticleText.tsx', import.meta.url), 'utf8'),
      readFileSync(new URL('./article-text.ts', import.meta.url), 'utf8'),
    ].join('\n')

    expect(source).not.toContain('dangerouslySetInnerHTML')
  })
})

describe('with hostile or huge input', () => {
  /** Runs `work`, and fails when it takes longer than a second: a sign of a runaway pattern. */
  function quickly<T>(work: () => T) {
    const start = performance.now()
    const result = work()

    expect(performance.now() - start).toBeLessThan(1000)

    return result
  }

  it('parses one line of a million characters', () => {
    const blocks = quickly(() => parseArticleText('a'.repeat(1_000_000)))

    expect(blocks).toHaveLength(1)
  })

  it.each(['[', '*', '**', '[a](', '[a](https://', '](', '*a ', '**a ', '[a](https://x.nl/'])(
    'parses a million times %j without hanging',
    (piece) => {
      const blocks = quickly(() => parseArticleText(piece.repeat(1_000_000 / piece.length)))

      expect(blocks.length).toBeGreaterThan(0)
    },
  )

  it('parses a million openers of a link with one closer at the end', () => {
    const text = `${'['.repeat(500_000)}](https://x.nl)`

    expect(quickly(() => parseArticleText(text))).toHaveLength(1)
  })

  it('parses a million openers of bold and italic with a closer at the end', () => {
    quickly(() => parseArticleText(`${'* a '.repeat(250_000)}*`))
    quickly(() => parseArticleText(`${'** a '.repeat(200_000)}**`))
  })

  it('parses nested markers to a fixed depth', () => {
    const blocks = quickly(() => parseArticleText(`${'**'.repeat(100_000)}x${'**'.repeat(100_000)}`))

    expect(JSON.stringify(blocks).length).toBeLessThan(5_000_000)
  })

  it('parses and renders fifty thousand lines and twenty thousand paragraphs', () => {
    const lines = Array.from({ length: 50_000 }, (_, index) => `- punt **${index}** [link](/x)`).join('\n')
    const paragraphs = Array.from({ length: 20_000 }, (_, index) => `Alinea ${index} met *tekst*.`).join('\n\n')
    const output = quickly(() => html(`${lines}\n\n${paragraphs}`))

    expect(output.match(/<li>/g)).toHaveLength(50_000)
    expect(output.match(/<p>/g)).toHaveLength(20_000)
  })

  it('refuses an address of a million characters', () => {
    expect(quickly(() => safeAddress(`https://www.lc.nl/${'a'.repeat(1_000_000)}`))).toBeUndefined()
    expect(quickly(() => safeAddress(`/${'a'.repeat(1_000_000)}`))).toBeUndefined()
  })
})
