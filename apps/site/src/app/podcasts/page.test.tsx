import type { PublicEpisode, PublicPodcast } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PodcastPage as Content } from '../../podcasts'

import { getPodcastPage } from '../../podcasts'
import PodcastsPage, { generateMetadata } from './page'

vi.mock('../../podcasts', () => ({ getPodcastPage: vi.fn() }))

// The moment of now is the afternoon of Friday 23 October 2026 in the Netherlands.
const now = new Date('2026-10-23T13:40:00Z')

const podcasts: PublicPodcast[] = [
  { name: 'Omroep Abe', slug: 'omroep-abe' },
  { name: 'Radio Camataru', slug: 'radio-camataru' },
]

const episodes: PublicEpisode[] = [
  {
    publishedAt: new Date('2026-10-22T10:00:00Z'),
    sourceName: 'Omroep Abe',
    title: 'Aflevering 12 & <b>de winterstop</b>',
    url: 'https://omny.test/shows/abe/12',
  },
  {
    publishedAt: new Date('2021-10-06T10:00:00Z'),
    sourceName: 'Radio Camataru',
    title: 'Aflevering 1',
    url: 'https://camataru.test/e/1/',
  },
]

const everything: Content = { episodes, pageCount: 1, podcasts, selected: undefined }

const bothAddresses = {
  applePodcastsUrl: 'https://podcasts.apple.com/nl/podcast/omroep-abe/id1',
  description: 'De podcast van de Leeuwarder Courant over sc Heerenveen.',
  name: 'Omroep Abe',
  spotifyUrl: 'https://open.spotify.com/show/abc',
}

type Query = Record<string, string | string[] | undefined>

const props = (query: Query = {}) => ({ searchParams: Promise.resolve(query) })

async function render(query: Query = {}) {
  return renderToStaticMarkup(await PodcastsPage(props(query)))
}

/** The page that the visitor sees: Next.js stops at a notFound() with an error that has this digest. */
const notFound = expect.objectContaining({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' }) as unknown

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.mocked(getPodcastPage).mockReset()
  vi.mocked(getPodcastPage).mockResolvedValue(everything)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page Podcasts', () => {
  it('has one h1, Podcasts, and no other heading', async () => {
    const html = await render()

    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual(['<h1 class="hf-heading-1">Podcasts</h1>'])
  })

  it('is the one main of the page, with the h1 and the filter as its introduction and the list in a card', async () => {
    const html = await render()

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).toMatch(/<main class="hf-page-main"><div class="hf-page-intro"><h1.*<\/h1><nav.*<\/nav><\/div>/)
    expect(html).toMatch(/<div class="hf-card"><ul role="list">/)
  })

  it('shows each episode as a link to its page at the maker, with the name of the podcast and the time', async () => {
    const html = await render()

    // The filter has list items too, so count the episodes in the card.
    expect(html.slice(html.indexOf('<div class="hf-card">')).match(/<li>/g)).toHaveLength(2)
    expect(html).toContain('href="https://omny.test/shows/abe/12"')
    expect(html).toContain('href="https://camataru.test/e/1/"')
    expect(html).toContain('Radio Camataru')
    expect(html).toContain('do 12:00')
    expect(html).toContain('6 okt 2021')
    expect(html).not.toContain('target=')
  })

  it('shows a title as text, escaped, and nothing of an episode but the title, the link, the name and the time', async () => {
    const html = await render()

    expect(html).toContain('Aflevering 12 &amp; &lt;b&gt;de winterstop&lt;/b&gt;')
    expect(html).not.toContain('<b>')
    expect(html).not.toMatch(/<img|<audio|<iframe|<script|\.mp3/)
  })

  it('has a filter with a link to all podcasts and one to each podcast, in a navigation with a name', async () => {
    const html = await render()
    const nav = html.match(/<nav[^>]*aria-label="Podcasts filteren".*?<\/nav>/)?.[0] ?? ''

    expect(
      [...nav.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label]),
    ).toEqual([
      ['/podcasts', 'Alle podcasts'],
      ['/podcasts?podcast=omroep-abe', 'Omroep Abe'],
      ['/podcasts?podcast=radio-camataru', 'Radio Camataru'],
    ])
  })

  it('marks Alle podcasts as the choice when no podcast is chosen', async () => {
    const html = await render()

    expect([...html.matchAll(/<a [^>]*aria-current="page"[^>]*>([^<]*)<\/a>/g)].map(([, label]) => label)).toEqual([
      'Alle podcasts',
    ])
  })

  it('marks the podcast that is chosen, and asks for its episodes', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({ ...everything, selected: bothAddresses })

    const html = await render({ podcast: 'omroep-abe' })

    expect([...html.matchAll(/<a [^>]*aria-current="page"[^>]*>([^<]*)<\/a>/g)].map(([, label]) => label)).toEqual([
      'Omroep Abe',
    ])
    expect(getPodcastPage).toHaveBeenCalledExactlyOnceWith('omroep-abe', 1)
  })
})

