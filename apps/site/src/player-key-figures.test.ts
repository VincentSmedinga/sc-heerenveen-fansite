import { describe, expect, it } from 'vitest'

import type { PlayerSeason } from './player-seasons'

import { playerKeyFigures } from './player-key-figures'

const season = (name: string, extra: Partial<PlayerSeason> = {}): PlayerSeason => ({
  assists: 1,
  cleanSheets: undefined,
  conceded: undefined,
  goals: 4,
  goalsByCompetition: {},
  matchesInSeason: 34,
  played: 30,
  red: 0,
  reportedMatches: 34,
  season: name,
  shirtNumber: undefined,
  source: 'lineups',
  started: 28,
  yellow: 2,
  ...extra,
})

const text = (figures: ReturnType<typeof playerKeyFigures>) =>
  figures.map(({ figure, label, note }) => `${figure} ${label}, ${note}`)

describe('the key figures of a player', () => {
  it('has the goals, seasons, matches and assists of a forward, in that order', () => {
    const seasons = [season('2003/04', { goals: 19 }), season('2002/03', { goals: 5 })]

    expect(text(playerKeyFigures(seasons, 'aanvaller'))).toEqual([
      '24 doelpunten, in alle competities',
      '2 seizoenen, tussen 2002 en 2004',
      '60 wedstrijden, in alle competities',
      '2 assists, in alle competities',
    ])
  })

  it('drops the matches and assists of a forward without line-ups and says what the goals count', () => {
    const seasons = [
      season('2009/10', { assists: undefined, played: undefined, source: 'none' }),
      season('2003/04', { assists: undefined, played: undefined, source: 'none' }),
    ]

    expect(text(playerKeyFigures(seasons, 'aanvaller'))).toEqual([
      '8 doelpunten, in alle competities',
      '2 seizoenen, tussen 2003 en 2010',
    ])
  })

  it('says in how many seasons a figure is known when not every season has it', () => {
    const seasons = [season('2003/04'), season('2002/03', { played: undefined, source: 'none' })]

    expect(text(playerKeyFigures(seasons, 'aanvaller'))).toContain('30 wedstrijden, in 1 van de 2 seizoenen')
  })

  it('has the matches, clean sheets, goals against per match with a comma and seasons of a goalkeeper', () => {
    const seasons = [
      season('2003/04', { cleanSheets: 18, conceded: 41, played: 43 }),
      season('2002/03', { cleanSheets: 7, conceded: 61, played: 38 }),
    ]

    expect(text(playerKeyFigures(seasons, 'doelman'))).toEqual([
      '81 wedstrijden, in alle competities',
      '25 keer de nul, in alle competities',
      '1,26 tegendoelpunten, per wedstrijd, in alle competities',
      '2 seizoenen, tussen 2002 en 2004',
    ])
  })

  it('has the matches, clean sheets with him in the line-up, goals and seasons of a defender', () => {
    const seasons = [season('2001/02', { cleanSheets: 17 })]

    expect(text(playerKeyFigures(seasons, 'verdediger'))).toEqual([
      '30 wedstrijden, in alle competities',
      '17 keer de nul, met hem in de basis, in alle competities',
      '4 doelpunten, in alle competities',
      '1 seizoen, in 2001/02',
    ])
  })

  it('has the matches, goals, assists and seasons of a midfielder', () => {
    expect(text(playerKeyFigures([season('2001/02')], 'middenvelder')).map((line) => line.split(' ')[1])).toEqual([
      'wedstrijden,',
      'doelpunten,',
      'assist,',
      'seizoen,',
    ])
  })

  it('says that the table of Wikipedia leaves competitions out', () => {
    const seasons = [season('2026/27', { played: 7, source: 'wikipedia' })]

    expect(text(playerKeyFigures(seasons, 'middenvelder'))[0]).toBe(
      '7 wedstrijden, uit de tabel van Wikipedia, niet alle competities',
    )
  })

  it('has the seasons, goals and matches of a player without a line', () => {
    expect(text(playerKeyFigures([season('2001/02')], undefined))).toEqual([
      '1 seizoen, in 2001/02',
      '4 doelpunten, in alle competities',
      '30 wedstrijden, in alle competities',
    ])
  })

  it('shows no row when fewer than two figures are known', () => {
    expect(
      playerKeyFigures([season('2001/02', { goals: undefined, played: undefined, source: 'none' })], undefined),
    ).toEqual([])
  })
})
