import type { PublicClubMatch } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import { earlierNames, meetingsOf, seasonsOf, summaryOf, tallyOf } from './opponents'

let id = 0

/** A match against the club, played at home in the Eredivisie unless `more` says otherwise. */
function match(ours: null | number, theirs: null | number, more: Partial<PublicClubMatch> = {}): PublicClubMatch {
  id += 1

  return {
    competition: 'Eredivisie',
    dateText: null,
    extraTime: false,
    goalsAgainst: theirs,
    goalsFor: ours,
    home: true,
    id,
    kickoffAt: null,
    matchDate: '2026-10-24',
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

/** The newest first, as `listClubMatches` gives them: home and away, the league and the cup. */
const matches: PublicClubMatch[] = [
  match(0, 3, { competition: 'KNVB Beker', home: false, matchDate: '2026-09-20', season: '2026/27' }),
  match(2, 2, { home: false, matchDate: '2025-12-14', season: '2025/26' }),
  match(1, 1, {
    competition: 'KNVB Beker',
    matchDate: '2025-10-30',
    penaltiesAgainst: 2,
    penaltiesFor: 4,
    season: '2025/26',
  }),
  match(4, 1, { matchDate: '2025-04-06', season: '2024/25' }),
  match(null, null, { matchDate: '2025-01-12', season: '2024/25', status: 'scheduled' }),
  match(1, 0, { home: false, matchDate: '2024-11-02', season: '2024/25' }),
  match(0, 1, { matchDate: '2023-10-01', season: '2023/24' }),
  match(5, 1, { home: false, matchDate: '2022-03-05', season: '2021/22' }),
]

describe('meetingsOf', () => {
  it('keeps the played matches with a score, in the order given, for all the matches', () => {
    const all = meetingsOf(matches, 'all')

    expect(all).toHaveLength(7)
    expect(all.map((meeting) => meeting.matchDate)).toEqual(
      matches.filter((item) => item.status === 'played').map((item) => item.matchDate),
    )
  })

  it('keeps only the Eredivisie for the league', () => {
    const league = meetingsOf(matches, 'league')

    expect(league).toHaveLength(5)
    expect(league.every((meeting) => meeting.competition === 'Eredivisie')).toBe(true)
  })

  it('leaves out a match that is played but has no score', () => {
    expect(meetingsOf([match(null, null)], 'all')).toEqual([])
  })
})

describe('tallyOf', () => {
  it('counts a cup tie that a shoot-out decided after a level score as a draw', () => {
    expect(tallyOf(meetingsOf([matches[2] as PublicClubMatch], 'all'))).toEqual({
      drawn: 1,
      goalsAgainst: 1,
      goalsFor: 1,
      lost: 0,
      played: 1,
      won: 0,
    })
  })

  it('is all zeros without a meeting', () => {
    expect(tallyOf([])).toEqual({ drawn: 0, goalsAgainst: 0, goalsFor: 0, lost: 0, played: 0, won: 0 })
  })
})

describe.each([['all' as const], ['league' as const]])('summaryOf, for the choice %s', (choice) => {
  const summary = summaryOf(meetingsOf(matches, choice))

  it('has a total that is the home matches and the away matches together', () => {
    for (const key of ['drawn', 'goalsAgainst', 'goalsFor', 'lost', 'played', 'won'] as const) {
      expect(summary.total[key]).toBe(summary.home[key] + summary.away[key])
    }
  })

  it.each([['total'], ['home'], ['away']] as const)('has won, drawn and lost that add up to played for %s', (side) => {
    const tally = summary[side]

    expect(tally.won + tally.drawn + tally.lost).toBe(tally.played)
  })

  it('has the biggest win and the biggest loss by the difference in goals', () => {
    expect(summary.biggestWin?.goalsFor).toBe(5)
    expect(summary.biggestWin?.goalsAgainst).toBe(1)
    expect(summary.biggestLoss).toBeDefined()
  })
})

describe('summaryOf', () => {
  it('counts the cup in the choice all and not in the league', () => {
    expect(summaryOf(meetingsOf(matches, 'all')).total.played).toBe(7)
    expect(summaryOf(meetingsOf(matches, 'league')).total.played).toBe(5)
  })

  it('has the biggest loss in the cup for all and in the league for the league', () => {
    expect(summaryOf(meetingsOf(matches, 'all')).biggestLoss).toMatchObject({
      competition: 'KNVB Beker',
      goalsAgainst: 3,
    })
    expect(summaryOf(meetingsOf(matches, 'league')).biggestLoss).toMatchObject({
      competition: 'Eredivisie',
      goalsAgainst: 1,
    })
  })

  it('takes the later match when two are equally big, as the card Uitersten does', () => {
    const earlier = match(3, 0, { matchDate: '2020-01-01' })
    const later = match(3, 0, { matchDate: '2024-01-01' })

    // The newest first: the later match comes first in the list.
    expect(summaryOf(meetingsOf([later, earlier], 'all')).biggestWin).toBe(later)
  })

  it('has no biggest win or loss in a record of draws', () => {
    const summary = summaryOf(meetingsOf([match(1, 1), match(0, 0, { home: false })], 'all'))

    expect(summary.biggestWin).toBeUndefined()
    expect(summary.biggestLoss).toBeUndefined()
    expect(summary.total.drawn).toBe(2)
  })

  it('has a side with no match at all as zeros', () => {
    const summary = summaryOf(meetingsOf([match(2, 0)], 'all'))

    expect(summary.away).toEqual({ drawn: 0, goalsAgainst: 0, goalsFor: 0, lost: 0, played: 0, won: 0 })
    expect(summary.home.played).toBe(1)
  })
})

describe('earlierNames', () => {
  it('joins the other names and says nothing for a club that has none', () => {
    expect(earlierNames(['Be Quick', 'Be Quick 1887'])).toBe('Be Quick, Be Quick 1887')
    expect(earlierNames([])).toBeUndefined()
  })
})

describe('seasonsOf', () => {
  it('gives each season once, the newest first', () => {
    expect(seasonsOf(matches)).toEqual(['2026/27', '2025/26', '2024/25', '2023/24', '2021/22'])
  })
})