describe('the card about the podcast in the sidebar', () => {
  /** The sidebar alone, or an empty text when the page has none. */
  const sidebarOf = (html: string) => (html.includes('<aside') ? html.slice(html.indexOf('<aside')) : '')

  it('is a card on a tonal surface in the sidebar, named by its h2 "Over" and the name of the podcast', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({ ...everything, selected: bothAddresses })

    const html = await render({ podcast: 'omroep-abe' })

    expect(html.match(/<aside/g)).toHaveLength(1)
    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('<aside'))
    expect(sidebarOf(html)).toMatch(
      /^<aside class="hf-page-sidebar" aria-label="Over Omroep Abe"><section class="hf-card hf-card-soft" aria-labelledby="about-heading"><h2 class="hf-heading-2" id="about-heading">Over Omroep Abe<\/h2>/,
    )
    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual([
      '<h1 class="hf-heading-1">Podcasts</h1>',
      '<h2 class="hf-heading-2" id="about-heading">Over Omroep Abe</h2>',
    ])
  })

  it('has the description of the podcast from the register, as text, before the links', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({
      ...everything,
      selected: { ...bothAddresses, description: 'Elke week & <b>vet</b> gepraat.' },
    })

    const sidebar = sidebarOf(await render({ podcast: 'omroep-abe' }))

    expect(sidebar).toContain('<p>Elke week &amp; &lt;b&gt;vet&lt;/b&gt; gepraat.</p>')
    expect(sidebar).not.toContain('<b>')
    expect(sidebar.indexOf('gepraat')).toBeLessThan(sidebar.indexOf('Luister ook op'))
  })

  it('has "Luister ook op" and a list with a text link for each address, named after the podcast', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({ ...everything, selected: bothAddresses })

    const sidebar = sidebarOf(await render({ podcast: 'omroep-abe' }))

    expect(sidebar).toContain(
      '<p>Luister ook op</p><ul role="list"><li><a href="https://podcasts.apple.com/nl/podcast/omroep-abe/id1"><span class="hf-visually-hidden">Omroep Abe op </span>Apple Podcasts</a></li><li><a href="https://open.spotify.com/show/abc"><span class="hf-visually-hidden">Omroep Abe op </span>Spotify</a></li></ul>',
    )
    expect(sidebar).not.toContain('target=')
  })

  it('has one item when the podcast has one address', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({
      ...everything,
      selected: { ...bothAddresses, spotifyUrl: null },
    })

    const sidebar = sidebarOf(await render({ podcast: 'omroep-abe' }))

    expect(sidebar.match(/<li>/g)).toHaveLength(1)
    expect(sidebar).toContain('Apple Podcasts')
    expect(sidebar).not.toContain('Spotify')
  })

  it('has the description alone when the podcast has no address: no line and no list', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({
      ...everything,
      selected: { ...bothAddresses, applePodcastsUrl: null, spotifyUrl: null },
    })

    const sidebar = sidebarOf(await render({ podcast: 'omroep-abe' }))

    expect(sidebar).toContain('De podcast van de Leeuwarder Courant over sc Heerenveen.')
    expect(sidebar).not.toContain('Luister ook op')
    expect(sidebar).not.toContain('<ul')
  })

  it('has the addresses alone when the podcast has no description', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({
      ...everything,
      selected: { ...bothAddresses, description: null },
    })

    const sidebar = sidebarOf(await render({ podcast: 'omroep-abe' }))

    expect(sidebar).toContain('Luister ook op')
    expect(sidebar.match(/<p>/g)).toHaveLength(1)
  })

  it('has only the h2 when the podcast has no description and no address', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({
      ...everything,
      selected: { applePodcastsUrl: null, description: '', name: 'Omroep Abe', spotifyUrl: null },
    })

    const sidebar = sidebarOf(await render({ podcast: 'omroep-abe' }))

    expect(sidebar).toContain('Over Omroep Abe')
    expect(sidebar).not.toContain('<p>')
  })

  it('is not there for all podcasts, and the line "Luister ook op" is no longer under the h1', async () => {
    const html = await render()

    expect(html).not.toContain('<aside')
    expect(html).not.toContain('Luister ook')
  })

  it('does not put the line under the h1 either when a podcast is chosen', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({ ...everything, selected: bothAddresses })

    const html = await render({ podcast: 'omroep-abe' })
    const main = html.slice(0, html.indexOf('</main>'))

    expect(main).not.toContain('Luister ook')
  })
})

