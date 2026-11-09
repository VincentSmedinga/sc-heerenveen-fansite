import type { PublicLeagueResult } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import { meetingOutcomeOf, meetingScoreOf, opponentFormOf } from './upcoming-match'

const result = (
  round: number,
  homeClub: string,
  homeGoals: number,
  awayClub: string,
  awayGoals: number,
): PublicLeagueResult => ({
  awayClub,
  awayGoals,
  homeClub,
  homeGoals,
  playedOn: `2026-09-${String(round).padStart(2, '0')}`,
  round,
})

describe('opponentFormOf', () => {
  it('gives the last five results of the club, the oldest first, from its own side', () => {
    const results = [
      result(1, 'Ajax', 3, 'PSV', 0),
      result(2, 'PSV', 1, 'Ajax', 1),
      result(3, 'Ajax', 0, 'FC Utrecht', 2),
      result(4, 'FC Twente', 1, 'Ajax', 2),
      result(5, 'Ajax', 0, 'PSV', 1),
      result(6, 'Ajax', 2, 'FC Twente', 2),
      result(7, 'PSV', 4, 'FC Twente', 0),
    ]

    expect(opponentFormOf(results, 'Ajax')).toEqual(['G', 'V', 'W', 'V', 'G'])
  })

  it('gives fewer than five early in the season', () => {
    expect(opponentFormOf([result(1, 'Ajax', 3, 'PSV', 0), result(2, 'PSV', 1, 'Ajax', 1)], 'PSV')).toEqual(['V', 'G'])
  })

  it('gives nothing for a club with no league result, such as a cup opponent or a newly promoted club', () => {
    expect(opponentFormOf([result(1, 'Ajax', 3, 'PSV', 0)], 'FC Eindhoven')).toEqual([])
    expect(opponentFormOf([], 'Ajax')).toEqual([])
  })

  it('orders by day and then by round, whatever the order the results come in', () => {
    const results = [result(3, 'Ajax', 1, 'PSV', 0), result(1, 'Ajax', 0, 'PSV', 1), result(2, 'Ajax', 2, 'PSV', 2)]

    expect(opponentFormOf(results, 'Ajax')).toEqual(['V', 'G', 'W'])
  })
})

describe('the previous meeting', () => {
  it('names the home club first, whichever side sc Heerenveen was on', () => {
    expect(meetingScoreOf({ goalsAgainst: 1, goalsFor: 2 }, true)).toEqual([2, 1])
    expect(meetingScoreOf({ goalsAgainst: 1, goalsFor: 2 }, false)).toEqual([1, 2])
  })

  it('takes the outcome for sc Heerenveen, not for the home club', () => {
    expect(meetingOutcomeOf({ goalsAgainst: 1, goalsFor: 2 })).toBe('win')
    expect(meetingOutcomeOf({ goalsAgainst: 3, goalsFor: 2 })).toBe('loss')
    expect(meetingOutcomeOf({ goalsAgainst: 2, goalsFor: 2 })).toBe('draw')
  })
})
