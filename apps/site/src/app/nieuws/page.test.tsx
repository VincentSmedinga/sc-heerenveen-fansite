import type { PublicArchiveItem, PublicArchiveSource, PublicEpisode } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ArchivePage as Content } from '../../archive'

import { getArchivePage } from '../../archive'
import { getNewestArticle } from '../../articles'
import { getLatestEpisodes } from '../../podcasts'
import { withoutIcons } from '../../without-icons'
import NewsPage, { generateMetadata } from './page'

vi.mock('../../archive', () => ({ getArchivePage: vi.fn() }))
vi.mock('../../articles', () => ({ getNewestArticle: vi.fn() }))
vi.mock('../../podcasts', () => ({ getLatestEpisodes: vi.fn() }))

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

const article = {
  intro: 'Wij zijn de redactie van de Fansite. Hier lees je wie we zijn.',
  publishedAt: new Date('2026-10-25T10:00:00Z'),
  slug: 'dit-zijn-wij',
  title: 'Dit zijn wij',
}

const episodes: PublicEpisode[] = [
  {
    durationSeconds: 2944,
    episodeNumber: 16,
    publishedAt: new Date('2026-10-22T10:00:00Z'),
    seasonNumber: 9,
    sourceName: 'Testpodcast',
    title: 'Aflevering 12 & <b>de winterstop</b>',
    url: 'https://testpodcast.test/e/12',
  },
]

const everything: Content = { headlines, pageCount: 1, selected: [], sources }

type Query = Record<string, string | string[] | undefined>

const props = (query: Query = {}) => ({ searchParams: Promise.resolve(query) })

