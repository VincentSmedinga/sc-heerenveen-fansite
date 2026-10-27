import type { PublicSource } from '@fansite/db/queries'

import { realSources } from '@fansite/db/seed'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getSources } from '../../sources'
import { headingAnchors, withoutHeadingLinks, withoutIcons } from '../../without-icons'
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

// Without the links that the headings are, for the tests about the rest of the page.
async function render() {
  return withoutHeadingLinks(await renderRaw())
}

async function renderRaw() {
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
      '<h2 class="hf-heading-2 hf-heading-anchored" id="nieuws">Nieuws</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="podcasts">Podcasts</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="voorstellen">Mis je een bron?</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="uitgever">Ben je zelf een bron?</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="nieuwsbrief">Abonneer je op de nieuwsbrief van de LC!</h2>',
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
    const links = [...html.matchAll(/<a href="https:\/\/(?!www\.lc\.nl)[^"]*">(.*?)<\/a>/g)].map(
      ([, content]) => content ?? '',
    )

    expect(links).toHaveLength(3)
    for (const content of links) {
      expect(content).toMatch(/<span class="hf-icon-tail">[^<]*<svg aria-hidden="true" class="hf-icon"/)
      expect(content).toContain('<path d="M9.5 2.5h4v4"></path>')
    }
    // The other three icons are the envelopes in two cards and the icon of the newsletter link.
    expect(html.match(/<svg /g)).toHaveLength(6)
  })

  it('invites visitors to subscribe to the newsletter of the LC, with the icon for a link to another site behind the link', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    const html = await render()
    const [, content] =
      html.match(/<a href="https:\/\/www\.lc\.nl\/sport\/nieuwsbrief-sc-heerenveen\/157167352\.html">(.*?)<\/a>/) ?? []

    expect(html).toContain('hf-card-warm" aria-labelledby="nieuwsbrief"')
    expect(html).toContain(
      'Misschien vergat Sander de Vries het in Omroep Abe te noemen – dan helpen we graag een handje:',
    )
    expect(content).toMatch(/<span class="hf-icon-tail">[^<]*<svg aria-hidden="true" class="hf-icon"/)
    expect(content).toContain('<path d="M9.5 2.5h4v4"></path>')
    expect(withoutIcons(content ?? '')).toBe('schrijf je snel in')
  })

  it('draws the envelope in front of the address in both cards, hidden from screen readers', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    const html = await render()
    const mailLinks = [...html.matchAll(/<a href="mailto:([^"]*)">(.*?)<\/a>/g)]

    expect(mailLinks.map(([, address]) => address)).toEqual(['fansite@heerenveen.org', 'fansite@heerenveen.org'])
    for (const [, , content] of mailLinks) {
      expect(content).toMatch(
        /^<span class="hf-icon-head"><svg aria-hidden="true" class="hf-icon"[^>]*>.*<\/svg>f<\/span>ansite@heerenveen\.org$/,
      )
      expect(content).toContain('<path d="m2.5 5 5.5 4 5.5-4"></path>')
    }
    expect(
      withoutIcons(html).match(/<a href="mailto:fansite@heerenveen\.org">fansite@heerenveen\.org<\/a>/g),
    ).toHaveLength(2)
  })

  it('is the one main of the page, with the h1 and the introduction as its intro and a card for each kind under it, and a sidebar with three coloured cards', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    const html = await render()

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).toMatch(
      /^<main class="hf-page-main"><div class="hf-page-intro"><h1 class="hf-heading-1">Onze bronnen<\/h1><p class="hf-intro"><b>Dit zijn de bronnen waar we het nieuws over sc Heerenveen vandaan halen\.<\/b><\/p><\/div><div class="hf-page-cells"><section class="hf-card" aria-labelledby="nieuws">.*<\/section><section class="hf-card" aria-labelledby="podcasts">.*<\/section><\/div><\/main><aside class="hf-page-sidebar hf-page-sidebar-split" aria-label="Contact over bronnen"><section class="hf-card hf-card-soft" aria-labelledby="voorstellen">.*<\/section><section class="hf-card hf-card-strong" aria-labelledby="uitgever">.*<\/section><section class="hf-card hf-card-warm" aria-labelledby="nieuwsbrief">.*<\/section><\/aside>$/,
    )
  })

  it('puts each kind, with its heading and its sources, in a card that takes its name from the heading', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    const html = await render()
    const cards = html.match(/<section.*?<\/section>/g) ?? []

    expect(cards).toHaveLength(5)
    expect(cards[0]).toContain('<h2 class="hf-heading-2 hf-heading-anchored" id="nieuws">Nieuws</h2>')
    expect(cards[0]?.match(/<li>/g)).toHaveLength(2)
    expect(cards[1]).toContain('<h2 class="hf-heading-2 hf-heading-anchored" id="podcasts">Podcasts</h2>')
    expect(cards[1]?.match(/<li>/g)).toHaveLength(1)
    // The h1 and the introduction are in the intro above the cards.
    expect(cards.join('')).not.toContain('<h1')
    expect(cards.join('')).not.toContain('Dit zijn de bronnen')
  })

  it('invites visitors to suggest a source and sources to get in touch, in two coloured cards', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    const html = await render()

    expect(html).toContain('hf-card-soft" aria-labelledby="voorstellen"')
    expect(html).toContain('hf-card-strong" aria-labelledby="uitgever"')
    expect(html.match(/href="mailto:fansite@heerenveen\.org"/g)).toHaveLength(2)
  })

  it('makes each heading a link to itself, with a Dutch anchor for the kind and for the three cards', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    expect(headingAnchors(await renderRaw())).toEqual([
      ['nieuws', 'Nieuws'],
      ['podcasts', 'Podcasts'],
      ['voorstellen', 'Mis je een bron?'],
      ['uitgever', 'Ben je zelf een bron?'],
      ['nieuwsbrief', 'Abonneer je op de nieuwsbrief van de LC!'],
    ])
  })

  it('shows a source without a description with its link only', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    expect(withoutIcons(await render())).toContain('<li><a href="https://proefnieuws.test">Proefnieuws</a></li>')
  })

  it('has cards for news, podcasts and the forum with the real sources of acceptance and production, and none for club and video', async () => {
    vi.mocked(getSources).mockResolvedValue(
      realSources.map(({ description, domain, kind, name }) => ({ description, domain, kind, name })),
    )

    const html = await render()

    expect(html.match(/<h2[^>]*>.*?<\/h2>/g)?.slice(0, 3)).toEqual([
      '<h2 class="hf-heading-2 hf-heading-anchored" id="nieuws">Nieuws</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="podcasts">Podcasts</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="forum">Forum</h2>',
    ])
    expect(html).not.toContain('id="club"')
    expect(html).not.toContain('id="video"')
    expect(html).not.toContain('.test"')
    expect(html).not.toContain('Testkrant')
  })

  it('is right with a single source in a kind: one card with one item', async () => {
    vi.mocked(getSources).mockResolvedValue([
      { description: 'Het forum.', domain: 'forum.heerenveen.org', kind: 'forum', name: 'sc Heerenveen Forum' },
    ])

    const html = await render()
    const cards = html.match(/<section.*?<\/section>/g) ?? []

    expect(cards).toHaveLength(4)
    expect(cards[0]).toContain('<h2 class="hf-heading-2 hf-heading-anchored" id="forum">Forum</h2>')
    expect(cards[0]?.match(/<li>/g)).toHaveLength(1)
    expect(html).toContain('Dit zijn de bronnen waar we het nieuws over sc Heerenveen vandaan halen.')
    expect(html).not.toContain('We hebben nog geen bronnen')
  })

  it('shows visitors an empty state when there are no sources', async () => {
    vi.mocked(getSources).mockResolvedValue([])

    const html = await render()

    expect(html).toContain('We hebben nog geen bronnen.')
    // The div for the cards stays empty, which page.css leaves out.
    expect(html).toContain('</div><div class="hf-page-cells"></div></main>')
    expect(html).not.toContain('Dit zijn de bronnen')
    expect(html).not.toContain('id="nieuws"')
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
