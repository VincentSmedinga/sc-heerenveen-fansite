import type { PublicPlayer, PublicSearchHit } from '@fansite/db/queries'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { Squad } from '../../../search'

import { getSquad, searchSite } from '../../../search'
import { withoutIcons } from '../../../without-icons'
import SearchPage, { generateMetadata } from './page'

// Only the two queries are replaced: the checks of the search and the groups are the real ones.
vi.mock('../../../search', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getSquad: vi.fn(),
  searchSite: vi.fn(),
}))

// The afternoon of Monday 26 October 2026 in the Netherlands.
const now = new Date('2026-10-26T13:40:00Z')

const hits: PublicSearchHit[] = [
  {
    kind: 'article',
    publishedAt: new Date('2026-10-25T08:00:00Z'),
    slug: 'over-klaverboer',
    title: 'Over Klaverboer & <i>zijn</i> doelpunten',
  },
  {
    durationSeconds: 2944,
    episodeNumber: 120,
    kind: 'podcast',
    paywalled: false,
    publishedAt: new Date('2026-10-24T10:00:00Z'),
    seasonNumber: null,
    sourceName: 'Testpodcast',
    title: 'Aflevering met Klaverboer',
    url: 'https://podcast.test/e/120',
  },
  {
    kind: 'news',
    paywalled: true,
    publishedAt: new Date('2026-10-14T10:00:00Z'),
    sourceName: 'Testkrant',
    title: 'Klaverboer tekent bij',
    url: 'https://testkrant.test/klaverboer',
  },
] as unknown as PublicSearchHit[]

const player = (name: string, position: PublicPlayer['position'], searchTerm: string): PublicPlayer => ({
  name,
  position,
  searchTerm,
})

const squad: Squad = {
  page: {
    readAt: new Date('2026-10-25T12:05:00Z'),
    title: 'Sc Heerenveen in het seizoen 2026/27 (mannen)',
    version: 'Sun, 25 Oct 2026 10:30:00 GMT',
  },
  players: [
    player('Tjerk Brandsma', 'doelman', 'Brandsma'),
    player('Jurre van der Kooi', 'verdediger', 'van der Kooi'),
    player('Bernt Klaverboer', 'middenvelder', 'Klaverboer'),
    player('Dinho', 'aanvaller', 'Dinho'),
  ],
  season: '2026/27',
}

type Query = Record<string, string | string[] | undefined>

const props = (query: Query = {}) => ({ searchParams: Promise.resolve(query) })

async function render(query: Query = {}) {
  return withoutIcons(renderToStaticMarkup(await SearchPage(props(query))))
}

/** The sidebar alone, or an empty text when the page has none. */
const sidebarOf = (html: string) => (html.includes('<aside') ? html.slice(html.indexOf('<aside')) : '')

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  vi.stubEnv('SITE_ENV', 'production')
  vi.mocked(searchSite).mockReset()
  vi.mocked(searchSite).mockResolvedValue({ hits, total: 3 })
  vi.mocked(getSquad).mockReset()
  vi.mocked(getSquad).mockResolvedValue(squad)
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllEnvs()
})

describe('the page Zoeken without a search', () => {
  it('has one h1, a form with a label and a button, and no results', async () => {
    const html = await render()

    expect(html.match(/<h1[^>]*>.*?<\/h1>/g)).toEqual(['<h1 class="hf-heading-1">Zoeken</h1>'])
    expect(html).toContain('<label class="hf-field-label" for="zoek" id="zoek-label">Zoeken</label>')
    expect(html).toContain('<button')
    expect(html).toMatch(/>Zoek<\/button>/u)
    expect(html).not.toContain('resultaat')
    expect(html).not.toContain('resultaten')
    expect(html).not.toContain('id="resultaten"')
    expect(searchSite).not.toHaveBeenCalled()
  })

  it('is a GET form to /nieuws/zoeken with a field named q, so it works without JavaScript and can be shared', async () => {
    const html = await render()

    expect(html).toMatch(/<form[^>]*action="\/nieuws\/zoeken"[^>]*method="get"/u)
    expect(html).toMatch(/<input type="search"[^>]*name="q"/u)
    expect(html).toMatch(/<form[^>]*role="search"/u)
  })

  it('has the h1 and the sentence in the introduction, and the form in a blue card, so the players start level with it', async () => {
    const html = await render()

    expect(html.match(/<main/g)).toHaveLength(1)
    expect(html).toMatch(
      /<div class="hf-page-intro"><h1 class="hf-heading-1">Zoeken<\/h1><p class="hf-intro">.*?<\/p><\/div>/u,
    )
    expect(html).toMatch(/<div class="hf-page-cells"><div class="hf-card hf-card-soft"><form/u)
    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('<aside'))
  })
})

