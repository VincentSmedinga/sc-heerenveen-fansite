import { describe, expect, it } from 'vitest'

import type { MatchReport, ReportGoal } from './match-report.ts'

import {
  type FantasyFacts,
  fantasyFacts,
  type FantasyLine,
  fantasyPoints,
  fantasyScoring,
  fantasySummary,
} from './fantasy-points.ts'

const facts = (more: Partial<FantasyFacts> & { line: FantasyLine }): FantasyFacts => ({
  assists: 0,
  cleanSheet: false,
  goals: 0,
  minutes: 90,
  ownGoals: 0,
  red: false,
  yellow: false,
  ...more,
})

const total = (more: Partial<FantasyFacts> & { line: FantasyLine }) => fantasyPoints(facts(more))?.total

describe('the rows of the table', () => {
  it('gives 2 for a player up to and including 59 minutes and 5 from 60', () => {
    expect(total({ line: 'middenvelder', minutes: 1 })).toBe(2)
    expect(total({ line: 'middenvelder', minutes: 59 })).toBe(2)
    expect(total({ line: 'middenvelder', minutes: 60 })).toBe(5)
    expect(total({ line: 'middenvelder', minutes: 120 })).toBe(5)
  })

  it('gives a player who did not play 0 and no lines', () => {
    expect(fantasyPoints(facts({ line: 'aanvaller', minutes: 0 }))).toEqual({ lines: [], total: 0 })
  })

  it('gives a goal 10 for an attacker, 12 for a midfielder and 15 for a defender or a goalkeeper', () => {
    expect(total({ goals: 1, line: 'aanvaller' })).toBe(5 + 10)
    expect(total({ goals: 1, line: 'middenvelder' })).toBe(5 + 12)
    expect(total({ goals: 1, line: 'verdediger' })).toBe(5 + 15)
    expect(total({ goals: 1, line: 'doelman' })).toBe(5 + 15)
    expect(total({ goals: 2, line: 'aanvaller' })).toBe(5 + 20)
  })

  it('gives an assist 8', () => {
    expect(total({ assists: 1, line: 'middenvelder' })).toBe(13)
    expect(total({ assists: 2, line: 'middenvelder' })).toBe(21)
  })

  it('gives no goal against 8 to a goalkeeper or defender from 60 minutes', () => {
    expect(total({ cleanSheet: true, line: 'doelman' })).toBe(13)
    expect(total({ cleanSheet: true, line: 'verdediger' })).toBe(13)
    expect(total({ cleanSheet: true, line: 'verdediger', minutes: 60 })).toBe(13)
    expect(total({ cleanSheet: true, line: 'verdediger', minutes: 59 })).toBe(2)
    expect(total({ cleanSheet: true, line: 'middenvelder' })).toBe(5)
    expect(total({ cleanSheet: true, line: 'aanvaller' })).toBe(5)
  })

  it('takes 3 for a yellow card and 8 for a red card, which replaces the yellow', () => {
    expect(total({ line: 'middenvelder', yellow: true })).toBe(2)
    expect(total({ line: 'middenvelder', red: true })).toBe(-3)
    expect(total({ line: 'middenvelder', red: true, yellow: true })).toBe(-3)
  })

  it('takes 5 for an own goal', () => {
    expect(total({ line: 'verdediger', ownGoals: 1 })).toBe(0)
    expect(total({ line: 'verdediger', ownGoals: 2 })).toBe(-5)
  })

  it('has no floor: a total can be negative', () => {
    expect(total({ line: 'verdediger', minutes: 30, ownGoals: 1, red: true })).toBe(-11)
  })

  it('says what each line is for', () => {
    expect(fantasyPoints(facts({ goals: 1, line: 'aanvaller', yellow: true }))?.lines).toEqual([
      { points: 5, reason: 'Gespeeld, vanaf 60 minuten' },
      { points: 10, reason: 'Doelpunt als aanvaller' },
      { points: -3, reason: 'Gele kaart' },
    ])
    expect(fantasyPoints(facts({ goals: 2, line: 'verdediger' }))?.lines[1]).toEqual({
      points: 30,
      reason: '2 doelpunten als verdediger',
    })
  })

  it('gives nothing while the minutes are not known', () => {
    expect(fantasyPoints(facts({ line: 'aanvaller', minutes: undefined }))).toBeUndefined()
  })

  it('keeps the numbers of the table in one place', () => {
    expect(fantasyScoring).toMatchObject({ assist: 8, cleanSheet: 8, fullGame: 5, ownGoal: -5, playedShort: 2 })
    expect(fantasyScoring.goal).toEqual({ aanvaller: 10, doelman: 15, middenvelder: 12, verdediger: 15 })
  })
})