async function render(query: Query = {}) {
  return renderToStaticMarkup(await NewsPage(props(query)))
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
  vi.mocked(getNewestArticle).mockReset()
  vi.mocked(getNewestArticle).mockResolvedValue(undefined)
  vi.mocked(getLatestEpisodes).mockReset()
  vi.mocked(getLatestEpisodes).mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page Nieuws', () => {
  it('has one h1, Nieuws, and the h2 of the podcasts: the filter is named by its legend', async () => {
    const html = await render()

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual([
      '<h1 class="hf-heading-1">Nieuws</h1>',
      '<h2 class="hf-heading-2" id="episodes-heading">Podcasts</h2>',
    ])
  })

  it('is the one main of the page, with the h1 as its introduction and the list in a card', async () => {
    const html = await render()

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).toMatch(/<main class="hf-page-main"><div class="hf-page-intro"><h1[^>]*>Nieuws<\/h1><\/div>/)
    expect(html).toMatch(/<div class="hf-card"><ul role="list">/)
    expect(html.slice(0, html.indexOf('</main>'))).not.toContain('<form')
  })

  it('shows each headline as a link to the source, with the name of the source, and the day and time of its own', async () => {
    const html = await render()

    expect(html.slice(0, html.indexOf('</main>')).match(/<li>/g)).toHaveLength(3)
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

  it('puts the filter in a card on the white surface in the sidebar, after the main, with a name for the sidebar', async () => {
    const html = await render()

    expect(html.match(/<aside/g)).toHaveLength(1)
    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('<aside'))
    expect(html.slice(html.indexOf('<aside'))).toMatch(
      /^<aside class="hf-page-sidebar hf-page-sidebar-narrow" aria-label="Het filter, de redactie en de podcasts"><div class="hf-card"><form class="hf-form" noValidate="" autoComplete="off" action="\/nieuws" method="get"><fieldset class="hf-checkbox-group"><legend class="hf-heading-2">Bronnen<\/legend>/,
    )
  })

  it('has no filter, but the other cards, when there are no sources', async () => {
    vi.mocked(getArchivePage).mockResolvedValue({ ...everything, headlines: [], sources: [] })
    vi.mocked(getNewestArticle).mockResolvedValue(article)

    const html = await render()

    expect(html).toContain('<aside')
    expect(html).not.toContain('Bronnen')
    expect(html).not.toContain('<form')
    expect(html).toContain('Van de redactie')
  })

  it('has a form that gets to /nieuws, with a group named Bronnen and a button Toon, so it works without JavaScript', async () => {
    const html = await render()
    const form = html.slice(html.indexOf('<aside')).match(/<form.*?<\/form>/)?.[0] ?? ''

    expect(form).toMatch(/^<form [^>]*action="\/nieuws"[^>]*method="get"/)
    expect(form).toContain('<fieldset')
    expect(form.match(/<legend[^>]*>Bronnen<\/legend>/)).not.toBeNull()
    expect(form).toMatch(/<button type="submit">Toon<\/button><\/form>$/)
    expect(form).not.toContain('hidden')
    expect(form).not.toContain('<script')
  })

  it('has a checkbox for each source, named bron, with the slug as value and the name of the source as label, in the order of the list', async () => {
    const html = await render()
    const group = html.slice(html.indexOf('<fieldset')).match(/<fieldset.*?<\/fieldset>/)?.[0] ?? ''

    expect(
      [...group.matchAll(/<label[^>]*><input([^>]*)\/><span>([^<]*)<\/span><\/label>/g)].map(([, input, label]) => [
        input?.match(/value="([^"]*)"/)?.[1],
        input?.match(/name="([^"]*)"/)?.[1],
        input?.match(/type="([^"]*)"/)?.[1],
        label,
      ]),
    ).toEqual([
      ['leeuwarder-courant', 'bron', 'checkbox', 'Leeuwarder Courant'],
      ['voorbeeldkrant', 'bron', 'checkbox', 'Voorbeeldkrant, met dank aan de redactie'],
    ])
  })

  it('has no link to filter and no link to all sources: Alle bronnen is gone', async () => {
    const html = await render()

    expect(html).not.toContain('Alle bronnen')
    expect(html).not.toContain('Bronnen filteren')
    expect(html).not.toContain('aria-current')
    expect(html).not.toMatch(/href="\/nieuws\?bron=/)
  })

  it('checks nothing when no source is chosen', async () => {
    const html = await render()

    expect(html).not.toContain('checked')
  })

  it('checks the sources that are chosen, as the address says, and asks for their headlines', async () => {
    vi.mocked(getArchivePage).mockResolvedValue({ ...everything, selected: [sources[0] as PublicArchiveSource] })

    const html = await render({ bron: 'leeuwarder-courant' })

    expect([...html.matchAll(/<input[^>]*checked=""[^>]*value="([^"]*)"/g)].map(([, value]) => value)).toEqual([
      'leeuwarder-courant',
    ])
    expect(getArchivePage).toHaveBeenCalledExactlyOnceWith(['leeuwarder-courant'], 1)
  })

  it('asks for more sources at once, in the order of the address, and checks them all', async () => {
    vi.mocked(getArchivePage).mockResolvedValue({ ...everything, selected: sources })

    const html = await render({ bron: ['voorbeeldkrant', 'leeuwarder-courant'] })

    expect(getArchivePage).toHaveBeenCalledExactlyOnceWith(['voorbeeldkrant', 'leeuwarder-courant'], 1)
    expect(html.match(/checked=""/g)).toHaveLength(2)
  })

  it('checks every source as the address says when all are in it, and links to the pages without bron', async () => {
    vi.mocked(getArchivePage).mockResolvedValue({ ...everything, pageCount: 3, selected: [] })

    const html = withoutIcons(await render({ bron: ['leeuwarder-courant', 'voorbeeldkrant'] }))

    expect(html.match(/checked=""/g)).toHaveLength(2)
    expect(html).toContain('<h1 class="hf-heading-1">Nieuws</h1>')
    expect(html).toContain('href="/nieuws?pagina=2" rel="next">Volgende')
  })

  it('asks for the first page of all sources without parameters, and ignores a parameter it does not know', async () => {
    const html = await render({ utm_source: 'nieuwsbrief' })

    expect(html).toContain('<h1 class="hf-heading-1">Nieuws</h1>')
    expect(getArchivePage).toHaveBeenCalledExactlyOnceWith([], 1)
  })
})

