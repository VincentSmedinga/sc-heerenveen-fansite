import type { PublicArchiveItem, PublicArchiveSource } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ArchivePage as Content } from '../../archive'

import { getArchivePage } from '../../archive'
import { withoutIcons } from '../../without-icons'
import ArchivePage, { generateMetadata } from './page'

vi.mock('../../archive', () => ({ getArchivePage: vi.fn() }))

// The moment of now is the afternoon of Friday 30 October 2026 in the Netherlands.
const now = new Date('2026-10-30T13:40:00Z')

const sources: PublicArchiveSource[] = [
  { name: 'Leeuwarder Courant', slug: 'leeuwarder-courant' },
  { name: 'Voorbeeldkrant, met dank aan de redactie', slug: 'voorbeeldkrant' },
]

const headlines: PublicArchiveItem[] = [
  {
    paywalled: false,
    publishedAt: new Date('2026-10-30T08:15:00Z'),
    sourceName: 'Leeuwarder Courant',
    title: 'Heerenveen houdt Testclub op afstand',
    url: 'https://lc.test/heerenveen-testclub',
  },
  {
    paywalled: true,
    publishedAt: new Date('2026-10-12T12:05:00Z'),
    sourceName: 'Voorbeeldkrant, met dank aan de redactie',
    title: 'SC Heerenveen & de “jonge garde”: <b>zo gaat het verder</b>',
    url: 'https://voorbeeldkrant.test/jonge-garde',
  },
  {
    paywalled: false,
    publishedAt: new Date('2025-05-04T09:00:00Z'),
    sourceName: 'Leeuwarder Courant',
    title: 'Een kop van vorig seizoen',
    url: 'https://lc.test/vorig-seizoen',
  },
]

const everything: Content = { headlines, pageCount: 1, selected: undefined, sources }

type Query = Record<string, string | string[] | undefined>

const props = (query: Query = {}) => ({ searchParams: Promise.resolve(query) })

async function render(query: Query = {}) {
  return renderToStaticMarkup(await ArchivePage(props(query)))
}

/**
 * The page that the visitor sees: Next.js stops at a notFound() with an error that has this
 * digest.
 */
const notFound = expect.objectContaining({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' }) as unknown

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.mocked(getArchivePage).mockReset()
  vi.mocked(getArchivePage).mockResolvedValue(everything)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page Nieuwsarchief', () => {
  it('has one h1, Nieuwsarchief, and no other heading', async () => {
    const html = await render()

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual(['<h1 class="hf-heading-1">Nieuwsarchief</h1>'])
  })

  it('is the one main of the page, with the h1 and the filter as its introduction and the list in a card', async () => {
    const html = await render()

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).toMatch(/<main class="hf-page-main"><div class="hf-page-intro"><h1.*<\/h1><nav.*<\/nav><\/div>/)
    expect(html).toMatch(/<div class="hf-card"><ul role="list">/)
    expect(html).not.toContain('<aside')
  })

  it('shows each headline as a link to the source, with the name of the source, and the day and time of its own', async () => {
    const html = await render()

    // The filter has list items too, so count the headlines in the card.
    expect(html.slice(html.indexOf('<div class="hf-card">')).match(/<li>/g)).toHaveLength(3)
    expect(html).toContain('href="https://lc.test/heerenveen-testclub"')
    expect(html).toContain('href="https://voorbeeldkrant.test/jonge-garde"')
    expect(html).toContain('<span>Voorbeeldkrant, met dank aan de redactie</span>')
    expect(html).toContain('dateTime="2026-10-30T08:15:00.000Z">vr 09:15</time>')
    expect(html).toContain('dateTime="2026-10-12T12:05:00.000Z">ma 12 okt</time>')
    expect(html).toContain('dateTime="2025-05-04T09:00:00.000Z">zo 4 mei 2025</time>')
    expect(html).not.toContain('target=')
  })

  it('keeps the order of the query and has no heading for a day', async () => {
    const html = await render()

    expect(html.indexOf('Testclub op afstand')).toBeLessThan(html.indexOf('jonge garde'))
    expect(html.indexOf('jonge garde')).toBeLessThan(html.indexOf('vorig seizoen'))
    expect(html).not.toContain('<h3')
  })

  it('puts "voor abonnees" in text with a headline behind the paywall, and with no other', async () => {
    const html = await render()

    expect(html.match(/voor abonnees/g)).toHaveLength(1)
    expect(html).toContain('<span>voor abonnees</span>')
    expect(html.indexOf('voor abonnees')).toBeGreaterThan(html.indexOf('jonge garde'))
    expect(html.indexOf('voor abonnees')).toBeLessThan(html.indexOf('vorig seizoen'))
  })

  it('shows a headline as text, escaped, and nothing of an item but the headline, the link, the name, the time and the paywall', async () => {
    const html = await render()

    expect(html).toContain('SC Heerenveen &amp; de “jonge garde”: &lt;b&gt;zo gaat het verder&lt;/b&gt;')
    expect(html).not.toContain('<b>')
    expect(html).not.toMatch(/<(img|picture|iframe|video|audio|script)/)
    expect(html).not.toMatch(/(src|srcset|poster)=/)
    // The only addresses are the links of the headlines and the links of the filter.
    expect([...html.matchAll(/href="(https?:[^"]*)"/g)].map(([, href]) => href)).toEqual([
      'https://lc.test/heerenveen-testclub',
      'https://voorbeeldkrant.test/jonge-garde',
      'https://lc.test/vorig-seizoen',
    ])
  })

  it('has a filter with a link to all sources and one to each source, in a navigation with a name', async () => {
    const html = await render()
    const nav = html.match(/<nav[^>]*aria-label="Bronnen filteren".*?<\/nav>/)?.[0] ?? ''

    expect(
      [...nav.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label]),
    ).toEqual([
      ['/nieuws', 'Alle bronnen'],
      ['/nieuws?bron=leeuwarder-courant', 'Leeuwarder Courant'],
      ['/nieuws?bron=voorbeeldkrant', 'Voorbeeldkrant, met dank aan de redactie'],
    ])
  })

  it('marks Alle bronnen as the choice when no source is chosen', async () => {
    const html = await render()

    expect([...html.matchAll(/<a [^>]*aria-current="page"[^>]*>([^<]*)<\/a>/g)].map(([, label]) => label)).toEqual([
      'Alle bronnen',
    ])
  })

  it('marks the source that is chosen, and asks for its headlines', async () => {
    vi.mocked(getArchivePage).mockResolvedValue({ ...everything, selected: sources[0] })

    const html = await render({ bron: 'leeuwarder-courant' })

    expect([...html.matchAll(/<a [^>]*aria-current="page"[^>]*>([^<]*)<\/a>/g)].map(([, label]) => label)).toEqual([
      'Leeuwarder Courant',
    ])
    expect(getArchivePage).toHaveBeenCalledExactlyOnceWith('leeuwarder-courant', 1)
  })

  it('asks for the first page of all sources without parameters, and ignores a parameter it does not know', async () => {
    const html = await render({ utm_source: 'nieuwsbrief' })

    expect(html).toContain('<h1 class="hf-heading-1">Nieuwsarchief</h1>')
    expect(getArchivePage).toHaveBeenCalledExactlyOnceWith(undefined, 1)
  })
})

