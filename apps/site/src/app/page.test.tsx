import type { PublicItem } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getHeadlines } from '../headlines'
import HomePage, { generateMetadata } from './page'

vi.mock('../headlines', () => ({ getHeadlines: vi.fn() }))

const headlines: PublicItem[] = [
  {
    paywalled: false,
    publishedAt: new Date('2026-10-22T08:15:00Z'),
    sourceName: 'Testkrant',
    title: 'Heerenveen houdt Testclub op afstand',
    url: 'https://testkrant.test/heerenveen-testclub',
  },
  {
    paywalled: true,
    publishedAt: new Date('2026-10-21T12:05:00Z'),
    sourceName: 'Voorbeeldkrant, met dank aan de redactie',
    title: 'SC Heerenveen & de “jonge garde”: <b>zo gaat het verder</b>',
    url: 'https://voorbeeldkrant.test/jonge-garde',
  },
  {
    paywalled: false,
    publishedAt: new Date('2026-10-21T09:00:00Z'),
    sourceName: 'Testkrant',
    title: 'Trainer verwacht geen wijzigingen in de basis',
    url: 'https://testkrant.test/basis',
  },
]

async function render() {
  return renderToStaticMarkup(await HomePage())
}

beforeEach(() => {
  vi.mocked(getHeadlines).mockReset()
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the homepage', () => {
  it('has one h1, for screen readers only, and an h2 for the news, and no heading for a day', async () => {
    vi.mocked(getHeadlines).mockResolvedValue(headlines)

    const html = await render()

    // The logo in the header shows the name of the site, so the h1 is hidden from the eye, not from a screen reader.
    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual([
      '<h1 class="hf-heading-1 hf-visually-hidden">sc Heerenveen Fansite</h1>',
      '<h2 class="hf-heading-2" id="media-heading">Laatste nieuws</h2>',
    ])
  })

  it('is the one main of the page, with the h1, the news in a card and the link to Onze bronnen as cells', async () => {
    vi.mocked(getHeadlines).mockResolvedValue(headlines)

    const html = await render()

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).toMatch(
      /^<main class="hf-page-main"><h1 class="hf-heading-1 hf-visually-hidden">sc Heerenveen Fansite<\/h1><section class="hf-card" aria-labelledby="media-heading">.*<\/section><p>Welke media we volgen, lees je bij <a href="\/bronnen">Onze bronnen<\/a>\.<\/p><\/main>$/,
    )
  })

  it('puts the h2 and the headlines in the card, which takes its name from the h2', async () => {
    vi.mocked(getHeadlines).mockResolvedValue(headlines)

    const html = await render()
    const cards = html.match(/<section.*?<\/section>/g) ?? []

    expect(cards).toHaveLength(1)
    expect(cards[0]).toContain('<h2 class="hf-heading-2" id="media-heading">Laatste nieuws</h2>')
    expect(cards[0]?.match(/<li>/g)).toHaveLength(3)
    // The h1 and the link to Onze bronnen are cells of their own, outside the card.
    expect(cards[0]).not.toContain('<h1')
    expect(cards[0]).not.toContain('Onze bronnen')
  })

  it('shows each headline as a link to the item at the source, with the day and the time before it and the source under it', async () => {
    vi.mocked(getHeadlines).mockResolvedValue(headlines)

    const html = await render()

    expect(html).toMatch(
      new RegExp(
        '<li><div class="hf-news-item"><div class="hf-news-item-layout"><time class="hf-meta hf-news-item-time" dateTime="2026-10-22T08:15:00.000Z">do 10:15</time>' +
          '<div class="hf-news-item-body"><a class="hf-headline hf-news-item-headline" href="https://testkrant.test/heerenveen-testclub">Heerenveen houdt Testclub op afstand</a>' +
          '<p class="hf-meta hf-news-item-meta"><span>Testkrant</span><svg [^>]*aria-hidden="true"[^>]*>.*?</svg></p></div></div></div></li>',
      ),
    )
  })

  it('shows the short day and the time in Dutch time, with the full time in the time element', async () => {
    vi.mocked(getHeadlines).mockResolvedValue(headlines)

    const html = await render()

    expect(html).toContain(
      '<time class="hf-meta hf-news-item-time" dateTime="2026-10-21T12:05:00.000Z">wo 14:05</time>',
    )
    expect(html).toContain(
      '<time class="hf-meta hf-news-item-time" dateTime="2026-10-21T09:00:00.000Z">wo 11:00</time>',
    )
  })

  it('puts "voor abonnees" in text with an item behind the paywall, and with no other item', async () => {
    vi.mocked(getHeadlines).mockResolvedValue(headlines)

    const html = await render()

    expect(html.match(/voor abonnees/g)).toHaveLength(1)
    expect(html).toContain('<span>voor abonnees</span>')
    expect(html.indexOf('voor abonnees')).toBeGreaterThan(html.indexOf('jonge garde'))
    expect(html.indexOf('voor abonnees')).toBeLessThan(html.indexOf('Trainer verwacht'))
  })

  it('names the source as the query gives it, and shows the headline as the source published it', async () => {
    vi.mocked(getHeadlines).mockResolvedValue(headlines)

    const html = await render()

    expect(html).toContain('<span>Voorbeeldkrant, met dank aan de redactie</span>')
    // Escaped, not parsed: the headline is text, also when a source puts tags in it.
    expect(html).toContain('SC Heerenveen &amp; de “jonge garde”: &lt;b&gt;zo gaat het verder&lt;/b&gt;')
    expect(html).not.toContain('<b>')
  })

  it('opens the links in the same tab', async () => {
    vi.mocked(getHeadlines).mockResolvedValue(headlines)

    expect(await render()).not.toContain('target=')
  })

  it('shows the items in one list, in the order the query gives them, with no heading for a day', async () => {
    vi.mocked(getHeadlines).mockResolvedValue(headlines)

    const html = await render()

    expect(html.match(/<ul/g)).toHaveLength(1)
    expect(html).toContain('<ul role="list">')
    expect(html.match(/<li>/g)).toHaveLength(3)
    expect(html).not.toContain('<h3')
    expect(html.indexOf('Heerenveen houdt Testclub')).toBeLessThan(html.indexOf('jonge garde'))
    expect(html.indexOf('jonge garde')).toBeLessThan(html.indexOf('Trainer verwacht'))
  })

  it('shows nothing of a source but the headline, the link, the name, the day and time and the paywall', async () => {
    vi.mocked(getHeadlines).mockResolvedValue(headlines)

    const html = await render()

    expect(html).not.toMatch(/<(img|picture|iframe|video|audio|script|image|use)/)
    expect(html).not.toMatch(/(src|srcset|poster)=/)
    // The only svg is our own icon for a link to another site, hidden from assistive technology, one for each item.
    expect(html.match(/<svg /g)).toHaveLength(3)
    expect(html.match(/<svg [^>]*aria-hidden="true"/g)).toHaveLength(3)
    // The only addresses are the links of the items and the link to the page with the sources.
    expect([...html.matchAll(/href="([^"]*)"/g)].map(([, href]) => href)).toEqual([
      'https://testkrant.test/heerenveen-testclub',
      'https://voorbeeldkrant.test/jonge-garde',
      'https://testkrant.test/basis',
      '/bronnen',
    ])
  })

  it('keeps the link to Onze bronnen under the news, and the old text is gone', async () => {
    vi.mocked(getHeadlines).mockResolvedValue(headlines)

    const html = await render()

    expect(html).toContain('<a href="/bronnen">Onze bronnen</a>')
    expect(html.indexOf('Onze bronnen')).toBeGreaterThan(html.lastIndexOf('</ul>'))
    expect(html).not.toContain('Binnenkort meer')
  })

  it('tells visitors there is no news this week, without a heading for a day', async () => {
    vi.mocked(getHeadlines).mockResolvedValue([])

    const html = await render()

    expect(html).toContain('<h2 class="hf-heading-2" id="media-heading">Laatste nieuws</h2>')
    expect(html).toContain('<p>We hebben deze week nog geen nieuws gevonden. Kijk straks nog eens.</p>')
    expect(html.match(/<section/g)).toHaveLength(1)
    expect(html).not.toContain('<h3')
    expect(html).not.toContain('<ul')
    expect(html).toContain('<a href="/bronnen">Onze bronnen</a>')
  })

  it('titles the page with the name of the site, and lets search engines in', async () => {
    vi.mocked(getHeadlines).mockResolvedValue(headlines)

    expect(await generateMetadata()).toEqual({})
  })
})

describe('the homepage when the database can not be read', () => {
  const failure = new Error('Failed query: select 1\nparams: geheim', {
    cause: new Error('connect ECONNREFUSED 127.0.0.1:3306'),
  })

  beforeEach(() => {
    vi.mocked(getHeadlines).mockRejectedValue(failure)
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  it('shows the error page in the HTML, with a way back to the homepage', async () => {
    const html = await render()

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Er ging iets mis</h1>'])
    expect(html).toContain('<a href="/">Probeer het opnieuw</a>')
    expect(html).not.toContain('Laatste nieuws')
    expect(html).not.toContain('We hebben deze week nog geen nieuws gevonden')
  })

  it('titles the page Er ging iets mis and keeps it out of the search engines', async () => {
    expect(await generateMetadata()).toEqual({ robots: { index: false }, title: 'Er ging iets mis' })
  })

  it('writes the reason to the log, without the values of the query', async () => {
    await render()

    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      'Could not read the headlines for the homepage: Failed query: select 1 (connect ECONNREFUSED 127.0.0.1:3306)',
    )
  })
})
