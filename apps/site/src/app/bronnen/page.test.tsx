import type { PublicSource } from '@fansite/db/queries'

import { realSources } from '@fansite/db/seed'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getSources } from '#src/sources'
import { headingAnchors, withoutHeadingLinks, withoutIcons } from '#src/without-icons'

import SourcesPage, { generateMetadata } from './page'

vi.mock('#src/sources', () => ({ getSources: vi.fn() }))

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
    // The heading and the cards say it, so there is no introduction under the heading.
    expect(html).not.toContain('hf-intro')
    expect(html.match(/<h2[^>]*>.*?<\/h2>/g)).toEqual([
      '<h2 class="hf-heading-2 hf-heading-anchored" id="nieuws">Nieuws</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="podcasts">Podcasts</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="wedstrijden-en-spelers">Wedstrijden, standen en spelers</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="voorstellen">Mis je een bron?</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="uitgever">Ben je zelf een bron?</h2>',
      '<h2 class="hf-heading-2 hf-heading-anchored" id="nieuwsbrief-lc">Abonneer je op de nieuwsbrief van de LC!</h2>',
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

    // Three sources, and the licence in the card Wedstrijden, standen en spelers.
    expect(links).toHaveLength(4)
    for (const content of links) {
      expect(content).toMatch(/<span class="hf-icon-tail">[^<]*<svg aria-hidden="true" class="hf-icon"/)
      expect(content).toContain('<path d="M9.5 2.5h4v4"></path>')
    }
    // The other three icons are the envelopes in two cards and the icon of the newsletter link.
    expect(html.match(/<svg /g)).toHaveLength(7)
  })

  it('invites visitors to subscribe to the newsletter of the LC, with the icon for a link to another site behind the link', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    const html = await render()
    const [, content] =
      html.match(/<a href="https:\/\/www\.lc\.nl\/sport\/nieuwsbrief-sc-heerenveen\/157167352\.html">(.*?)<\/a>/) ?? []

    expect(html).toContain('hf-card-warm" aria-labelledby="nieuwsbrief-lc"')
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

  it('is the one main of the page, with the h1 alone in its cell and a card in a cell for each kind under it, and a section with three coloured cards', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    const html = await render()

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).not.toContain('<aside')
    expect(html).toMatch(
      /^<main class="hf-page-main hf-page-main-grid"[^>]*><div class="hf-page-cell" style="grid-area:head"><h1 class="hf-heading-1">Onze bronnen<\/h1><\/div><div class="hf-page-cell" style="grid-area:news"><section class="hf-card" aria-labelledby="nieuws">.*<\/section><\/div><div class="hf-page-cell" style="grid-area:podcast"><section class="hf-card" aria-labelledby="podcasts">.*<\/section><\/div><div class="hf-page-cell" style="grid-area:data"><section class="hf-card" aria-labelledby="wedstrijden-en-spelers">.*<\/section><\/div><section class="hf-page-section" style="grid-area:side" aria-label="Meer over bronnen"><section class="hf-card hf-card-soft" aria-labelledby="voorstellen">.*<\/section><section class="hf-card hf-card-strong" aria-labelledby="uitgever">.*<\/section><section class="hf-card hf-card-warm" aria-labelledby="nieuwsbrief-lc">.*<\/section><\/section><\/main>$/,
    )
  })

  it('puts each kind, with its heading and its sources, in a card that takes its name from the heading', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    const html = await render()
    const cards = html.match(/<section.*?<\/section>/g) ?? []

    expect(cards).toHaveLength(6)
    expect(cards[0]).toContain('<h2 class="hf-heading-2 hf-heading-anchored" id="nieuws">Nieuws</h2>')
    expect(cards[0]?.match(/<li>/g)).toHaveLength(2)
    expect(cards[1]).toContain('<h2 class="hf-heading-2 hf-heading-anchored" id="podcasts">Podcasts</h2>')
    expect(cards[1]?.match(/<li>/g)).toHaveLength(1)
    // The h1 is in the cell of the heading, above the cards.
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
      ['wedstrijden-en-spelers', 'Wedstrijden, standen en spelers'],
      ['voorstellen', 'Mis je een bron?'],
      ['uitgever', 'Ben je zelf een bron?'],
      ['nieuwsbrief-lc', 'Abonneer je op de nieuwsbrief van de LC!'],
    ])
  })

  it('says in a card of its own where the matches, standings and players come from, with the licence', async () => {
    vi.mocked(getSources).mockResolvedValue(sources)

    const html = withoutIcons(await render())
    const card = html.match(/<section[^>]*aria-labelledby="wedstrijden-en-spelers".*?<\/section>/)?.[0] ?? ''

    expect(card).toContain('Wedstrijden, standen en spelers</h2>')
    expect(card).toContain(
      'Uitslagen, doelpunten, standen en gegevens van spelers komen van Wikipedia, vooral de Nederlandse en soms de Engelse. Enkele gegevens van spelers komen van Wikidata (CC0).',
    )
    expect(card).toContain(
      'Wikipedia is geschreven door vrijwilligers. Hun namen staan in de geschiedenis van elk artikel. We lezen de artikelen hoogstens één keer per uur.',
    )
    expect(card).toContain(
      'met de opstellingen, wissels, kaarten en assists van wedstrijden van 1990 tot 2007, en met wat onze redactie zelf invulde of verbeterde.',
    )
    expect(card).toContain(
      '<a href="https://creativecommons.org/licenses/by-sa/4.0/deed.nl">CC BY-SA 4.0</a>. Je mag ze delen en bewerken als je Wikipedia en ons noemt, zegt dat je ze bewerkte en dezelfde licentie houdt.',
    )
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

    expect(cards).toHaveLength(5)
    expect(cards[0]).toContain('<h2 class="hf-heading-2 hf-heading-anchored" id="forum">Forum</h2>')
    expect(cards[0]?.match(/<li>/g)).toHaveLength(1)
    expect(html).not.toContain('Dit zijn de bronnen')
    expect(html).not.toContain('We hebben nog geen bronnen')
  })

  it('shows visitors an empty state when there are no sources', async () => {
    vi.mocked(getSources).mockResolvedValue([])

    const html = await render()

    expect(html).toContain('<p class="hf-intro"><b>We hebben nog geen bronnen.')
    // The card for matches and players has nothing to do with the register, so it stays.
    expect(html).toContain(
      '<div class="hf-page-cell" style="grid-area:data"><section class="hf-card" aria-labelledby="wedstrijden-en-spelers">',
    )
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