describe('the page Zoeken with a search', () => {
  it('asks for the words and the first ten, and says how many results there are', async () => {
    const html = await render({ q: 'klaverboer' })

    expect(searchSite).toHaveBeenCalledExactlyOnceWith(['klaverboer'], 10)
    expect(html).toContain('<h2 class="hf-heading-2" id="resultaten">3 resultaten voor klaverboer</h2>')
    expect(html).toMatch(/<input[^>]*value="klaverboer"/u)
  })

  it('has the form and the results in one white card', async () => {
    const html = await render({ q: 'klaverboer' })

    expect(html).toMatch(/<div class="hf-page-cells"><div class="hf-card"><form.*<\/form><h2[^>]*id="resultaten"/u)
    expect(html).not.toContain('hf-card-soft')
    expect(html.match(/<div class="hf-card">/g)).toHaveLength(1)
  })

  it('says "1 resultaat" for one', async () => {
    vi.mocked(searchSite).mockResolvedValue({ hits: hits.slice(0, 1), total: 1 })

    expect(await render({ q: 'klaverboer' })).toContain('>1 resultaat voor klaverboer</h2>')
  })

  it('asks for all the words, in the order written', async () => {
    await render({ q: '  Klaverboer   Zwolle ' })

    expect(searchSite).toHaveBeenCalledExactlyOnceWith(['Klaverboer', 'Zwolle'], 10)
  })

  it('shows a news item as on the homepage, with the source, the time and the paywall', async () => {
    const html = await render({ q: 'klaverboer' })

    expect(html).toContain('href="https://testkrant.test/klaverboer"')
    expect(html).toContain('Klaverboer tekent bij')
    expect(html).toContain('<span>Testkrant</span>')
    expect(html).toContain('<span>voor abonnees</span>')
    expect(html).toContain('wo 14 okt<')
  })

  it('shows a podcast episode as on /nieuws/podcasts, with its facts', async () => {
    const html = await render({ q: 'klaverboer' })

    expect(html).toContain('href="https://podcast.test/e/120"')
    expect(html).toContain('<span>Testpodcast</span>')
    expect(html).toContain('<span>aflevering 120</span>')
    expect(html).toContain('<span>49 min</span>')
    expect(html).toContain('za 12:00')
  })

  it('shows an article as a line with its title, "Van de redactie" and the date, linking to its own page', async () => {
    const html = await render({ q: 'klaverboer' })
    const line = html.match(/<li id="resultaat-1">.*?<\/li>/u)?.[0] ?? ''

    expect(line).toContain('href="/redactie/over-klaverboer"')
    expect(line).toContain('Over Klaverboer &amp; &lt;i&gt;zijn&lt;/i&gt; doelpunten')
    expect(line).toContain('<span>Van de redactie</span>')
    expect(line).toContain('<time class="hf-meta hf-news-item-time" dateTime="2026-10-25">zo 25 okt</time>')
    expect(line).not.toContain('<svg')
    expect(html).not.toContain('<i>')
  })

  it('shows the results in the order the query gives them, each with a number for the button to jump to', async () => {
    const html = await render({ q: 'klaverboer' })

    expect(html).toContain('<li id="resultaat-1">')
    expect(html).toContain('<li id="resultaat-3">')
    expect(html.indexOf('Over Klaverboer')).toBeLessThan(html.indexOf('Aflevering met'))
    expect(html.indexOf('Aflevering met')).toBeLessThan(html.indexOf('Klaverboer tekent bij'))
  })

  it('has no button when everything is shown', async () => {
    expect(await render({ q: 'klaverboer' })).not.toContain('Laad')
  })

  it('has the button "Laad 5 meer" when there are more, as a GET form that keeps the search', async () => {
    vi.mocked(searchSite).mockResolvedValue({ hits, total: 12 })

    const html = await render({ q: 'klaverboer' })

    expect(html).toContain('>12 resultaten voor klaverboer</h2>')
    expect(html).toContain('Laad 5 meer')
    expect(html).toMatch(/<form[^>]*action="\/nieuws\/zoeken#resultaat-4"[^>]*method="get"/u)
    expect(html).toContain('<input type="hidden" name="q" value="klaverboer"/>')
    expect(html).toMatch(/<button[^>]*value="15"[^>]*name="aantal"/u)
  })

  it('asks for more when the address says so, and the button then asks for five more again', async () => {
    vi.mocked(searchSite).mockResolvedValue({ hits, total: 40 })

    const html = await render({ aantal: '20', q: 'klaverboer' })

    expect(searchSite).toHaveBeenCalledExactlyOnceWith(['klaverboer'], 20)
    expect(html).toMatch(/<button[^>]*value="25"[^>]*name="aantal"/u)
  })

  it('asks for the first ten when the number in the address is not one the button gives', async () => {
    await render({ aantal: '7', q: 'klaverboer' })

    expect(searchSite).toHaveBeenCalledExactlyOnceWith(['klaverboer'], 10)
  })

  it('has no button at the most results, but says that these are the newest', async () => {
    vi.mocked(searchSite).mockResolvedValue({ hits, total: 400 })

    const html = await render({ aantal: '100', q: 'de' })

    expect(html).not.toContain('Laad')
    expect(html).toContain('Dit zijn de 100 nieuwste resultaten.')
  })

  it('writes the search as text, escaped', async () => {
    vi.mocked(searchSite).mockResolvedValue({ hits: [], total: 0 })

    const html = await render({ q: '<b>vet</b> &&' })

    expect(html).toContain('Geen resultaten voor &lt;b&gt;vet&lt;/b&gt; &amp;&amp;')
    expect(html).not.toContain('<b>vet')
  })
})

