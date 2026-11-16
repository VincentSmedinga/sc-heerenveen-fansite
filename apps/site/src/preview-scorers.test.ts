import type { PublicClubMatch } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import { scorersOf } from './preview-scorers'

type Goal = PublicClubMatch['goals'][number]

const goal = (player: string, more: Partial<Goal> = {}): Goal => ({
  minute: 10,
  ours: true,
  ownGoal: false,
  penalty: false,
  personFamilyName: null,
  personFamilyNamePrefix: null,
  personGivenName: null,
  personId: null,
  personSlug: null,
  player,
  playerId: null,
  playerPage: null,
  stoppageMinutes: null,
  ...more,
})

/** A goal of a person: the name comes from the person, as a page of a player shows it. */
const person = (id: number, given: string, family: string, more: Partial<Goal> = {}) =>
  goal(`${given} ${family}`, {
    personFamilyName: family,
    personGivenName: given,
    personId: id,
    personSlug: `${given}-${family}`.toLowerCase(),
    ...more,
  })

let id = 0

/** A played match in the Eredivisie, away unless `more` says otherwise. */
function match(goals: Goal[], matchDate: string, more: Partial<PublicClubMatch> = {}): PublicClubMatch {
  id += 1

  return {
    afterNinetyAgainst: null,
    afterNinetyFor: null,
    attendance: null,
    competition: 'Eredivisie',
    dataSource: 'wikipedia',
    dateText: null,
    extraTime: false,
    goals,
    goalsAgainst: goals.filter((item) => !item.ours).length,
    goalsFor: goals.filter((item) => item.ours).length,
    home: false,
    id,
    kickoffAt: null,
    matchDate,
    note: null,
    opponent: 'Testclub',
    penaltiesAgainst: null,
    penaltiesFor: null,
    round: `Speelronde ${id}`,
    season: '2025/26',
    stadium: null,
    status: 'played',
    ...more,
  }
}

const none = new Set<number>()

describe('scorersOf', () => {
  it('counts the goals of ours per person on the side of the match, with the year of the last one', () => {
    const result = scorersOf(
      [
        match([person(1, 'Ada', 'Aalders'), person(1, 'Ada', 'Aalders')], '2025-02-01'),
        match([person(1, 'Ada', 'Aalders')], '2023-02-01'),
        match([person(2, 'Bo', 'Bakker')], '2026-02-01'),
        match([person(3, 'Cas', 'Home')], '2024-02-01', { home: true }),
      ],
      false,
      none,
    )

    expect(result?.mostOften.map(({ goals, last, name }) => [name, goals, last])).toEqual([
      ['Ada Aalders', 3, 2025],
      ['Bo Bakker', 1, 2026],
    ])
    expect(result?.mostOften[0]).toMatchObject({ givenName: 'Ada', href: '/spelers/ada-aalders', surname: 'Aalders' })
  })

  it('counts the home matches for a home match', () => {
    const result = scorersOf(
      [
        match([person(1, 'Ada', 'Aalders')], '2025-02-01'),
        match([person(3, 'Cas', 'Home')], '2024-02-01', { home: true }),
      ],
      true,
      none,
    )

    expect(result?.mostOften.map(({ name }) => name)).toEqual(['Cas Home'])
  })

  it('never counts an own goal, of the opponent or of one of ours, and leaves out the goals of the opponent', () => {
    const result = scorersOf(
      [
        match(
          [
            goal('Autogol Tegen', { ours: true, ownGoal: true }),
            person(4, 'Dirk', 'Eigen', { ours: false, ownGoal: true }),
            goal('Tegenstander', { ours: false }),
            person(1, 'Ada', 'Aalders'),
          ],
          '2025-02-01',
        ),
      ],
      false,
      none,
    )

    expect(result?.mostOften.map(({ name }) => name)).toEqual(['Ada Aalders'])
  })

  it('has no scorers, so no card, without a goal of ours on that side', () => {
    expect(scorersOf([match([goal('Tegenstander', { ours: false })], '2025-02-01')], false, none)).toBeUndefined()
    expect(scorersOf([match([person(1, 'Ada', 'Aalders')], '2025-02-01', { home: true })], false, none)).toBeUndefined()
    expect(scorersOf([], false, none)).toBeUndefined()
  })

  it('counts a goal without a person by its name, plain text, and keeps it out of the squad', () => {
    const result = scorersOf([match([goal('Piet Proefman'), goal('Piet Proefman')], '2020-02-01')], false, new Set([1]))

    expect(result?.mostOften).toMatchObject([{ goals: 2, name: 'Piet Proefman', personId: null }])
    expect(result?.mostOften[0]?.href).toBeUndefined()
    expect(result?.squad).toEqual([])
  })

  it('lists the people of the squad apart, however few goals they have, and keeps them in the five too', () => {
    const result = scorersOf(
      [
        match([person(1, 'Ada', 'Aalders'), person(1, 'Ada', 'Aalders'), person(2, 'Bo', 'Bakker')], '2025-02-01'),
        match([person(3, 'Cas', 'Cooper')], '2024-02-01'),
      ],
      false,
      new Set([2, 3]),
    )

    expect(result?.squad.map(({ name }) => name)).toEqual(['Bo Bakker', 'Cas Cooper'])
    expect(result?.mostOften.map(({ name }) => name)).toEqual(['Ada Aalders', 'Bo Bakker', 'Cas Cooper'])
  })

  it('orders equal numbers by the newest last goal, then by the name from A to Z, and shows five at most', () => {
    const result = scorersOf(
      [
        match(
          [
            person(1, 'Zed', 'Zwart'),
            person(2, 'Ann', 'Appel'),
            person(3, 'Bea', 'Beek'),
            person(4, 'Cor', 'Cruijff'),
            person(5, 'Dan', 'Dijk'),
            person(6, 'Eef', 'Eik'),
          ],
          '2020-02-01',
        ),
        match([person(1, 'Zed', 'Zwart'), person(6, 'Eef', 'Eik')], '2021-02-01'),
        match([person(2, 'Ann', 'Appel')], '2020-03-01'),
        match([person(5, 'Dan', 'Dijk')], '2022-02-01'),
      ],
      false,
      none,
    )

    expect(result?.mostOften.map(({ name }) => name)).toEqual([
      'Dan Dijk',
      'Eef Eik',
      'Zed Zwart',
      'Ann Appel',
      'Bea Beek',
    ])
  })
})
