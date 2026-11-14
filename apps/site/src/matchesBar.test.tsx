import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { MatchesBar, matchesBarItems } from './matchesBar'

const hrefs = (items: { href: string }[]) => items.map(({ href }) => href)

describe('matchesBarItems', () => {
  it('goes to Cijfers, Tegenstanders and Zoeken with all matches, the plain addresses', () => {
    expect(hrefs(matchesBarItems({ competition: 'all', current: undefined }))).toEqual([
      '/wedstrijden/cijfers',
      '/tegenstanders',
      '/wedstrijden/zoeken',
    ])
  })

  it('keeps the choice of the Eredivisie in the links to Cijfers and Tegenstanders, and not in Zoeken', () => {
    expect(hrefs(matchesBarItems({ competition: 'league', current: undefined }))).toEqual([
      '/wedstrijden/cijfers?competitie=eredivisie',
      '/tegenstanders?competitie=eredivisie',
      '/wedstrijden/zoeken',
    ])
  })

  it('keeps the season of the page in the link to Cijfers, and not in the one to Tegenstanders', () => {
    expect(hrefs(matchesBarItems({ competition: 'league', current: undefined, season: '2023/24' }))).toEqual([
      '/wedstrijden/cijfers/2023-24?competitie=eredivisie',
      '/tegenstanders?competitie=eredivisie',
      '/wedstrijden/zoeken',
    ])
  })

  it('has no link to Spelers, which is an item of the main menu', () => {
    expect(hrefs(matchesBarItems({ competition: 'all', current: undefined })).join()).not.toContain('spelers')
  })

  it('marks the sub-page the visitor is on, and none on the page of a season', () => {
    const current = (subpage: 'figures' | 'opponents' | 'search' | undefined) =>
      matchesBarItems({ competition: 'all', current: subpage }).map((item) => item.current)

    expect(current('figures')).toEqual([true, false, false])
    expect(current('opponents')).toEqual([false, true, false])
    expect(current('search')).toEqual([false, false, true])
    expect(current(undefined)).toEqual([false, false, false])
  })
})

describe('MatchesBar', () => {
  const render = async (searchParams: Record<string, string | string[] | undefined>) =>
    renderToStaticMarkup(await MatchesBar({ current: 'opponents', searchParams: Promise.resolve(searchParams) }))

  const links = (html: string) =>
    [...html.matchAll(/<a [^>]*href="([^"]*)"[^>]*>([^<]*)<\/a>/g)].map(([, href, label]) => [href, label])

  it('draws the links of the bar from the choice in the address', async () => {
    expect(links(await render({ competitie: 'eredivisie' }))).toEqual([
      ['/wedstrijden/cijfers?competitie=eredivisie', 'Cijfers'],
      ['/tegenstanders?competitie=eredivisie', 'Tegenstanders'],
      ['/wedstrijden/zoeken', 'Zoeken'],
    ])
  })

  it('draws the plain addresses without a choice', async () => {
    expect(links(await render({}))).toEqual([
      ['/wedstrijden/cijfers', 'Cijfers'],
      ['/tegenstanders', 'Tegenstanders'],
      ['/wedstrijden/zoeken', 'Zoeken'],
    ])
  })

  it('takes the season of the page along to Cijfers, and ignores a season that is not one', async () => {
    const withSeason = async (seasonSlug: string) =>
      links(
        renderToStaticMarkup(await MatchesBar({ current: undefined, searchParams: Promise.resolve({}), seasonSlug })),
      )

    expect(await withSeason('2023-24')).toEqual([
      ['/wedstrijden/cijfers/2023-24', 'Cijfers'],
      ['/tegenstanders', 'Tegenstanders'],
      ['/wedstrijden/zoeken', 'Zoeken'],
    ])
    expect(await withSeason('onzin')).toEqual([
      ['/wedstrijden/cijfers', 'Cijfers'],
      ['/tegenstanders', 'Tegenstanders'],
      ['/wedstrijden/zoeken', 'Zoeken'],
    ])
  })

  it.each([
    ['a value that is not known', 'alle'],
    ['an empty value', ''],
    ['a different spelling', 'Eredivisie'],
    ['a value that is given twice', ['eredivisie', 'eredivisie']],
  ])('does not repeat %s: the page is "niet gevonden", so the link goes to the default', async (_name, value) => {
    expect(links(await render({ competitie: value }))).toEqual([
      ['/wedstrijden/cijfers', 'Cijfers'],
      ['/tegenstanders', 'Tegenstanders'],
      ['/wedstrijden/zoeken', 'Zoeken'],
    ])
  })

  it('marks the current sub-page with aria-current="page" in the bar of the menu', async () => {
    const html = await render({})

    expect(html).toContain('class="hf-navigation-bar"')
    expect(html).toMatch(/aria-current="page"[^>]*href="\/tegenstanders"/)
    expect(html.match(/aria-current/g)).toHaveLength(1)
  })
})