describe('the examples of the issue', () => {
  it.each([
    ['a goalkeeper with a goal against', { cleanSheet: false, line: 'doelman' }, 5],
    ['a goalkeeper without a goal against', { cleanSheet: true, line: 'doelman' }, 13],
    ['a defender with an own goal and a goal against', { line: 'verdediger', ownGoals: 1 }, 0],
    ['a defender of 55 minutes with a goal', { goals: 1, line: 'verdediger', minutes: 55 }, 17],
    ['a midfielder of 72 minutes with an assist', { assists: 1, line: 'middenvelder', minutes: 72 }, 13],
    ['a midfielder of 30 minutes with a direct red card', { line: 'middenvelder', minutes: 30, red: true }, -6],
    ['an attacker with two goals and a yellow card', { goals: 2, line: 'aanvaller', yellow: true }, 22],
    [
      'an attacker of 70 minutes sent off after two yellows',
      { line: 'aanvaller', minutes: 70, red: true, yellow: true },
      -3,
    ],
    ['a substitute who did not come on', { line: 'aanvaller', minutes: 0 }, 0],
  ] as [string, Partial<FantasyFacts> & { line: FantasyLine }, number][])('%s', (_name, more, expected) => {
    expect(total(more)).toBe(expected)
  })

  it('adds up to 40 for the four of the example', () => {
    const four = [
      total({ line: 'doelman' }),
      total({ line: 'verdediger', ownGoals: 1 }),
      total({ assists: 1, line: 'middenvelder', minutes: 72 }),
      total({ goals: 2, line: 'aanvaller', yellow: true }),
    ]

    expect(four).toEqual([5, 0, 13, 22])
    expect(four.reduce<number>((sum, points) => sum + (points ?? 0), 0)).toBe(40)
  })
})