describe('the pagination', () => {
  const many: Content = { ...everything, pageCount: 9 }

  it('is not there when there is one page', async () => {
    expect(await render()).not.toContain('Paginering')
  })

  it('has a link to the next page and none to a previous page on the first page', async () => {
    vi.mocked(getArchivePage).mockResolvedValue(many)

    const html = await render()

    expect(html).toContain('<nav aria-label="Paginering"')
    expect(html).toContain('Pagina 1 van 9')
    expect(withoutIcons(html)).toContain(
      '<a class="hf-pagination-link hf-pagination-next" href="/nieuws?pagina=2" rel="next">Volgende</a>',
    )
    expect(html).not.toContain('Vorige')
  })

  it('has both links in the middle, and the link back to the first page has no parameter', async () => {
    vi.mocked(getArchivePage).mockResolvedValue(many)

    const second = withoutIcons(await render({ pagina: '2' }))

    expect(second).toContain('Pagina 2 van 9')
    expect(second).toContain('href="/nieuws" rel="prev">Vorige')
    expect(second).toContain('href="/nieuws?pagina=3" rel="next">Volgende')
    expect(getArchivePage).toHaveBeenCalledExactlyOnceWith(undefined, 2)
  })

  it('has a link to the previous page and none to a next page on the last page', async () => {
    vi.mocked(getArchivePage).mockResolvedValue(many)

    const html = withoutIcons(await render({ pagina: '9' }))

    expect(html).toContain('href="/nieuws?pagina=8" rel="prev">Vorige')
    expect(html).not.toContain('Volgende')
  })

  it('keeps the source in the addresses of the pages, and the filter starts at the first page', async () => {
    vi.mocked(getArchivePage).mockResolvedValue({ ...many, selected: sources[0] })

    const html = withoutIcons(await render({ bron: 'leeuwarder-courant', pagina: '2' }))

    expect(html).toContain('href="/nieuws?bron=leeuwarder-courant" rel="prev">Vorige')
    expect(html).toContain('href="/nieuws?bron=leeuwarder-courant&amp;pagina=3" rel="next">Volgende')
    expect(html).toContain('href="/nieuws?bron=voorbeeldkrant"')
    expect(html).not.toContain('bron=voorbeeldkrant&amp;pagina')
  })
})

