import { renderToStaticMarkup } from 'react-dom/server'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getReleases } from '../../releases'
import WhatsNewPage, { metadata } from './page'

vi.mock('../../releases', () => ({ getReleases: vi.fn() }))

const releases = [
  { date: '2026-11-03', sentences: ['Een verandering.', 'Nog een verandering.'], version: '0.2.0' },
  { date: '2026-10-21', sentences: ['De eerste versie.'], version: '0.1.0' },
]

beforeEach(() => {
  vi.mocked(getReleases).mockReset()
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

  it('says so when there is no version yet', () => {
    vi.mocked(getReleases).mockReturnValue([])

    const html = renderToStaticMarkup(WhatsNewPage())

    expect(html).toContain('<p>We hebben nog geen versie uitgebracht. Hier lees je straks wat er nieuw is.</p>')
    expect(html).not.toContain('<h2')
    expect(html).not.toContain('<ul')
  })

  it.each([[releases], [[]]])('links to the feed in the text', (shown) => {
    vi.mocked(getReleases).mockReturnValue(shown)

    expect(renderToStaticMarkup(WhatsNewPage())).toContain(
      '<a href="/wat-is-er-nieuw/feed.xml">RSS-feed van Wat is er nieuw</a>',
    )
  })

  it('has the title Wat is er nieuw and points feed readers to the feed', () => {
    expect(metadata).toEqual({
      alternates: {
        types: { 'application/rss+xml': [{ title: 'Wat is er nieuw', url: '/wat-is-er-nieuw/feed.xml' }] },
      },
      title: 'Wat is er nieuw',
    })
  })
})