describe('the page Zoeken without results', () => {
  beforeEach(() => {
    vi.mocked(searchSite).mockResolvedValue({ hits: [], total: 0 })
  })

  it('says there are none, with a sentence for the reader that points to the players beside it', async () => {
    const html = await render({ q: 'bestaatniet' })

    expect(html).toContain('<h2 class="hf-heading-2" id="resultaten">Geen resultaten voor bestaatniet</h2>')
    expect(html).toContain(
      '<p>Daar hebben we niets over gevonden. Probeer een ander woord, of kijk bij de spelers hiernaast.</p>',
    )
    expect(html).not.toContain('<ul role="list"><li id=')
  })

  it('does not point to players when there is no list', async () => {
    vi.mocked(getSquad).mockResolvedValue({ ...squad, players: [] })

    const html = await render({ q: 'bestaatniet' })

    expect(html).toContain('<p>Daar hebben we niets over gevonden. Probeer een ander woord.</p>')
    expect(html).not.toContain('<aside')
  })
})

describe('the page Zoeken with a search that does not meet the limits', () => {
  it.each([
    ['', 'Schrijf een woord om te zoeken.'],
    ['   ', 'Schrijf een woord om te zoeken.'],
    ['a', 'Schrijf woorden van minstens 2 tekens.'],
    ['aa bb cc dd ee ff', 'Zoek op hoogstens 5 woorden.'],
    ['a'.repeat(61), 'Schrijf hoogstens 60 tekens.'],
  ])('says what is wrong with %j at the field, and asks nothing of the database', async (q, message) => {
    const html = await render({ q })

    expect(html).toContain(`<span class="hf-visually-hidden">Fout:</span> ${message}`)
    expect(html).toMatch(/<input[^>]*aria-invalid="true"/u)
    expect(html).toMatch(/<input[^>]*aria-describedby="zoek-hint zoek-error"/u)
    expect(html).not.toContain('id="resultaten"')
    expect(searchSite).not.toHaveBeenCalled()
  })

  it('shows back no more than sixty characters of a search that is too long', async () => {
    const html = await render({ q: 'a'.repeat(5000) })

    expect(html).toContain(`value="${'a'.repeat(60)}"`)
    expect(html).not.toContain('a'.repeat(61))
  })

  it('still shows the players', async () => {
    expect(await render({ q: 'a' })).toContain('<aside')
  })
})

