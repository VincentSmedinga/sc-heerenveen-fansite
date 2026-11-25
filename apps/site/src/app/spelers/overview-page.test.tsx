import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { getPlayersOverview, overviewOf } from '#src/players-overview'
import { withoutIcons } from '#src/without-icons'

import { overviewMetadata, OverviewPage, overviewShortcuts } from './overview-page'

vi.mock('#src/players-overview', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  getPlayersOverview: vi.fn(),
}))

const row = (id: number, family: string, extra: { country?: string; prefix?: string; slug?: string } = {}) => ({
  country: extra.country ?? null,
  familyName: family,
  familyNamePrefix: extra.prefix ?? null,
  givenName: 'Jan',
  id,
  line: 'verdediger',
  name: null,
  rowName: family,
  season: '2013/14',
  slug: extra.slug ?? null,
})

beforeEach(() => {
  vi.mocked(getPlayersOverview).mockResolvedValue(
    overviewOf([
      row(1, 'Aken', { country: 'NL', prefix: 'van', slug: 'jan-van-aken' }),
      row(2, 'Berg', { country: 'DK' }),
      row(3, 'Dal', { country: 'SE' }),
    ]),
  )
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-23T13:40:00Z'))
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

const render = async (view: 'land' | 'naam') => withoutIcons(renderToStaticMarkup(await OverviewPage({ view })))

describe('the overview by name', () => {
  it('has the total and the first year from the data, the two views and a section for each letter', async () => {
    const html = await render('naam')

    expect(html).toContain('Alle 3 spelers die sinds 2013 in de selectie van sc Heerenveen stonden, op achternaam.')
    expect(html).toContain('<h1')
    expect(html).toMatch(/<a aria-current="page"[^>]*href="\/spelers\/overzicht"/)
    expect(html).toContain('href="/spelers/overzicht/land"')
    expect(html).not.toContain('Op nummer')
    expect([...html.matchAll(/<h2[^>]*id="letter-(\w)"/g)].map(([, letter]) => letter)).toEqual(['a', 'b', 'd'])
    expect(html).toContain('1 speler')
  })

  it('puts the letters and then the credit in one grid of three columns, with no side section', async () => {
    const html = await render('naam')
    const columns = html.slice(html.indexOf('hf-card-columns-grid'), html.indexOf('</main>'))

    expect(html).toContain('hf-card-columns-three')
    expect([...columns.matchAll(/<h2[^>]*id="letter-(\w)"/g)].map(([, letter]) => letter)).toEqual(['a', 'b', 'd'])
    expect(columns.indexOf('id="letter-d"')).toBeLessThan(columns.indexOf('Bron: Wikipedia'))
    expect(columns.indexOf('Bron: Wikipedia')).toBeGreaterThan(columns.lastIndexOf('id="letter-'))
    expect(html).not.toContain('grid-area:side')
  })

  it('links a player who has a page and shows the surname in the name weight, then the given name with the prefix', async () => {
    const html = await render('naam')

    expect(html).toMatch(/<a href="\/spelers\/jan-van-aken"><span[^>]*>Aken<\/span>, Jan van<\/a>/)
    expect(html).toContain('Verdediger · 2013/14')
    expect(html).toContain('Bron: Wikipedia en sc Heerenveen Fansite')
  })

  it('shows the error page when the players cannot be read', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getPlayersOverview).mockRejectedValue(new Error('connect ECONNREFUSED'))

    expect(await render('naam')).toContain('Er ging iets mis')
  })
})

