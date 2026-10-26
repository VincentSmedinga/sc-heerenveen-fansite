import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import type { ReadMatch, ReadStandingsRow } from './read-wikipedia.ts'

import { checkGoals, checkMatches, checkStandings } from './check-wikipedia.ts'
import { readCup, readLeague, readStandings } from './read-wikipedia.ts'

function read<T extends { kind: string }>(result: T): Extract<T, { kind: 'read' }> {
  if (result.kind !== 'read') {
    throw new Error(`Not read: ${JSON.stringify(result)}`)
  }

  return result as Extract<T, { kind: 'read' }>
}

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

const league = read(readLeague(fixture('wikipedia-programme.wiki'))).matches
const cup = read(readCup(fixture('wikipedia-cup.wiki'))).matches
const rows = read(readStandings(fixture('wikipedia-standings.wiki'))).rows

/**
 * The table with one club changed. The numbers that follow from the rest are worked out
 * again.
 */
function withClub(club: string, change: Partial<ReadStandingsRow>, from: ReadStandingsRow[] = rows) {
  return from.map((row) => {
    if (row.club !== club) {
      return row
    }

    const next = { ...row, ...change }

    return {
      ...next,
      goalDifference: next.goalsFor - next.goalsAgainst,
      played: next.won + next.drawn + next.lost,
      points: 3 * next.won + next.drawn,
    }
  })
}

describe('the checks of the matches', () => {
  it('pass for the 34 league matches and the cup tie', () => {
    expect(checkMatches([...league, ...cup])).toEqual([])
  })

  it('fail when a league match is missing', () => {
    expect(checkMatches(league.slice(1))).toEqual(['the league has 33 matches for sc Heerenveen, not 34'])
  })

  it('fail when there are more than 34', () => {
    expect(checkMatches([...league, { ...league[0], round: 'Speelronde 35' } as ReadMatch])).toEqual([
      'the league has 35 matches for sc Heerenveen, not 34',
    ])
  })

  it('fail when the home and away matches are not 17 and 17', () => {
    // The first match is at home, so turning it makes 16 at home and 18 away.
    const lopsided = league.map((match, index) => (index === 0 ? { ...match, home: !match.home } : match))

    expect(checkMatches(lopsided)).toEqual(['the league has 16 home matches and 18 away, not 17 and 17'])
  })

  it('fail when two matches share a round', () => {
    const twice = league.map((match, index) => (index === 1 ? { ...match, round: 'Speelronde 1' } : match))

    expect(checkMatches(twice)).toContain('two league matches are in the same round')
  })
})

describe('the checks of the league table', () => {
  it('pass for the table and the results of the fixtures', () => {
    expect(checkStandings(rows, league)).toEqual([])
  })

  it('pass in the middle of a round, when the clubs have played a different number of matches', () => {
    // Ajax beat Willem II 2-0 and the table has that, while the other clubs wait for
    // their match.
    const middle = withClub('Willem II', { goalsAgainst: 34, lost: 9 }, withClub('Ajax', { goalsFor: 31, won: 7 }))

    expect(new Set(middle.map((row) => row.played)).size).toBe(2)
    expect(checkStandings(middle, league)).toEqual([])
  })

  it('fail when there are not 18 clubs', () => {
    expect(checkStandings(rows.slice(1), league)).toContain('the table has 17 clubs, not 18')
  })

  it('fail when a club has a goal more but its opponent has not', () => {
    expect(checkStandings(withClub('Ajax', { goalsFor: 30 }), league)).toContain(
      'over the table the goals for are not the goals against',
    )
  })

  it('fail when a club has a win more but its opponent has no loss more', () => {
    expect(checkStandings(withClub('Ajax', { won: 7 }), league)).toContain('over the table the wins are not the losses')
  })

  it('fail when the numbers of a club do not add up', () => {
    const broken = rows.map((row) => (row.club === 'Ajax' ? { ...row, points: row.points + 1 } : row))

    expect(checkStandings(broken, league)).toContain('Ajax: points are not 3 x won + drawn')
    expect(
      checkStandings(
        rows.map((row) => (row.club === 'Ajax' ? { ...row, played: 11 } : row)),
        league,
      ),
    ).toContain('Ajax: played is not won + drawn + lost')
    expect(
      checkStandings(
        rows.map((row) => (row.club === 'Ajax' ? { ...row, goalDifference: 0 } : row)),
        league,
      ),
    ).toContain('Ajax: goal difference is not goals for - goals against')
  })

  it('fail when the row of sc Heerenveen does not match our own results', () => {
    // A win and a loss more over the table keeps it balanced, but we have not played that.
    const ahead = withClub('sc Heerenveen', { won: 5 }, withClub('Ajax', { lost: 2 }))

    expect(checkStandings(ahead, league)).toEqual([
      'the row of sc Heerenveen (11 played, 18-13, 18 points) is not what the matches say (10 played, 18-13, 15 points)',
    ])
  })

  it('fail when sc Heerenveen is not in the table, or twice', () => {
    expect(
      checkStandings(
        rows.filter((row) => row.club !== 'sc Heerenveen'),
        league,
      ),
    ).toContain('the table has 0 rows for sc Heerenveen, not 1')
  })
})

describe('the check of the scorers', () => {
  const played = league.find((match) => match.round === 'Speelronde 2')!
  const goal = (ours: boolean, minute: number) => ({
    minute,
    ours,
    ownGoal: false,
    penalty: false,
    player: 'Speler',
    stoppageMinutes: null,
  })

  it('passes when the goals of each club are as many as the club has in the result, an own goal counting for the club that benefits', () => {
    // 2-2 against Ajax, of which one goal of ours is an own goal of Ajax: it is listed as ours.
    expect(played.goals?.filter((entry) => entry.ownGoal)).toHaveLength(1)
    expect(checkGoals(played)).toBeUndefined()
    // The real fixtures pass as they are.
    expect(
      league
        .concat(cup)
        .map(checkGoals)
        .filter((problem) => problem !== undefined),
    ).toEqual([])
  })

  it('passes a 0-0 with no scorers, and a played match whose scorers are not on the page yet', () => {
    expect(checkGoals({ ...played, goals: [], goalsAgainst: 0, goalsFor: 0 })).toBeUndefined()
    expect(checkGoals({ ...played, goals: null })).toBeUndefined()
  })

  it.each([
    ['one goal of ours too few', [goal(true, 10), goal(false, 20), goal(false, 30)], '1-2, the result is 2-2'],
    [
      'one goal of the opponent too many',
      [goal(true, 10), goal(true, 15), goal(false, 20), goal(false, 30), goal(false, 40)],
      '2-3, the result is 2-2',
    ],
    ['a list for one club only', [goal(true, 10), goal(true, 20)], '2-0, the result is 2-2'],
    [
      'goals in the wrong place: all for the other club',
      [goal(false, 10), goal(false, 20), goal(false, 30), goal(false, 40)],
      '0-4, the result is 2-2',
    ],
  ])('fails with %s, with the round and the two numbers', (_name, goals, text) => {
    expect(checkGoals({ ...played, goals })).toBe(`Speelronde 2 (Eredivisie): the scorers are ${text}`)
  })

  it('fails with the reason when a line could not be read', () => {
    expect(
      checkGoals({ ...played, goals: null, goalsProblem: 'Speelronde 2 (Eredivisie): a goal has no usable name' }),
    ).toBe('Speelronde 2 (Eredivisie): a goal has no usable name')
  })
})
