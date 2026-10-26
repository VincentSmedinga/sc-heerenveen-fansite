import type { PublicDiscussion, PublicEpisode, PublicItem } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getNewestArticle } from '../articles'
import { getDiscussions } from '../discussions'
import { getHeadlines } from '../headlines'
import { getMatchData, type MatchData } from '../matches'
import { getLatestEpisodes } from '../podcasts'
import { matchData } from '../test-matches'
import { withoutIcons } from '../without-icons'
import HomePage, { generateMetadata } from './page'

// Only the query is replaced: the check of the number in the address is the real one.
vi.mock('../headlines', async (importOriginal) => ({ ...(await importOriginal<object>()), getHeadlines: vi.fn() }))
vi.mock('../articles', () => ({ getNewestArticle: vi.fn() }))
vi.mock('../discussions', () => ({ getDiscussions: vi.fn() }))
vi.mock('../podcasts', () => ({ getLatestEpisodes: vi.fn() }))
// The query is replaced; the split into the next match and the results is the real one.
vi.mock('../matches', async (importOriginal) => ({ ...(await importOriginal<object>()), getMatchData: vi.fn() }))

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

// Made up, like the screen names. The moment of now is the afternoon of Friday 23 October 2026
// in the Netherlands.
const now = new Date('2026-10-23T13:40:00Z')

const discussions: PublicDiscussion[] = [
  {
    lastPostedAt: new Date('2026-10-23T11:28:21Z'),
    lastPostedBy: 'Buffon1',
    replyCount: 83,
    title: 'Wie wint er zondag?',
    url: 'https://forum.test/d/41-wie-wint-zondag',
  },
  {
    lastPostedAt: new Date('2026-10-21T19:45:00Z'),
    lastPostedBy: 'Tribunetijger',
    replyCount: 1,
    title: 'Nieuwe spits & <b>gezocht</b>',
    url: 'https://forum.test/d/37-nieuwe-spits-gezocht',
  },
  {
    lastPostedAt: new Date('2026-10-10T08:10:00Z'),
    lastPostedBy: null,
    replyCount: 0,
    title: 'Het stadion in de winter',
    url: 'https://forum.test/d/12-het-stadion-in-de-winter',
  },
]

/** A season without matches, a table or a page that was read: the importer has not run yet. */
const noMatchData: MatchData = { matches: [], pages: [], season: '2026/27', standings: [] }

async function render(query: Record<string, string | string[]> = {}) {
  return renderToStaticMarkup(await HomePage({ searchParams: Promise.resolve(query) }))
}

/** The card with the discussions of the forum alone. */
async function renderDiscussions() {
  const html = await renderSidebar()
  const start = html.indexOf('<section class="hf-card" aria-labelledby="discussions-heading">')

  return html.slice(start, html.indexOf('<section class="hf-card" aria-labelledby="episodes-heading">'))
}

/** The main column alone: the news, without the sidebar. */
async function renderMain() {
  const html = await render()

  return html.slice(0, html.indexOf('</main>') + '</main>'.length)
}

