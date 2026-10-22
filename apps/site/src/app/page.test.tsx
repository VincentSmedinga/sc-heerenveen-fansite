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
  it('has one h1, an h2 for the news and an h3 for each day with news, so no level is skipped', async () => {
    vi.mocked(getHeadlines).mockResolvedValue(headlines)

    const html = await render()

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual([
      '<h1 class="hf-heading-1">sc Heerenveen Fansite</h1>',
      '<h2 class="hf-heading-2">sc Heerenveen in de media</h2>',
      '<h3 class="hf-heading-3">donderdag 22 oktober</h3>',
      '<h3 class="hf-heading-3">woensdag 21 oktober</h3>',
    ])
  })

  it('shows each headline as a link to the item at the source, with the source and the time', async () => {
    vi.mocked(getHeadlines).mockResolvedValue(headlines)

    const html = await render()

    expect(html).toContain(
      '<li><div class="hf-news-item"><a class="hf-headline hf-news-item-headline" href="https://testkrant.test/heerenveen-testclub">Heerenveen houdt Testclub op afstand</a>' +
        '<p class="hf-meta hf-news-item-meta"><span>Testkrant</span><span aria-hidden="true"> · </span><time dateTime="2026-10-22T08:15:00.000Z">10:15</time></p></div></li>',
    )
  })

  it('shows the time in Dutch time, with the full time in the time element', async () => {
    vi.mocked(getHeadlines).mockResolvedValue(headlines)

    const html = await render()

    expect(html).toContain('<time dateTime="2026-10-21T12:05:00.000Z">14:05</time>')
    expect(html).toContain('<time dateTime="2026-10-21T09:00:00.000Z">11:00</time>')
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

  it('shows an item per list, in the order the query gives them, a list for each day', async () => {
    vi.mocked(getHeadlines).mockResolvedValue(headlines)

    const html = await render()

    expect(html.match(/<ul/g)).toHaveLength(2)
    expect(html.match(/<li>/g)).toHaveLength(3)
    expect(html.indexOf('Heerenveen houdt Testclub')).toBeLessThan(html.indexOf('jonge garde'))
    expect(html.indexOf('jonge garde')).toBeLessThan(html.indexOf('Trainer verwacht'))
  })

  it('shows nothing of a source but the headline, the link, the name, the time and the paywall', async () => {
    vi.mocked(getHeadlines).mockResolvedValue(headlines)

    const html = await render()

    expect(html).not.toMatch(/<(img|picture|svg|iframe|video|audio|script)/)
    expect(html).not.toMatch(/(src|srcset|poster)=/)
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

    expect(html).toContain('<h2 class="hf-heading-2">sc Heerenveen in de media</h2>')
    expect(html).toContain('<p>We hebben deze week nog geen nieuws gevonden. Kijk straks nog eens.</p>')
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
    expect(html).not.toContain('sc Heerenveen in de media')
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
