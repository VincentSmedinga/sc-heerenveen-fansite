import { describe, expect, it } from 'vitest'

import type { OpenGame, OpenMatch } from './open-games'

import { openGameCards, openGameLinks } from './open-game-views'

// Friday 20 November 2026, noon in the Netherlands.
const now = new Date('2026-11-20T11:00:00Z')

const next: OpenMatch = {
  competition: 'Eredivisie',
  home: true,
  opponent: 'FC Twente',
  round: '14',
  season: '2026/27',
}

const last: OpenMatch = { ...next, home: false, opponent: 'Ajax', round: '13' }

const games: OpenGame[] = [
  { closesAt: new Date('2026-11-21T15:45:00Z'), game: 'prognose', match: next },
  { closesAt: new Date('2026-11-26T19:00:00Z'), game: 'uitblinker', match: last },
  { closesAt: new Date('2026-11-28T15:45:00Z'), game: 'fjouwer', match: next },
  { closesAt: new Date('2026-11-30T23:00:00Z'), game: 'fantest', month: 11 },
]

describe('the cards of the open games', () => {
  it('says until when each is open in Dutch time, with the date from six days away', () => {
    expect(openGameCards(games, now).map(({ tag }) => tag)).toEqual([
      'Open tot za 16.45',
      'Open tot do 26 nov 20.00',
      'Open tot za 28 nov 16.45',
      'Open tot ma 30 nov 23.59',
    ])
  })

  it('gives each a short link, named by what it is about, and no sentence about the match', () => {
    expect(openGameCards(games, now).map(({ href, link, linkName, name }) => ({ href, link, linkName, name }))).toEqual(
      [
        { href: '/fans/prognose', link: 'Voorspel', linkName: 'Voorspel sc Heerenveen – FC Twente', name: 'Prognose' },
        {
          href: '/fans/uitblinker',
          link: 'Geef cijfers',
          linkName: 'Geef cijfers voor Ajax – sc Heerenveen',
          name: 'Uitblinker',
        },
        {
          href: '/fans/fjouwer',
          link: 'Kies je vier',
          linkName: 'Kies je vier voor sc Heerenveen – FC Twente',
          name: 'Fjouwer',
        },
        { href: '/fans/fantest', link: 'Doe de test', linkName: 'Doe de test van november', name: 'Fantest' },
      ],
    )
  })
})

describe('the links under the matches', () => {
  it('puts each link under its match, the Prognose before the Fjouwer, and no link for the Fantest', () => {
    const links = openGameLinks(games, '2026/27')

    expect([...links.keys()]).toEqual(['Eredivisie|14', 'Eredivisie|13'])
    expect(links.get('Eredivisie|14')).toEqual([
      {
        game: 'prognose',
        href: '/fans/prognose',
        match: 'sc Heerenveen – FC Twente',
        text: 'Wat denk je dat het wordt?',
      },
      {
        game: 'fjouwer',
        href: '/fans/fjouwer',
        match: 'sc Heerenveen – FC Twente',
        text: 'Welke fjouwer stel jij op?',
      },
    ])
    expect(links.get('Eredivisie|13')).toEqual([
      { game: 'uitblinker', href: '/fans/uitblinker', match: 'Ajax – sc Heerenveen', text: 'Wie vond jij de besten?' },
    ])
  })

  it('has no link for a match of another season', () => {
    expect(openGameLinks(games, '2025/26').size).toBe(0)
  })
})