/** The sidebar alone: the discussions of the forum and the podcast episodes. */
async function renderSidebar() {
  const html = await render()

  return html.slice(html.indexOf('<aside'))
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.mocked(getHeadlines).mockReset()
  vi.mocked(getNewestArticle).mockReset()
  vi.mocked(getNewestArticle).mockResolvedValue(undefined)
  vi.mocked(getDiscussions).mockReset()
  vi.mocked(getDiscussions).mockResolvedValue([])
  vi.mocked(getLatestEpisodes).mockReset()
  vi.mocked(getLatestEpisodes).mockResolvedValue([])
  vi.mocked(getMatchData).mockReset()
  vi.mocked(getMatchData).mockResolvedValue(noMatchData)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the homepage', () => {
  it('has one h1, for screen readers only, and an h2 for the news, the discussions, the podcasts, the matches and the table, and no heading for a day', async () => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: false })

    const html = await render()

    // The logo in the header shows the name of the site, so the h1 is hidden from the eye, not
    // from a screen reader.
    expect(html.match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual([
      '<h1 class="hf-heading-1 hf-visually-hidden">sc Heerenveen Fansite</h1>',
      '<h2 class="hf-heading-2" id="media-heading">Laatste nieuws</h2>',
      '<h2 class="hf-heading-2" id="discussions-heading">Nieuwste discussies</h2>',
      '<h2 class="hf-heading-2" id="episodes-heading">Nieuwste podcasts</h2>',
      '<h2 class="hf-heading-2" id="matches-heading">Wedstrijden</h2>',
      '<h2 class="hf-heading-2" id="standings-heading">Stand</h2>',
    ])
  })

  it('is the one main of the page, with the h1 and the news in a card', async () => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: false })

    const html = await render()

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).toMatch(
      /^<main class="hf-page-main"><h1 class="hf-heading-1 hf-visually-hidden">sc Heerenveen Fansite<\/h1><section class="hf-card" aria-labelledby="media-heading">.*<\/section><\/main><aside/,
    )
  })

  it('puts the h2 and the headlines in the card, which takes its name from the h2', async () => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: false })

    const html = await renderMain()
    const cards = html.match(/<section.*?<\/section>/g) ?? []

    expect(cards).toHaveLength(1)
    expect(cards[0]).toContain('<h2 class="hf-heading-2" id="media-heading">Laatste nieuws</h2>')
    expect(cards[0]?.match(/<li id="nieuws-\d+">/g)).toHaveLength(3)
    // The h1 is a cell of its own, outside the card.
    expect(cards[0]).not.toContain('<h1')
  })

  it('shows each headline as a link to the item at the source, with the day and the time before it and the source under it', async () => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: false })

    const html = await render()

    expect(html).toMatch(
      new RegExp(
        '<li id="nieuws-1"><div class="hf-news-item"><div class="hf-news-item-layout"><time class="hf-meta hf-news-item-time" dateTime="2026-10-22T08:15:00.000Z">do 10:15</time>' +
          '<div class="hf-news-item-body"><a class="hf-headline hf-news-item-headline" href="https://testkrant.test/heerenveen-testclub">Heerenveen houdt Testclub op afstand</a>' +
          '<p class="hf-meta hf-news-item-meta"><span>Testkrant</span><svg [^>]*aria-hidden="true"[^>]*>.*?</svg></p></div></div></div></li>',
      ),
    )
  })

  it('shows the short day and the time in Dutch time, with the full time in the time element', async () => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: false })

    const html = await render()

    expect(html).toContain(
      '<time class="hf-meta hf-news-item-time" dateTime="2026-10-21T12:05:00.000Z">wo 14:05</time>',
    )
    expect(html).toContain(
      '<time class="hf-meta hf-news-item-time" dateTime="2026-10-21T09:00:00.000Z">wo 11:00</time>',
    )
  })

  it('shows the date and the time for an item from before the last seven days, and the weekday for the six days before today', async () => {
    vi.mocked(getHeadlines).mockResolvedValue({
      headlines: [
        { ...headlines[0]!, publishedAt: new Date('2026-10-17T07:30:00Z') },
        { ...headlines[1]!, publishedAt: new Date('2026-10-16T12:05:00Z') },
        { ...headlines[2]!, publishedAt: new Date('2026-10-10T21:59:00Z') },
      ],
      more: false,
    })

    const html = await render()

    expect(html).toContain('dateTime="2026-10-17T07:30:00.000Z">za 09:30</time>')
    expect(html).toContain('dateTime="2026-10-16T12:05:00.000Z">16 okt 14:05</time>')
    expect(html).toContain('dateTime="2026-10-10T21:59:00.000Z">10 okt 23:59</time>')
  })

  it('puts "voor abonnees" in text with an item behind the paywall, and with no other item', async () => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: false })

    const html = await render()

    expect(html.match(/voor abonnees/g)).toHaveLength(1)
    expect(html).toContain('<span>voor abonnees</span>')
    expect(html.indexOf('voor abonnees')).toBeGreaterThan(html.indexOf('jonge garde'))
    expect(html.indexOf('voor abonnees')).toBeLessThan(html.indexOf('Trainer verwacht'))
  })

  it('names the source as the query gives it, and shows the headline as the source published it', async () => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: false })

    const html = await render()

    expect(html).toContain('<span>Voorbeeldkrant, met dank aan de redactie</span>')
    // Escaped, not parsed: the headline is text, also when a source puts tags in it.
    expect(html).toContain('SC Heerenveen &amp; de “jonge garde”: &lt;b&gt;zo gaat het verder&lt;/b&gt;')
    expect(html).not.toContain('<b>')
  })

  it('opens the links in the same tab', async () => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: false })

    expect(await render()).not.toContain('target=')
  })

  it('shows the items in one list, in the order the query gives them, with no heading for a day', async () => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: false })

    const html = await renderMain()

    expect(html.match(/<ul/g)).toHaveLength(1)
    expect(html).toContain('<ul role="list">')
    expect(html.match(/<li id="nieuws-\d+">/g)).toHaveLength(3)
    expect(html).not.toContain('<h3')
    expect(html.indexOf('Heerenveen houdt Testclub')).toBeLessThan(html.indexOf('jonge garde'))
    expect(html.indexOf('jonge garde')).toBeLessThan(html.indexOf('Trainer verwacht'))
  })

  it('shows nothing of a source but the headline, the link, the name, the day and time and the paywall', async () => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: false })

    const html = await renderMain()

    expect(html).not.toMatch(/<(img|picture|iframe|video|audio|script|image|use)/)
    expect(html).not.toMatch(/(src|srcset|poster)=/)
    // The only svg is our own icon for a link to another site, hidden from assistive
    // technology, one for each item.
    expect(html.match(/<svg /g)).toHaveLength(3)
    expect(html.match(/<svg [^>]*aria-hidden="true"/g)).toHaveLength(3)
    // The only addresses are the links of the items.
    expect([...html.matchAll(/href="([^"]*)"/g)].map(([, href]) => href)).toEqual([
      'https://testkrant.test/heerenveen-testclub',
      'https://voorbeeldkrant.test/jonge-garde',
      'https://testkrant.test/basis',
    ])
  })

  it('has no text under the news about the sources, nor a link to them, and the old text is gone', async () => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: false })

    const html = await renderMain()

    expect(html).not.toContain('Welke media we volgen')
    expect(html).not.toContain('Onze bronnen')
    expect(html).not.toContain('href="/bronnen"')
    expect(html).not.toContain('Binnenkort meer')
  })

  it('tells visitors there is no news yet, without a heading for a day', async () => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines: [], more: false })

    const html = await renderMain()

    expect(html).toContain('<h2 class="hf-heading-2" id="media-heading">Laatste nieuws</h2>')
    expect(html).toContain('<p>We hebben nog geen nieuws gevonden. Kijk straks nog eens.</p>')
    expect(html.match(/<section/g)).toHaveLength(1)
    expect(html).not.toContain('<h3')
    expect(html).not.toContain('<ul')
  })

  it('titles the page with the name of the site, describes it and lets search engines in', async () => {
    vi.stubEnv('SITE_ENV', 'acceptance')
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: false })

    const metadata = await generateMetadata({ searchParams: Promise.resolve({}) })

    expect(metadata).toMatchObject({
      alternates: { canonical: 'https://acc.sc.heerenveen.org/' },
      description: expect.stringMatching(/^Alle koppen en links over sc Heerenveen/),
      openGraph: { title: 'sc Heerenveen Fansite', url: 'https://acc.sc.heerenveen.org/' },
    })
    expect(metadata).not.toHaveProperty('title')
    expect(metadata).not.toHaveProperty('robots')
  })
})

