import { predictionPoints } from '@fansite/shared/prediction-points'
import { describe, expect, it } from 'vitest'

import type { ScoredMatch, ScoredPrediction } from './prediction-results'

import { guessText, listItemOf, reasonText } from './prediction-words'

const clubs = { away: 'FC Twente', home: 'sc Heerenveen' }
const s = (home: number, away: number) => ({ away, home })
const played = { fullTime: s(2, 1), halfTime: s(1, 0) }
const pointsOf = (half: [number, number], full: [number, number]) =>
  predictionPoints({ fullTime: s(...full), halfTime: s(...half) }, played)

describe('why a part gave its points', () => {
  it.each([
    { full: [2, 1], text: 'Precies goed 20', which: 'fullTime' },
    { full: [3, 1], text: 'Goede uitslag 10, goals van FC Twente goed 5', which: 'fullTime' },
    { full: [2, 0], text: 'Goede uitslag 10, goals van sc Heerenveen goed 5', which: 'fullTime' },
    { full: [2, 2], text: 'Goals van sc Heerenveen goed 5', which: 'fullTime' },
    { full: [1, 0], text: 'Goede uitslag 10', which: 'fullTime' },
    { full: [0, 3], text: 'Niets goed', which: 'fullTime' },
  ] as const)('says "$text" for $full', ({ full, text, which }) => {
    const part = pointsOf([1, 0], [...full])[which]

    expect(part && reasonText(part, which, clubs)).toBe(text)
  })

  it('uses the half numbers for the half-time score', () => {
    const half = (guess: [number, number]) => {
      const part = pointsOf(guess, [2, 1]).halfTime

      return part && reasonText(part, 'halfTime', clubs)
    }

    expect(half([1, 0])).toBe('Precies goed 10')
    expect(half([2, 0])).toBe('Goede uitslag 5, goals van FC Twente goed 2')
    expect(half([1, 1])).toBe('Goals van sc Heerenveen goed 2')
  })
})

const match = (extra: Partial<ScoredMatch> = {}): ScoredMatch => ({
  clubSlug: 'fc-twente',
  competition: 'Eredivisie',
  dateText: null,
  goalsAgainst: 1,
  goalsFor: 2,
  home: true,
  id: 1,
  kickoffAt: new Date('2026-11-21T19:45:00Z'),
  matchDate: '2026-11-21',
  opponent: 'FC Twente',
  round: 'Speelronde 14',
  season: '2026/27',
  state: 'played',
  ...extra,
})

const item = (extra: Partial<ScoredMatch> = {}): ScoredPrediction => ({
  guess: { fullTime: s(3, 1), halfTime: s(1, 1) },
  match: match(extra),
  points: pointsOf([1, 1], [3, 1]),
  result: played,
})

describe('a row of the list', () => {
  const now = new Date('2026-11-22T10:00:00Z')

  it('has the clubs, the score, the prediction and the points of a match that was played', () => {
    expect(listItemOf(item(), now)).toMatchObject({
      ...clubs,
      competition: 'Eredivisie',
      points: 17,
      prediction: { fullTime: { right: true, score: '3–1' }, halfTime: { right: true, score: '1–1' } },
      score: '2–1',
    })
  })

  it('marks the part that gave nothing as wrong, and the part that gave points as right', () => {
    const row = listItemOf({ ...item(), points: pointsOf([1, 1], [0, 2]) }, now)

    expect(row.prediction.halfTime.right).toBe(true)
    expect(row.prediction.fullTime.right).toBe(false)
  })

  it('gives no colour to a match that was not played', () => {
    const row = listItemOf(item({ goalsAgainst: null, goalsFor: null, state: 'live' }), now)

    expect(row.prediction.fullTime.right).toBeUndefined()
    expect(row.prediction.halfTime.right).toBeUndefined()
  })

  it('writes the score in the order of the clubs on the line, for a match away', () => {
    expect(listItemOf(item({ goalsAgainst: 3, goalsFor: 0, home: false }), now)).toMatchObject({
      away: 'sc Heerenveen',
      home: 'FC Twente',
      score: '3–0',
    })
  })

  it.each([
    { state: 'live', text: 'Bezig' },
    { state: 'cancelled', text: 'Afgelast' },
    { state: 'postponed', text: 'Uitgesteld' },
  ] as const)('says $text and gives no points for a match that is $state', ({ state, text }) => {
    const row = listItemOf(item({ goalsAgainst: null, goalsFor: null, state }), now)

    expect(row.status).toBe(text)
    expect(row.points).toBeUndefined()
    expect(row.score).toBeUndefined()
  })

  it('says nothing about the state of a match that has not been played yet', () => {
    const row = listItemOf(item({ goalsAgainst: null, goalsFor: null, state: 'upcoming' }), now)

    expect(row.status).toBeUndefined()
    expect(row.points).toBeUndefined()
  })

  it('says what the fan predicted', () => {
    expect(guessText(item())).toBe('Jij: 1–1 bij rust, 3–1 eind')
  })
})
