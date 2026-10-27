import { describe, expect, it } from 'vitest'

import type { LinkableGoal, LinkablePlayer } from './link-players.ts'

import { isGoalOfOurPlayer, playerLinker } from './link-players.ts'

const squad: LinkablePlayer[] = [
  { id: 1, name: 'Luca Oyen', wikipediaPage: 'Luca Oyen' },
  { id: 2, name: 'Jacob Trenskow', wikipediaPage: 'Jacob Trenskow' },
  { id: 3, name: 'Jan Paul van Hecke', wikipediaPage: 'Jan Paul van Hecke' },
  { id: 4, name: 'Roberts Uldrikis', wikipediaPage: 'Roberts Uldriķis' },
  { id: 5, name: 'Pim Verbeek', wikipediaPage: 'Pim Verbeek (voetballer, 1999)' },
  { id: 6, name: 'Dinho', wikipediaPage: null },
]

const goal = (player: string, playerPage: null | string = null, rest: Partial<LinkableGoal> = {}): LinkableGoal => ({
  ours: true,
  ownGoal: false,
  player,
  playerPage,
  ...rest,
})

describe('the goals of our players', () => {
  it.each([
    ['a goal of sc Heerenveen', { ours: true, ownGoal: false }, true],
    ['an own goal listed under the opponent, of a player of ours', { ours: false, ownGoal: true }, true],
    ['a goal of the opponent', { ours: false, ownGoal: false }, false],
    ['an own goal of an opponent, listed under sc Heerenveen', { ours: true, ownGoal: true }, false],
  ])('are told from %s', (_name, goal, expected) => {
    expect(isGoalOfOurPlayer(goal)).toBe(expected)
  })
})

describe('linking a goal to a player', () => {
  const link = playerLinker(squad)

  describe('1. by the page of the link', () => {
    it('finds the player whose page the goal links to', () => {
      expect(link(goal('Oyen', 'Luca Oyen'))).toBe(1)
    })

    it('finds the player when the name in the goal is not his name at all', () => {
      expect(link(goal('Uldrikis', 'Roberts Uldriķis'))).toBe(4)
      expect(link(goal('Verbeek', 'Pim Verbeek (voetballer, 1999)'))).toBe(5)
    })

    it('does not care about capitals and accents in the page', () => {
      expect(link(goal('Uldrikis', 'roberts uldrikis'))).toBe(4)
    })

    it('goes before the name: the page of a player wins over a name that fits another', () => {
      expect(link(goal('Trenskow', 'Luca Oyen'))).toBe(1)
    })
  })

  describe('2. by the full name', () => {
    it('finds the player whose full name is in the goal, without a link', () => {
      expect(link(goal('Luca Oyen'))).toBe(1)
      expect(link(goal('Jan Paul van Hecke'))).toBe(3)
    })

    it('finds him when the page is one we do not know, such as a redirect', () => {
      expect(link(goal('Luca Oyen', 'Luca Oyen (voetballer)'))).toBe(1)
    })

    it('does not care about capitals and accents', () => {
      expect(link(goal('roberts uldriķis'))).toBe(4)
    })

    it('finds a player of one name', () => {
      expect(link(goal('Dinho'))).toBe(6)
    })
  })

  describe('3. by the surname, when only one player has it', () => {
    it('finds the player whose name ends in the name of the goal', () => {
      expect(link(goal('Oyen'))).toBe(1)
      expect(link(goal('Trenskow', 'Jacob Trenskow (voetballer)'))).toBe(2)
    })

    it('finds a surname of more than one word, and one that is written with a capital', () => {
      expect(link(goal('Van Hecke'))).toBe(3)
      expect(link(goal('van Hecke'))).toBe(3)
    })

    it('takes the last words of a name, and not a part of a word or the first name', () => {
      expect(link(goal('Hecke'))).toBe(3)
      expect(link(goal('ecke'))).toBeNull()
      expect(link(goal('Luca'))).toBeNull()
    })

    it('does not guess when two players have the surname, not even when one has left the squad', () => {
      const twins = playerLinker([
        ...squad,
        { id: 7, name: 'Bram Jansen', wikipediaPage: 'Bram Jansen' },
        { id: 8, name: 'Kees Jansen', wikipediaPage: null },
      ])

      expect(twins(goal('Jansen'))).toBeNull()
      expect(twins(goal('Jansen', 'Pagina die niemand heeft'))).toBeNull()
    })

    it('still links two players with the same surname by their pages or their full names', () => {
      const twins = playerLinker([
        { id: 7, name: 'Bram Jansen', wikipediaPage: 'Bram Jansen' },
        { id: 8, name: 'Kees Jansen', wikipediaPage: 'Kees Jansen' },
      ])

      expect(twins(goal('Jansen', 'Bram Jansen'))).toBe(7)
      expect(twins(goal('Jansen', 'Kees Jansen'))).toBe(8)
      expect(twins(goal('Kees Jansen'))).toBe(8)
    })
  })

  describe('4. otherwise nobody', () => {
    it('gives null for a name no player has', () => {
      expect(link(goal('Onbekend'))).toBeNull()
      expect(link(goal('Onbekend', 'Een Onbekende'))).toBeNull()
    })

    it('gives null for a squad without players', () => {
      expect(playerLinker([])(goal('Oyen', 'Luca Oyen'))).toBeNull()
    })
  })

  describe('the goals that are not of our players', () => {
    it('leaves a goal of the opponent alone, also when a player of ours has the name', () => {
      expect(link(goal('Oyen', 'Luca Oyen', { ours: false }))).toBeNull()
    })

    it('leaves an own goal of an opponent alone, listed under sc Heerenveen', () => {
      expect(link(goal('Oyen', 'Luca Oyen', { ownGoal: true }))).toBeNull()
    })

    it('links an own goal of a player of ours, listed under the opponent', () => {
      expect(link(goal('Oyen', 'Luca Oyen', { ours: false, ownGoal: true }))).toBe(1)
    })
  })
})