describe('the button that loads five more headlines', () => {
  beforeEach(() => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: true })
  })

  it('asks for the first ten headlines without a number in the address', async () => {
    await render()

    expect(getHeadlines).toHaveBeenCalledExactlyOnceWith(10)
  })

  it.each([
    ['10', 10],
    ['15', 15],
    ['20', 20],
    ['100', 100],
  ])('asks for %s headlines for ?nieuws=%s', async (value, count) => {
    await render({ nieuws: value })

    expect(getHeadlines).toHaveBeenCalledExactlyOnceWith(count)
  })

  it.each(['0', '4', '5', '7', '12', '-5', '5.5', '1e1', '010', '105', '1000', 'abc', ''])(
    'asks for the first ten headlines for ?nieuws=%j, which is not a valid number',
    async (value) => {
      await render({ nieuws: value })

      expect(getHeadlines).toHaveBeenCalledExactlyOnceWith(10)
    },
  )

  it('asks for the first ten headlines when the number is given twice', async () => {
    await render({ nieuws: ['10', '15'] })

    expect(getHeadlines).toHaveBeenCalledExactlyOnceWith(10)
  })

  it('shows a real button "Laad 5 meer" under the list, in the card, when there are older headlines', async () => {
    const html = await renderMain()
    const card = html.match(/<section.*?<\/section>/)?.[0] ?? ''

    expect(card).toMatch(
      /<\/ul><form class="hf-form" noValidate="" action="\/#nieuws-4" method="get"><button class="hf-button-soft" type="submit" value="15" name="nieuws"><span class="hf-icon-head"><svg [^>]*class="hf-icon"[^>]*>.*?<\/svg>Laad<\/span> 5 meer<\/button><\/form><\/section>$/,
    )
  })

  it('draws a plus in front of the text of the button, hidden from screen readers, and the button is still named "Laad 5 meer"', async () => {
    const html = await renderMain()
    const button = html.match(/<button.*?<\/button>/)?.[0] ?? ''

    expect(button).toMatch(/^<button [^>]*><span class="hf-icon-head"><svg aria-hidden="true"/)
    expect(button.match(/<svg /g)).toHaveLength(1)
    expect(button.replace(/<svg.*?<\/svg>/, '').replace(/<[^>]*>/g, '')).toBe('Laad 5 meer')
  })

  it('gives each headline an id with its number, and sends the button to the first new headline', async () => {
    const html = await renderMain()

    expect(html.match(/<li id="nieuws-\d+">/g)).toEqual([
      '<li id="nieuws-1">',
      '<li id="nieuws-2">',
      '<li id="nieuws-3">',
    ])
    // With three headlines on the page, the first new one is the fourth: the page that loads
    // again has it.
    expect(html).toContain('action="/#nieuws-4"')
  })

  it('has the button ask for the number after the one in the address', async () => {
    expect(await render()).toContain('value="15" name="nieuws"')
    expect(await render({ nieuws: '15' })).toContain('value="20" name="nieuws"')
    expect(await render({ nieuws: '95' })).toContain('value="100" name="nieuws"')
  })

  it('shows no button when there are no older headlines', async () => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: false })

    const html = await render()

    expect(html).not.toContain('<button')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('Laad')
  })

  it('needs no script and no address of an API: the only form is a GET form to the card', async () => {
    const html = await render()

    expect(html.match(/<form/g)).toHaveLength(1)
    expect(html).not.toContain('<script')
    expect(html).not.toContain('/api/')
    expect(html).not.toContain('method="post"')
  })

  it('has the homepage itself as canonical address, whatever the number in the address', async () => {
    vi.stubEnv('SITE_ENV', 'acceptance')

    const metadata = await generateMetadata({ searchParams: Promise.resolve({ nieuws: '15' }) })

    expect(metadata).toMatchObject({
      alternates: { canonical: 'https://acc.sc.heerenveen.org/' },
      openGraph: { url: 'https://acc.sc.heerenveen.org/' },
    })
    expect(metadata).not.toHaveProperty('robots')
    expect(getHeadlines).toHaveBeenCalledWith(15)
  })
})

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
  {
    durationSeconds: 4320,
    episodeNumber: null,
    publishedAt: new Date('2026-10-12T10:00:00Z'),
    seasonNumber: null,
    sourceName: 'Proefpodcast',
    title: 'Aflevering 11',
    url: 'https://proefpodcast.test/e/11',
  },
  {
    durationSeconds: null,
    episodeNumber: null,
    publishedAt: new Date('2025-12-30T10:00:00Z'),
    seasonNumber: null,
    sourceName: 'Testpodcast',
    title: 'Aflevering 1',
    url: 'https://testpodcast.test/e/1',
  },
]