describe('the sources that are chosen', () => {
  const one: Content = { ...everything, selected: [sources[0] as PublicArchiveSource] }

  it('names the source in the heading when one is chosen, and shows its name on no line', async () => {
    vi.mocked(getArchivePage).mockResolvedValue(one)

    const html = await render({ bron: 'leeuwarder-courant' })

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Nieuws van Leeuwarder Courant</h1>'])
    // The name stays in each line for a screen reader, but nobody sees it.
    expect(html.slice(0, html.indexOf('</main>')).match(/<span>Leeuwarder Courant<\/span>/g)).toBeNull()
    expect(html.slice(0, html.indexOf('</main>')).match(/class="hf-visually-hidden">[^<]* <\/span>/g)).toHaveLength(3)
  })

  it('shows the name of the source on each line when none is chosen', async () => {
    const html = await render()

    expect(html.slice(0, html.indexOf('</main>')).match(/<span>Leeuwarder Courant<\/span>/g)).toHaveLength(2)
    expect(html).not.toContain('hf-visually-hidden')
  })

  it('names two sources in the heading with "en", and shows the name on each line, as more than one source is in the list', async () => {
    vi.mocked(getArchivePage).mockResolvedValue({ ...everything, selected: sources })

    const html = await render({ bron: ['leeuwarder-courant', 'voorbeeldkrant'] })

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual([
      '<h1 class="hf-heading-1">Nieuws van Leeuwarder Courant en Voorbeeldkrant, met dank aan de redactie</h1>',
    ])
    expect(html.slice(0, html.indexOf('</main>')).match(/<span>Leeuwarder Courant<\/span>/g)).toHaveLength(2)
  })

  it('names three sources with commas and "en"', async () => {
    const three = [...sources, { name: 'Omrop Fryslân', slug: 'omrop-fryslan' }]

    vi.mocked(getArchivePage).mockResolvedValue({ ...everything, selected: three, sources: three })

    const html = await render({ bron: ['leeuwarder-courant', 'voorbeeldkrant', 'omrop-fryslan'] })

    expect(html).toContain(
      '<h1 class="hf-heading-1">Nieuws van Leeuwarder Courant, Voorbeeldkrant, met dank aan de redactie en Omrop Fryslân</h1>',
    )
  })

  it('shows the error page at the address that was asked, with all its sources', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getArchivePage).mockRejectedValue(new Error('no database'))

    const html = await render({ bron: ['voorbeeldkrant', 'leeuwarder-courant'] })

    expect(html).toContain('<a href="/nieuws?bron=voorbeeldkrant&amp;bron=leeuwarder-courant">Probeer het opnieuw</a>')
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
    expect(getArchivePage).toHaveBeenCalledExactlyOnceWith([], 2)
  })

  it('has a link to the previous page and none to a next page on the last page', async () => {
    vi.mocked(getArchivePage).mockResolvedValue(many)

    const html = withoutIcons(await render({ pagina: '9' }))

    expect(html).toContain('href="/nieuws?pagina=8" rel="prev">Vorige')
    expect(html).not.toContain('Volgende')
  })

  it('keeps the source in the addresses of the pages, and the filter starts at the first page', async () => {
    vi.mocked(getArchivePage).mockResolvedValue({ ...many, selected: [sources[0] as PublicArchiveSource] })

    const html = withoutIcons(await render({ bron: 'leeuwarder-courant', pagina: '2' }))

    expect(html).toContain('href="/nieuws?bron=leeuwarder-courant" rel="prev">Vorige')
    expect(html).toContain('href="/nieuws?bron=leeuwarder-courant&amp;pagina=3" rel="next">Volgende')
  })

  it('keeps all the chosen sources in the addresses of the pages, in the order of the list', async () => {
    vi.mocked(getArchivePage).mockResolvedValue({ ...many, selected: sources })

    const html = withoutIcons(await render({ bron: ['voorbeeldkrant', 'leeuwarder-courant'], pagina: '2' }))

    expect(html).toContain('href="/nieuws?bron=leeuwarder-courant&amp;bron=voorbeeldkrant" rel="prev">Vorige')
    expect(html).toContain(
      'href="/nieuws?bron=leeuwarder-courant&amp;bron=voorbeeldkrant&amp;pagina=3" rel="next">Volgende',
    )
  })

  it('starts at the first page after a new choice, because the form sends no page', async () => {
    const html = await render({ pagina: '2' })
    const form = html.match(/<form.*?<\/form>/)?.[0] ?? ''

    expect(form).not.toContain('pagina')
  })
})

