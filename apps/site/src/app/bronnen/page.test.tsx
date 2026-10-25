import type { PublicSource } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getSources } from '../../sources'
import { withoutIcons } from '../../without-icons'
import SourcesPage, { generateMetadata } from './page'

vi.mock('../../sources', () => ({ getSources: vi.fn() }))

const sources: PublicSource[] = [
  { description: 'Een podcast.', domain: 'testpodcast.test', kind: 'podcast', name: 'Testpodcast' },
  {
    description: 'Een dagblad. Het schrijft over sc Heerenveen.',
    domain: 'testkrant.test',
    kind: 'news',
    name: 'Testkrant',
  },
  { description: null, domain: 'proefnieuws.test', kind: 'news', name: 'Proefnieuws' },
]

async function render() {
  return renderToStaticMarkup(await SourcesPage())
}

beforeEach(() => {
  vi.mocked(getSources).mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page Onze bronnen', () => {
  it('lists the sources under a heading per kind, each with a link to its website and its description', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    const html = await render()

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Onze bronnen</h1>'])
    expect(html).toContain(
      '<p class="hf-intro"><b>Dit zijn de bronnen waar we het nieuws over sc Heerenveen vandaan halen.</b></p>',
    )
    expect(html.match(/<h2[^>]*>.*?<\/h2>/g)).toEqual([
      '<h2 class="hf-heading-2" id="news-heading">Nieuws</h2>',
      '<h2 class="hf-heading-2" id="podcast-heading">Podcasts</h2>',
      '<h2 class="hf-heading-2" id="suggest-heading">Mis je een bron?</h2>',
      '<h2 class="hf-heading-2" id="inquiry-heading">Ben je zelf een bron?</h2>',
    ])
    expect(withoutIcons(html)).toContain(
      '<li><a href="https://testkrant.test">Testkrant</a><p>Een dagblad. Het schrijft over sc Heerenveen.</p></li>',
    )
    expect(withoutIcons(html)).toContain(
      '<li><a href="https://testpodcast.test">Testpodcast</a><p>Een podcast.</p></li>',
    )
  })

  it('draws the icon for a link to another site behind the name of every source, hidden from screen readers, and nowhere else', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    const html = await render()
    const links = [...html.matchAll(/<a href="https:\/\/[^"]*">(.*?)<\/a>/g)].map(([, content]) => content ?? '')

    expect(links).toHaveLength(3)
    for (const content of links) {
      expect(content).toMatch(/<span class="hf-icon-tail">[^<]*<svg aria-hidden="true" class="hf-icon"/)
      expect(content).toContain('<path d="M9.5 2.5h4v4"></path>')
    }
    expect(html.match(/<svg /g)).toHaveLength(3)
  })

  it('is the one main of the page, with the h1 and the introduction as its intro and a card for each kind under it, and a sidebar with two coloured cards', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    const html = await render()

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).toMatch(
      /^<main class="hf-page-main"><div class="hf-page-intro"><h1 class="hf-heading-1">Onze bronnen<\/h1><p class="hf-intro"><b>Dit zijn de bronnen waar we het nieuws over sc Heerenveen vandaan halen\.<\/b><\/p><\/div><div class="hf-page-cells"><section class="hf-card" aria-labelledby="news-heading">.*<\/section><section class="hf-card" aria-labelledby="podcast-heading">.*<\/section><\/div><\/main><aside class="hf-page-sidebar" aria-label="Contact over bronnen"><section class="hf-card hf-card-soft" aria-labelledby="suggest-heading">.*<\/section><section class="hf-card hf-card-warm" aria-labelledby="inquiry-heading">.*<\/section><\/aside>$/,
    )
  })

  it('puts each kind, with its heading and its sources, in a card that takes its name from the heading', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    const html = await render()
    const cards = html.match(/<section.*?<\/section>/g) ?? []

    expect(cards).toHaveLength(4)
    expect(cards[0]).toContain('<h2 class="hf-heading-2" id="news-heading">Nieuws</h2>')
    expect(cards[0]?.match(/<li>/g)).toHaveLength(2)
    expect(cards[1]).toContain('<h2 class="hf-heading-2" id="podcast-heading">Podcasts</h2>')
    expect(cards[1]?.match(/<li>/g)).toHaveLength(1)
    // The h1 and the introduction are in the intro above the cards.
    expect(cards.join('')).not.toContain('<h1')
    expect(cards.join('')).not.toContain('Dit zijn de bronnen')
  })

  it('invites visitors to suggest a source and sources to get in touch, in two coloured cards', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    const html = await render()

    expect(html).toContain('hf-card-soft" aria-labelledby="suggest-heading"')
    expect(html).toContain('hf-card-warm" aria-labelledby="inquiry-heading"')
    expect(html.match(/href="mailto:fansite@heerenveen\.org"/g)).toHaveLength(2)
  })

  it('shows a source without a description with its link only', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    expect(withoutIcons(await render())).toContain('<li><a href="https://proefnieuws.test">Proefnieuws</a></li>')
  })

  it('shows visitors an empty state when there are no sources', async () => {
    vi.mocked(getSources).mockResolvedValue([])

    const html = await render()

    expect(html).toContain('We hebben nog geen bronnen.')
    // The div for the cards stays empty, which page.css leaves out.
    expect(html).toContain('</div><div class="hf-page-cells"></div></main>')
    expect(html).not.toContain('Dit zijn de bronnen')
    expect(html).not.toContain('id="news-heading"')
    expect(html).not.toContain('<ul')
  })
})

describe('the page Onze bronnen when the register can not be read', () => {
  const failure = new Error('Failed query: select 1\nparams: geheim', {
    cause: new Error('connect ECONNREFUSED 127.0.0.1:3306'),
  })

  beforeEach(() => {
    vi.mocked(getSources).mockRejectedValue(failure)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('shows the error page in the HTML, with a way back to this page and to the homepage', async () => {
    const html = await render()

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Er ging iets mis</h1>'])
    expect(html).toContain('<a href="/bronnen">Probeer het opnieuw</a>')
    expect(html).toContain('<a href="/">Naar de homepage</a>')
    expect(html).not.toContain('Onze bronnen')
  })

  it('titles the page Er ging iets mis and keeps it out of the search engines', async () => {
    expect(await generateMetadata()).toEqual({ robots: { index: false }, title: 'Er ging iets mis' })
  })

  it('titles the page Onze bronnen when the register can be read', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    vi.stubEnv('SITE_ENV', 'acceptance')

    expect(await generateMetadata()).toMatchObject({
      alternates: { canonical: 'https://acc.sc.heerenveen.org/bronnen' },
      description: expect.stringMatching(/^De media waar we het nieuws/),
      openGraph: { title: 'Onze bronnen', url: 'https://acc.sc.heerenveen.org/bronnen' },
      title: 'Onze bronnen',
    })
  })

  it('writes the reason to the log, without the values of the query', async () => {
    await render()

    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      'Could not read the sources for /bronnen: Failed query: select 1 (connect ECONNREFUSED 127.0.0.1:3306)',
    )
  })
})