describe('the pagination', () => {
  const many: Content = { ...everything, pageCount: 9 }

  it('is not there when there is one page', async () => {
    expect(await render()).not.toContain('Paginering')
  })

  it('has a link to the next page and none to a previous page on the first page', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue(many)

    const html = await render()

    expect(html).toContain('<nav aria-label="Paginering"')
    expect(html).toContain('Pagina 1 van 9')
    expect(html).toContain(
      '<a class="hf-pagination-link hf-pagination-next" href="/podcasts?pagina=2" rel="next">Volgende</a>',
    )
    expect(html).not.toContain('Vorige')
  })

  it('has both links in the middle, and the link back to the first page has no parameter', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue(many)

    const second = await render({ pagina: '2' })

    expect(second).toContain('Pagina 2 van 9')
    expect(second).toContain('href="/podcasts" rel="prev">Vorige')
    expect(second).toContain('href="/podcasts?pagina=3" rel="next">Volgende')
    expect(getPodcastPage).toHaveBeenCalledExactlyOnceWith(undefined, 2)
  })

  it('has a link to the previous page and none to a next page on the last page', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue(many)

    const html = await render({ pagina: '9' })

    expect(html).toContain('href="/podcasts?pagina=8" rel="prev">Vorige')
    expect(html).not.toContain('Volgende')
  })

  it('keeps the podcast in the addresses of the pages', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({ ...many, selected: bothAddresses })

    const html = await render({ pagina: '2', podcast: 'omroep-abe' })

    expect(html).toContain('href="/podcasts?podcast=omroep-abe" rel="prev">Vorige')
    expect(html).toContain('href="/podcasts?podcast=omroep-abe&amp;pagina=3" rel="next">Volgende')
  })
})