describe('the list of players', () => {
  it('is in the sidebar with a name of its own, after the main', async () => {
    const html = await render({ q: 'klaverboer' })

    expect(html.match(/<aside/g)).toHaveLength(1)
    expect(html.indexOf('</main>')).toBeLessThan(html.indexOf('<aside'))
    expect(sidebarOf(html)).toMatch(/^<aside class="hf-page-sidebar" aria-label="De spelers van sc Heerenveen">/u)
  })

  it('has the players under a heading for each position, with an h2 above them', async () => {
    const html = await render()

    expect(sidebarOf(html).match(/<h[1-6][^>]*>.*?<\/h[1-6]>/g)).toEqual([
      '<h2 class="hf-heading-2" id="spelers">Spelers</h2>',
      '<h3 class="hf-heading-3">Doelmannen</h3>',
      '<h3 class="hf-heading-3">Verdedigers</h3>',
      '<h3 class="hf-heading-3">Middenvelders</h3>',
      '<h3 class="hf-heading-3">Aanvallers</h3>',
    ])
  })

  it('says to search quickly on a surname above the players', async () => {
    expect(sidebarOf(await render())).toContain('<p>Zoek snel op een achternaam.</p>')
  })

  it('has each name as a plain link to a search for the surname', async () => {
    const html = await render()

    expect(
      [...sidebarOf(html).matchAll(/<a href="([^"]*)">(.*?)<\/a>/g)]
        .filter(([, href]) => href?.startsWith('/nieuws/zoeken'))
        .map(([, href, name]) => [href, name?.replaceAll(/<[^>]*>/g, '')]),
    ).toEqual([
      ['/nieuws/zoeken?q=Brandsma', 'Tjerk Brandsma'],
      ['/nieuws/zoeken?q=van+der+Kooi', 'Jurre van der Kooi'],
      ['/nieuws/zoeken?q=Klaverboer', 'Bernt Klaverboer'],
      ['/nieuws/zoeken?q=Dinho', 'Dinho'],
    ])
  })

  it('shows the given name plain and the surname heavier, and a name of one word as a surname', async () => {
    const sidebar = sidebarOf(await render())

    expect(sidebar).toContain(
      '<span class="hf-player-name"><span class="hf-player-name-given">Jurre</span> <span class="hf-player-name-surname">van der Kooi</span></span>',
    )
    expect(sidebar).toContain('<span class="hf-player-name"><span class="hf-player-name-surname">Dinho</span></span>')
  })

  it('credits Wikipedia under the list, with the page and the time of the last good read', async () => {
    const sidebar = sidebarOf(await render())

    expect(sidebar).toContain('Bron: Wikipedia (')
    expect(sidebar).toContain('href="https://nl.wikipedia.org/wiki/Sc_Heerenveen_in_het_seizoen_2026/27_(mannen)"')
    expect(sidebar).toContain('>Selectie 2026/27</a>')
    expect(sidebar).toContain('<time dateTime="2026-10-25T12:05:00.000Z">25 oktober 2026 om 13:05</time>')
    expect(sidebar).toContain('Onze selectiegegevens zijn ook CC BY-SA 4.0.')
    expect(sidebar).not.toContain('wedstrijdgegevens')
    expect(sidebar.indexOf('Aanvallers')).toBeLessThan(sidebar.indexOf('Bron: Wikipedia'))
  })

  it('is left out when there are no players, with the rest of the page as it is', async () => {
    vi.mocked(getSquad).mockResolvedValue({ ...squad, players: [] })

    const html = await render({ q: 'klaverboer' })

    expect(html).not.toContain('<aside')
    expect(html).not.toContain('Bron: Wikipedia')
    expect(html).toContain('>3 resultaten voor klaverboer</h2>')
  })

  it('is left out, and the search still works, when the database cannot give the squad', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(getSquad).mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3306'))

    const html = await render({ q: 'klaverboer' })

    expect(html).not.toContain('<aside')
    expect(html).toContain('>3 resultaten voor klaverboer</h2>')
    expect(error).toHaveBeenCalledWith(
      'Could not read the squad for /nieuws/zoeken: connect ECONNREFUSED 127.0.0.1:3306',
    )
  })

  it('ends the card with the date the page of the squad last changed, in Dutch time, before the credit', async () => {
    const sidebar = sidebarOf(await render())
    const line =
      '<p class="hf-meta" data-hf-card-share="">Laatst gewijzigd: <time dateTime="2026-10-25T10:30:00.000Z">zo 11:30</time></p></section>'

    expect(sidebar).toContain(line)
    expect(sidebar.indexOf('Laatst gewijzigd')).toBeLessThan(sidebar.indexOf('Bron: Wikipedia'))
  })

  it('has no date when the squad has no page, or the page has no version', async () => {
    vi.mocked(getSquad).mockResolvedValue({ ...squad, page: undefined })

    expect(sidebarOf(await render())).not.toContain('Laatst gewijzigd')

    vi.mocked(getSquad).mockResolvedValue({ ...squad, page: { ...squad.page!, version: null } })

    expect(sidebarOf(await render())).not.toContain('Laatst gewijzigd')
  })

  it('has no credit when the squad has no page', async () => {
    vi.mocked(getSquad).mockResolvedValue({ ...squad, page: undefined })

    const sidebar = sidebarOf(await render())

    expect(sidebar.replaceAll(/<[^>]*>/g, '')).toContain('Tjerk Brandsma')
    expect(sidebar).not.toContain('Bron: Wikipedia')
  })
})

