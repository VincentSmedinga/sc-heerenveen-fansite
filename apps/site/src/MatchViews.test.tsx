import { describe, expect, it } from 'vitest'

import type { ScoreCount } from './matches'

import { imageCredit, scoreCountsSentence } from './MatchViews'

describe('imageCredit', () => {
  it('has no button for a card without facts', () => {
    expect(imageCredit(false)).toBeUndefined()
    expect(imageCredit(false, '2025/26')).toBeUndefined()
  })

  it('gives the credit of Wikipedia for a card with facts, and no season for the current season', () => {
    expect(imageCredit(true)).toMatchObject({ season: undefined })
    expect(imageCredit(true)?.source).toBeDefined()
  })

  it('gives the season of a card of a season that is over, for the image and its file name', () => {
    expect(imageCredit(true, '2025/26')).toMatchObject({ season: '2025/26' })
  })
})

describe('scoreCountsSentence', () => {
  const count = (outcome: ScoreCount['outcome'], times: number): ScoreCount => ({
    count: times,
    goalsAgainst: outcome === 'win' ? 0 : outcome === 'loss' ? 2 : 1,
    goalsFor: outcome === 'win' ? 2 : outcome === 'loss' ? 0 : 1,
    outcome,
  })

  it('adds up the scores of each outcome: won, drawn and lost', () => {
    expect(
      scoreCountsSentence([count('win', 5), { ...count('win', 3), goalsFor: 4 }, count('draw', 1), count('loss', 5)]),
    ).toBe('8 keer gewonnen, 1 keer gelijk, 5 keer verloren')
  })

  it('leaves out an outcome that did not happen', () => {
    expect(scoreCountsSentence([count('win', 2), count('loss', 1)])).toBe('2 keer gewonnen, 1 keer verloren')
  })

  it('has the same form for one match, whichever way it went', () => {
    expect(scoreCountsSentence([count('win', 1)])).toBe('1 keer gewonnen')
    expect(scoreCountsSentence([count('draw', 1)])).toBe('1 keer gelijk')
    expect(scoreCountsSentence([count('loss', 1)])).toBe('1 keer verloren')
  })
})