/** The block of podcasts alone: the second card of the sidebar. */
async function renderEpisodes() {
  const html = await renderSidebar()

  return html.slice(html.indexOf('<section class="hf-card" aria-labelledby="episodes-heading">'))
}

describe('the podcast episodes in the sidebar of the homepage', () => {
  beforeEach(() => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines: [], more: false })
  })

  it('puts the block under the forum, named by its h2, with the link to all podcasts under the list', async () => {
    vi.mocked(getLatestEpisodes).mockResolvedValue(episodes)

    const html = await renderSidebar()

    expect(html.indexOf('discussions-heading')).toBeLessThan(html.indexOf('episodes-heading'))
    expect(await renderEpisodes()).toMatch(
      /^<section class="hf-card" aria-labelledby="episodes-heading"><h2 class="hf-heading-2" id="episodes-heading">Nieuwste podcasts<\/h2><ul role="list">.*<\/ul><p><a href="\/podcasts">Alle <span class="hf-icon-tail">podcasts<svg [^>]*class="hf-icon"[^>]*>.*?<\/svg><\/span><\/a><\/p><\/section><section class="hf-card" aria-labelledby="matches-heading">/,
    )
  })

  it('draws an arrow to the right behind "Alle podcasts", hidden from screen readers, and no icon for the external link', async () => {
    const html = await renderEpisodes()
    const link = html.match(/<a href="\/podcasts">.*?<\/a>/)?.[0] ?? ''

    expect(link).toContain('<path d="M2.5 8h11"></path><path d="M9 3.5 13.5 8 9 12.5"></path>')
    expect(link).toContain('aria-hidden="true"')
    expect(link.replace(/<[^>]*>/g, '')).toBe('Alle podcasts')
  })

  it('shows each episode as a link to its page at the maker, with the name of the podcast', async () => {
    vi.mocked(getLatestEpisodes).mockResolvedValue(episodes)

    const html = await renderEpisodes()

    expect(html.match(/<li>/g)).toHaveLength(3)
    expect(html).toContain('href="https://testpodcast.test/e/12"')
    expect(html).toContain('Testpodcast')
    expect(html).toContain('Proefpodcast')
  })

  it('shows a weekday and the time for this week, and the date, with the year when it is not this year, before that', async () => {
    vi.mocked(getLatestEpisodes).mockResolvedValue(episodes)

    const html = await renderEpisodes()

    expect(html).toContain('do 12:00')
    expect(html).toContain('12 okt')
    expect(html).toContain('30 dec 2025')
  })

  it('shows the season, the number and the duration of an episode after the name, for what the feed gave', async () => {
    vi.mocked(getLatestEpisodes).mockResolvedValue(episodes)

    const html = await renderEpisodes()

    expect(html).toContain('<span>seizoen 9, aflevering 16</span>')
    expect(html).toContain('<span>49 min</span>')
    expect(html).toContain('<span>1 uur 12 min</span>')
    expect(html.match(/aflevering \d+/g)).toHaveLength(1)
    expect(html.match(/ min<|uur<\/span>/g)).toHaveLength(2)
  })

  it('shows a title as text, escaped', async () => {
    vi.mocked(getLatestEpisodes).mockResolvedValue(episodes)

    const html = await renderEpisodes()

    expect(html).toContain('Aflevering 12 &amp; &lt;b&gt;de winterstop&lt;/b&gt;')
    expect(html).not.toContain('<b>de winterstop')
  })

  it('shows nothing of an episode but the title, the link, the name and the time', async () => {
    vi.mocked(getLatestEpisodes).mockResolvedValue(episodes)

    const html = await renderEpisodes()

    expect(html).not.toMatch(/<img|<audio|<iframe|\.mp3/)
  })

  it('says there are no episodes yet, with the link to all podcasts under it', async () => {
    const html = await renderEpisodes()

    expect(withoutIcons(html)).toContain(
      '<p>We hebben nog geen podcastafleveringen gevonden.</p><p><a href="/podcasts">Alle podcasts</a></p>',
    )
  })

  it('shows the error page when only the episodes can not be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: false })
    vi.mocked(getLatestEpisodes).mockRejectedValue(new Error('Failed query'))

    const html = await render()

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Er ging iets mis</h1>'])
    expect(html).not.toContain('Nieuwste podcasts')
  })
})