describe('when the database cannot give the results', () => {
  it('shows the error page in the HTML, with a link to try again, and logs the reason and not the search', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(searchSite).mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:3306'))

    const html = await render({ q: 'klaverboer zwolle' })

    expect(html).toContain('<h1 class="hf-heading-1">Er ging iets mis</h1>')
    expect(html).toContain('href="/nieuws/zoeken?q=klaverboer+zwolle"')
    expect(error).toHaveBeenCalledWith('Could not search for /nieuws/zoeken: connect ECONNREFUSED 127.0.0.1:3306')
    expect(JSON.stringify(error.mock.calls)).not.toContain('klaverboer')
    expect(await generateMetadata(props({ q: 'klaverboer zwolle' }))).toMatchObject({ title: 'Er ging iets mis' })
  })
})

describe('the metadata of the page Zoeken', () => {
  const noindex = { follow: false, index: false }

  it('says noindex without a search, and has the title Zoeken', async () => {
    expect(await generateMetadata(props())).toEqual({ robots: noindex, title: 'Zoeken' })
  })

  it('says noindex with a search too, and puts the search in the title', async () => {
    expect(await generateMetadata(props({ q: 'klaverboer' }))).toEqual({ robots: noindex, title: 'Zoeken: klaverboer' })
  })

  it('says noindex for a search that does not meet the limits, with the plain title', async () => {
    expect(await generateMetadata(props({ q: 'a' }))).toEqual({ robots: noindex, title: 'Zoeken' })
  })
})
