import { describe, expect, it } from 'vitest'

import { continentOf, continentOfCountry, continents, countByContinent, countriesWithoutContinent } from './continents'
import { countryCodes } from './countries'

describe('the table of continents', () => {
  it('has a continent for every country code that the pages know', () => {
    expect(countriesWithoutContinent()).toEqual([])
  })

  it('has no country twice and no code that is not a country', () => {
    expect(Object.keys(continentOfCountry).sort()).toEqual([...countryCodes].sort())
  })

  it('has the six continents', () => {
    expect(new Set(Object.values(continentOfCountry))).toEqual(new Set(continents))
  })

  it('puts the countries in two continents with the football association', () => {
    for (const code of ['TR', 'RU', 'CY', 'GE', 'AM', 'AZ', 'KZ', 'IL']) {
      expect(continentOf(code)).toBe('europe')
    }
  })

  it('puts Central America and the Caribbean in North America', () => {
    for (const code of ['GT', 'CW', 'JM', 'CR']) {
      expect(continentOf(code)).toBe('north-america')
    }
  })

  it('does not know a code that is not a country', () => {
    expect(continentOf('ZZ')).toBeUndefined()
    expect(continentOf('toString')).toBeUndefined()
  })
})

describe('countByContinent', () => {
  it('counts a country in Asia and in Europe, leaves out an unknown country and keeps an empty continent at 0', () => {
    const { counts, unknown } = countByContinent(['NL', 'NL', 'JP', 'ZZ', undefined])

    expect(counts).toEqual([
      { continent: 'europe', count: 2, name: 'Europa' },
      { continent: 'asia', count: 1, name: 'Azië' },
      { continent: 'africa', count: 0, name: 'Afrika' },
      { continent: 'north-america', count: 0, name: 'Noord-Amerika' },
      { continent: 'oceania', count: 0, name: 'Oceanië' },
      { continent: 'south-america', count: 0, name: 'Zuid-Amerika' },
    ])
    expect(unknown).toBe(2)
  })

  it('puts continents with as many players in the order of their name', () => {
    const { counts } = countByContinent(['JP', 'ZA'])

    expect(counts.slice(0, 2).map((row) => row.name)).toEqual(['Afrika', 'Azië'])
  })
})
