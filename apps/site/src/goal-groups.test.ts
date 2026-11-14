import { describe, expect, it } from 'vitest'

import type { PersonTraits } from './goal-groups'

import { goalsByCountryOf, goalsByLineOf } from './goal-groups'

type Goal = { ours: boolean; ownGoal: boolean; personId: null | number }

const goal = (personId: null | number, options: Partial<Goal> = {}) =>
  ({ ours: true, ownGoal: false, personId, ...options }) as never

const match = (goals: unknown[], competition = 'Eredivisie') => ({ competition, goals }) as never

const traits = new Map<number, PersonTraits>([
  [1, { country: 'NL', line: 'aanvaller' }],
  [2, { country: 'DK', line: 'middenvelder' }],
  [3, { country: 'NL', line: 'verdediger' }],
  [4, { country: null, line: null }],
  [5, { country: 'SE', line: 'doelman' }],
])

describe('goalsByLineOf', () => {
  it('counts the goals per line in the order of the card and leaves out a line without goals', () => {
    const result = goalsByLineOf([match([goal(1), goal(1), goal(2), goal(3)])], 'all', traits)

    expect(result.groups).toEqual([
      { goals: 2, key: 'aanvaller', name: 'Aanvallers' },
      { goals: 1, key: 'middenvelder', name: 'Middenvelders' },
      { goals: 1, key: 'verdediger', name: 'Verdedigers' },
    ])
    expect(result).toMatchObject({ counted: 4, total: 4 })
  })

  it('leaves out own goals and goals of the opponent, as the list of scorers does', () => {
    const result = goalsByLineOf(
      [match([goal(1), goal(1, { ownGoal: true }), goal(2, { ours: false })])],
      'all',
      traits,
    )

    expect(result.groups).toEqual([{ goals: 1, key: 'aanvaller', name: 'Aanvallers' }])
    expect(result.total).toBe(1)
  })

  it('has goals without a person, a person without a line and an unknown person in the total only', () => {
    const result = goalsByLineOf([match([goal(1), goal(null), goal(4), goal(99)])], 'all', traits)

    expect(result).toMatchObject({ counted: 1, total: 4 })
  })

  it('follows the choice of competition', () => {
    const matches = [match([goal(1)]), match([goal(2)], 'KNVB Beker')]

    expect(goalsByLineOf(matches, 'cup', traits).groups).toEqual([
      { goals: 1, key: 'middenvelder', name: 'Middenvelders' },
    ])
  })

  it('has no groups without goals', () => {
    expect(goalsByLineOf([], 'all', traits)).toEqual({ counted: 0, groups: [], total: 0 })
  })
})

describe('goalsByCountryOf', () => {
  it('counts the goals per country, the most first, and by name when level', () => {
    const result = goalsByCountryOf([match([goal(2), goal(5), goal(1), goal(3)])], 'all', traits)

    expect(result.groups).toEqual([
      { goals: 2, key: 'NL', name: 'Nederland' },
      { goals: 1, key: 'DK', name: 'Denemarken' },
      { goals: 1, key: 'SE', name: 'Zweden' },
    ])
  })

  it('shows five countries, and counts the goals of all of them', () => {
    const many = new Map<number, PersonTraits>(
      ['NL', 'DK', 'SE', 'IS', 'NO', 'FI'].map((country, index) => [index + 10, { country, line: null }]),
    )
    const goals = [10, 10, 11, 12, 13, 14, 15].map((person) => goal(person))
    const result = goalsByCountryOf([match(goals)], 'all', many)

    expect(result.groups).toHaveLength(5)
    expect(result.groups[0]).toEqual({ goals: 2, key: 'NL', name: 'Nederland' })
    expect(result).toMatchObject({ counted: 7, total: 7 })
  })

  it('leaves a goal without a person or a country out of the counted goals', () => {
    const result = goalsByCountryOf([match([goal(1), goal(null), goal(4)])], 'all', traits)

    expect(result).toMatchObject({ counted: 1, total: 3 })
  })
})
