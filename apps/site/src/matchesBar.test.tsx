import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { MatchesBar, matchesBarItems } from './matchesBar'

const hrefs = (items: { href: string }[]) => items.map(({ href }) => href)

describe('matchesBarItems', () => {
  it('goes to Tegenstanders with all matches, the plain address', () => {
    expect(hrefs(matchesBarItems({ competition: 'all', current: undefined }))).toEqual(['/tegenstanders'])
  })

  it('keeps the choice of the Eredivisie in the link', () => {
    expect(hrefs(matchesBarItems({ competition: 'league', current: undefined }))).toEqual([
      '/tegenstanders?competitie=eredivisie',
    ])
  })

  it('has no link to Spelers, which is an item of the main menu', () => {
    expect(hrefs(matchesBarItems({ competition: 'all', current: undefined })).join()).not.toContain('spelers')
  })

  it('marks the sub-page the visitor is on, and none on the page of a season', () => {
    const current = (subpage: 'opponents' | undefined) =>
      matchesBarItems({ competition: 'all', current: subpage }).map((item) => item.current)

    expect(current('opponents')).toEqual([true])
    expect(current(undefined)).toEqual([false])
  })
})

describe('MatchesBar', () => {
  const render = async (searchParams: Record<string, string | string[] | undefined>) =>
    renderToStaticMarkup(await MatchesBar({ current: 'opponents', searchParams: Promise.resolve(searchParams) }))

  const links = (html: string) =>
    [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label])

  it('draws the link of the bar from the choice in the address', async () => {
    expect(links(await render({ competitie: 'eredivisie' }))).toEqual([
      ['/tegenstanders?competitie=eredivisie', 'Tegenstanders'],
    ])
  })

  it('draws the plain address without a choice', async () => {
    expect(links(await render({}))).toEqual([['/tegenstanders', 'Tegenstanders']])
  })

  it.each([
    ['a value that is not known', 'alle'],
    ['an empty value', ''],
    ['a different spelling', 'Eredivisie'],
    ['a value that is given twice', ['eredivisie', 'eredivisie']],
  ])('does not repeat %s: the page is "niet gevonden", so the link goes to the default', async (_name, value) => {
    expect(links(await render({ competitie: value }))).toEqual([['/tegenstanders', 'Tegenstanders']])
  })

  it('marks the current sub-page with aria-current="page" in the bar of the menu', async () => {
    const html = await render({})

    expect(html).toContain('class="hf-navigation-bar"')
    expect(html).toMatch(/aria-current="page"[^>]*href="\/tegenstanders"/)
    expect(html.match(/aria-current/g)).toHaveLength(1)
  })
})
