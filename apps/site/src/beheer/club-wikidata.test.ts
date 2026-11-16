import { describe, expect, it } from 'vitest'

import { readWikidataNumber } from './club-wikidata'

describe('readWikidataNumber', () => {
  it('reads a Q-number in any case with spaces round it, and nothing as no number', () => {
    expect(readWikidataNumber(' q 1234 ')).toEqual({ id: 'Q1234' })
    expect(readWikidataNumber('')).toEqual({ id: null })
  })

  it.each(['1234', 'Q0', 'Q01', 'P31', 'Q12a', 'Q1234567890123456789', 'https://www.wikidata.org/wiki/Q1'])(
    'refuses %s',
    (text) => {
      expect(readWikidataNumber(text)).toHaveProperty('error')
    },
  )
})
