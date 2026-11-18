import type { MatchGoal } from '@fansite/db/schema'

import { encodePartProposal, oldSiteGoalsReason, sourceDifferenceReasons } from '@fansite/db/match-conflicts'
import { describe, expect, it } from 'vitest'

import { copyForWikipedia, wikipediaAttendance, wikipediaGoals } from './wikipedia-copy'

const goal = (overrides: Partial<MatchGoal>): MatchGoal => ({
  appearanceId: null,
  assistAppearanceId: null,
  id: 1,
  matchId: 1,
  minute: 10,
  ours: true,
  ownGoal: false,
  penalty: false,
  personId: null,
  player: 'Van Bergen',
  playerId: null,
  stoppageMinutes: null,
  wikipediaPage: null,
  ...overrides,
})

const facts = JSON.stringify({ attendance: 12000, note: null, part: 'facts', referee: null, stadium: null })
const wikipedia = 'onze invoer en Wikipedia verschillen'

describe('wikipediaGoals', () => {
  const goals = [
    goal({ minute: 45, player: 'Van Bergen', stoppageMinutes: 1, wikipediaPage: 'Henk van Bergen' }),
    goal({ id: 2, minute: 60, ours: false, player: 'Smans' }),
    goal({ id: 3, minute: 88, ours: false, penalty: true, player: 'Kramer' }),
    goal({ id: 4, minute: 90, ours: true, ownGoal: true, player: 'De Jong' }),
  ]

  it('puts our goals on the home side, name first, with the minute and the link', () => {
    expect(wikipediaGoals(goals, true)).toBe(
      [
        '|goals1=[[Henk van Bergen|Van Bergen]] {{goal|45+1}}<br />[[De Jong]] {{goal|90|e.d.}}',
        '|goals2={{goal|60}} [[Smans]]<br />{{goal|88|pen.}} [[Kramer]]',
      ].join('\n'),
    )
  })

  it('swaps the sides for an away match and puts the minute first on the away side', () => {
    expect(wikipediaGoals(goals, false)).toBe(
      [
        '|goals1=[[Smans]] {{goal|60}}<br />[[Kramer]] {{goal|88|pen.}}',
        '|goals2={{goal|45+1}} [[Henk van Bergen|Van Bergen]]<br />{{goal|90|e.d.}} [[De Jong]]',
      ].join('\n'),
    )
  })

  it('writes a goal without a minute as the name alone', () => {
    expect(wikipediaGoals([goal({ minute: null })], true)).toBe('|goals1=[[Van Bergen]]\n|goals2=')
  })
})

describe('wikipediaAttendance', () => {
  it('writes the number without a separator', () => {
    expect(wikipediaAttendance(26100)).toBe('|attendance=26100')
  })
})

describe('copyForWikipedia', () => {
  const match = { attendance: 26100, home: true, status: 'played' as const }
  const difference = (
    part: 'facts' | 'goals' | 'kickoff' | 'result',
    proposal: null | string = null,
    reason = wikipedia,
  ) => ({
    part,
    proposal,
    reason,
  })

  it('copies the goals of a difference in the goals', () => {
    expect(copyForWikipedia(difference('goals'), match, [goal({})])).toEqual({
      text: '|goals1=[[Van Bergen]] {{goal|10}}\n|goals2=',
      what: 'de doelpunten',
    })
  })

  it('copies the attendance of a difference in the facts when Wikipedia has another number', () => {
    expect(copyForWikipedia(difference('facts', facts), match, [])).toEqual({
      text: '|attendance=26100',
      what: 'het aantal toeschouwers',
    })
  })

  it('copies a difference between Wikipedia and the source of the match', () => {
    const reason = sourceDifferenceReasons.wikipedia

    expect(copyForWikipedia(difference('goals', null, reason), match, [goal({})])?.what).toBe('de doelpunten')
  })

  it('gives no button when the facts differ in something else than the attendance', () => {
    const proposal = encodePartProposal('facts', {
      goals: [],
      match: { ...match, afterNinetyAgainst: null, afterNinetyFor: null, attendance: 26100 } as never,
    })

    expect(copyForWikipedia(difference('facts', proposal), match, [])).toBeUndefined()
  })

  it('gives no button when we have no attendance or no goals', () => {
    expect(copyForWikipedia(difference('facts', facts), { ...match, attendance: null }, [])).toBeUndefined()
    expect(copyForWikipedia(difference('goals'), match, [])).toBeUndefined()
  })

  it.each(['kickoff', 'result'] as const)('gives no button for the part %s', (part) => {
    expect(copyForWikipedia(difference(part), match, [goal({})])).toBeUndefined()
  })

  it('gives no button for the goals of the old fansite or for a difference with the old fansite', () => {
    expect(copyForWikipedia(difference('goals', null, oldSiteGoalsReason), match, [goal({})])).toBeUndefined()
    expect(
      copyForWikipedia(difference('goals', null, sourceDifferenceReasons['oude-fansite']), match, [goal({})]),
    ).toBeUndefined()
  })
})
