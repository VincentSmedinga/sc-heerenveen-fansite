import { describe, expect, it } from 'vitest'

import { parseStandingsView, standingsViewQuery } from './standings-view'

describe('parseStandingsView', () => {
  it('is the whole season without a parameter, and for any value but laatste-5', () => {
    expect(parseStandingsView(undefined)).toBe('season')
    expect(parseStandingsView('')).toBe('season')
    expect(parseStandingsView('Laatste-5')).toBe('season')
    expect(parseStandingsView('hele-seizoen')).toBe('season')
    expect(parseStandingsView(['laatste-5', 'laatste-5'])).toBe('season')
  })

  it('is the latest five matches for laatste-5', () => {
    expect(parseStandingsView('laatste-5')).toBe('last-five')
  })
})

describe('standingsViewQuery', () => {
  it('has nothing for the whole season and ?stand=laatste-5 for the latest five matches', () => {
    expect(standingsViewQuery('season')).toBe('')
    expect(standingsViewQuery('last-five')).toBe('?stand=laatste-5')
  })
})