describe('an address that is wrong', () => {
  it.each([
    ['a source that does not exist', { bron: 'bestaat-niet' }],
    ['one source that does not exist next to one that does', { bron: ['bestaat-niet', 'leeuwarder-courant'] }],
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
    ['a source given twice', { bron: ['nos', 'nos'] }],
    ['a source given twice next to another', { bron: ['nos', 'espn', 'nos'] }],
  ])('gives the page niet gevonden for %s, without asking the data', async (_, query) => {
    await expect(render(query)).rejects.toEqual(notFound)
    await expect(generateMetadata(props(query))).rejects.toEqual(notFound)
    expect(getArchivePage).not.toHaveBeenCalled()
  })

  it('gives the page niet gevonden for an empty source, because that is no source', async () => {
    vi.mocked(getArchivePage).mockResolvedValue(undefined)

    await expect(render({ bron: '' })).rejects.toEqual(notFound)
    expect(getArchivePage).toHaveBeenCalledExactlyOnceWith([''], 1)
  })
})

describe('the sidebar of the news page', () => {
  beforeEach(() => {
    vi.mocked(getNewestArticle).mockResolvedValue(article)
    vi.mocked(getLatestEpisodes).mockResolvedValue(episodes)
  })

  it('has the filter, then the article of the editors, then the podcasts, in the order of the keyboard', async () => {
    const html = await render()
    const sidebar = html.slice(html.indexOf('<aside'))

    expect(sidebar.indexOf('<form')).toBeLessThan(sidebar.indexOf('id="editors-heading"'))
    expect(sidebar.indexOf('id="editors-heading"')).toBeLessThan(sidebar.indexOf('id="episodes-heading"'))
    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('<form'))
  })

  it('shows the article as one news line: the title as a link, the day, "Van de redactie" as the source and no intro', async () => {
    const html = withoutIcons(await render())
    const card = html.match(/<section class="hf-card" aria-labelledby="editors-heading">.*?<\/section>/)?.[0] ?? ''

    expect(card).toContain('<h2 class="hf-heading-2" id="editors-heading">Van de redactie</h2>')
    expect(card).toContain('href="/redactie/dit-zijn-wij"')
    expect(card).toContain('Dit zijn wij')
    expect(card).toContain('<time class="hf-meta hf-news-item-time" dateTime="2026-10-25">zo 25 okt</time>')
    expect(card).toContain('<span>Van de redactie</span>')
    expect(card).not.toContain('Wij zijn de redactie van de Fansite')
    expect(card).not.toContain('Lees verder')
    expect(card.match(/<a /g)).toHaveLength(1)
  })

  it('draws no icon for another site behind the article: it is a page of our own', async () => {
    const html = await render()
    const card = html.match(/<section class="hf-card" aria-labelledby="editors-heading">.*?<\/section>/)?.[0] ?? ''

    expect(card).not.toContain('<svg')
  })

  it('leaves the card of the editors out when there is no article', async () => {
    vi.mocked(getNewestArticle).mockResolvedValue(undefined)

    const html = await render()

    expect(html).not.toContain('Van de redactie')
    expect(html).toContain('id="episodes-heading"')
  })

  it('shows the newest episodes under the heading Podcasts, with the link to all podcasts', async () => {
    const html = withoutIcons(await render())
    const card = html.match(/<section class="hf-card" aria-labelledby="episodes-heading">.*?<\/section>/)?.[0] ?? ''

    expect(card).toContain('<h2 class="hf-heading-2" id="episodes-heading">Podcasts</h2>')
    expect(card).toContain('href="https://testpodcast.test/e/12"')
    expect(card).toContain('Aflevering 12 &amp; &lt;b&gt;de winterstop&lt;/b&gt;')
    expect(card).toContain('<a href="/nieuws/podcasts">Alle podcasts</a>')
  })

  it('has no card with matches or the table', async () => {
    const html = await render()

    expect(html).not.toContain('matches-heading')
    expect(html).not.toContain('standings-heading')
    expect(html).not.toContain('Wedstrijden')
    expect(html).not.toContain('discussions-heading')
  })

  it('shows the headlines without the card, and logs why, when only the article can not be read', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getNewestArticle).mockRejectedValue(new Error('Failed query: select 1 (connect ECONNREFUSED)'))

    const html = await render()

    expect(html).toContain('Heerenveen houdt Testclub op afstand')
    expect(html).not.toContain('Van de redactie')
    expect(log).toHaveBeenCalledWith(expect.stringContaining('the newest article for /nieuws'))
  })

  it('shows the headlines without the podcasts, and logs why, when only the episodes can not be read', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getLatestEpisodes).mockRejectedValue(new Error('Failed query: select 1 (connect ECONNREFUSED)'))

    const html = await render()

    expect(html).toContain('Heerenveen houdt Testclub op afstand')
    expect(html).not.toContain('episodes-heading')
    expect(log).toHaveBeenCalledWith(expect.stringContaining('the newest podcast episodes for /nieuws'))
  })
})

