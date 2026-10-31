import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import NoSubnav from '../[...rest]/page'
import Home from '../page'
import SeasonStatisticsSubnav from './[seizoen]/page'
import StatisticsSubnav from './page'
import SeasonPlayersSubnav from './spelers/[seizoen]/page'
import PlayersSubnav from './spelers/page'
import ClubSubnav from './tegenstanders/[club]/page'
import OpponentsSubnav from './tegenstanders/page'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-23T13:40:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

type Query = Record<string, string | string[] | undefined>

const links = (html: string) => [...html.matchAll(/<a [^>]*href="([^"]*)"/g)].map(([, href]) => href)

const current = (html: string) => /aria-current="page"[^>]*>([^<]*)</.exec(html)?.[1]

const search = (query: Query = {}) => ({ searchParams: Promise.resolve(query) })
const season = (seizoen: string, query: Query = {}) => ({ params: Promise.resolve({ seizoen }), ...search(query) })

describe('the slot @subnav, for the bar of Statistieken in the main menu', () => {
  it('keeps the season and the choice on the page of a season, and marks no sub-page', async () => {
    const html = renderToStaticMarkup(await SeasonStatisticsSubnav(season('2025-26', { competitie: 'eredivisie' })))

    expect(links(html)).toEqual([
      '/statistieken/spelers/2025-26?competitie=eredivisie',
      '/statistieken/tegenstanders?competitie=eredivisie',
    ])
    expect(current(html)).toBeUndefined()
  })

  it('goes to the current season on /statistieken, with and without the choice', async () => {
    expect(links(renderToStaticMarkup(await StatisticsSubnav(search())))).toEqual([
      '/statistieken/spelers',
      '/statistieken/tegenstanders',
    ])
    expect(links(renderToStaticMarkup(await StatisticsSubnav(search({ competitie: 'eredivisie' }))))).toEqual([
      '/statistieken/spelers?competitie=eredivisie',
      '/statistieken/tegenstanders?competitie=eredivisie',
    ])
  })

  it('goes to the current season for an address that is no season, which is the page "niet gevonden"', async () => {
    expect(links(renderToStaticMarkup(await SeasonStatisticsSubnav(season('onzin'))))).toEqual([
      '/statistieken/spelers',
      '/statistieken/tegenstanders',
    ])
  })

  it('does not repeat a choice that the page does not know', async () => {
    expect(
      links(renderToStaticMarkup(await SeasonStatisticsSubnav(season('2025-26', { competitie: 'alle' })))),
    ).toEqual(['/statistieken/spelers/2025-26', '/statistieken/tegenstanders'])
  })

  it('marks Spelers on the page Spelers of the current season and of another season, with the choice', async () => {
    const now = renderToStaticMarkup(await PlayersSubnav(search({ competitie: 'eredivisie' })))
    const before = renderToStaticMarkup(await SeasonPlayersSubnav(season('2025-26', { competitie: 'eredivisie' })))

    expect(links(now)[0]).toBe('/statistieken/spelers?competitie=eredivisie')
    expect(links(before)[0]).toBe('/statistieken/spelers/2025-26?competitie=eredivisie')
    expect(current(now)).toBe('Spelers')
    expect(current(before)).toBe('Spelers')
  })

  it('marks Tegenstanders on its list and on the page of a club, and keeps the choice', async () => {
    const list = renderToStaticMarkup(await OpponentsSubnav(search({ competitie: 'eredivisie' })))
    const club = renderToStaticMarkup(await ClubSubnav(search({ competitie: 'eredivisie' })))

    for (const html of [list, club]) {
      expect(links(html)).toEqual([
        '/statistieken/spelers?competitie=eredivisie',
        '/statistieken/tegenstanders?competitie=eredivisie',
      ])
      expect(current(html)).toBe('Tegenstanders')
    }
  })

  it('is empty for the home page and every other page', () => {
    expect(Home()).toBeNull()
    expect(NoSubnav()).toBeNull()
  })
})