describe('an address that is wrong', () => {
  it.each([
    ['a podcast that does not exist', { podcast: 'bestaat-niet' }],
    ['a page that does not exist', { pagina: '99' }],
  ])('gives the page niet gevonden for %s, when the data has none', async (_, query) => {
    vi.mocked(getPodcastPage).mockResolvedValue(undefined)

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
    ['a podcast given twice', { podcast: ['omroep-abe', 'radio-camataru'] }],
  ])('gives the page niet gevonden for %s, without asking the data', async (_, query) => {
    await expect(render(query)).rejects.toEqual(notFound)
    await expect(generateMetadata(props(query))).rejects.toEqual(notFound)
    expect(getPodcastPage).not.toHaveBeenCalled()
  })

  it('ignores a parameter that the page does not know', async () => {
    const html = await render({ utm_source: 'nieuwsbrief' })

    expect(html).toContain('<h1 class="hf-heading-1">Podcasts</h1>')
    expect(getPodcastPage).toHaveBeenCalledExactlyOnceWith(undefined, 1)
  })

  it('gives the page niet gevonden for an empty podcast, because that is no podcast', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue(undefined)

    await expect(render({ podcast: '' })).rejects.toEqual(notFound)
    expect(getPodcastPage).toHaveBeenCalledExactlyOnceWith('', 1)
  })
})

describe('a page without episodes', () => {
  it('says so in a sentence, and has no list', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({ ...everything, episodes: [] })

    const html = await render()

    expect(html).toContain('<p>We hebben nog geen podcastafleveringen gevonden.</p>')
    expect(html).not.toContain('<ul role="list">')
  })
})

describe('the metadata', () => {
  it('titles the first page Podcasts, describes it and lets search engines in', async () => {
    vi.stubEnv('SITE_ENV', 'production')

    const metadata = await generateMetadata(props())

    expect(metadata.title).toBe('Podcasts')
    expect(metadata.description).toContain('podcasts over sc Heerenveen')
    expect(metadata.alternates?.canonical).toBe('https://sc.heerenveen.org/podcasts')
    expect(metadata.robots).toBeUndefined()
  })

  it('gives each page and each podcast its own canonical address, so search engines keep them apart', async () => {
    vi.stubEnv('SITE_ENV', 'production')

    const canonical = async (query: Query) => (await generateMetadata(props(query))).alternates?.canonical

    expect(await canonical({})).toBe('https://sc.heerenveen.org/podcasts')
    expect(await canonical({ pagina: '1' })).toBe('https://sc.heerenveen.org/podcasts')
    expect(await canonical({ pagina: '2' })).toBe('https://sc.heerenveen.org/podcasts?pagina=2')
    expect(await canonical({ podcast: 'omroep-abe' })).toBe('https://sc.heerenveen.org/podcasts?podcast=omroep-abe')
    expect(await canonical({ pagina: '2', podcast: 'omroep-abe' })).toBe(
      'https://sc.heerenveen.org/podcasts?podcast=omroep-abe&pagina=2',
    )
    expect((await generateMetadata(props({ pagina: '2' }))).openGraph?.url).toBe(
      'https://sc.heerenveen.org/podcasts?pagina=2',
    )
  })

  it('titles a later page with its number', async () => {
    vi.stubEnv('SITE_ENV', 'production')

    expect((await generateMetadata(props({ pagina: '2' }))).title).toBe('Podcasts, pagina 2')
    expect((await generateMetadata(props({ pagina: '1' }))).title).toBe('Podcasts')
  })
})

describe('when the database can not be read', () => {
  const failure = new Error('Failed query: select 1 (connect ECONNREFUSED 127.0.0.1:3306)')

  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getPodcastPage).mockRejectedValue(failure)
  })

  it('shows the error page in the HTML, with a link to try again at the same address', async () => {
    const html = await render({ pagina: '2', podcast: 'omroep-abe' })

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Er ging iets mis</h1>'])
    expect(html).toContain('<a href="/podcasts?podcast=omroep-abe&amp;pagina=2">Probeer het opnieuw</a>')
    expect(html).not.toContain('Luister ook')
  })

  it('titles the page Er ging iets mis and keeps it out of the search engines', async () => {
    expect(await generateMetadata(props())).toEqual({ robots: { index: false }, title: 'Er ging iets mis' })
  })

  it('writes the reason to the log, without the values of the query', async () => {
    await render()

    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      'Could not read the episodes for /podcasts: Failed query: select 1 (connect ECONNREFUSED 127.0.0.1:3306)',
    )
  })
})
