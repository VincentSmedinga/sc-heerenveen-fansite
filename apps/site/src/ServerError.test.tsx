import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { ServerError } from './ServerError'
import { withoutIcons } from './without-icons'

describe('ServerError', () => {
  const html = renderToStaticMarkup(<ServerError retryHref="/bronnen" />)

  it('is the one main of the page, with all its content in one cell', () => {
    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).toMatch(/^<main class="hf-page-main"><div class="hf-page-cell">.*<\/div><\/main>$/)
  })

  it('has one h1, which is the title', () => {
    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Er ging iets mis</h1>'])
  })

  it('says that it is our fault, and what to do', () => {
    expect(html).toContain(
      '<p class="hf-intro"><b>Deze pagina lukt nu even niet. Dat ligt aan ons, niet aan jou.</b></p>',
    )
    expect(withoutIcons(html)).toContain(
      '<p>Probeer het over een paar minuten opnieuw. Lukt het dan nog niet, meld het dan op <a href="https://forum.heerenveen.org">het forum</a>.</p>',
    )
  })

  it('draws the icon for a link to another site behind the link to the forum, and at no other link', () => {
    expect(html).toMatch(
      /<a href="https:\/\/forum\.heerenveen\.org">het <span class="hf-icon-tail">forum<svg [^>]*class="hf-icon"/,
    )
    expect(html.match(/<svg /g)).toHaveLength(1)
  })

  it('links to the page itself and to the homepage', () => {
    expect(html).toContain('<li><a href="/bronnen">Probeer het opnieuw</a></li>')
    expect(html).toContain('<li><a href="/">Naar de homepage</a></li>')
  })

  it('does not name a cause', () => {
    expect(html).not.toMatch(/database|server|fout/i)
  })
})
