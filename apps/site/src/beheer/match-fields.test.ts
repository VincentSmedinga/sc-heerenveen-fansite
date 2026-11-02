import { describe, expect, it } from 'vitest'

import {
  emptyFields,
  emptyGoal,
  goalFieldNames,
  goalTotalOf,
  isUntouchedGoal,
  type MatchValues,
  padGoals,
  scorerFormOf,
} from './match-fields'

const values = (wij: string, zij: string, goals: MatchValues['doelpunten'] = []): MatchValues => ({
  doelpunten: goals,
  reden: '',
  velden: { ...emptyFields, 'uitslag-wij': wij, 'uitslag-zij': zij },
})

describe('scorerFormOf', () => {
  it('asks for the squad for a goal of ours and for an own goal of the opponent', () => {
    expect(scorerFormOf('wij', 'gewoon')).toBe('squad')
    expect(scorerFormOf('wij', 'strafschop')).toBe('squad')
    expect(scorerFormOf('zij', 'eigen')).toBe('squad')
  })

  it('asks for a name for a goal of the opponent and for an own goal of ours', () => {
    expect(scorerFormOf('zij', 'gewoon')).toBe('name')
    expect(scorerFormOf('zij', 'strafschop')).toBe('name')
    expect(scorerFormOf('wij', 'eigen')).toBe('name')
  })

  it('asks for the squad before a team is chosen, which is the usual goal', () => {
    expect(scorerFormOf('', 'gewoon')).toBe('squad')
    expect(scorerFormOf('', 'eigen')).toBe('squad')
  })
})

describe('goalFieldNames', () => {
  it('are in the order of the form: minute, added time, kind, then team and the scorer', () => {
    expect(goalFieldNames).toEqual(['minuut', 'extra', 'soort', 'kant', 'speler', 'naam'])
  })
})

describe('goalTotalOf', () => {
  it('adds up the two scores of the end result', () => {
    expect(goalTotalOf(values('2', '1').velden)).toBe(3)
    expect(goalTotalOf(values('0', '0').velden)).toBe(0)
    expect(goalTotalOf(values('10', '3').velden)).toBe(13)
  })

  it('is not known while a score is empty or is not a whole number', () => {
    expect(goalTotalOf(values('2', '').velden)).toBeUndefined()
    expect(goalTotalOf(values('', '').velden)).toBeUndefined()
    expect(goalTotalOf(values('2', 'x').velden)).toBeUndefined()
    expect(goalTotalOf(values('-1', '2').velden)).toBeUndefined()
    expect(goalTotalOf(values('100', '2').velden)).toBeUndefined()
  })

  it('stops at twenty goals, so a typing mistake does not fill the screen', () => {
    expect(goalTotalOf(values('99', '99').velden)).toBe(20)
  })
})

describe('isUntouchedGoal', () => {
  it('is a goal as a new goal has it, and nothing else', () => {
    expect(isUntouchedGoal({ ...emptyGoal })).toBe(true)

    for (const field of goalFieldNames) {
      expect(isUntouchedGoal({ ...emptyGoal, [field]: field === 'soort' ? 'eigen' : 'x' }), field).toBe(false)
    }
  })
})

describe('padGoals', () => {
  it('adds empty goals until there are as many as the result asks for, after the goals that are there', () => {
    const first = { ...emptyGoal, minuut: '12' }
    const padded = padGoals(values('2', '1', [first]))

    expect(padded.doelpunten).toEqual([first, emptyGoal, emptyGoal])
    expect(padded.doelpunten[1]).not.toBe(padded.doelpunten[2])
  })

  it('keeps the goals when there are as many as the result asks for or more', () => {
    const goals = [
      { ...emptyGoal, minuut: '12' },
      { ...emptyGoal, minuut: '40' },
    ]

    expect(padGoals(values('1', '0', goals)).doelpunten).toEqual(goals)
    expect(padGoals(values('2', '0', goals)).doelpunten).toEqual(goals)
  })

  it('leaves the values as they are while the result is not known', () => {
    const unknown = values('', '')

    expect(padGoals(unknown)).toBe(unknown)
  })

  it('has no goals for a result of nil-nil', () => {
    expect(padGoals(values('0', '0')).doelpunten).toEqual([])
  })
})
