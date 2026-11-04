import { articleBodyToJson } from '@fansite/db/article-body-migration'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ArticleText } from './ArticleText'
import { withoutIcons } from './without-icons'

const html = (body: string) => withoutIcons(renderToStaticMarkup(<ArticleText body={body} />))

const text = (value: string, marks?: unknown[]) => ({ text: value, type: 'text', ...(marks ? { marks } : {}) })
const paragraph = (...content: unknown[]) => ({ content, type: 'paragraph' })
const doc = (...content: unknown[]) => JSON.stringify({ content, type: 'doc' })
const link = (href: string) => ({ attrs: { href }, type: 'link' })

describe('ArticleText', () => {
  it('makes a paragraph, a heading of level 2, a list, bold, italic and links of the JSON', () => {
    const output = html(
      doc(
        paragraph(
          text('Een alinea met '),
          text('vet', [{ type: 'bold' }]),
          text(', '),
          text('cursief', [{ type: 'italic' }]),
          text(' en '),
          text('de LC', [link('https://www.lc.nl/sport')]),
          text(' en '),
          text('onze bronnen', [link('/bronnen')]),
          text('.'),
        ),
        { attrs: { level: 2 }, content: [text('Een kop')], type: 'heading' },
        {
          content: [
            { content: [paragraph(text('een'))], type: 'listItem' },
            { content: [paragraph(text('twee'))], type: 'listItem' },
          ],
          type: 'bulletList',
        },
      ),
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

  it('puts nodes that share a mark in one element', () => {
    const output = html(
      doc(
        paragraph(
          text('a ', [{ type: 'bold' }]),
          text('b', [{ type: 'bold' }, { type: 'italic' }]),
          text(' c', [{ type: 'bold' }]),
        ),
      ),
    )

    expect(output).toBe('<p><strong>a <em>b</em> c</strong></p>')
  })

  it('gives a link to another site the icon for an external link, and a link of ours none', () => {
    const output = renderToStaticMarkup(
      <ArticleText
        body={doc(paragraph(text('LC', [link('https://www.lc.nl')]), text(' en '), text('wij', [link('/bronnen')])))}
      />,
    )
    const [external, internal] = output.split('</a>')

    expect(external).toContain('<svg')
    expect(internal).not.toContain('<svg')
  })

  it('renders an empty paragraph and an empty document', () => {
    expect(html(doc({ type: 'paragraph' }))).toBe('<p></p>')
    expect(html(doc())).toBe('')
  })

  it('renders raw HTML in the text as text that the browser does not run', () => {
    const output = html(
      doc(
        paragraph(text('<script>alert(1)</script>')),
        paragraph(text('<img src=x onerror=alert(1)>')),
        paragraph(text('<b>vet</b>', [{ type: 'bold' }])),
      ),
    )

    expect(output).not.toMatch(/<script|<img|<b>/)
    expect(output).toContain('&lt;script&gt;alert(1)&lt;/script&gt;')
    expect(output).toContain('&lt;img src=x onerror=alert(1)&gt;')
    expect(output).toContain('<strong>&lt;b&gt;vet&lt;/b&gt;</strong>')
  })

  it('does not let a quote or a tag in a link or its text out of the attribute', () => {
    const output = html(doc(paragraph(text('x" onclick="alert(1)', [link('https://www.lc.nl/')]))))

    expect(output).not.toMatch(/<a [^>]*\sonclick=/)
    expect(output).toContain('x&quot; onclick=&quot;alert(1)')
  })

  it.each([
    ['a node that is not on the list', doc({ attrs: { src: 'https://www.lc.nl/foto.jpg' }, type: 'image' })],
    ['a script as a node', doc({ content: [text('alert(1)')], type: 'script' })],
    ['a link to javascript:', doc(paragraph(text('klik', [link('javascript:alert(1)')])))],
    ['a link to //evil.example', doc(paragraph(text('klik', [link('//evil.example')])))],
    ['a link to /\\evil.example', doc(paragraph(text('klik', [link('/\\evil.example')])))],
    ['a link to http://', doc(paragraph(text('klik', [link('http://www.lc.nl')])))],
    ['a link with a login', doc(paragraph(text('klik', [link('https://user:pw@www.lc.nl')])))],
    ['JSON that is no document', '{"type":"paragraph"}'],
    ['an old text', 'Een alinea in de oude opmaak.'],
    ['an empty string', ''],
  ])('shows nothing at all for %s', (_name, body) => {
    expect(html(body)).toBe('')
  })

  it('has no dangerouslySetInnerHTML in its source', async () => {
    const { readFileSync } = await import('node:fs')

    expect(readFileSync(new URL('./ArticleText.tsx', import.meta.url), 'utf8')).not.toContain('dangerouslySetInnerHTML')
  })

  it('renders four thousand list items and two thousand paragraphs in a moment', () => {
    const items = Array.from({ length: 4000 }, (_, index) => ({
      content: [paragraph(text(`punt ${index}`, [{ type: 'bold' }]))],
      type: 'listItem',
    }))
    const paragraphs = Array.from({ length: 2000 }, (_, index) => paragraph(text(`Alinea ${index}`)))
    const start = performance.now()
    const output = html(doc({ content: items, type: 'bulletList' }, ...paragraphs))

    expect(performance.now() - start).toBeLessThan(5000)
    expect(output.match(/<li>/g)).toHaveLength(4000)
    expect(output.match(/<p>/g)).toHaveLength(2000)
  })
})

describe('an article that was written in the old format', () => {
  // The text of an article with every part, and what a visitor saw of it before the migration:
  // the HTML that the old `ArticleText` made of the old text, kept as it was.
  const oldText = [
    'Dit is een **verzonnen** artikel om de pagina mee te testen. Het heeft *cursieve* tekst en een link naar [onze bronnen](/bronnen).',
    '## Een kop in het artikel',
    'Een alinea met een link naar [de Testkrant](https://testkrant.test/verhaal), een andere site.',
    '- Het eerste punt van de lijst',
    '- Het tweede punt, met **vet**',
    '## Een tweede kop',
    'Het slot, met <b>HTML</b> dat gewone tekst blijft, en een lang adres: https://www.voorbeeldkrant.test/een/heel/lang/adres/van/vandaag.',
    '**vet en *cursief erin*** en *cursief* en [link](https://www.lc.nl/sport?a=1&b=2) met 2 * 3 * 4 en <script>alert(1)</script>',
    '- een **vet**\n- twee [link](/bronnen)\n- drie',
    'Regel een\nregel twee',
    '[klik](javascript:alert(1)) en [x](//evil.example)',
  ].join('\n\n')

  const before = [
    '<p>Dit is een <strong>verzonnen</strong> artikel om de pagina mee te testen. Het heeft <em>cursieve</em> tekst en een link naar <a href="/bronnen">onze bronnen</a>.</p>',
    '<h2 class="hf-heading-2">Een kop in het artikel</h2>',
    '<p>Een alinea met een link naar <a href="https://testkrant.test/verhaal" rel="noopener">de Testkrant</a>, een andere site.</p>',
    '<ul><li>Het eerste punt van de lijst</li></ul>',
    '<ul><li>Het tweede punt, met <strong>vet</strong></li></ul>',
    '<h2 class="hf-heading-2">Een tweede kop</h2>',
    '<p>Het slot, met &lt;b&gt;HTML&lt;/b&gt; dat gewone tekst blijft, en een lang adres: https://www.voorbeeldkrant.test/een/heel/lang/adres/van/vandaag.</p>',
    '<p><strong>vet en <em>cursief erin</em></strong> en <em>cursief</em> en <a href="https://www.lc.nl/sport?a=1&amp;b=2" rel="noopener">link</a> met 2 * 3 * 4 en &lt;script&gt;alert(1)&lt;/script&gt;</p>',
    '<ul><li>een <strong>vet</strong></li><li>twee <a href="/bronnen">link</a></li><li>drie</li></ul>',
    '<p>Regel een regel twee</p>',
    '<p>[klik](javascript:alert(1)) en [x](//evil.example)</p>',
  ].join('')

  it('shows a visitor the same page after the migration as before it', () => {
    expect(html(articleBodyToJson(oldText))).toBe(before)
  })
})