describe('an address that is wrong', () => {
  it.each([
    ['a source that does not exist', { bron: 'bestaat-niet' }],
    ['a page that does not exist', { pagina: '99' }],
  ])('gives the page niet gevonden for %s, when the data has none', async (_, query) => {
    vi.mocked(getArchivePage).mockResolvedValue(undefined)

    await expect(render(query)).rejects.toEqual(notFound)
    await expect(generateMetadata(props(query))).rejects.toEqual(notFound)
  })

  it.each([
    ['0', { pagina: '0' }],
    ['a negative page', { pagina: '-1' }],
    ['a fraction', { pagina: '2.5' }],
    ['letters', { pagina: 'abc' }],
    ['an empty page', { pagina: '' }],
    ['a page with a plus sign', { pagina: '+2' }],
    ['a page with a leading zero', { pagina: '02' }],
    ['a page with spaces', { pagina: ' 2' }],
    ['a page that is far too large', { pagina: '99999999999999999999' }],
    ['a page given twice', { pagina: ['1', '2'] }],
    ['a source given twice', { bron: ['nos', 'espn'] }],
  ])('gives the page niet gevonden for %s, without asking the data', async (_, query) => {
    await expect(render(query)).rejects.toEqual(notFound)
    await expect(generateMetadata(props(query))).rejects.toEqual(notFound)
    expect(getArchivePage).not.toHaveBeenCalled()
  })

  it('gives the page niet gevonden for an empty source, because that is no source', async () => {
    vi.mocked(getArchivePage).mockResolvedValue(undefined)

    await expect(render({ bron: '' })).rejects.toEqual(notFound)
    expect(getArchivePage).toHaveBeenCalledExactlyOnceWith('', 1)
  })
})

describe('a page without headlines', () => {
  it('says so in a sentence, and has no list and no filter', async () => {
    vi.mocked(getArchivePage).mockResolvedValue({ ...everything, headlines: [], sources: [] })

    const html = await render()

    expect(html).toContain('<p>We hebben nog geen nieuws gevonden.</p>')
    expect(html).not.toContain('<ul')
    expect(html).not.toContain('<nav')
    expect(html).not.toContain('Alle bronnen')
  })
})

describe('the metadata', () => {
  it('titles the first page Nieuwsarchief, describes it and lets search engines in', async () => {
    vi.stubEnv('SITE_ENV', 'production')

    const metadata = await generateMetadata(props())

    expect(metadata.title).toBe('Nieuwsarchief')
    expect(metadata.description).toContain('koppen over sc Heerenveen')
    expect(metadata.alternates?.canonical).toBe('https://sc.heerenveen.org/nieuws')
    expect(metadata.robots).toBeUndefined()
  })

  it('gives each page and each source its own canonical address, so search engines keep them apart', async () => {
    vi.stubEnv('SITE_ENV', 'production')
    vi.mocked(getArchivePage).mockImplementation((source) =>
      Promise.resolve({ ...everything, selected: sources.find((item) => item.slug === source) }),
    )

    const canonical = async (query: Query) => (await generateMetadata(props(query))).alternates?.canonical

    expect(await canonical({})).toBe('https://sc.heerenveen.org/nieuws')
    expect(await canonical({ pagina: '1' })).toBe('https://sc.heerenveen.org/nieuws')
    expect(await canonical({ pagina: '2' })).toBe('https://sc.heerenveen.org/nieuws?pagina=2')
    expect(await canonical({ bron: 'voorbeeldkrant' })).toBe('https://sc.heerenveen.org/nieuws?bron=voorbeeldkrant')
    expect(await canonical({ bron: 'voorbeeldkrant', pagina: '3' })).toBe(
      'https://sc.heerenveen.org/nieuws?bron=voorbeeldkrant&pagina=3',
    )
    expect((await generateMetadata(props({ pagina: '2' }))).openGraph?.url).toBe(
      'https://sc.heerenveen.org/nieuws?pagina=2',
    )
  })

  it('names the source and the page in the title', async () => {
    vi.stubEnv('SITE_ENV', 'production')
    vi.mocked(getArchivePage).mockImplementation((source) =>
      Promise.resolve({ ...everything, selected: sources.find((item) => item.slug === source) }),
    )

    const title = async (query: Query) => (await generateMetadata(props(query))).title

    expect(await title({ pagina: '1' })).toBe('Nieuwsarchief')
    expect(await title({ pagina: '2' })).toBe('Nieuwsarchief, pagina 2')
    expect(await title({ bron: 'leeuwarder-courant' })).toBe('Nieuwsarchief van Leeuwarder Courant')
    expect(await title({ bron: 'leeuwarder-courant', pagina: '3' })).toBe(
      'Nieuwsarchief van Leeuwarder Courant, pagina 3',
    )
  })
})

describe('when the database can not be read', () => {
  const failure = new Error('Failed query: select 1 (connect ECONNREFUSED 127.0.0.1:3306)')

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getArchivePage).mockRejectedValue(failure)
  })

  it('shows the error page in the HTML, with a link to try again at the same address', async () => {
    const html = await render({ bron: 'leeuwarder-courant', pagina: '2' })

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Er ging iets mis</h1>'])
    expect(html).toContain('<a href="/nieuws?bron=leeuwarder-courant&amp;pagina=2">Probeer het opnieuw</a>')
    expect(html).not.toContain('Alle bronnen')
  })

  it('titles the page Er ging iets mis and keeps it out of the search engines', async () => {
    expect(await generateMetadata(props())).toEqual({ robots: { index: false }, title: 'Er ging iets mis' })
  })

  it('writes the reason to the log, without the values of the query', async () => {
    await render()

    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      'Could not read the headlines for /nieuws: Failed query: select 1 (connect ECONNREFUSED 127.0.0.1:3306)',
    )
  })
})