describe('the discussions in the sidebar of the homepage', () => {
  beforeEach(() => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: false })
    vi.mocked(getDiscussions).mockResolvedValue(discussions)
  })

  it('puts the block in the sidebar beside the news, named by its h2', async () => {
    const html = await render()

    expect(html.match(/<aside/g)).toHaveLength(1)
    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('<aside'))
    expect(withoutIcons(await renderSidebar())).toMatch(
      /^<aside class="hf-page-sidebar" aria-label="Het forum, de podcasts en de wedstrijden"><section class="hf-card" aria-labelledby="discussions-heading"><h2 class="hf-heading-2" id="discussions-heading">Nieuwste discussies<\/h2><ul role="list">.*<\/ul><p><a href="https:\/\/forum.heerenveen.org">Naar het forum<\/a><\/p><\/section><section class="hf-card" aria-labelledby="episodes-heading">.*<\/section><section class="hf-card" aria-labelledby="matches-heading">.*<\/section><section class="hf-card" aria-labelledby="standings-heading">.*<\/section><\/aside>$/,
    )
  })

  it('shows each discussion as a link to the forum with the replies, the last poster and the time', async () => {
    const html = await renderDiscussions()

    expect(html.match(/<li>/g)).toHaveLength(3)
    expect(html).toContain(
      '<a class="hf-headline hf-discussion-item-title" href="https://forum.test/d/41-wie-wint-zondag">Wie wint er zondag?</a>',
    )
    expect(html).toContain('<span>83 reacties</span>')
    expect(html).toContain(
      '<span>laatst Buffon1</span> <span aria-hidden="true">·</span> <time dateTime="2026-10-23T11:28:21.000Z">13:28</time>',
    )
  })

  it('shows today as the time alone, the days before as the weekday and the time, and older ones as the date', async () => {
    const html = await renderDiscussions()

    expect(html).toContain('<time dateTime="2026-10-23T11:28:21.000Z">13:28</time>')
    expect(html).toContain('<time dateTime="2026-10-21T19:45:00.000Z">wo 21:45</time>')
    expect(html).toContain('<time dateTime="2026-10-10T08:10:00.000Z">10 okt</time>')
  })

  it('writes "1 reactie" and "0 reacties", and only the time when the last poster is not known', async () => {
    const html = await renderDiscussions()

    expect(html).toContain('<span>1 reactie</span>')
    expect(html).toContain('<span>0 reacties</span>')
    expect(html).toContain('<span>laatst</span> <time dateTime="2026-10-10T08:10:00.000Z">')
  })

  it('shows a title as text, escaped, and the addresses as our database has them', async () => {
    const html = await renderDiscussions()

    expect(html).toContain('Nieuwe spits &amp; &lt;b&gt;gezocht&lt;/b&gt;')
    expect(html).not.toContain('<b>')
    expect([...html.matchAll(/href="([^"]*)"/g)].map(([, href]) => href)).toEqual([
      'https://forum.test/d/41-wie-wint-zondag',
      'https://forum.test/d/37-nieuwe-spits-gezocht',
      'https://forum.test/d/12-het-stadion-in-de-winter',
      'https://forum.heerenveen.org',
    ])
    expect(html).not.toContain('target=')
  })

  it('draws the icon for a link to another site behind "Naar het forum", hidden from screen readers', async () => {
    const html = await renderDiscussions()
    const link = html.match(/<a href="https:\/\/forum\.heerenveen\.org">.*?<\/a>/)?.[0] ?? ''

    expect(link).toMatch(
      /^<a href="[^"]*">Naar het <span class="hf-icon-tail">forum<svg aria-hidden="true" class="hf-icon"/,
    )
    expect(link).toContain('<path d="M9.5 2.5h4v4"></path>')
    expect(link.replace(/<[^>]*>/g, '')).toBe('Naar het forum')
    expect(html.match(/<svg /g)).toHaveLength(1)
  })

  it('loads nothing from the forum: no image, avatar, frame or script, and only links', async () => {
    const html = withoutIcons(await renderDiscussions())

    expect(html).not.toMatch(/<(img|picture|iframe|video|audio|script|image|use|svg|link|source)/)
    expect(html).not.toMatch(/(src|srcset|poster)=/)
  })

  it('shows the screen name as text, with no link', async () => {
    const html = await renderDiscussions()

    expect(html).not.toMatch(/<a [^>]*>[^<]*(Buffon1|Tribunetijger)/)
    expect(html.match(/<a /g)).toHaveLength(discussions.length + 1)
  })

  it('says there are no discussions yet, with the link to the forum under it', async () => {
    vi.mocked(getDiscussions).mockResolvedValue([])

    const html = withoutIcons(await renderDiscussions())

    expect(html).toContain('<h2 class="hf-heading-2" id="discussions-heading">Nieuwste discussies</h2>')
    expect(html).toContain('<p>We hebben nog geen discussies van het forum.</p>')
    expect(html).not.toContain('<ul')
    expect(html.indexOf('nog geen discussies')).toBeLessThan(html.indexOf('Naar het forum'))
    expect(html).toContain('<a href="https://forum.heerenveen.org">Naar het forum</a>')
  })

  it('shows the discussions when there is no news', async () => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines: [], more: false })

    const html = await render()

    expect(html).toContain('We hebben nog geen nieuws gevonden.')
    expect(html).toContain('Wie wint er zondag?')
  })
})

