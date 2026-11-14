import { describe, expect, it } from 'vitest'

import {
  allSeasonsAddress,
  allSeasonsChoice,
  allSeasonsSlug,
  pickedAddress,
  seasonAddress,
  seasonChoices,
  seasonChoicesWithAll,
  seasonFromSlug,
  seasonSlug,
} from './seasons'

describe('seasonFromSlug', () => {
  it.each([
    ['2025-26', '2025/26'],
    ['2026-27', '2026/27'],
    ['1999-00', '1999/00'],
    ['1990-91', '1990/91'],
  ])('reads %s as the season %s', (slug, season) => {
    expect(seasonFromSlug(slug)).toBe(season)
  })

  it.each([
    undefined,
    '',
    '2025/26',
    '2025-2026',
    '2025-27',
    '2025-25',
    '2025-6',
    '25-26',
    '0050-51',
    'seizoen',
    'cijfers',
    '2025-26 ',
    ' 2025-26',
    '2025–26',
    '2025-26/',
    '../2025-26',
  ])('does not read %j as a season', (slug) => {
    expect(seasonFromSlug(slug)).toBeUndefined()
  })
})

describe('seasonSlug', () => {
  it('puts a hyphen where the season has a slash, and reads back what it wrote', () => {
    expect(seasonSlug('2025/26')).toBe('2025-26')
    expect(seasonFromSlug(seasonSlug('1999/00'))).toBe('1999/00')
  })
})

describe('seasonAddress', () => {
  it('is the base address for the current season, so a season has one address', () => {
    expect(seasonAddress('/wedstrijden', '2026/27', '2026/27')).toBe('/wedstrijden')
  })

  it('is the base address with the season for another season, for any base address', () => {
    expect(seasonAddress('/wedstrijden', '2025/26', '2026/27')).toBe('/wedstrijden/2025-26')
    expect(seasonAddress('/wedstrijden/cijfers', '2025/26', '2026/27')).toBe('/wedstrijden/cijfers/2025-26')
  })
})

describe('seasonChoices', () => {
  it('keeps the order, writes the season with a slash and sends it with a hyphen', () => {
    expect(seasonChoices(['2026/27', '2025/26'])).toEqual([
      { label: '2026/27', value: '2026-27' },
      { label: '2025/26', value: '2025-26' },
    ])
  })
})

describe('pickedAddress', () => {
  const known = { current: '2026/27', seasons: ['2026/27', '2025/26', '2024/25'] }

  it('goes to the address of the season that was picked', () => {
    expect(pickedAddress('/wedstrijden', '2025-26', known)).toBe('/wedstrijden/2025-26')
  })

  it('goes to the base address for the current season', () => {
    expect(pickedAddress('/wedstrijden', '2026-27', known)).toBe('/wedstrijden')
  })

  it('goes back to the base address for a value that is not a season', () => {
    for (const value of [undefined, '', 'x', '2025/26', '2025-27', '../etc', '2025-26\n/evil']) {
      expect(pickedAddress('/wedstrijden', value, known), String(value)).toBe('/wedstrijden')
    }
  })

  it('goes back to the base address for a season that has no matches', () => {
    expect(pickedAddress('/wedstrijden', '2010-11', known)).toBe('/wedstrijden')
    expect(pickedAddress('/wedstrijden', '2027-28', known)).toBe('/wedstrijden')
  })

  it('works for a base address that is not /wedstrijden', () => {
    expect(pickedAddress('/wedstrijden/cijfers', '2024-25', known)).toBe('/wedstrijden/cijfers/2024-25')
  })
})

describe('all seasons', () => {
  it('has the address part alle, which is no season', () => {
    expect(allSeasonsSlug).toBe('alle')
    expect(seasonFromSlug(allSeasonsSlug)).toBeUndefined()
    expect(allSeasonsAddress('/wedstrijden/cijfers')).toBe('/wedstrijden/cijfers/alle')
  })

  it('puts "Alle seizoenen" first in the choices, above the newest season', () => {
    expect(seasonChoicesWithAll(['2026/27', '2025/26'])).toEqual([
      allSeasonsChoice,
      { label: '2026/27', value: '2026-27' },
      { label: '2025/26', value: '2025-26' },
    ])
    expect(allSeasonsChoice).toEqual({ label: 'Alle seizoenen', value: 'alle' })
  })

  it('adds nothing with fewer than two seasons, where all seasons is the one season', () => {
    expect(seasonChoicesWithAll(['2026/27'])).toEqual(seasonChoices(['2026/27']))
    expect(seasonChoicesWithAll([])).toEqual([])
  })

  it('sends alle to <base>/alle only for a page that counts all seasons', () => {
    const known = { current: '2026/27', seasons: ['2026/27', '2025/26'] }

    expect(pickedAddress('/wedstrijden/cijfers', 'alle', { ...known, allSeasons: true })).toBe(
      '/wedstrijden/cijfers/alle',
    )
    expect(pickedAddress('/wedstrijden', 'alle', known)).toBe('/wedstrijden')
  })
})
