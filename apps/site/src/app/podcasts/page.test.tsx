import type { PublicEpisode, PublicPodcast } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PodcastPage as Content } from '../../podcasts'

import { getPodcastPage } from '../../podcasts'
import { withoutIcons } from '../../without-icons'
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
    durationSeconds: 2944,
    episodeNumber: 120,
    publishedAt: new Date('2026-10-22T10:00:00Z'),
    seasonNumber: null,
    sourceName: 'Omroep Abe',
    title: 'Aflevering 12 & <b>de winterstop</b>',
    url: 'https://omny.test/shows/abe/12',
  },
  {
    durationSeconds: null,
    episodeNumber: null,
    publishedAt: new Date('2021-10-06T10:00:00Z'),
    seasonNumber: null,
    sourceName: 'Radio Camataru',
    title: 'Aflevering 1',
    url: 'https://camataru.test/e/1/',
  },
]

const abe = podcasts[0] as PublicPodcast
const camataru = podcasts[1] as PublicPodcast

const everything: Content = { about: undefined, episodes, pageCount: 1, podcasts, selected: [] }

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

/**
 * The page that the visitor sees: Next.js stops at a notFound() with an error that has this
 * digest.
 */
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

  it('is the one main of the page, with the h1 as its introduction and the list in a card', async () => {
    const html = await render()

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).toMatch(/<main class="hf-page-main"><div class="hf-page-intro"><h1[^>]*>Podcasts<\/h1><\/div>/)
    expect(html).toMatch(/<div class="hf-card"><ul role="list">/)
    expect(html.slice(0, html.indexOf('</main>'))).not.toContain('<form')
  })

  it('shows each episode as a link to its page at the maker, with the name of the podcast and the time', async () => {
    const html = await render()

    expect(html.slice(0, html.indexOf('</main>')).match(/<li>/g)).toHaveLength(2)
    expect(html).toContain('href="https://omny.test/shows/abe/12"')
    expect(html).toContain('href="https://camataru.test/e/1/"')
    expect(html).toContain('Radio Camataru')
    expect(html).toContain('do 12:00')
    expect(html).toContain('6 okt 2021')
    expect(html).not.toContain('target=')
  })

  it('shows the number and the duration of an episode after the name, and nothing for what the feed did not give', async () => {
    const html = await render()

    expect(html).toContain('<span>aflevering 120</span>')
    expect(html).toContain('<span>49 min</span>')
    expect(html.match(/aflevering \d+/g)).toHaveLength(1)
  })

  it('shows a title as text, escaped, and nothing of an episode but the title, the link, the name and the time', async () => {
    const html = await render()

    expect(html).toContain('Aflevering 12 &amp; &lt;b&gt;de winterstop&lt;/b&gt;')
    expect(html).not.toContain('<b>')
    expect(html).not.toMatch(/<img|<audio|<iframe|<script|\.mp3/)
  })

  it('puts the filter in a card on a soft surface in the sidebar, after the main, with a name for the sidebar', async () => {
    const html = await render()

    expect(html.match(/<aside/g)).toHaveLength(1)
    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('<aside'))
    expect(html.slice(html.indexOf('<aside'))).toMatch(
      /^<aside class="hf-page-sidebar" aria-label="Podcasts"><div class="hf-card hf-card-soft"><form class="hf-form" noValidate="" autoComplete="off" action="\/podcasts" method="get"><fieldset class="hf-checkbox-group"><legend class="hf-heading-2">Podcasts<\/legend>/,
    )
  })

  it('has no sidebar and no filter when there are no podcasts', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({ ...everything, episodes: [], podcasts: [] })

    const html = await render()

    expect(html).not.toContain('<aside')
    expect(html).not.toContain('<fieldset')
  })

  it('has a form that gets to /podcasts, with a group named Podcasts and a button Toon, so it works without JavaScript', async () => {
    const html = await render()
    const form = html.slice(html.indexOf('<aside')).match(/<form.*?<\/form>/)?.[0] ?? ''

    expect(form).toMatch(/^<form [^>]*action="\/podcasts"[^>]*method="get"/)
    expect(form).toContain('<fieldset')
    expect(form.match(/<legend[^>]*>Podcasts<\/legend>/)).not.toBeNull()
    expect(form).toMatch(/<button type="submit">Toon<\/button><\/form>$/)
    expect(form).not.toContain('hidden')
    expect(form).not.toContain('<script')
  })

  it('has a checkbox for each podcast, named podcast, with the slug as value and the name of the podcast as label, in the order of the list', async () => {
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
      ['omroep-abe', 'podcast', 'checkbox', 'Omroep Abe'],
      ['radio-camataru', 'podcast', 'checkbox', 'Radio Camataru'],
    ])
  })

  it('has no link to filter and no link to all podcasts: Alle podcasts is gone', async () => {
    const html = await render()

    expect(html).not.toContain('Alle podcasts')
    expect(html).not.toContain('Podcasts filteren')
    expect(html).not.toContain('aria-current')
    expect(html).not.toMatch(/href="\/podcasts\?podcast=/)
  })

  it('checks nothing when no podcast is chosen', async () => {
    expect(await render()).not.toContain('checked')
  })

  it('checks the podcast that is chosen, as the address says, and asks for its episodes', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({ ...everything, about: bothAddresses, selected: [abe] })

    const html = await render({ podcast: 'omroep-abe' })

    expect([...html.matchAll(/<input[^>]*checked=""[^>]*value="([^"]*)"/g)].map(([, value]) => value)).toEqual([
      'omroep-abe',
    ])
    expect(getPodcastPage).toHaveBeenCalledExactlyOnceWith(['omroep-abe'], 1)
  })

  it('asks for more podcasts at once, in the order of the address, and checks them all', async () => {
    const three = [...podcasts, { name: 'Zondag Zes', slug: 'zondag-zes' }]

    vi.mocked(getPodcastPage).mockResolvedValue({ ...everything, podcasts: three, selected: [abe, camataru] })

    const html = await render({ podcast: ['radio-camataru', 'omroep-abe'] })

    expect(getPodcastPage).toHaveBeenCalledExactlyOnceWith(['radio-camataru', 'omroep-abe'], 1)
    expect(html.match(/checked=""/g)).toHaveLength(2)
  })

  it('checks every podcast as the address says when all are in it, and links to the pages without podcast', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({ ...everything, pageCount: 3 })

    const html = withoutIcons(await render({ podcast: ['omroep-abe', 'radio-camataru'] }))

    expect(html.match(/checked=""/g)).toHaveLength(2)
    expect(html).toContain('<h1 class="hf-heading-1">Podcasts</h1>')
    expect(html).toContain('href="/podcasts?pagina=2" rel="next">Volgende')
    expect(html).not.toContain('Over ')
  })
})

