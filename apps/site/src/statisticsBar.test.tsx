import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { StatisticsBar, statisticsBarItems } from './statisticsBar'

const hrefs = (items: { href: string }[]) => items.map(({ href }) => href)

describe('statisticsBarItems', () => {
  it('goes to Tegenstanders with all matches, the plain address', () => {
    expect(hrefs(statisticsBarItems({ competition: 'all', current: undefined }))).toEqual([
      '/statistieken/tegenstanders',
    ])
  })

  it('keeps the choice of the Eredivisie in the link', () => {
    expect(hrefs(statisticsBarItems({ competition: 'league', current: undefined }))).toEqual([
      '/statistieken/tegenstanders?competitie=eredivisie',
    ])
  })

  it('has no link to Spelers, which is an item of the main menu', () => {
    expect(hrefs(statisticsBarItems({ competition: 'all', current: undefined })).join()).not.toContain('spelers')
  })

  it('marks the sub-page the visitor is on, and none on the page of a season', () => {
    const current = (subpage: 'opponents' | undefined) =>
      statisticsBarItems({ competition: 'all', current: subpage }).map((item) => item.current)

    expect(current('opponents')).toEqual([true])
    expect(current(undefined)).toEqual([false])
  })
})

describe('StatisticsBar', () => {
  const render = async (searchParams: Record<string, string | string[] | undefined>) =>
    renderToStaticMarkup(await StatisticsBar({ current: 'opponents', searchParams: Promise.resolve(searchParams) }))

  const links = (html: string) =>
    [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label])

  it('draws the link of the bar from the choice in the address', async () => {
    expect(links(await render({ competitie: 'eredivisie' }))).toEqual([
      ['/statistieken/tegenstanders?competitie=eredivisie', 'Tegenstanders'],
    ])
  })

  it('draws the plain address without a choice', async () => {
    expect(links(await render({}))).toEqual([['/statistieken/tegenstanders', 'Tegenstanders']])
  })

  it.each([
    ['a value that is not known', 'alle'],
    ['an empty value', ''],
    ['a different spelling', 'Eredivisie'],
    ['a value that is given twice', ['eredivisie', 'eredivisie']],
  ])('does not repeat %s: the page is "niet gevonden", so the link goes to the default', async (_name, value) => {
    expect(links(await render({ competitie: value }))).toEqual([['/statistieken/tegenstanders', 'Tegenstanders']])
  })

  it('marks the current sub-page with aria-current="page" in the bar of the menu', async () => {
    const html = await render({})

    expect(html).toContain('class="hf-navigation-bar"')
    expect(html).toMatch(/aria-current="page"[^>]*href="\/statistieken\/tegenstanders"/)
    expect(html.match(/aria-current/g)).toHaveLength(1)
  })
})