describe('the overview by country', () => {
  it('has a bar card with a link to each country, the card Ze komen uit het noorden and a section for each country', async () => {
    const html = await render('land')

    expect(html).toContain('per land van de speler.')
    expect(html).toMatch(/<a aria-current="page"[^>]*href="\/spelers\/overzicht\/land"/)
    expect(html).toContain('href="#land-nederland"')
    expect([...html.matchAll(/<h2[^>]*id="(land-[\w-]+)"/g)].map(([, id]) => id)).toEqual([
      'land-nederland',
      'land-denemarken',
      'land-zweden',
    ])
    expect(html).toContain('2 spelers uit Denemarken en Zweden.')
  })

  it('reads the largest countries, the north, the continents, the countries and the credit, in that order', async () => {
    const html = await render('land')
    const at = (text: string) => html.indexOf(text)

    expect(html).toContain('hf-card-columns-three')
    expect(at('id="landen"')).toBeLessThan(at('id="ze-komen-uit-het-noorden"'))
    expect(at('id="ze-komen-uit-het-noorden"')).toBeLessThan(at('id="werelddelen"'))
    expect(at('id="werelddelen"')).toBeLessThan(at('id="land-nederland"'))
    expect(at('id="land-nederland"')).toBeLessThan(at('id="land-denemarken"'))
    expect(at('id="land-zweden"')).toBeLessThan(at('Bron: Wikipedia'))
    expect(html.indexOf('Bron: Wikipedia')).toBe(html.lastIndexOf('Bron: Wikipedia'))
  })

  it('gives the Netherlands a column of its own, before the grid with the other countries', async () => {
    const html = await render('land')
    const split = html.indexOf('hf-card-columns-split')
    const grid = html.indexOf('hf-card-columns-grid')
    const dutch = html.indexOf('id="land-nederland"')

    expect(split).toBeGreaterThan(-1)
    expect(dutch).toBeGreaterThan(split)
    expect(dutch).toBeLessThan(grid)
    expect(html.indexOf('id="land-denemarken"')).toBeGreaterThan(grid)
  })

  it('has no column of its own without a player from the Netherlands', async () => {
    vi.mocked(getPlayersOverview).mockResolvedValue(overviewOf([row(1, 'Berg', { country: 'DK' })]))

    expect(await render('land')).not.toContain('hf-card-columns-split')
    expect(await render('naam')).not.toContain('hf-card-columns-split')
  })

  it('names the card of the north Ze komen uit het noorden, and the anchor follows the title', async () => {
    const html = await render('land')

    expect(html).toMatch(/<h2[^>]*id="ze-komen-uit-het-noorden"[^>]*>Ze komen uit het noorden</)
    expect(html).toContain('aria-labelledby="ze-komen-uit-het-noorden"')
    expect(html).not.toContain('"uit-het-noorden"')
  })

  it('has a card with the continents under the north, most players first, with 0 for an empty one', async () => {
    const html = await render('land')
    const card = html.slice(html.indexOf('id="werelddelen"'))
    const items = [...card.matchAll(/hf-bar-list-label">(.*?)<\/span>.*?hf-bar-list-value">(\d+)</g)].map(
      ([, name, count]) => `${name} ${count}`,
    )

    expect(html.indexOf('id="ze-komen-uit-het-noorden"')).toBeLessThan(html.indexOf('id="werelddelen"'))
    expect(items).toEqual(['Europa 3', 'Afrika 0', 'Azië 0', 'Noord-Amerika 0', 'Oceanië 0', 'Zuid-Amerika 0'])
    expect(card).toContain('hf-bar-list')
    expect(html).not.toContain('niet bekend')
  })

  it('says how many players have no known country, in a line under the continents', async () => {
    vi.mocked(getPlayersOverview).mockResolvedValue(overviewOf([row(1, 'Aken', { country: 'JP' }), row(2, 'Berg')]))

    const html = await render('land')

    expect(html).toContain('Van 1 speler is het land niet bekend.')
    expect(html).toMatch(/hf-bar-list-label">Azië<\/span>.*?hf-bar-list-value">1</)
  })
})

describe('the bar and the metadata', () => {
  it('has a link for each letter, and for each country in the order of the sections', async () => {
    const letters = renderToStaticMarkup((await overviewShortcuts('naam')) ?? <></>)
    const countries = renderToStaticMarkup((await overviewShortcuts('land')) ?? <></>)

    expect(letters).toContain('Op deze pagina:')
    expect([...letters.matchAll(/href="(#[^"]+)"/g)].map(([, href]) => href)).toEqual([
      '#letter-a',
      '#letter-b',
      '#letter-d',
    ])
    expect([...countries.matchAll(/href="(#[^"]+)"/g)].map(([, href]) => href)).toEqual([
      '#land-denemarken',
      '#land-nederland',
      '#land-zweden',
    ])
  })

  it('is not noindex, and is noindex when the page failed', async () => {
    vi.stubEnv('SITE_ENV', 'local')
    expect((await overviewMetadata('naam')).robots).toBeUndefined()

    vi.spyOn(console, 'error').mockImplementation(() => {})
    vi.mocked(getPlayersOverview).mockRejectedValue(new Error('x'))

    expect((await overviewMetadata('naam')).robots).toEqual({ index: false })
  })
})