describe('the podcasts that are chosen', () => {
  it('names the podcast in the heading when one is chosen, and shows its name on no line', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({ ...everything, about: bothAddresses, selected: [abe] })

    const html = await render({ podcast: 'omroep-abe' })

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Podcasts van Omroep Abe</h1>'])
    // The name stays in each line for a screen reader, but nobody sees it.
    const list = html.slice(0, html.indexOf('</main>'))

    expect(list.match(/<span>Omroep Abe<\/span>/g)).toBeNull()
    expect(list.match(/class="hf-visually-hidden">[^<]* <\/span>/g)).toHaveLength(2)
  })

  it('shows the name of the podcast on each line when none is chosen', async () => {
    const html = await render()

    expect(html.slice(0, html.indexOf('</main>')).match(/<span>Omroep Abe<\/span>/g)).toHaveLength(1)
    expect(html).not.toContain('hf-visually-hidden')
  })

  it('names two podcasts in the heading with "en", and shows the name on each line, as more than one podcast is in the list', async () => {
    const three = [...podcasts, { name: 'Zondag Zes', slug: 'zondag-zes' }]

    vi.mocked(getPodcastPage).mockResolvedValue({ ...everything, podcasts: three, selected: [abe, camataru] })

    const html = await render({ podcast: ['omroep-abe', 'radio-camataru'] })

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual([
      '<h1 class="hf-heading-1">Podcasts van Omroep Abe en Radio Camataru</h1>',
    ])
    expect(html.slice(0, html.indexOf('</main>')).match(/<span>Omroep Abe<\/span>/g)).toHaveLength(1)
    expect(html).not.toContain('Over Omroep Abe')
  })

  it('names three podcasts with commas and "en"', async () => {
    const four = [...podcasts, { name: 'Zondag Zes', slug: 'zondag-zes' }, { name: 'De Klup', slug: 'de-klup' }]

    vi.mocked(getPodcastPage).mockResolvedValue({
      ...everything,
      podcasts: four,
      selected: [abe, camataru, { name: 'Zondag Zes', slug: 'zondag-zes' }],
    })

    const html = await render({ podcast: ['omroep-abe', 'radio-camataru', 'zondag-zes'] })

    expect(html).toContain('<h1 class="hf-heading-1">Podcasts van Omroep Abe, Radio Camataru en Zondag Zes</h1>')
  })

  it('shows the error page at the address that was asked, with all its podcasts', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getPodcastPage).mockRejectedValue(new Error('no database'))

    const html = await render({ podcast: ['radio-camataru', 'omroep-abe'] })

    expect(html).toContain('<a href="/podcasts?podcast=radio-camataru&amp;podcast=omroep-abe">Probeer het opnieuw</a>')
  })

  it('asks for the first page of all podcasts without parameters, and ignores a parameter it does not know', async () => {
    const html = await render({ utm_source: 'nieuwsbrief' })

    expect(html).toContain('<h1 class="hf-heading-1">Podcasts</h1>')
    expect(getPodcastPage).toHaveBeenCalledExactlyOnceWith([], 1)
  })
})