describe('the facts of a report', () => {
  // Player 1 is the goalkeeper, 2 a defender, 3 a midfielder, 4 an attacker; 12 and 13 are on
  // the bench; 21 is a player of the opponent.
  const player = (id: number, ours: boolean, starter: boolean) => ({
    captain: false,
    id,
    name: `Speler ${id}`,
    ours,
    shirtNumber: id,
    starter,
  })
  const goal = (more: Partial<ReportGoal>): ReportGoal => ({
    appearanceId: null,
    assistId: null,
    minute: 10,
    ours: true,
    ownGoal: false,
    penalty: false,
    stoppageMinutes: null,
    ...more,
  })
  const report = (more: Partial<MatchReport> = {}): MatchReport => ({
    appearances: [
      player(1, true, true),
      player(2, true, true),
      player(3, true, true),
      player(4, true, true),
      player(12, true, false),
      player(13, true, false),
      player(21, false, true),
    ],
    cards: [],
    goals: [],
    incidents: [],
    opponentComplete: false,
    status: 'klaar',
    substitutions: [],
    ...more,
  })
  const match = { extraTime: false, goalsAgainst: null }
  const pointsOf = (
    r: MatchReport,
    id: number,
    line: FantasyLine,
    m: { extraTime: boolean; goalsAgainst: null | number } = match,
  ) => fantasyPoints(fantasyFacts(r, m, id, line))?.total

  it('counts a goal, an assist and the minutes', () => {
    const r = report({ goals: [goal({ appearanceId: 4, assistId: 3 })] })

    expect(pointsOf(r, 4, 'aanvaller')).toBe(15)
    expect(pointsOf(r, 3, 'middenvelder')).toBe(13)
  })

  it('counts a penalty as a goal', () => {
    const r = report({ goals: [goal({ appearanceId: 4, penalty: true })] })

    expect(pointsOf(r, 4, 'aanvaller')).toBe(15)
  })

  it('counts a goal in extra time and gives 120 minutes of play', () => {
    const r = report({ goals: [goal({ appearanceId: 4, minute: 105 })] })
    const extra = { extraTime: true, goalsAgainst: null }

    expect(fantasyFacts(r, extra, 4, 'aanvaller').minutes).toBe(120)
    expect(pointsOf(r, 4, 'aanvaller', extra)).toBe(15)
  })

  it('counts a kick in a shoot-out as nothing: no goal and no assist', () => {
    const r = report({
      shootout: [
        { appearanceId: 4, ours: true, outcome: 'raak', round: 1 },
        { appearanceId: 3, ours: true, outcome: 'raak', round: 2 },
      ],
    })

    expect(fantasyFacts(r, match, 4, 'aanvaller')).toMatchObject({ assists: 0, goals: 0 })
    expect(pointsOf(r, 4, 'aanvaller')).toBe(5)
  })

  it('counts an own goal of a player of ours against him, and no goal for him', () => {
    const r = report({ goals: [goal({ appearanceId: 2, ours: false, ownGoal: true })] })

    expect(fantasyFacts(r, match, 2, 'verdediger')).toMatchObject({ cleanSheet: false, goals: 0, ownGoals: 1 })
    expect(pointsOf(r, 2, 'verdediger')).toBe(0)
  })

  it('does not give an assist for an own goal of the opponent', () => {
    const r = report({ goals: [goal({ appearanceId: 21, assistId: 3, ownGoal: true })] })

    expect(fantasyFacts(r, match, 3, 'middenvelder').assists).toBe(0)
  })

  it('takes the whole match for no goal against, also for a player who had gone off', () => {
    const r = report({
      goals: [goal({ appearanceId: null, minute: 80, ours: false })],
      substitutions: [{ inId: 12, minute: 60, outId: 1, stoppageMinutes: null }],
    })

    // Player 1 played 60 minutes and was gone before the goal against, and still misses the 8.
    expect(fantasyFacts(r, match, 1, 'doelman')).toMatchObject({ cleanSheet: false, minutes: 60 })
    expect(pointsOf(r, 1, 'doelman')).toBe(5)
    // The goalkeeper who came on gets 30 minutes, so the clean sheet does not count for him.
    expect(pointsOf(r, 12, 'doelman')).toBe(2)
  })

  it('also looks at the score of the match for a goal against that the report does not have', () => {
    expect(fantasyFacts(report(), { extraTime: false, goalsAgainst: 1 }, 1, 'doelman').cleanSheet).toBe(false)
  })

  it('takes the second yellow card and the red card as one red card', () => {
    const second = report({
      cards: [
        { appearanceId: 3, kind: 'geel', minute: 20, stoppageMinutes: null },
        { appearanceId: 3, kind: 'geel-rood', minute: 70, stoppageMinutes: null },
      ],
    })
    const direct = report({ cards: [{ appearanceId: 3, kind: 'rood', minute: 30, stoppageMinutes: null }] })

    expect(pointsOf(second, 3, 'middenvelder')).toBe(5 - 8)
    expect(pointsOf(direct, 3, 'middenvelder')).toBe(2 - 8)
  })

  it('works out the minutes of a substitute who is himself substituted', () => {
    const r = report({
      substitutions: [
        { inId: 12, minute: 46, outId: 2, stoppageMinutes: null },
        { inId: 13, minute: 70, outId: 12, stoppageMinutes: null },
      ],
    })

    expect(fantasyFacts(r, match, 12, 'verdediger').minutes).toBe(24)
    expect(pointsOf(r, 12, 'verdediger')).toBe(2)
  })

  it('gives a player of the bench who did not come on, or who is not in the report, 0', () => {
    expect(pointsOf(report(), 13, 'aanvaller')).toBe(0)
    expect(pointsOf(report(), 99, 'aanvaller')).toBe(0)
    expect(fantasyFacts(report(), match, undefined, 'aanvaller').minutes).toBe(0)
  })

  it('gives nothing while the report is not finished', () => {
    expect(fantasyPoints(fantasyFacts(report({ status: 'bezig' }), match, 4, 'aanvaller'))).toBeUndefined()
  })

  it('gives nothing when the minute of a red card is missing', () => {
    const r = report({ cards: [{ appearanceId: 3, kind: 'rood', minute: null, stoppageMinutes: null }] })

    expect(fantasyPoints(fantasyFacts(r, match, 3, 'middenvelder'))).toBeUndefined()
  })
})

describe('the words of a player', () => {
  it('says in plain words what happened', () => {
    expect(fantasySummary(facts({ goals: 2, line: 'aanvaller', yellow: true }))).toBe('90 min, 2 goals, geel')
    expect(fantasySummary(facts({ assists: 1, line: 'middenvelder', minutes: 72 }))).toBe('72 min, assist')
    expect(fantasySummary(facts({ line: 'doelman' }))).toBe('90 min, tegengoal')
    expect(fantasySummary(facts({ cleanSheet: true, line: 'doelman' }))).toBe('90 min, geen tegengoal')
    expect(fantasySummary(facts({ line: 'verdediger', ownGoals: 1 }))).toBe('90 min, eigen goal, tegengoal')
    expect(fantasySummary(facts({ line: 'middenvelder', minutes: 30, red: true }))).toBe('30 min, rood')
    expect(fantasySummary(facts({ line: 'aanvaller', minutes: 0 }))).toBe('Niet gespeeld')
    expect(fantasySummary(facts({ line: 'aanvaller', minutes: undefined }))).toBe('')
  })
})
