import { describe, expect, it } from 'vitest'

import { completenessSentence, isEnglishPage, squadPageName, squadParts } from './season-squad'
import { squadData } from './test-squad'

const base = squadData.players[0]!

const player = (overrides: Partial<(typeof squadData.players)[number]>) => ({ ...base, ...overrides })

describe('squadParts', () => {
  it('keeps the order the query gave inside a part and the parts from the goal to the front', () => {
    const parts = squadParts([
      player({ name: 'Aanval Een', position: 'aanvaller', shirtNumber: 9 }),
      player({ name: 'Keeper Een', position: 'doelman', shirtNumber: 1 }),
      player({ name: 'Aanval Twee', position: 'aanvaller', shirtNumber: null }),
    ])

    expect(parts.map((part) => [part.label, part.players.map((line) => line.key)])).toEqual([
      ['Doelmannen', ['Keeper Een']],
      ['Aanvallers', ['Aanval Een', 'Aanval Twee']],
    ])
  })

  it('gives a player without a number an empty column where others have one, and no column where nobody has', () => {
    const parts = squadParts([
      player({ name: 'Een Keeper', position: 'doelman', shirtNumber: 1 }),
      player({ name: 'Twee Keeper', position: 'doelman', shirtNumber: null }),
      player({ name: 'Een Verdediger', position: 'verdediger', shirtNumber: null }),
    ])

    expect(parts[0]?.players.map((line) => line.shirtNumber)).toEqual([1, null])
    expect(parts[1]?.players.map((line) => line.shirtNumber)).toEqual([undefined])
  })

  it('splits a name as the person is kept, and shows a name without a kept name whole', () => {
    const [part] = squadParts([
      player({
        name: 'Joost van Aken',
        personFamilyName: 'Aken',
        personFamilyNamePrefix: 'van',
        personGivenName: 'Joost',
      }),
      player({ name: 'Naam Zonder Persoon' }),
    ])

    expect(part?.players.map(({ givenName, surname }) => [givenName, surname])).toEqual([
      ['Joost', 'van Aken'],
      ['Naam Zonder Persoon', ''],
    ])
  })

  it('has one list without a heading when nobody has a position, and nothing without players', () => {
    expect(squadParts([player({ position: null }), player({ name: 'Twee', position: null })])).toMatchObject([
      { label: null },
    ])
    expect(squadParts([])).toEqual([])
  })

  it('puts the players without a position last, as Positie onbekend', () => {
    expect(
      squadParts([player({ name: 'Zonder', position: null }), player({ name: 'Keeper', position: 'doelman' })]).map(
        (part) => part.label,
      ),
    ).toEqual(['Doelmannen', 'Positie onbekend'])
  })
})

describe('completenessSentence', () => {
  it('says the squad is unknown for a season without a row', () => {
    expect(completenessSentence(undefined)).toBe('Van dit seizoen kennen we de selectie niet.')
  })
})

describe('the credit of the pages of the squad', () => {
  it('knows the page of the English Wikipedia by its title', () => {
    expect(isEnglishPage('2018–19 SC Heerenveen season')).toBe(true)
    expect(isEnglishPage('Sc Heerenveen in het seizoen 2018/19 (mannen)')).toBe(false)
  })

  it('names a single Dutch page by the season, and a season with more Dutch pages by their titles', () => {
    expect(squadPageName('Sc Heerenveen in het seizoen 2008/09 (mannen)', '2008/09', 1)).toBe('Selectie 2008/09')
    expect(squadPageName('Sc Heerenveen in het seizoen 2006/07', '2006/07', 2)).toBe(
      'Sc Heerenveen in het seizoen 2006/07',
    )
    expect(squadPageName('2018–19 SC Heerenveen season', '2018/19', 1)).toBe('Selectie 2018/19 (Engelse Wikipedia)')
  })
})
