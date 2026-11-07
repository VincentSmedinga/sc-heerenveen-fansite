import { describe, expect, it } from 'vitest'

import type { CompletenessPlayer, CompletenessScorer, SquadCompletenessInput } from './squad-completeness.ts'

import { levelOf, minimumMatches, smallSquad, sourceCeilings, squadCompleteness } from './squad-completeness.ts'

function players(count: number): CompletenessPlayer[] {
  return Array.from({ length: count }, (_, index) => ({ name: `Speler Nummer${index}`, personId: index + 1 }))
}

function scorersOf(list: CompletenessPlayer[], count: number): CompletenessScorer[] {
  return list.slice(0, count).map((player) => ({ goals: 2, name: player.name, personId: player.personId }))
}

function season(overrides: Partial<SquadCompletenessInput> = {}): SquadCompletenessInput {
  const list = players(28)

  return {
    goalsTotal: null,
    matchesTotal: null,
    players: list,
    playersPerSource: { selectie: 28 },
    scorers: scorersOf(list, 10),
    ...overrides,
  }
}

describe('squadCompleteness', () => {
  it('is complete for a table of the whole squad, a usual size and every scorer in it', () => {
    const result = squadCompleteness(season())

    expect(result.level).toBe('compleet')
    expect(result.probability).toBe(sourceCeilings.selectie)
  })

  it('is at most almost complete when one scorer is missing', () => {
    const list = players(28)
    const scorers = [...scorersOf(list, 10), { goals: 1, name: 'Niet Erbij', personId: 999 }]
    const result = squadCompleteness(season({ players: list, scorers }))

    expect(result.probability).toBeLessThan(55)
    expect(result.level).not.toBe('compleet')
    expect(result.level).not.toBe('bijna')
    expect(result.checks.find((check) => check.name === 'scorers')?.outcome).toBe('failed')
  })

  it('finds a scorer without a person by his name, without accents', () => {
    const list = [{ name: 'José Müller', personId: null }, ...players(27)]
    const scorers = [{ goals: 1, name: 'Jose Muller', personId: null }]
    const result = squadCompleteness(season({ players: list, scorers }))

    expect(result.checks.find((check) => check.name === 'scorers')?.outcome).toBe('passed')
  })

  it('finds scorers with a person in a list without persons, by their names, up to the ceiling of the source', () => {
    const list = players(30).map((player) => ({ ...player, personId: null }))
    const result = squadCompleteness(
      season({ players: list, playersPerSource: { engels: 30 }, scorers: scorersOf(players(30), 12) }),
    )

    expect(result.checks.find((check) => check.name === 'scorers')?.outcome).toBe('passed')
    expect(result.probability).toBe(sourceCeilings.engels)
    expect(result.level).toBe('bijna')
  })

  it('still fails for a scorer with a person who is in the list by neither person nor name', () => {
    const list = players(30).map((player) => ({ ...player, personId: null }))
    const scorers = [...scorersOf(players(30), 12), { goals: 1, name: 'Niet Erbij', personId: 999 }]
    const result = squadCompleteness(season({ players: list, playersPerSource: { engels: 30 }, scorers }))

    expect(result.checks.find((check) => check.name === 'scorers')?.outcome).toBe('failed')
    expect(result.probability).toBeLessThan(55)
  })

  it('is at most partly complete for a table of who played with too few matches', () => {
    const result = squadCompleteness(
      season({ matchesTotal: minimumMatches - 1, playersPerSource: { statistieken: 28 } }),
    )

    expect(result.probability).toBeLessThanOrEqual(45)
    expect(['deels', 'weinig']).toContain(result.level)
    expect(result.checks.find((check) => check.name === 'matches')?.outcome).toBe('failed')
  })

  it('does not check the matches of a table that is not a list of who played', () => {
    const result = squadCompleteness(season({ matchesTotal: 1 }))

    expect(result.checks.find((check) => check.name === 'matches')?.outcome).toBe('unavailable')
    expect(result.level).toBe('compleet')
  })

  it('fails when the table gives fewer goals than the goals of ours', () => {
    const list = players(28)
    const result = squadCompleteness(season({ goalsTotal: 5, players: list, scorers: scorersOf(list, 10) }))

    expect(result.checks.find((check) => check.name === 'goals')?.outcome).toBe('failed')
    expect(result.level).toBe('deels')
  })

  it('lowers the chance for a squad with few players', () => {
    const result = squadCompleteness(season({ players: players(smallSquad - 1), scorers: null }))

    expect(result.probability).toBeLessThan(55)
    expect(result.checks.find((check) => check.name === 'size')?.outcome).toBe('failed')
  })

  it('does not lower or raise anything for a check that cannot run', () => {
    const result = squadCompleteness(season({ scorers: null }))

    expect(result.probability).toBe(sourceCeilings.selectie)
    expect(result.checks.find((check) => check.name === 'scorers')?.outcome).toBe('unavailable')
    expect(result.checks.find((check) => check.name === 'goals')?.outcome).toBe('unavailable')
  })

  it('never gives transfers more than their ceiling, whatever the checks say', () => {
    for (const count of [5, 28, 60]) {
      const result = squadCompleteness(season({ players: players(count), playersPerSource: { transfers: count } }))

      expect(result.probability).toBeLessThanOrEqual(sourceCeilings.transfers)
    }
  })

  it('is unknown with probability 0 without players', () => {
    expect(squadCompleteness(season({ players: [], playersPerSource: {} }))).toEqual({
      checks: [],
      level: 'onbekend',
      probability: 0,
    })
    expect(squadCompleteness(season({ playersPerSource: {} })).probability).toBe(0)
  })

  it('does not raise the chance above the ceiling of a weaker source with more players', () => {
    const few = squadCompleteness(season({ players: players(25), playersPerSource: { statistieken: 25 } }))
    const many = squadCompleteness(season({ players: players(80), playersPerSource: { statistieken: 80 } }))

    expect(many.probability).toBeLessThanOrEqual(sourceCeilings.statistieken)
    expect(many.probability).toBeLessThanOrEqual(few.probability)
  })

  it('starts at the best source of the season', () => {
    const result = squadCompleteness(season({ playersPerSource: { statistieken: 20, transfers: 8 } }))

    expect(result.probability).toBe(sourceCeilings.statistieken)
  })

  it('keeps the sources in order of what they can know', () => {
    const order = ['selectie', 'engels', 'statistieken', 'wikidata', 'transfers', 'doelpunten', 'verslag'] as const
    const ceilings = order.map((source) => sourceCeilings[source])

    expect(ceilings).toEqual([...ceilings].sort((a, b) => b - a))
    expect(sourceCeilings.selectie).toBe(95)
  })

  it('is always a whole number from 0 to 100', () => {
    for (const source of Object.keys(sourceCeilings) as (keyof typeof sourceCeilings)[]) {
      const { probability } = squadCompleteness(season({ playersPerSource: { [source]: 28 } }))

      expect(Number.isInteger(probability)).toBe(true)
      expect(probability).toBeGreaterThanOrEqual(0)
      expect(probability).toBeLessThanOrEqual(100)
    }
  })
})

describe('levelOf', () => {
  it('has the borders of the levels', () => {
    expect([0, 1, 24, 25, 54, 55, 79, 80, 100].map(levelOf)).toEqual([
      'onbekend',
      'weinig',
      'weinig',
      'deels',
      'deels',
      'bijna',
      'bijna',
      'compleet',
      'compleet',
    ])
  })
})
