import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getReleases } from '../../releases'
import WhatsNewPage, { generateMetadata } from './page'

vi.mock('../../releases', () => ({ getReleases: vi.fn() }))

const releases = [
  { date: '2026-11-03', sentences: ['Een verandering.', 'Nog een verandering.'], version: '0.2.0' },
  { date: '2026-10-21', sentences: ['De eerste versie.'], version: '0.1.0' },
]

beforeEach(() => {
  vi.mocked(getReleases).mockReset()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('the page Wat is er nieuw', () => {
  it('shows each version under a heading with its date and its number in small print, newest first, with a sentence per change', () => {
    vi.mocked(getReleases).mockReturnValue(releases)

    const html = renderToStaticMarkup(WhatsNewPage())

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Wat is er nieuw</h1>'])
    expect(html.match(/<h2[^>]*>.*?<\/h2>/g)).toEqual([
      '<h2 class="hf-heading-2" id="versie-0.2.0">3 november 2026 <span class="hf-meta">versie 0.2.0</span></h2>',
      '<h2 class="hf-heading-2" id="versie-0.1.0">21 oktober 2026 <span class="hf-meta">versie 0.1.0</span></h2>',
    ])
    expect(html).toContain('versie 0.2.0</span></h2><ul><li>Een verandering.</li><li>Nog een verandering.</li></ul>')
    expect(html).not.toContain('nog geen versie')
  })

  it('is the one main of the page, with all its content in one cell', () => {
    vi.mocked(getReleases).mockReturnValue(releases)

    const html = renderToStaticMarkup(WhatsNewPage())

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).toMatch(/^<main class="hf-page-main"><div class="hf-page-cell">.*<\/div><\/main>$/)
  })

  it('says so when there is no version yet', () => {
    vi.mocked(getReleases).mockReturnValue([])

    const html = renderToStaticMarkup(WhatsNewPage())

    expect(html).toContain(
      '<p class="hf-intro"><b>We hebben nog geen versie uitgebracht. Hier lees je straks wat er nieuw is.</b></p>',
    )
    expect(html).not.toContain('<h2')
    expect(html).not.toContain('<ul')
  })

  it('shows the line about the feed as the intro when there are versions, and no other paragraph', () => {
    vi.mocked(getReleases).mockReturnValue(releases)

    const html = renderToStaticMarkup(WhatsNewPage())

    expect(html).toContain(
      '</h1><p class="hf-intro"><b>Volg nieuwe versies met de <a href="/wat-is-er-nieuw/feed.xml">',
    )
    expect(html.match(/class="hf-intro"/g)).toHaveLength(1)
  })

  it('keeps the line about the feed as an ordinary paragraph under the intro when there is no version', () => {
    vi.mocked(getReleases).mockReturnValue([])

    const html = renderToStaticMarkup(WhatsNewPage())

    expect(html).toContain('</b></p><p>Volg nieuwe versies met de <a href="/wat-is-er-nieuw/feed.xml">')
    expect(html.match(/class="hf-intro"/g)).toHaveLength(1)
  })

  it.each([[releases], [[]]])('links to the feed in the text', (shown) => {
    vi.mocked(getReleases).mockReturnValue(shown)

    expect(renderToStaticMarkup(WhatsNewPage())).toContain(
      '<a href="/wat-is-er-nieuw/feed.xml">RSS-feed van Wat is er nieuw</a>',
    )
  })

  it('has the title Wat is er nieuw, a canonical URL, and points feed readers to the feed', () => {
    vi.stubEnv('SITE_ENV', 'acceptance')

    expect(generateMetadata()).toMatchObject({
      alternates: {
        canonical: 'https://acc.sc.heerenveen.org/wat-is-er-nieuw',
        types: { 'application/rss+xml': [{ title: 'Wat is er nieuw', url: '/wat-is-er-nieuw/feed.xml' }] },
      },
      description: expect.stringMatching(/^Wat er nieuw is/),
      openGraph: { title: 'Wat is er nieuw', url: 'https://acc.sc.heerenveen.org/wat-is-er-nieuw' },
      title: 'Wat is er nieuw',
    })
  })
})
