import { existsSync } from 'node:fs'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import NoSubnav from '../[...rest]/page'
import Home from '../page'
import SeasonStatisticsSubnav from './[seizoen]/page'
import StatisticsSubnav from './page'
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

describe('the slot @subnav, for the bar of Statistieken in the main menu', () => {
  it('keeps the choice on the page of a season, and marks no sub-page', async () => {
    const html = renderToStaticMarkup(await SeasonStatisticsSubnav(search({ competitie: 'eredivisie' })))

    expect(links(html)).toEqual(['/statistieken/tegenstanders?competitie=eredivisie'])
    expect(current(html)).toBeUndefined()
  })

  it('has the link to Tegenstanders on /statistieken, with and without the choice', async () => {
    expect(links(renderToStaticMarkup(await StatisticsSubnav(search())))).toEqual(['/statistieken/tegenstanders'])
    expect(links(renderToStaticMarkup(await StatisticsSubnav(search({ competitie: 'eredivisie' }))))).toEqual([
      '/statistieken/tegenstanders?competitie=eredivisie',
    ])
  })

  it('does not repeat a choice that the page does not know', async () => {
    expect(links(renderToStaticMarkup(await SeasonStatisticsSubnav(search({ competitie: 'alle' }))))).toEqual([
      '/statistieken/tegenstanders',
    ])
  })

  it('has no bar for Spelers, which is an item of the main menu with no sub-pages', () => {
    expect(existsSync(new URL('./spelers', import.meta.url))).toBe(false)
  })

  it('marks Tegenstanders on its list and on the page of a club, and keeps the choice', async () => {
    const list = renderToStaticMarkup(await OpponentsSubnav(search({ competitie: 'eredivisie' })))
    const club = renderToStaticMarkup(await ClubSubnav(search({ competitie: 'eredivisie' })))

    for (const html of [list, club]) {
      expect(links(html)).toEqual(['/statistieken/tegenstanders?competitie=eredivisie'])
      expect(current(html)).toBe('Tegenstanders')
    }
  })

  it('is empty for the home page and every other page', () => {
    expect(Home()).toBeNull()
    expect(NoSubnav()).toBeNull()
  })
})
