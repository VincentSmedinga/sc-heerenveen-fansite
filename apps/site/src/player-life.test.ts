import { describe, expect, it } from 'vitest'

import { lifeOf } from './player-page'

const today = new Date('2026-11-12T12:00:00Z')
const day = { birthDate: '1998-05-13', birthDatePrecision: 'day' as const, deathDate: null, wikidataReadAt: null }

describe('lifeOf: the line under the name of a player (#1147)', () => {
  it('shows place, years and no age for a player who has died', () => {
    expect(
      lifeOf(
        { ...day, birthDate: '1950-01-01', birthDatePrecision: 'year', deathDate: '2020-01-01' },
        { birthPlace: 'Herten', inCurrentSeason: true, today },
      ),
    ).toEqual({ age: undefined, birthPlace: 'Herten', birthYear: '1950', bornLongAgo: false, deathYear: '2020' })
  })

  it('shows place, year and age for a player in the current season', () => {
    expect(lifeOf(day, { birthPlace: 'Herten', inCurrentSeason: true, today })).toMatchObject({
      age: 28,
      birthYear: '1998',
      deathYear: undefined,
    })
  })

  it('shows the age of a former player whose Wikidata reading is 60 days old, and not one of 61', () => {
    const read = (days: number) => ({ ...day, wikidataReadAt: new Date(today.getTime() - days * 86_400_000) })

    expect(lifeOf(read(60), { birthPlace: undefined, inCurrentSeason: false, today }).age).toBe(28)
    expect(lifeOf(read(61), { birthPlace: undefined, inCurrentSeason: false, today }).age).toBeUndefined()
  })

  it('shows place and year without an age for a former player without a recent reading', () => {
    expect(lifeOf(day, { birthPlace: 'Herten', inCurrentSeason: false, today })).toEqual({
      age: undefined,
      birthPlace: 'Herten',
      birthYear: '1998',
      bornLongAgo: false,
      deathYear: undefined,
    })
  })

  it('shows no age for a birth date that is only a year, also in the current season', () => {
    expect(
      lifeOf({ ...day, birthDatePrecision: 'year' }, { birthPlace: 'Herten', inCurrentSeason: true, today }).age,
    ).toBeUndefined()
  })

  it('says only that he was born long ago for a birth year of over a hundred years, without a death', () => {
    expect(
      lifeOf(
        { ...day, birthDate: '1920-01-01', birthDatePrecision: 'year' },
        { birthPlace: 'Herten', inCurrentSeason: false, today },
      ),
    ).toMatchObject({ age: undefined, bornLongAgo: true, deathYear: undefined })
    expect(
      lifeOf(
        { ...day, birthDate: '1927-01-01', birthDatePrecision: 'year' },
        { birthPlace: 'Herten', inCurrentSeason: false, today },
      ).bornLongAgo,
    ).toBe(false)
  })
})
