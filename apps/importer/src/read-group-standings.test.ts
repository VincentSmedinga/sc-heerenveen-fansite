import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { checkGroupStandings, isOwnClub, readGroupStandings } from './read-group-standings.ts'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

function read(text: string) {
  const result = readGroupStandings(text)

  if (result.kind !== 'read') {
    throw new Error(`expected a table, got ${JSON.stringify(result)}`)
  }

  return result
}

describe('readGroupStandings', () => {
  it('reads the group of sc Heerenveen from the page of the Champions League of 2000/01', () => {
    const { group, rows } = read(fixture('wikipedia-group-stage-champions-league.wiki'))

    expect(group).toBe('Groep C')
    expect(rows.map((row) => `${row.position} ${row.club} ${row.points}`)).toEqual([
      '1 Valencia CF 13',
      '2 Olympique Lyonnais 9',
      '3 Olympiakos Piraeus 9',
      '4 sc Heerenveen 4',
    ])
    expect(rows[3]).toMatchObject({
      drawn: 1,
      goalDifference: -6,
      goalsAgainst: 9,
      goalsFor: 3,
      lost: 4,
      played: 6,
      won: 1,
    })
    expect(rows[1]?.page).toBe('Olympique Lyonnais')
    expect(checkGroupStandings(rows)).toEqual([])
  })

  it('reads the columns by the header: places in a cell of their own, and the points last', () => {
    const { group, rows } = read(fixture('wikipedia-group-stage-europa-league.wiki'))

    expect(group).toBe('Groep D')
    expect(rows.map((row) => `${row.position} ${row.club} ${row.points} ${row.played}`)).toEqual([
      '1 Sporting Lissabon 11 6',
      '2 Hertha BSC 10 6',
      '3 sc Heerenveen 8 6',
      '4 FK Ventspils 3 6',
    ])
    expect(rows[2]).toMatchObject({ goalDifference: 4, goalsAgainst: 7, goalsFor: 11 })
    expect(checkGroupStandings(rows)).toEqual([])
  })

  it('numbers the clubs by their order when the page has no place in front of the name', () => {
    const { rows } = read(fixture('wikipedia-group-stage-uefa-cup.wiki'))

    expect(rows.map((row) => `${row.position} ${row.club}`)).toEqual([
      '1 VfL Wolfsburg',
      '2 AC Milan',
      '3 SC Braga',
      '4 Portsmouth FC',
      '5 sc Heerenveen',
    ])
    expect(rows[4]).toMatchObject({ goalDifference: -10, points: 0, won: 0 })
    expect(rows[2]?.page).toBe('Sporting Clube de Braga')
    expect(checkGroupStandings(rows)).toEqual([])
  })

  it('keeps two clubs with the same points in the order of the page', () => {
    const { rows } = read(fixture('wikipedia-group-stage-champions-league.wiki'))

    expect(rows[1]?.points).toBe(rows[2]?.points)
    expect(rows.map((row) => row.position)).toEqual([1, 2, 3, 4])
  })

  it('says there is no table when the page has no group with sc Heerenveen', () => {
    expect(readGroupStandings('==Voorronde==\nGeen groepen hier.')).toEqual({ kind: 'none' })
    expect(
      readGroupStandings(fixture('wikipedia-group-stage-champions-league.wiki').replaceAll('Heerenveen', 'Utrecht')),
    ).toEqual({
      kind: 'none',
    })
  })

  it('is an error when the table of sc Heerenveen has no points', () => {
    const text = '=Groep A=\n{|\n!Team\n!Wed\n|-\n|1. [[sc Heerenveen]]||4\n|}'

    expect(readGroupStandings(text)).toMatchObject({ kind: 'error' })
  })
})

describe('checkGroupStandings', () => {
  const rows = () => read(fixture('wikipedia-group-stage-champions-league.wiki')).rows

  it('names the club whose points do not add up', () => {
    const wrong = rows().map((row) => (row.club === 'sc Heerenveen' ? { ...row, points: 5 } : row))

    expect(checkGroupStandings(wrong)).toEqual(['sc Heerenveen has 5 points, but 1 won and 1 drawn is 4'])
  })

  it('names the club whose goal difference does not match', () => {
    const wrong = rows().map((row) => (row.club === 'Valencia CF' ? { ...row, goalDifference: 4 } : row))

    expect(checkGroupStandings(wrong)).toContain('Valencia CF has goal difference 4, but 7 − 4')
  })

  it('finds clubs with another number of matches and goals that do not add up', () => {
    const wrong = rows().map((row, index) =>
      index === 0 ? { ...row, drawn: 0, lost: 0, played: 5, points: 15, won: 5 } : row,
    )
    const faults = checkGroupStandings(wrong)

    expect(faults).toContain('the clubs have not played the same number of matches')
  })

  it('finds a place that is not where it should be', () => {
    const wrong = rows().map((row, index) => (index === 1 ? { ...row, position: 3 } : row))

    expect(checkGroupStandings(wrong)).toContain('Olympique Lyonnais has place 3, where 2 was expected')
  })
})

describe('isOwnClub', () => {
  it('knows sc Heerenveen by any spelling of the pages', () => {
    expect(['sc Heerenveen', 'SC Heerenveen', 'Sc Heerenveen', 'SC. Heerenveen'].map(isOwnClub)).toEqual([
      true,
      true,
      true,
      true,
    ])
    expect(isOwnClub('Heerenveen Zuid')).toBe(false)
  })
})
