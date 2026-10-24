import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getReleases } from '../../releases'
import UpdatesPage, { generateMetadata } from './page'

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

describe('the page Updates', () => {
  it('shows each version under a heading with its date and its number in small print, newest first, with a sentence per change', () => {
    vi.mocked(getReleases).mockReturnValue(releases)

    const html = renderToStaticMarkup(UpdatesPage())

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Updates</h1>'])
    expect(html.match(/<h2[^>]*>.*?<\/h2>/g)).toEqual([
      '<h2 class="hf-heading-2" id="versie-0.2.0">3 november 2026 <span class="hf-meta">versie 0.2.0</span></h2>',
      '<h2 class="hf-heading-2" id="versie-0.1.0">21 oktober 2026 <span class="hf-meta">versie 0.1.0</span></h2>',
    ])
    expect(html).toContain('versie 0.2.0</span></h2><ul><li>Een verandering.</li><li>Nog een verandering.</li></ul>')
    expect(html).not.toContain('nog geen versie')
  })

  it('is the one main of the page, with all its content in one cell', () => {
    vi.mocked(getReleases).mockReturnValue(releases)

    const html = renderToStaticMarkup(UpdatesPage())

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).toMatch(/^<main class="hf-page-main"><div class="hf-page-cell">.*<\/div><\/main>$/)
  })

  it('says so when there is no version yet', () => {
    vi.mocked(getReleases).mockReturnValue([])

    const html = renderToStaticMarkup(UpdatesPage())

    expect(html).toContain(
      '<p class="hf-intro"><b>We hebben nog geen versie uitgebracht. Hier lees je straks wat er nieuw is.</b></p>',
    )
    expect(html).not.toContain('<h2')
    expect(html).not.toContain('<ul')
  })

  it('shows the line about the feed as the intro when there are versions, and no other paragraph', () => {
    vi.mocked(getReleases).mockReturnValue(releases)

    const html = renderToStaticMarkup(UpdatesPage())

    expect(html).toContain('</h1><p class="hf-intro"><b>Volg nieuwe versies met de <a href="/updates/feed.xml">')
    expect(html.match(/class="hf-intro"/g)).toHaveLength(1)
  })

  it('keeps the line about the feed as an ordinary paragraph under the intro when there is no version', () => {
    vi.mocked(getReleases).mockReturnValue([])

    const html = renderToStaticMarkup(UpdatesPage())

    expect(html).toContain('</b></p><p>Volg nieuwe versies met de <a href="/updates/feed.xml">')
    expect(html.match(/class="hf-intro"/g)).toHaveLength(1)
  })

  it.each([[releases], [[]]])('links to the feed in the text', (shown) => {
    vi.mocked(getReleases).mockReturnValue(shown)

    expect(renderToStaticMarkup(UpdatesPage())).toContain('<a href="/updates/feed.xml">RSS-feed van Updates</a>')
  })

  it('has the title Updates, a canonical URL, and points feed readers to the feed', () => {
    vi.stubEnv('SITE_ENV', 'acceptance')

    expect(generateMetadata()).toMatchObject({
      alternates: {
        canonical: 'https://acc.sc.heerenveen.org/updates',
        types: { 'application/rss+xml': [{ title: 'Updates', url: '/updates/feed.xml' }] },
      },
      description: expect.stringMatching(/^Wat er nieuw is/),
      openGraph: { title: 'Updates', url: 'https://acc.sc.heerenveen.org/updates' },
      title: 'Updates',
    })
  })
})
