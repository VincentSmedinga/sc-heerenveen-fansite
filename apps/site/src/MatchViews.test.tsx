import { describe, expect, it } from 'vitest'

import { imageCredit, playedLine } from './MatchViews'

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

describe('playedLine', () => {
  it('says how many matches the card counts, without a base or a season', () => {
    expect(playedLine(40)).toBe('Alle 40 gespeelde wedstrijden')
    expect(playedLine(2)).toBe('Alle 2 gespeelde wedstrijden')
    expect(playedLine(1)).toBe('1 gespeelde wedstrijd')
  })
})
