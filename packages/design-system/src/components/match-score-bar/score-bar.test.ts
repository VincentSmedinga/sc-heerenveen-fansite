import { describe, expect, it } from 'vitest'

import { type ScoreBarGoal, scoreBarLayout, tickInterval } from './score-bar'

const ours = (minute: number, stoppageMinutes?: number): ScoreBarGoal => ({ minute, ours: true, stoppageMinutes })
const theirs = (minute: number, stoppageMinutes?: number): ScoreBarGoal => ({ minute, ours: false, stoppageMinutes })

const scores = (goals: ScoreBarGoal[], extraTime = false) =>
  scoreBarLayout(goals, extraTime).segments.map((piece) => `${piece.goalsFor}-${piece.goalsAgainst}`)

describe('scoreBarLayout', () => {
  it('has one piece for the whole match when nobody scored', () => {
    const { segments } = scoreBarLayout([], false)

    expect(segments).toEqual([{ end: 100, goalsAgainst: 0, goalsFor: 0, minuteEnd: '90', minuteStart: '0', start: 0 }])
  })

  it('has a piece for every score, each starting where the last ended', () => {
    const { segments } = scoreBarLayout([ours(12), theirs(34), theirs(51)], false)

    expect(segments.map((piece) => `${piece.goalsFor}-${piece.goalsAgainst}`)).toEqual(['0-0', '1-0', '1-1', '1-2'])
    expect(segments.map((piece) => `${piece.minuteStart}-${piece.minuteEnd}`)).toEqual([
      '0-12',
      '12-34',
      '34-51',
      '51-90',
    ])
    expect(segments[0]?.start).toBe(0)
    expect(segments.at(-1)?.end).toBe(100)

    for (const [index, piece] of segments.entries()) {
      expect(piece.start).toBe(segments[index - 1]?.end ?? 0)
    }
  })

  it('counts a goal for the team that gains from it, so an own goal counts for the other team', () => {
    // sc Heerenveen scores an own goal: the opponent gains, so it is `ours: false`.
    expect(scores([theirs(10)])).toEqual(['0-0', '0-1'])
    // The opponent scores an own goal: sc Heerenveen gains.
    expect(scores([ours(10)])).toEqual(['0-0', '1-0'])
  })

  it('puts goals in the order of the clock, whatever order they came in', () => {
    expect(scores([theirs(60), ours(10)])).toEqual(['0-0', '1-0', '1-1'])
  })

  it('makes no piece between two goals in the same minute and keeps the last score', () => {
    const { segments } = scoreBarLayout([ours(30), theirs(30), ours(30)], false)

    expect(segments.map((piece) => `${piece.goalsFor}-${piece.goalsAgainst}`)).toEqual(['0-0', '2-1'])
    expect(segments.map((piece) => piece.minuteStart)).toEqual(['0', '30'])
  })

  it('gives the added time of 45 and 90 room, so a goal in 90+2 is not on 90', () => {
    const regular = scoreBarLayout([ours(90), ours(90, 2)], false).segments
    const added = scoreBarLayout([ours(45, 2)], false).segments

    expect(regular).toHaveLength(3)
    expect(regular[1]!.start).toBeLessThan(regular[2]!.start)
    expect(regular[1]!.minuteEnd).toBe('90+2')
    expect(added[0]!.end).toBeGreaterThan(scoreBarLayout([ours(45)], false).segments[0]!.end)
    expect(scoreBarLayout([ours(46)], false).segments[0]!.end).toBeGreaterThan(added[0]!.end)
  })

  it('keeps a goal with more added time than the room inside the room', () => {
    const { segments } = scoreBarLayout([ours(45, 4), ours(45, 9), ours(46)], false)

    expect(segments.map((piece) => piece.goalsFor)).toEqual([0, 2, 3])
    expect(segments.at(-1)?.end).toBe(100)
  })

  it('puts the marks every 15 minutes, to 90 without extra time and to 120 with it', () => {
    expect(scoreBarLayout([], false).ticks.map((tick) => tick.minute)).toEqual([0, 15, 30, 45, 60, 75, 90])
    expect(scoreBarLayout([], true).ticks.map((tick) => tick.minute)).toEqual([0, 15, 30, 45, 60, 75, 90, 105, 120])
    expect(tickInterval).toBe(15)
  })

  it('puts the marks in order, the first at the start and none past the end', () => {
    for (const extraTime of [false, true]) {
      const { ticks } = scoreBarLayout([], extraTime)
      const positions = ticks.map((tick) => tick.position)

      expect(positions[0]).toBe(0)
      expect(positions.toSorted((first, second) => first - second)).toEqual(positions)
      expect(positions.at(-1)).toBeLessThanOrEqual(100)
    }
  })

  it('shows extra time with a line where it begins, and none without it', () => {
    expect(scoreBarLayout([], false).extraTimeStart).toBeNull()

    const { extraTimeStart, ticks } = scoreBarLayout([], true)

    expect(extraTimeStart).toBeGreaterThan(ticks.find((tick) => tick.minute === 90)!.position)
    expect(extraTimeStart).toBeLessThan(ticks.find((tick) => tick.minute === 105)!.position)
  })

  it('runs the last piece to minute 120 in extra time', () => {
    const { segments } = scoreBarLayout([ours(100)], true)

    expect(segments.at(-1)?.minuteEnd).toBe('120')
    expect(segments.at(-1)?.end).toBe(100)
  })

  it('has goals in extra time after those in regular time', () => {
    expect(scores([theirs(20), ours(105), ours(118, 1)], true)).toEqual(['0-0', '0-1', '1-1', '2-1'])
  })

  it('keeps a goal past 90 inside the bar when there was no extra time', () => {
    const { segments } = scoreBarLayout([ours(95)], false)

    expect(segments.every((piece) => piece.end <= 100)).toBe(true)
    expect(segments.at(-1)?.goalsFor).toBe(1)
  })
})
