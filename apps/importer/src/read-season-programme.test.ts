import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { readSeasonProgramme } from './read-season-programme.ts'

const page = readFileSync(new URL('./fixtures/wikipedia-season-programme-2006-07.wiki', import.meta.url), 'utf8')

function read(text = page) {
  const result = readSeasonProgramme(text)

  if (result.kind !== 'read') {
    throw new Error(result.reason)
  }

  return result
}

describe('readSeasonProgramme', () => {
  it('reads the day, the club, who was at home, the result and the goals of a league row', () => {
    const [first, second] = read().rows

    expect(first).toMatchObject({
      competition: 'Eredivisie',
      day: 19,
      goalsProblem: null,
      home: false,
      month: 8,
      opponent: 'Ajax',
      opponentPage: 'AFC Ajax',
      round: null,
      score: { against: 2, for: 3 },
    })
    expect(first?.goals).toEqual([
      {
        minute: 40,
        ours: false,
        ownGoal: false,
        penalty: false,
        player: 'Voorbeeld',
        playerPage: 'Anna Voorbeeld',
        stoppageMinutes: null,
      },
      {
        minute: 42,
        ours: true,
        ownGoal: false,
        penalty: false,
        player: 'Piet Proef',
        playerPage: 'Piet Proef',
        stoppageMinutes: null,
      },
      {
        minute: 58,
        ours: false,
        ownGoal: false,
        penalty: true,
        player: 'Test',
        playerPage: 'Kees Test',
        stoppageMinutes: null,
      },
      {
        minute: 81,
        ours: true,
        ownGoal: false,
        penalty: false,
        player: 'Proef',
        playerPage: 'Piet Proef',
        stoppageMinutes: null,
      },
      {
        minute: 90,
        ours: true,
        ownGoal: false,
        penalty: false,
        player: 'Onbekend',
        playerPage: 'Fanny Onbekend',
        stoppageMinutes: 3,
      },
    ])
    expect(second).toMatchObject({ day: 26, home: true, score: { against: 0, for: 2 } })
  })

  it('reads a goalless match, a penalty in added time and a goal without a link', () => {
    const rows = read().rows

    expect(rows[2]).toMatchObject({ goals: [], goalsProblem: null, score: { against: 0, for: 0 } })
    expect(rows[4]?.goals).toEqual([
      {
        minute: 90,
        ours: false,
        ownGoal: false,
        penalty: true,
        player: 'Test',
        playerPage: 'Kees Test',
        stoppageMinutes: 4,
      },
    ])
    expect(rows[5]?.goals?.[0]).toMatchObject({ minute: 4, ours: true, player: 'Proef', playerPage: null })
  })

  it('reads the play-offs with their legs and the cup and the other tables not at all', () => {
    const rows = read().rows.filter((row) => row.competition !== 'Eredivisie')

    expect(rows).toMatchObject([
      { day: 9, home: true, month: 5, round: 'Eerste ronde, wedstrijd 1/2', score: { against: 0, for: 1 } },
      { day: 13, goals: null, home: false, round: 'Eerste ronde, wedstrijd 2/2', score: { against: 4, for: 0 } },
    ])
    expect(rows[1]?.goalsProblem).toContain('4-1 does not follow 3-0')
    expect(read().rows).toHaveLength(9)
  })

  it('gives a list that does not add up to the result no goals, with the reason', () => {
    const rows = read().rows

    expect(rows[1]).toMatchObject({ goals: null, goalsProblem: 'the scorers add up to 1-0, the result is 2-0' })
    expect(rows[3]?.goals).toHaveLength(2)
    expect(rows[6]).toMatchObject({ goals: null, score: null })
    expect(rows[6]?.goalsProblem).toContain('no result we can read')
  })
})
