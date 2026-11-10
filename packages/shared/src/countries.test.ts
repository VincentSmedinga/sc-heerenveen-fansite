import { describe, expect, it } from 'vitest'

import { countryCodes, isCountryCode } from './countries.ts'

describe('countryCodes', () => {
  it('holds the 249 codes of ISO 3166-1 and Kosovo, each once, in capitals and in order', () => {
    expect(countryCodes).toHaveLength(250)
    expect(new Set(countryCodes).size).toBe(250)
    expect(countryCodes.every((code) => /^[A-Z]{2}$/u.test(code))).toBe(true)
    expect([...countryCodes].sort()).toEqual(countryCodes)
  })

  it('knows a code in capitals only, and no country that is gone', () => {
    expect(isCountryCode('NL')).toBe(true)
    expect(isCountryCode('XK')).toBe(true)
    expect(isCountryCode('nl')).toBe(false)
    expect(isCountryCode('YU')).toBe(false)
    expect(isCountryCode('')).toBe(false)
  })
})
