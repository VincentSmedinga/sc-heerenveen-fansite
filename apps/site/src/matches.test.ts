import type { PublicMatch, PublicStandingsRow } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import { overviewOf, standingsAround } from './matches'

const match = (round: string, status: PublicMatch['status'], matchDate: string): PublicMatch => ({
  competition: 'Eredivisie',
  dateText: null,
  extraTime: false,
  goals: [],
  goalsAgainst: status === 'played' ? 0 : null,
  goalsFor: status === 'played' ? 1 : null,
  home: true,
  kickoffAt: new Date(`${matchDate}T14:30:00Z`),
  matchDate,
  opponent: 'Testdorp FC',
  penaltiesAgainst: null,
  penaltiesFor: null,
  round,
  stadium: null,
  status,
})

const season = [
  match('Speelronde 1', 'played', '2026-08-01'),
  match('Speelronde 2', 'played', '2026-08-08'),
  match('Speelronde 3', 'played', '2026-08-15'),
  match('Speelronde 4', 'played', '2026-08-22'),
  match('Speelronde 5', 'postponed', '2026-08-29'),
  match('Speelronde 6', 'scheduled', '2026-09-05'),
  match('Speelronde 7', 'scheduled', '2026-09-12'),
]

describe('overviewOf', () => {
  it('puts the matches that are not played in the programme, in the order they are given, a postponed one included', () => {
    expect(overviewOf(season).programme.map((item) => item.round)).toEqual([
      'Speelronde 5',
      'Speelronde 6',
      'Speelronde 7',
    ])
  })

  it('gives the results with the newest first', () => {
    expect(overviewOf(season).results.map((item) => item.round)).toEqual([
      'Speelronde 4',
      'Speelronde 3',
      'Speelronde 2',
      'Speelronde 1',
    ])
  })

  it('gives the newest result as the previous match for the homepage', () => {
    expect(overviewOf(season).previous?.round).toBe('Speelronde 4')
    expect(overviewOf([match('Speelronde 5', 'postponed', '2026-08-29')]).previous).toBeUndefined()
  })

  it('takes the first match that is scheduled as the next one, and not a postponed match', () => {
    expect(overviewOf(season).next?.round).toBe('Speelronde 6')
  })

  it('has no next match when only a postponed one is left, and nothing at all for no matches', () => {
    expect(overviewOf([match('Speelronde 5', 'postponed', '2026-08-29')]).next).toBeUndefined()
    expect(overviewOf([])).toEqual({ next: undefined, previous: undefined, programme: [], results: [] })
  })

  it('does not change the list it is given', () => {
    const copy = [...season]

    overviewOf(season)

    expect(season).toEqual(copy)
  })
})

const row = (position: number, club: string): PublicStandingsRow => ({
  club,
  drawn: 0,
  goalDifference: 0,
  goalsAgainst: 0,
  goalsFor: 0,
  lost: 0,
  played: 0,
  points: 0,
  position,
  validOn: '2026-10-18',
  won: 0,
})

const table = ['Een', 'Twee', 'Drie', 'sc Heerenveen', 'Vijf', 'Zes', 'Zeven'].map((club, index) =>
  row(index + 1, club),
)

describe('standingsAround', () => {
  it('gives three clubs with sc Heerenveen in the middle', () => {
    expect(standingsAround(table).map((item) => item.club)).toEqual(['Drie', 'sc Heerenveen', 'Vijf'])
  })

  it('keeps the real positions', () => {
    expect(standingsAround(table).map((item) => item.position)).toEqual([3, 4, 5])
  })

  it('gives the first three when sc Heerenveen is first or second, so it is the middle one only if possible', () => {
    const first = [row(1, 'sc Heerenveen'), ...table.slice(0, 3).map((item) => row(item.position + 1, item.club))]
    const second = [row(1, 'Een'), row(2, 'sc Heerenveen'), row(3, 'Drie'), row(4, 'Vier')]

    expect(standingsAround(first).map((item) => item.club)).toEqual(['sc Heerenveen', 'Een', 'Twee'])
    expect(standingsAround(second).map((item) => item.club)).toEqual(['Een', 'sc Heerenveen', 'Drie'])
  })

  it('gives the last three when sc Heerenveen is last', () => {
    const last = [row(1, 'Een'), row(2, 'Twee'), row(3, 'Drie'), row(4, 'Vier'), row(5, 'sc Heerenveen')]

    expect(standingsAround(last).map((item) => item.club)).toEqual(['Drie', 'Vier', 'sc Heerenveen'])
  })

  it('gives the first three when sc Heerenveen is not in the table, and all of a short table', () => {
    expect(standingsAround(table.filter((item) => item.club !== 'sc Heerenveen')).map((item) => item.club)).toEqual([
      'Een',
      'Twee',
      'Drie',
    ])
    expect(standingsAround(table.slice(0, 2))).toHaveLength(2)
    expect(standingsAround([])).toEqual([])
  })
})
