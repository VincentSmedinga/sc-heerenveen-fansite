import { existsSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import NoSubnav from '../[...rest]/page'
import Home from '../page'
import ClubSubnav from '../tegenstanders/[club]/page'
import OpponentsSubnav from '../tegenstanders/page'
import SeasonMatchesSubnav from './[seizoen]/page'
import SeasonFiguresSubnav from './cijfers/[seizoen]/page'
import FiguresSubnav from './cijfers/page'
import MatchesSubnav from './page'
import SearchSubnav from './zoeken/page'

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

const search = (query: Query = {}, seizoen = '2025-26') => ({
  params: Promise.resolve({ seizoen }),
  searchParams: Promise.resolve(query),
})

describe('the slot @subnav, for the bar of Wedstrijden in the main menu', () => {
  it('keeps the choice and the season on the page of a season, and marks no sub-page', async () => {
    const html = renderToStaticMarkup(await SeasonMatchesSubnav(search({ competitie: 'eredivisie' })))

    expect(links(html)).toEqual([
      '/wedstrijden/cijfers/2025-26?competitie=eredivisie',
      '/tegenstanders?competitie=eredivisie',
      '/wedstrijden/zoeken',
    ])
    expect(current(html)).toBeUndefined()
  })

  it('has the links to Cijfers and Tegenstanders on /wedstrijden, with and without the choice', async () => {
    expect(links(renderToStaticMarkup(await MatchesSubnav(search())))).toEqual([
      '/wedstrijden/cijfers',
      '/tegenstanders',
      '/wedstrijden/zoeken',
    ])
    expect(links(renderToStaticMarkup(await MatchesSubnav(search({ competitie: 'eredivisie' }))))).toEqual([
      '/wedstrijden/cijfers?competitie=eredivisie',
      '/tegenstanders?competitie=eredivisie',
      '/wedstrijden/zoeken',
    ])
  })

  it('does not repeat a choice that the page does not know', async () => {
    expect(links(renderToStaticMarkup(await SeasonMatchesSubnav(search({ competitie: 'alle' }))))).toEqual([
      '/wedstrijden/cijfers/2025-26',
      '/tegenstanders',
      '/wedstrijden/zoeken',
    ])
  })

  it('marks Cijfers on /wedstrijden/cijfers and on the page of a season, and keeps the choice and the season', async () => {
    const figures = renderToStaticMarkup(await FiguresSubnav(search({ competitie: 'eredivisie' })))
    const season = renderToStaticMarkup(await SeasonFiguresSubnav(search({ competitie: 'eredivisie' }, '2023-24')))

    expect(links(figures)).toEqual([
      '/wedstrijden/cijfers?competitie=eredivisie',
      '/tegenstanders?competitie=eredivisie',
      '/wedstrijden/zoeken',
    ])
    expect(links(season)).toEqual([
      '/wedstrijden/cijfers/2023-24?competitie=eredivisie',
      '/tegenstanders?competitie=eredivisie',
      '/wedstrijden/zoeken',
    ])

    for (const html of [figures, season]) {
      expect(current(html)).toBe('Cijfers')
    }
  })

  it('has no bar for Spelers, which has no sub-pages', () => {
    expect(existsSync(new URL('../spelers', import.meta.url))).toBe(false)
  })

  it('marks Tegenstanders on its list and on the page of a club, and keeps the choice', async () => {
    const list = renderToStaticMarkup(await OpponentsSubnav(search({ competitie: 'eredivisie' })))
    const club = renderToStaticMarkup(await ClubSubnav(search({ competitie: 'eredivisie' })))

    for (const html of [list, club]) {
      expect(links(html)).toEqual([
        '/wedstrijden/cijfers?competitie=eredivisie',
        '/tegenstanders?competitie=eredivisie',
        '/wedstrijden/zoeken',
      ])
      expect(current(html)).toBe('Tegenstanders')
    }
  })

  it('marks Zoeken on /wedstrijden/zoeken, which keeps no choice', async () => {
    const html = renderToStaticMarkup(await SearchSubnav(search({ competitie: 'eredivisie' })))

    expect(links(html)).toEqual([
      '/wedstrijden/cijfers?competitie=eredivisie',
      '/tegenstanders?competitie=eredivisie',
      '/wedstrijden/zoeken',
    ])
    expect(current(html)).toBe('Zoeken')
  })

  it('is empty for the home page and every other page', () => {
    expect(Home()).toBeNull()
    expect(NoSubnav()).toBeNull()
  })
})
