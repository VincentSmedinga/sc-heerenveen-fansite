import type { PublicClubMatch } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import { headToHeadOf } from './preview-head-to-head'

let id = 0

/** A played match in the Eredivisie, away unless `more` says otherwise. */
function match(ours: null | number, theirs: null | number, more: Partial<PublicClubMatch> = {}): PublicClubMatch {
  id += 1

  return {
    afterNinetyAgainst: null,
    afterNinetyFor: null,
    attendance: null,
    competition: 'Eredivisie',
    dataSource: 'wikipedia',
    dateText: null,
    extraTime: false,
    goals: [],
    goalsAgainst: theirs,
    goalsFor: ours,
    home: false,
    id,
    kickoffAt: null,
    matchDate: '2026-10-24',
    note: null,
    opponent: 'Testclub',
    penaltiesAgainst: null,
    penaltiesFor: null,
    round: `Speelronde ${id}`,
    season: '2026/27',
    stadium: null,
    status: 'played',
    ...more,
  }
}

/** The newest first, as `listClubMatches` gives them. */
const matches: PublicClubMatch[] = [
  match(null, null, { matchDate: '2026-11-21', status: 'scheduled' }),
  match(1, 0, { home: true, matchDate: '2026-04-12', season: '2025/26' }),
  match(0, 1, { matchDate: '2026-02-01', season: '2025/26' }),
  match(5, 1, { matchDate: '2025-04-20', season: '2024/25' }),
  match(3, 0, { competition: 'KNVB Beker', matchDate: '2024-12-18', season: '2024/25' }),
  match(2, 2, { matchDate: '2024-09-01', season: '2024/25' }),
  match(0, 2, { matchDate: '2023-10-01', season: '2023/24', status: 'cancelled' }),
  match(4, 0, { home: true, matchDate: '2023-03-05', season: '2022/23' }),
  match(1, 0, { matchDate: '2022-03-06', season: '2021/22' }),
  match(4, 0, { matchDate: '2021-02-07', season: '2020/21' }),
  match(3, 2, { matchDate: '2020-02-09', season: '2019/20' }),
]

describe('headToHeadOf', () => {
  it('counts only the played matches away for an away match, in every competition', () => {
    const result = headToHeadOf(matches, false)

    expect(result?.tally).toEqual({ drawn: 1, goalsAgainst: 6, goalsFor: 18, lost: 1, played: 7, won: 5 })
    expect(result?.since).toBe('2019/20')
  })

  it('counts only the played home matches for a home match', () => {
    const result = headToHeadOf(matches, true)

    expect(result?.tally).toEqual({ drawn: 0, goalsAgainst: 0, goalsFor: 5, lost: 0, played: 2, won: 2 })
    expect(result?.since).toBe('2022/23')
  })

  it('does not count a match that is not played, called off or without a score', () => {
    const result = headToHeadOf(
      [
        match(null, null, { status: 'scheduled' }),
        match(null, null, { status: 'postponed' }),
        match(null, null, { status: 'played' }),
        match(1, 0),
      ],
      false,
    )

    expect(result?.tally.played).toBe(1)
  })

  it('lists the newest five, newest first', () => {
    expect(headToHeadOf(matches, false)?.last.map((meeting) => meeting.matchDate)).toEqual([
      '2026-02-01',
      '2025-04-20',
      '2024-12-18',
      '2024-09-01',
      '2022-03-06',
    ])
    expect(headToHeadOf(matches, true)?.last).toHaveLength(2)
  })

  it('has the last win and the biggest win: most goals ahead, then most goals of ours, then the newest', () => {
    const result = headToHeadOf(matches, false)

    expect(result?.lastWin?.matchDate).toBe('2025-04-20')
    // 5–1 and 4–0 are 4 ahead; the one with the most goals of ours wins.
    expect(result?.biggestWin?.matchDate).toBe('2025-04-20')

    const level = headToHeadOf(
      [match(4, 0, { matchDate: '2025-01-01' }), match(4, 0, { matchDate: '2024-01-01' })],
      false,
    )

    expect(level?.biggestWin?.matchDate).toBe('2025-01-01')
  })

  it('has no win to show when there is none', () => {
    const result = headToHeadOf([match(0, 1), match(2, 2)], false)

    expect(result?.lastWin).toBeUndefined()
    expect(result?.biggestWin).toBeUndefined()
  })

  it('gives nothing for a club that we have not played on that side', () => {
    expect(headToHeadOf([match(1, 0, { home: true })], false)).toBeUndefined()
    expect(headToHeadOf([], false)).toBeUndefined()
  })
})
