import type { FoundPlayer } from '@fansite/db/person-slugs'

import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { findPlayers } from '#src/player-search'
import { withoutIcons } from '#src/without-icons'

import PlayerSearchPage, { generateMetadata } from './page'

// Only the query is replaced: the checks of the search and the facts are the real ones.
vi.mock('#src/player-search', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  findPlayers: vi.fn(),
}))

// Every player is made up.
const aken: FoundPlayer = {
  familyName: 'Aken',
  familyNamePrefix: 'van',
  givenName: 'Joost',
  id: 1,
  line: 'verdediger',
  name: 'Joost van Aken',
  seasons: ['2019/20', '2021/22', '2023/24'],
  slug: 'joost-van-aken',
}
const dinho: FoundPlayer = {
  familyName: 'Dinho',
  familyNamePrefix: null,
  givenName: null,
  id: 2,
  line: null,
  name: 'Dinho',
  seasons: [],
  slug: 'dinho',
}

type Query = Record<string, string | string[] | undefined>

async function render(query: Query = {}) {
  return withoutIcons(renderToStaticMarkup(await PlayerSearchPage({ searchParams: Promise.resolve(query) })))
}

beforeEach(() => {
  vi.mocked(findPlayers).mockReset()
  vi.mocked(findPlayers).mockResolvedValue({ players: [aken, dinho], total: 2 })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('the page Zoeken naar een speler', () => {
  it('has the heading, the sentence and a GET form to its own address, and asks nothing without a search', async () => {
    const html = await render()

    expect(html).toContain('>Zoeken naar een speler</h1>')
    expect(html).toContain('Zoek een speler van sc Heerenveen op zijn naam.')
    expect(html).toContain('Naam van de speler</label>')
    expect(html).toContain('Alle woorden moeten erin staan. Een deel van een woord is genoeg.')
    expect(html).toMatch(/<form[^>]*action="\/spelers\/zoeken"[^>]*method="get"/u)
    expect(html).toMatch(/>Zoek<\/button>/u)
    expect(html).not.toContain('id="resultaten"')
    expect(findPlayers).not.toHaveBeenCalled()
  })

  it('says how many players there are, and links each to his page with the line and seasons', async () => {
    const html = await render({ q: 'ak' })

    expect(findPlayers).toHaveBeenCalledWith(['ak'])
    expect(html).toContain('<h2 class="hf-heading-2" id="resultaten">2 spelers voor ak</h2>')
    expect(html).toContain('href="/spelers/joost-van-aken"')
    expect(html).toContain('Verdediger · 2019/20 – 2023/24')
    expect(html).toMatch(/aria-labelledby="resultaten"[^>]*role="list"|role="list"[^>]*aria-labelledby="resultaten"/u)
    // A player without a line and a season shows the name alone.
    expect(html).toContain('href="/spelers/dinho"')
    expect(html).not.toContain('hf-player-list-facts">Dinho')
    expect(html).not.toContain('Dit zijn')
  })

  it('says "1 speler" for one', async () => {
    vi.mocked(findPlayers).mockResolvedValue({ players: [aken], total: 1 })

    expect(await render({ q: 'aken' })).toContain('>1 speler voor aken<')
  })

  it('says how many there are when more than ten fit', async () => {
    vi.mocked(findPlayers).mockResolvedValue({
      players: Array.from({ length: 10 }, (_, i) => ({ ...aken, id: i })),
      total: 23,
    })

    expect(await render({ q: 'aken' })).toContain(
      'Dit zijn 10 van de 23 spelers. Zoek op meer van de naam om er minder te krijgen.',
    )
  })

  it('says so, and links to the players of this season, when nobody fits', async () => {
    vi.mocked(findPlayers).mockResolvedValue({ players: [], total: 0 })

    const html = await render({ q: 'bestaatniet' })

    expect(html).toContain('>Geen spelers voor bestaatniet<')
    expect(html).toContain('Daar hebben we geen speler onder gevonden.')
    expect(html).toContain('href="/spelers"')
  })

  it('asks nothing of the database for a search outside the limits, and says what is wrong at the field', async () => {
    const html = await render({ q: 'a' })

    expect(html).toContain('Schrijf woorden van minstens 2 tekens.')
    expect(html).not.toContain('id="resultaten"')
    expect(findPlayers).not.toHaveBeenCalled()
  })

  it('shows the error page in the HTML, and logs the reason and never the search', async () => {
    const log = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    vi.mocked(findPlayers).mockRejectedValue(new Error('connection lost'))

    const html = await render({ q: 'geheimenaam' })

    expect(html).not.toContain('id="resultaten"')
    expect(log).toHaveBeenCalledWith(expect.stringContaining('connection lost'))
    expect(JSON.stringify(log.mock.calls)).not.toContain('geheimenaam')
  })
})

describe('the metadata', () => {
  it('is noindex, with and without a search', async () => {
    for (const q of [undefined, 'aken']) {
      const metadata = await generateMetadata({ searchParams: Promise.resolve(q === undefined ? {} : { q }) })

      expect(metadata.robots).toEqual({ follow: false, index: false })
    }
  })
})
