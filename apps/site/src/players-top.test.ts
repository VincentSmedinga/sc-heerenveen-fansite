import { describe, expect, it } from 'vitest'

import { cleanSheetsLine, crowdedLabel, firstPlaces, isCrowded } from './players-top'

const place = (position: number, count: number) => ({
  goals: 4 - position,
  players: Array.from({ length: count }, (_, index) => ({ givenName: 'A', id: `${position}-${index}`, surname: 'B' })),
  position,
})

describe('firstPlaces', () => {
  it('keeps three places, whatever number of players a place has', () => {
    const places = [place(1, 1), place(2, 2), place(4, 5), place(9, 1)] as never

    expect(firstPlaces(places)).toHaveLength(3)
  })
})

describe('a crowded place', () => {
  it('starts at three players, and is named by their number', () => {
    expect(isCrowded(place(1, 2) as never)).toBe(false)
    expect(isCrowded(place(1, 3) as never)).toBe(true)
    expect(crowdedLabel(place(1, 4) as never)).toBe('4 spelers')
  })
})

describe('cleanSheetsLine', () => {
  const last = {
    dateText: null,
    goalsAgainst: 0,
    goalsFor: 2,
    home: false,
    kickoffAt: null,
    matchDate: '2026-10-18',
    opponent: 'NEC',
    status: 'played',
  } as never
  const now = new Date('2026-10-23T13:40:00Z')

  it('names the matches played, the score, the side, the opponent and the day', () => {
    expect(cleanSheetsLine({ last, played: 39, sheets: 9 }, now, 'dit seizoen')).toBe(
      'In 39 wedstrijden. De laatste keer: 2–0 uit bij NEC, zo 18 okt.',
    )
  })

  it('says "Nog niet" and nothing about the last time without a clean sheet', () => {
    expect(cleanSheetsLine({ last: undefined, played: 3, sheets: 0 }, now, 'in 2025/26')).toBe(
      'Nog niet de nul gehouden in 2025/26.',
    )
  })
})
