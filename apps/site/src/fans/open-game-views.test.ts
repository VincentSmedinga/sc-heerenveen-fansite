import { describe, expect, it } from 'vitest'

import type { OpenGame, OpenMatch } from './open-games'

import { openGameCards, openGameLinks } from './open-game-views'

const next = {
  competition: 'Eredivisie',
  home: true,
  opponent: 'FC Twente',
  round: '14',
  season: '2026/27',
} as OpenMatch

const last: OpenMatch = { ...next, home: false, opponent: 'Ajax', round: '13' }

const games: OpenGame[] = [
  { closesAt: new Date('2026-11-21T15:45:00Z'), game: 'prognose', match: next },
  { closesAt: new Date('2026-11-26T19:00:00Z'), game: 'uitblinker', match: last },
  { closesAt: new Date('2026-11-28T15:45:00Z'), game: 'fjouwer', match: next },
  { closesAt: new Date('2026-11-30T23:00:00Z'), game: 'fantest', month: 11 },
]

describe('the cards of the open games', () => {
  it('gives each a link that says what you can do, named by what it is about, and no deadline', () => {
    expect(openGameCards(games)).toEqual([
      {
        game: 'prognose',
        href: '/fans/prognose',
        link: 'Voorspel de uitslag',
        linkName: 'Voorspel de uitslag van sc Heerenveen – FC Twente',
        name: 'Prognose',
      },
      {
        game: 'uitblinker',
        href: '/fans/uitblinker',
        link: 'Geef de spelers een cijfer',
        linkName: 'Geef de spelers een cijfer voor Ajax – sc Heerenveen',
        name: 'Uitblinker',
      },
      {
        game: 'fjouwer',
        href: '/fans/fjouwer',
        link: 'Kies jouw fjouwer',
        linkName: 'Kies jouw fjouwer voor sc Heerenveen – FC Twente',
        name: 'Fjouwer',
      },
      {
        game: 'fantest',
        href: '/fans/fantest',
        link: 'Doe de test van november',
        linkName: 'Doe de test van november',
        name: 'Fantest',
      },
    ])
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
