import type { PublicStandingsRow } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import type { HomeAwayTally } from './matches'

import { allSeasonsKeyFigures, statisticsKeyFigures } from './statistics-key-figures'

const row = (club: string, position: number, played = 30): PublicStandingsRow =>
  ({ club, played, position }) as PublicStandingsRow

const tally = (extra: Partial<HomeAwayTally> = {}): HomeAwayTally => ({
  cleanSheets: 9,
  drawn: 10,
  goalsAgainst: 66,
  goalsFor: 69,
  goalsPerMatch: 1.8,
  lost: 14,
  played: 39,
  points: 55,
  pointsPerMatch: 1.4,
  won: 15,
  ...extra,
})

const text = (figures: ReturnType<typeof statisticsKeyFigures>) =>
  figures.map(({ figure, label, note }) => `${figure} ${label}, ${note}`)

describe('the key figures of Wedstrijden · Cijfers', () => {
  it('has four figures: the place, the matches, won, drawn and lost, and the goals', () => {
    expect(text(statisticsKeyFigures([row('Ajax', 1), row('sc Heerenveen', 9)], tally(), 'all'))).toEqual([
      '9e plek, in de Eredivisie',
      '39 wedstrijden, gespeeld in alle competities',
      '15–10–14 gewonnen, gelijk, verloren, in alle competities',
      '69–66 doelpunten, voor en tegen in alle competities',
    ])
  })

  it('names the choice of competition under the three counts, but not under the place', () => {
    const figures = statisticsKeyFigures([row('sc Heerenveen', 9)], tally({ played: 1 }), 'cup')

    expect(text(figures)[0]).toBe('9e plek, in de Eredivisie')
    expect(text(figures)[1]).toBe('1 wedstrijd, gespeeld in de Beker')
  })

  it('writes a number of a thousand or more with a point', () => {
    expect(statisticsKeyFigures([], tally({ goalsFor: 2259, played: 1385 }), 'all')[0]?.figure).toBe('1.385')
  })

  it('leaves out the place when the table has no row of us, or we have not played', () => {
    expect(statisticsKeyFigures([row('Ajax', 1)], tally(), 'all')).toHaveLength(3)
    expect(statisticsKeyFigures([row('sc Heerenveen', 1, 0)], tally(), 'all')).toHaveLength(3)
  })

  it('has only the place without a played match, and then no row at all', () => {
    expect(statisticsKeyFigures([row('sc Heerenveen', 9)], tally({ played: 0 }), 'all')).toEqual([])
    expect(statisticsKeyFigures([], tally({ played: 0 }), 'all')).toEqual([])
  })
})

describe('the key figures of Wedstrijden · Cijfers with all seasons', () => {
  it('has the matches, won, drawn and lost, and the goals, with a point between the thousands', () => {
    expect(
      text(
        allSeasonsKeyFigures(
          tally({ drawn: 358, goalsAgainst: 2075, goalsFor: 2259, lost: 475, played: 1385, won: 552 }),
          'all',
          '1990/91',
        ),
      ),
    ).toEqual([
      '1.385 wedstrijden, gespeeld in alle competities sinds 1990/91',
      '552–358–475 gewonnen, gelijk, verloren, in alle competities sinds 1990/91',
      '2.259–2.075 doelpunten, voor en tegen in alle competities sinds 1990/91',
    ])
  })

  it('names the choice of competition', () => {
    expect(allSeasonsKeyFigures(tally(), 'league', '1990/91')[0]?.note).toBe('gespeeld in de Eredivisie sinds 1990/91')
  })

  it('has no figures without a played match', () => {
    expect(allSeasonsKeyFigures(tally({ played: 0 }), 'all', '1990/91')).toEqual([])
  })
})
