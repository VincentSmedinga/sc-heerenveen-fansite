import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import type { ReadResult } from './read-wikipedia.ts'

import { matchClubNames, playedWarning } from './league-results.ts'
import { readLeagueResults, readStandings } from './read-wikipedia.ts'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

const result = (homeClub: string, awayClub: string): ReadResult => ({
  awayClub,
  awayGoals: 0,
  homeClub,
  homeGoals: 1,
  playedOn: '2026-08-09',
  round: 1,
})

describe('the names of the clubs in the results and in the table', () => {
  const table = [{ club: 'Excelsior Rotterdam' }, { club: 'FC Twente' }, { club: 'sc Heerenveen' }]

  it('keeps a name that the table has', () => {
    expect(matchClubNames([result('FC Twente', 'sc Heerenveen')], table)).toEqual({
      results: [result('FC Twente', 'sc Heerenveen')],
      strangers: [],
    })
  })

  it('writes a name as the table does when the two differ in case only', () => {
    expect(matchClubNames([result('SC HEERENVEEN', 'fc twente')], table)).toEqual({
      results: [result('sc Heerenveen', 'FC Twente')],
      strangers: [],
    })
  })

  it('writes a name as the table does when the list of club names has them as one club', () => {
    expect(matchClubNames([result('Excelsior', 'FC Twente'), result('SBV Excelsior', 'sc Heerenveen')], table)).toEqual(
      {
        results: [result('Excelsior Rotterdam', 'FC Twente'), result('Excelsior Rotterdam', 'sc Heerenveen')],
        strangers: [],
      },
    )
  })

  it('writes Roda JC as Roda JC Kerkrade, which is how the table has the club', () => {
    expect(matchClubNames([result('PSV', 'Roda JC')], [{ club: 'PSV' }, { club: 'Roda JC Kerkrade' }])).toEqual({
      results: [result('PSV', 'Roda JC Kerkrade')],
      strangers: [],
    })
  })

  it('writes a name the table lacks as the page has it, and says which', () => {
    expect(matchClubNames([result('FC Volendam', 'FC Twente'), result('FC Twente', 'Heracles')], table)).toEqual({
      results: [result('FC Volendam', 'FC Twente'), result('FC Twente', 'Heracles')],
      strangers: ['FC Volendam', 'Heracles'],
    })
  })
})

describe.each([
  ['2026/27', 'wikipedia-programme.wiki', 'wikipedia-standings.wiki'],
  ['2025/26', 'wikipedia-season-programme.wiki', 'wikipedia-season-standings.wiki'],
])('the results and the table of %s', (_season, programme, standings) => {
  const read = readStandings(fixture(standings))
  const rows = read.kind === 'read' ? read.rows : []
  const { results, unread } = readLeagueResults(fixture(programme))

  it('have the same clubs, written the same way, without putting a name right', () => {
    const named = [...new Set(results.flatMap((row) => [row.homeClub, row.awayClub]))].sort()

    expect(rows).toHaveLength(18)
    expect(named).toEqual(rows.map((row) => row.club).sort())
    expect(matchClubNames(results, rows)).toEqual({ results, strangers: [] })
    expect(unread).toEqual([])
  })

  it('give each club as many results as the table says it has played', () => {
    for (const row of rows) {
      expect(results.filter((found) => found.homeClub === row.club || found.awayClub === row.club)).toHaveLength(
        row.played,
      )
    }
  })
})

describe('the warning when the results do not agree with the table', () => {
  const table = [
    { club: 'Ajax', played: 2 },
    { club: 'FC Twente', played: 1 },
    { club: 'sc Heerenveen', played: 1 },
  ]
  const results = [result('Ajax', 'FC Twente'), result('sc Heerenveen', 'Ajax')]

  it('says nothing when every club has played what the table says', () => {
    expect(playedWarning(results, table, [])).toBeUndefined()
  })

  it('says nothing for a page without the results of other clubs, whatever the table says', () => {
    expect(playedWarning([], table, [])).toBeUndefined()
  })

  it('names each club that has another number, with both numbers', () => {
    expect(playedWarning(results, [{ club: 'Ajax', played: 3 }, ...table.slice(1)], [])).toBe(
      'league results: the results do not agree with the table: Ajax 2 results against 3 played',
    )
    expect(playedWarning(results.slice(0, 1), table, [])).toBe(
      'league results: the results do not agree with the table: Ajax 1 results against 2 played, sc Heerenveen 0 results against 1 played',
    )
  })

  it('names a club the table does not have', () => {
    expect(playedWarning(results, table, ['FC Volendam'])).toBe(
      'league results: results of a club the table does not have: FC Volendam',
    )
  })

  it('lists the first six clubs and shows there are more', () => {
    const clubs = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'].map((club) => ({ club, played: 5 }))

    expect(playedWarning([result('A', 'B')], clubs, [])).toBe(
      'league results: the results do not agree with the table: A 1 results against 5 played, B 1 results against 5 played, C 0 results against 5 played, D 0 results against 5 played, E 0 results against 5 played, F 0 results against 5 played, …',
    )
  })
})
