import { renderToStaticMarkup } from 'react-dom/server'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { StatisticsBar, statisticsBarItems } from './statisticsBar'

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-10-23T13:40:00Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

const hrefs = (items: { href: string }[]) => items.map(({ href }) => href)

describe('statisticsBarItems', () => {
  it('goes to Spelers and Tegenstanders of the current season with all matches, the plain addresses', () => {
    expect(hrefs(statisticsBarItems({ competition: 'all', current: undefined }))).toEqual([
      '/statistieken/spelers',
      '/statistieken/tegenstanders',
    ])
  })

  it('keeps the choice of the Eredivisie in both links', () => {
    expect(hrefs(statisticsBarItems({ competition: 'league', current: undefined }))).toEqual([
      '/statistieken/spelers?competitie=eredivisie',
      '/statistieken/tegenstanders?competitie=eredivisie',
    ])
  })

  it('keeps the season of another season in Spelers, with and without the choice', () => {
    expect(hrefs(statisticsBarItems({ competition: 'all', current: undefined, season: '2025/26' }))[0]).toBe(
      '/statistieken/spelers/2025-26',
    )
    expect(hrefs(statisticsBarItems({ competition: 'league', current: undefined, season: '2025/26' }))).toEqual([
      '/statistieken/spelers/2025-26?competitie=eredivisie',
      '/statistieken/tegenstanders?competitie=eredivisie',
    ])
  })

  it('uses the address without a season for the current season, which has one address', () => {
    expect(hrefs(statisticsBarItems({ competition: 'league', current: undefined, season: '2026/27' }))[0]).toBe(
      '/statistieken/spelers?competitie=eredivisie',
    )
  })

  it('marks the sub-page the visitor is on, and none on the page of a season', () => {
    const current = (subpage: 'opponents' | 'players' | undefined) =>
      statisticsBarItems({ competition: 'all', current: subpage }).map((item) => item.current)

    expect(current('players')).toEqual([true, false])
    expect(current('opponents')).toEqual([false, true])
    expect(current(undefined)).toEqual([false, false])
  })
})

describe('StatisticsBar', () => {
  const render = async (searchParams: Record<string, string | string[] | undefined>, season?: string) =>
    renderToStaticMarkup(
      await StatisticsBar({ current: 'players', searchParams: Promise.resolve(searchParams), season }),
    )

  const links = (html: string) =>
    [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label])

  it('draws the links of the bar from the choice in the address', async () => {
    expect(links(await render({ competitie: 'eredivisie' }, '2025/26'))).toEqual([
      ['/statistieken/spelers/2025-26?competitie=eredivisie', 'Spelers'],
      ['/statistieken/tegenstanders?competitie=eredivisie', 'Tegenstanders'],
    ])
  })

  it('draws the plain addresses without a choice', async () => {
    expect(links(await render({}, '2025/26'))).toEqual([
      ['/statistieken/spelers/2025-26', 'Spelers'],
      ['/statistieken/tegenstanders', 'Tegenstanders'],
    ])
  })

  it.each([
    ['a value that is not known', 'alle'],
    ['an empty value', ''],
    ['a different spelling', 'Eredivisie'],
    ['a value that is given twice', ['eredivisie', 'eredivisie']],
  ])('does not repeat %s: the page is "niet gevonden", so the links go to the default', async (_name, value) => {
    expect(links(await render({ competitie: value }))).toEqual([
      ['/statistieken/spelers', 'Spelers'],
      ['/statistieken/tegenstanders', 'Tegenstanders'],
    ])
  })

  it('marks the current sub-page with aria-current="page" in the bar of the menu', async () => {
    const html = await render({})

    expect(html).toContain('class="hf-navigation-bar"')
    expect(html).toMatch(/aria-current="page"[^>]*href="\/statistieken\/spelers"/)
    expect(html.match(/aria-current/g)).toHaveLength(1)
  })
})
