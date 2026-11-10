import { isCountryCode } from '@fansite/shared/countries'
import { describe, expect, it } from 'vitest'

import { wikidataCountryCodes } from './person-countries.ts'

describe('wikidataCountryCodes', () => {
  it('gives every item a code of the list of countries', () => {
    expect([...wikidataCountryCodes].filter(([id, code]) => !/^Q[1-9]\d*$/u.test(id) || !isCountryCode(code))).toEqual(
      [],
    )
  })

  it('knows the country and the kingdom of the Netherlands and of Denmark', () => {
    expect(['Q55', 'Q29999', 'Q35', 'Q756617'].map((id) => wikidataCountryCodes.get(id))).toEqual([
      'NL',
      'NL',
      'DK',
      'DK',
    ])
  })

  it('has no country that is gone, so its persons stay a gap', () => {
    expect(wikidataCountryCodes.has('Q36704')).toBe(false)
    expect(wikidataCountryCodes.has('Q15180')).toBe(false)
  })
})
