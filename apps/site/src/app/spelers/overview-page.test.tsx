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

  it('links a player who has a page and shows the surname bold, then the given name with the prefix', async () => {
    const html = await render('naam')

    expect(html).toMatch(/<a href="\/spelers\/jan-van-aken"><strong[^>]*>Aken<\/strong>, Jan van<\/a>/)
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
  it('has a bar card with a link to each country, the card Uit het noorden and a section for each country', async () => {
    const html = await render('land')

    expect(html).toContain('per land van de speler.')
    expect(html).toMatch(/<a aria-current="page"[^>]*href="\/spelers\/overzicht\/land"/)
    expect(html).toContain('href="#land-nederland"')
    expect([...html.matchAll(/<h2[^>]*id="(land-[\w-]+)"/g)].map(([, id]) => id)).toEqual([
      'land-denemarken',
      'land-nederland',
      'land-zweden',
    ])
    expect(html).toContain('2 spelers uit Denemarken en Zweden.')
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