describe('the card with the newest article of the editors', () => {
  const article = {
    intro: 'Wij zijn de redactie van de Fansite & <b>dit</b> is wie we zijn.',
    publishedAt: new Date('2026-10-25T08:00:00Z'),
    slug: 'dit-zijn-wij',
    title: 'Dit zijn wij <i>allemaal</i>',
  }

  beforeEach(() => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: false })
  })

  it('puts the card at the top of the main column, above the news, after the h1', async () => {
    vi.mocked(getNewestArticle).mockResolvedValue(article)

    const html = await renderMain()

    expect(html).toMatch(
      /^<main class="hf-page-main"><h1 [^>]*>sc Heerenveen Fansite<\/h1><section class="hf-card hf-card-soft hf-article-card" aria-labelledby="[^"]+">.*?<\/section><section class="hf-card" aria-labelledby="media-heading">/,
    )
    expect(html.indexOf('Van de redactie')).toBeLessThan(html.indexOf('Laatste nieuws'))
  })

  it('has the h2 "Van de redactie" and the title as an h3 with a link to the page of the article', async () => {
    vi.mocked(getNewestArticle).mockResolvedValue(article)

    const html = withoutIcons(await renderMain())

    expect(html).toMatch(/<h2 class="hf-heading-2" id="[^"]+">Van de redactie<\/h2>/)
    expect(html).toContain(
      '<h3 class="hf-heading-3 hf-article-card-title"><a href="/redactie/dit-zijn-wij">Dit zijn wij &lt;i&gt;allemaal&lt;/i&gt;</a></h3>',
    )
  })

  it('shows the date, the intro and the link "Lees verder", as text', async () => {
    vi.mocked(getNewestArticle).mockResolvedValue(article)

    const html = withoutIcons(await renderMain())

    expect(html).toContain('<time dateTime="2026-10-25">25 oktober 2026</time>')
    expect(html).toContain('Wij zijn de redactie van de Fansite &amp; &lt;b&gt;dit&lt;/b&gt; is wie we zijn.')
    expect(html).toContain(
      '<a aria-label="Lees verder over Dit zijn wij &lt;i&gt;allemaal&lt;/i&gt;" href="/redactie/dit-zijn-wij">Lees verder</a>',
    )
  })

  it('leaves the card out when there is no published article', async () => {
    vi.mocked(getNewestArticle).mockResolvedValue(undefined)

    const html = await render()

    expect(html).not.toContain('Van de redactie')
    expect(html).not.toContain('/redactie/')
  })

  it('does not count in the headlines: the news is asked for and shown as before', async () => {
    vi.mocked(getNewestArticle).mockResolvedValue(article)

    const html = await render()

    expect(getHeadlines).toHaveBeenCalledWith(10)
    expect(html.match(/class="hf-news-item"/g)).toHaveLength(headlines.length)
  })

  it('shows the news without the card, and logs why, when only the article can not be read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getNewestArticle).mockRejectedValue(new Error('Failed query: select 1', { cause: new Error('boom') }))

    const html = await render()

    expect(html).toContain('Laatste nieuws')
    expect(html).not.toContain('Van de redactie')
    expect(error).toHaveBeenCalledExactlyOnceWith(
      'Could not read the newest article for the homepage: Failed query: select 1 (boom)',
    )
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
    expect(html).not.toContain('We hebben nog geen nieuws gevonden')
  })

  it('titles the page Er ging iets mis and keeps it out of the search engines', async () => {
    expect(await generateMetadata({ searchParams: Promise.resolve({}) })).toEqual({
      robots: { index: false },
      title: 'Er ging iets mis',
    })
  })

  it('shows the error page when only the discussions can not be read', async () => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: false })
    vi.mocked(getDiscussions).mockRejectedValue(failure)

    const html = await render()

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Er ging iets mis</h1>'])
    expect(html).not.toContain('Nieuwste discussies')
    expect(await generateMetadata({ searchParams: Promise.resolve({}) })).toEqual({
      robots: { index: false },
      title: 'Er ging iets mis',
    })
  })

  it('writes the reason to the log, without the values of the query', async () => {
    await render()

    expect(console.error).toHaveBeenCalledExactlyOnceWith(
      'Could not read the headlines, discussions and episodes for the homepage: Failed query: select 1 (connect ECONNREFUSED 127.0.0.1:3306)',
    )
  })
})