describe('a page without headlines', () => {
  it('says so in a sentence, and has no list, no filter and no card of the editors', async () => {
    vi.mocked(getArchivePage).mockResolvedValue({ ...everything, headlines: [], sources: [] })

    const html = await render()

    expect(html).toContain('<p>We hebben nog geen nieuws gevonden.</p>')
    expect(html).not.toContain('<ul')
    expect(html).not.toContain('<nav')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('Van de redactie')
    expect(html).not.toContain('Alle bronnen')
  })
})

describe('the metadata', () => {
  it('titles the first page Nieuws, describes it and lets search engines in', async () => {
    vi.stubEnv('SITE_ENV', 'production')

    const metadata = await generateMetadata(props())

    expect(metadata.title).toBe('Nieuws')
    expect(metadata.description).toContain('koppen over sc Heerenveen')
    expect(metadata.alternates?.canonical).toBe('https://sc.heerenveen.org/nieuws')
    expect(metadata.robots).toBeUndefined()
  })

  it('gives each page and each source its own canonical address, so search engines keep them apart', async () => {
    vi.stubEnv('SITE_ENV', 'production')
    vi.mocked(getArchivePage).mockImplementation((slugs) =>
      Promise.resolve({ ...everything, selected: sources.filter((item) => slugs.includes(item.slug)) }),
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
    vi.mocked(getArchivePage).mockImplementation((slugs) =>
      Promise.resolve({ ...everything, selected: sources.filter((item) => slugs.includes(item.slug)) }),
    )

    const title = async (query: Query) => (await generateMetadata(props(query))).title

    expect(await title({ pagina: '1' })).toBe('Nieuws')
    expect(await title({ pagina: '2' })).toBe('Nieuws, pagina 2')
    expect(await title({ bron: 'leeuwarder-courant' })).toBe('Nieuws van Leeuwarder Courant')
    expect(await title({ bron: 'leeuwarder-courant', pagina: '3' })).toBe('Nieuws van Leeuwarder Courant, pagina 3')
    expect(await title({ bron: ['leeuwarder-courant', 'voorbeeldkrant'] })).toBe(
      'Nieuws van Leeuwarder Courant en Voorbeeldkrant, met dank aan de redactie',
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