describe('the card about the podcast in the sidebar', () => {
  /** The card alone, or an empty text when the page has none. */
  const sidebarOf = (html: string) => (html.includes('<section') ? html.slice(html.indexOf('<section')) : '')

  it('is a card on a tonal surface in the sidebar under the card with the filter, named by its h2 "Over" and the name of the podcast', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({ ...everything, about: bothAddresses, selected: [abe] })

    const html = await render({ podcast: 'omroep-abe' })

    expect(html.match(/<aside/g)).toHaveLength(1)
    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('<aside'))
    expect(html.indexOf('<fieldset')).toBeLessThan(html.indexOf('<section'))
    expect(html).toContain('</form></div><section class="hf-card hf-card-soft" aria-labelledby="about-heading">')
    expect(sidebarOf(html)).toMatch(
      /^<section class="hf-card hf-card-soft" aria-labelledby="about-heading"><h2 class="hf-heading-2" id="about-heading">Over Omroep Abe<\/h2>/,
    )
    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual([
      '<h1 class="hf-heading-1">Podcasts van Omroep Abe</h1>',
      '<h2 class="hf-heading-2" id="about-heading">Over Omroep Abe</h2>',
    ])
  })

  it('has the description of the podcast from the register, as text, before the links', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({
      ...everything,
      about: { ...bothAddresses, description: 'Elke week & <b>vet</b> gepraat.' },
      selected: [abe],
    })

    const sidebar = sidebarOf(await render({ podcast: 'omroep-abe' }))

    expect(sidebar).toContain('<p>Elke week &amp; &lt;b&gt;vet&lt;/b&gt; gepraat.</p>')
    expect(sidebar).not.toContain('<b>')
    expect(sidebar.indexOf('gepraat')).toBeLessThan(sidebar.indexOf('Luister ook op'))
  })

  it('has "Luister ook op" and a list with a text link for each address, named after the podcast', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({ ...everything, about: bothAddresses, selected: [abe] })

    const sidebar = withoutIcons(sidebarOf(await render({ podcast: 'omroep-abe' })))

    expect(sidebar).toContain(
      '<p>Luister ook op</p><ul role="list"><li><a href="https://podcasts.apple.com/nl/podcast/omroep-abe/id1"><span class="hf-visually-hidden">Omroep Abe op </span>Apple Podcasts</a></li><li><a href="https://open.spotify.com/show/abc"><span class="hf-visually-hidden">Omroep Abe op </span>Spotify</a></li></ul>',
    )
    expect(sidebar).not.toContain('target=')
  })

  it('draws the icon for a link to another site behind each address, hidden from screen readers, and the link is still named after the podcast', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({ ...everything, about: bothAddresses, selected: [abe] })

    const sidebar = sidebarOf(await render({ podcast: 'omroep-abe' }))
    const links = [...sidebar.matchAll(/<a href="[^"]*">(.*?)<\/a>/g)].map(([, content]) => content ?? '')

    expect(links).toHaveLength(2)
    expect(links[0]).toMatch(
      /Omroep Abe op <\/span>Apple <span class="hf-icon-tail">Podcasts<svg aria-hidden="true" class="hf-icon"/,
    )
    expect(links[1]).toMatch(
      /Omroep Abe op <\/span><span class="hf-icon-tail">Spotify<svg aria-hidden="true" class="hf-icon"/,
    )
    expect(links.map((content) => content.replace(/<svg.*?<\/svg>/, '').replace(/<[^>]*>/g, ''))).toEqual([
      'Omroep Abe op Apple Podcasts',
      'Omroep Abe op Spotify',
    ])
  })

  it('has one item when the podcast has one address', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({
      ...everything,
      about: { ...bothAddresses, spotifyUrl: null },
      selected: [abe],
    })

    const sidebar = withoutIcons(sidebarOf(await render({ podcast: 'omroep-abe' })))

    expect(sidebar.match(/<li>/g)).toHaveLength(1)
    expect(sidebar).toContain('Apple Podcasts')
    expect(sidebar).not.toContain('Spotify')
  })

  it('has the description alone when the podcast has no address: no line and no list', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({
      ...everything,
      about: { ...bothAddresses, applePodcastsUrl: null, spotifyUrl: null },
      selected: [abe],
    })

    const sidebar = sidebarOf(await render({ podcast: 'omroep-abe' }))

    expect(sidebar).toContain('De podcast van de Leeuwarder Courant over sc Heerenveen.')
    expect(sidebar).not.toContain('Luister ook op')
    expect(sidebar).not.toContain('<ul')
  })

  it('has the addresses alone when the podcast has no description', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({
      ...everything,
      about: { ...bothAddresses, description: null },
      selected: [abe],
    })

    const sidebar = sidebarOf(await render({ podcast: 'omroep-abe' }))

    expect(sidebar).toContain('Luister ook op')
    expect(sidebar.match(/<p>/g)).toHaveLength(1)
  })

  it('has only the h2 when the podcast has no description and no address', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({
      ...everything,
      about: { applePodcastsUrl: null, description: '', name: 'Omroep Abe', spotifyUrl: null },
      selected: [abe],
    })

    const sidebar = sidebarOf(await render({ podcast: 'omroep-abe' }))

    expect(sidebar).toContain('Over Omroep Abe')
    expect(sidebar).not.toContain('<p>')
  })

  it('is not there for all podcasts or for more than one, and the line "Luister ook op" is no longer under the h1', async () => {
    const html = await render()

    expect(html).not.toContain('<section')
    expect(html).not.toContain('Luister ook')

    vi.mocked(getPodcastPage).mockResolvedValue({
      ...everything,
      podcasts: [...podcasts, { name: 'Zondag Zes', slug: 'zondag-zes' }],
      selected: [abe, camataru],
    })

    expect(await render({ podcast: ['omroep-abe', 'radio-camataru'] })).not.toContain('Over ')
  })

  it('does not put the line under the h1 either when a podcast is chosen', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({ ...everything, about: bothAddresses, selected: [abe] })

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
    expect(withoutIcons(html)).toContain(
      '<a class="hf-pagination-link hf-pagination-next" href="/podcasts?pagina=2" rel="next">Volgende</a>',
    )
    expect(html).not.toContain('Vorige')
  })

  it('has both links in the middle, and the link back to the first page has no parameter', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue(many)

    const second = withoutIcons(await render({ pagina: '2' }))

    expect(second).toContain('Pagina 2 van 9')
    expect(second).toContain('href="/podcasts" rel="prev">Vorige')
    expect(second).toContain('href="/podcasts?pagina=3" rel="next">Volgende')
    expect(getPodcastPage).toHaveBeenCalledExactlyOnceWith([], 2)
  })

  it('has a link to the previous page and none to a next page on the last page', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue(many)

    const html = withoutIcons(await render({ pagina: '9' }))

    expect(html).toContain('href="/podcasts?pagina=8" rel="prev">Vorige')
    expect(html).not.toContain('Volgende')
  })

  it('draws an arrow to the left in front of "Vorige" and an arrow to the right behind "Volgende", hidden from screen readers', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue(many)

    const html = await render({ pagina: '2' })
    const previous = html.match(/<a class="hf-pagination-link hf-pagination-previous".*?<\/a>/)?.[0] ?? ''
    const next = html.match(/<a class="hf-pagination-link hf-pagination-next".*?<\/a>/)?.[0] ?? ''

    expect(previous).toMatch(
      /rel="prev"><span class="hf-icon-head"><svg aria-hidden="true" class="hf-icon"[^>]*><path d="M13.5 8h-11"><\/path>.*<\/svg>Vorige<\/span><\/a>$/,
    )
    expect(next).toMatch(
      /rel="next"><span class="hf-icon-tail">Volgende<svg aria-hidden="true" class="hf-icon"[^>]*><path d="M2.5 8h11"><\/path>.*<\/svg><\/span><\/a>$/,
    )
  })

  it('keeps the podcast in the addresses of the pages', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue({ ...many, about: bothAddresses, selected: [abe] })

    const html = withoutIcons(await render({ pagina: '2', podcast: 'omroep-abe' }))

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
    ['a podcast given twice', { podcast: ['omroep-abe', 'omroep-abe'] }],
    ['a podcast given twice, next to another', { podcast: ['omroep-abe', 'radio-camataru', 'omroep-abe'] }],
  ])('gives the page niet gevonden for %s, without asking the data', async (_, query) => {
    await expect(render(query)).rejects.toEqual(notFound)
    await expect(generateMetadata(props(query))).rejects.toEqual(notFound)
    expect(getPodcastPage).not.toHaveBeenCalled()
  })

  it('gives the page niet gevonden for an empty podcast, because that is no podcast', async () => {
    vi.mocked(getPodcastPage).mockResolvedValue(undefined)

    await expect(render({ podcast: '' })).rejects.toEqual(notFound)
    expect(getPodcastPage).toHaveBeenCalledExactlyOnceWith([''], 1)
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

  it('gives each page and each choice of podcasts its own canonical address, in the order of the list, so search engines keep them apart', async () => {
    vi.stubEnv('SITE_ENV', 'production')

    const three = [...podcasts, { name: 'Zondag Zes', slug: 'zondag-zes' }]
    const canonical = async (query: Query, content: Content = everything) => {
      vi.mocked(getPodcastPage).mockResolvedValue(content)

      return (await generateMetadata(props(query))).alternates?.canonical
    }

    expect(await canonical({})).toBe('https://sc.heerenveen.org/podcasts')
    expect(await canonical({ pagina: '1' })).toBe('https://sc.heerenveen.org/podcasts')
    expect(await canonical({ pagina: '2' })).toBe('https://sc.heerenveen.org/podcasts?pagina=2')
    expect(await canonical({ podcast: 'omroep-abe' }, { ...everything, selected: [abe] })).toBe(
      'https://sc.heerenveen.org/podcasts?podcast=omroep-abe',
    )
    expect(await canonical({ pagina: '2', podcast: 'omroep-abe' }, { ...everything, selected: [abe] })).toBe(
      'https://sc.heerenveen.org/podcasts?podcast=omroep-abe&pagina=2',
    )
    expect(
      await canonical(
        { podcast: ['radio-camataru', 'omroep-abe'] },
        { ...everything, podcasts: three, selected: [abe, camataru] },
      ),
    ).toBe('https://sc.heerenveen.org/podcasts?podcast=omroep-abe&podcast=radio-camataru')
    // Every podcast is the page of all podcasts, and so is its address.
    expect(await canonical({ podcast: ['omroep-abe', 'radio-camataru'] })).toBe('https://sc.heerenveen.org/podcasts')
    expect((await generateMetadata(props({ pagina: '2' }))).openGraph?.url).toBe(
      'https://sc.heerenveen.org/podcasts?pagina=2',
    )
  })

  it('titles a later page with its number', async () => {
    vi.stubEnv('SITE_ENV', 'production')

    expect((await generateMetadata(props({ pagina: '2' }))).title).toBe('Podcasts, pagina 2')
    expect((await generateMetadata(props({ pagina: '1' }))).title).toBe('Podcasts')
  })

  it('names the podcasts that are chosen in the title, before the page', async () => {
    vi.stubEnv('SITE_ENV', 'production')

    const three = [...podcasts, { name: 'Zondag Zes', slug: 'zondag-zes' }]

    vi.mocked(getPodcastPage).mockResolvedValue({ ...everything, selected: [abe] })

    expect((await generateMetadata(props({ podcast: 'omroep-abe' }))).title).toBe('Podcasts van Omroep Abe')

    vi.mocked(getPodcastPage).mockResolvedValue({ ...everything, podcasts: three, selected: [abe, camataru] })

    expect((await generateMetadata(props({ pagina: '3', podcast: ['omroep-abe', 'radio-camataru'] }))).title).toBe(
      'Podcasts van Omroep Abe en Radio Camataru, pagina 3',
    )
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