/** The card with the matches alone. */
async function renderMatchesCard() {
  const html = await renderSidebar()
  const start = html.indexOf('<section class="hf-card" aria-labelledby="matches-heading">')

  return html.slice(start, html.indexOf('<section class="hf-card" aria-labelledby="standings-heading">'))
}

/** The card with the table alone, the last of the sidebar. */
async function renderStandingsCard() {
  const html = await renderSidebar()

  return html.slice(html.indexOf('<section class="hf-card" aria-labelledby="standings-heading">'))
}

describe('the matches and the table in the sidebar of the homepage', () => {
  beforeEach(() => {
    vi.mocked(getHeadlines).mockResolvedValue({ headlines, more: false })
    vi.mocked(getDiscussions).mockResolvedValue(discussions)
    vi.mocked(getMatchData).mockResolvedValue(matchData)
  })

  it('puts the two cards at the bottom of the sidebar, under the discussions and the podcasts, and after the news', async () => {
    const html = await render()

    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('matches-heading'))
    expect(html.indexOf('episodes-heading')).toBeLessThan(html.indexOf('matches-heading'))
    expect(html.indexOf('matches-heading')).toBeLessThan(html.indexOf('standings-heading'))
    expect(html.match(/<aside/g)).toHaveLength(1)
    expect(html.lastIndexOf('<section')).toBe(
      html.indexOf('<section class="hf-card" aria-labelledby="standings-heading">'),
    )
  })

  it('shows the previous and the next match in one list of two, the previous first, with no h3', async () => {
    const html = await renderMatchesCard()

    expect(html.match(/<h3/g)).toBeNull()
    expect(html.match(/<ul/g)).toHaveLength(1)
    expect(html.match(/class="hf-match"/g)).toHaveLength(2)
    expect(html.indexOf('Tweede ronde')).toBeLessThan(html.indexOf('Speelronde 10'))
    expect(html).not.toContain('Speelronde 9')
    expect(html).not.toContain('Uitgesteld')
    expect(html).toContain('di 20 okt')
    expect(html).toContain('wo 28 okt 19:45')
  })

  it('shows only the next match when nothing is played yet', async () => {
    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      matches: matchData.matches.filter((match) => match.status === 'scheduled'),
    })

    const html = await renderMatchesCard()

    expect(html.match(/class="hf-match"/g)).toHaveLength(1)
    expect(html).toContain('Speelronde 10')
  })

  it('shows only the previous match when none is left to play, such as at the end of the season', async () => {
    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      matches: matchData.matches.filter((match) => match.status === 'played'),
    })

    const html = await renderMatchesCard()

    expect(html.match(/class="hf-match"/g)).toHaveLength(1)
    expect(html).toContain('Tweede ronde')
  })

  it('links the matches card to /wedstrijden with a name of its own, and the table to the table on that page', async () => {
    const matches = withoutIcons(await renderMatchesCard())
    const standings = withoutIcons(await renderStandingsCard())

    expect(matches).toContain('<p><a href="/wedstrijden">Alle wedstrijden</a></p>')
    expect(standings).toContain('<p><a href="/wedstrijden#stand">De volledige stand</a></p>')
  })

  it('shows three clubs of the table, sc Heerenveen in the middle, with the real positions and its row marked', async () => {
    const html = await renderStandingsCard()

    expect(html).toContain('<caption class="hf-visually-hidden">Stand op 18 oktober 2026</caption>')
    expect(html.match(/<th scope="row">[^<]*/g)).toEqual([
      '<th scope="row">Demo Boys',
      '<th scope="row">sc Heerenveen',
      '<th scope="row">Testdorp FC',
    ])
    expect(html.match(/<td class="hf-numeric hf-rank">\d/g)).toEqual([
      '<td class="hf-numeric hf-rank">1',
      '<td class="hf-numeric hf-rank">2',
      '<td class="hf-numeric hf-rank">3',
    ])
    expect(html.match(/<th class="hf-numeric" scope="col">/g)).toHaveLength(3)
    expect(html).not.toContain('role="region"')
    expect(html.match(/class="hf-highlight hf-standings-table-own"/g)).toHaveLength(1)
    expect(html).toContain(
      '<abbr title="Punten"><span aria-hidden="true">P</span><span class="hf-visually-hidden">punten</span></abbr>',
    )
    expect(html).not.toContain('hf-bar-legend')
  })

  it('has the columns position, played and points in the table, in the headers and in the row of sc Heerenveen', async () => {
    const html = await renderStandingsCard()
    const head = html.slice(html.indexOf('<thead>'), html.indexOf('</thead>'))
    const ours = html.slice(
      html.indexOf('hf-standings-table-own'),
      html.indexOf('</tr>', html.indexOf('hf-standings-table-own')),
    )

    expect([...head.matchAll(/<span aria-hidden="true">([^<]*)<\/span>/g)].map((match) => match[1])).toEqual([
      '#',
      'G',
      'P',
    ])
    expect([...ours.matchAll(/<td[^>]*>([^<]*)<\/td>/g)].map((match) => match[1])).toEqual(['2', '2', '6'])
    expect(html).not.toContain('class="hf-bar"')
  })

  it('shows only three clubs of a longer table, with sc Heerenveen in the middle', async () => {
    const [first, ours, other] = matchData.standings

    vi.mocked(getMatchData).mockResolvedValue({
      ...matchData,
      standings: [first!, other!, ours!, ...['Vier', 'Vijf', 'Zes'].map((club) => ({ ...other!, club }))].map(
        (row, index) => ({ ...row, position: index + 1 }),
      ),
    })

    const html = await renderStandingsCard()

    expect(html.match(/<th scope="row">[^<]*/g)).toEqual([
      '<th scope="row">Testdorp FC',
      '<th scope="row">sc Heerenveen',
      '<th scope="row">Vier',
    ])
  })

  it('has "Bron: Wikipedia" under each card, and nothing more: the full credit is on /wedstrijden', async () => {
    for (const html of [await renderMatchesCard(), await renderStandingsCard()]) {
      expect(html).toContain('<p class="hf-meta hf-wikipedia-credit">Bron: Wikipedia</p>')
      expect(html).not.toContain('CC BY-SA')
      expect(html).not.toContain('wikipedia.org')
    }
  })

  it('says in a sentence for visitors that there is no programme or table yet, with no credit', async () => {
    vi.mocked(getMatchData).mockResolvedValue(noMatchData)

    const matches = await renderMatchesCard()
    const standings = await renderStandingsCard()

    expect(matches).toContain('<p>We hebben het programma nog niet gevonden. Kijk straks nog eens.</p>')
    expect(standings).toContain('<p>We hebben de stand nog niet gevonden. Kijk straks nog eens.</p>')
    expect(matches).not.toContain('Bron: Wikipedia')
    expect(standings).not.toContain('Bron: Wikipedia')
  })

  it('shows the rest of the homepage, and logs why, when only the matches can not be read', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.stubEnv('SITE_ENV', 'production')
    vi.mocked(getMatchData).mockRejectedValue(new Error('Failed query: select 1', { cause: new Error('boom') }))

    const html = await render()

    expect(html).toContain('Laatste nieuws')
    expect(html).toContain('Nieuwste discussies')
    expect(html).not.toContain('matches-heading')
    expect(html).not.toContain('standings-heading')
    expect(error).toHaveBeenCalledExactlyOnceWith(
      'Could not read the matches and the table for the homepage: Failed query: select 1 (boom)',
    )
    expect(await generateMetadata({ searchParams: Promise.resolve({}) })).not.toHaveProperty('robots')
  })

  it('asks the matches for the homepage only once, and not again for the title', async () => {
    await render()

    expect(getMatchData).toHaveBeenCalledTimes(1)
  })

  it('loads nothing from another domain: no image, script or frame', async () => {
    const html = (await renderMatchesCard()) + (await renderStandingsCard())

    expect(html).not.toMatch(/<(?:img|script|iframe|link)\b/u)
  })
})
