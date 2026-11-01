import type { PublicClubMatch } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import { earlierNames, meetingsOf, seasonsOf, stadiumsOf, summaryOf, tallyOf } from './opponents'

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

describe('stadiumsOf', () => {
  /** A league match we played away, at the stadium the club had on that day. */
  const visit = (matchDate: string, stadium: null | string, more: Partial<PublicClubMatch> = {}) =>
    match(1, 0, { home: false, matchDate, stadium, ...more })

  it('gives the one name of a club that never changed, from the first to the last visit', () => {
    const visits = [visit('2025-03-01', 'Stadion Test'), visit('2022-10-02', 'Stadion Test')]

    expect(stadiumsOf(visits)).toEqual([{ firstDay: '2022-10-02', lastDay: '2025-03-01', name: 'Stadion Test' }])
  })

  it('gives the names in the order of the matches, whatever the order they come in', () => {
    const visits = [
      visit('2026-02-01', 'Nieuwe Arena'),
      visit('2024-11-10', 'Nieuwe Arena'),
      visit('2023-04-02', 'Oud Stadion'),
      visit('2021-09-12', 'Oud Stadion'),
    ]

    expect(stadiumsOf(visits)).toEqual([
      { firstDay: '2021-09-12', lastDay: '2023-04-02', name: 'Oud Stadion' },
      { firstDay: '2024-11-10', lastDay: '2026-02-01', name: 'Nieuwe Arena' },
    ])
  })

  it('puts the kick-off in order when two matches have the same day', () => {
    const visits = [
      visit('2025-05-04', 'Late Naam', { kickoffAt: new Date('2025-05-04T18:00:00Z') }),
      visit('2025-05-04', 'Vroege Naam', { kickoffAt: new Date('2025-05-04T12:00:00Z') }),
    ]

    expect(stadiumsOf(visits).map((stadium) => stadium.name)).toEqual(['Vroege Naam', 'Late Naam'])
  })

  it('gives a name that returns as a line of its own', () => {
    const visits = [visit('2024-01-01', 'A'), visit('2023-01-01', 'B'), visit('2022-01-01', 'A')]

    expect(stadiumsOf(visits).map((stadium) => stadium.name)).toEqual(['A', 'B', 'A'])
  })

  it('leaves out a cup tie and a play-off, which can be at a neutral ground', () => {
    const visits = [
      visit('2025-05-17', 'Neutraal Stadion', { competition: 'KNVB Beker' }),
      visit('2025-05-10', 'Play-offstadion', { competition: 'Play-offs Conference League' }),
      visit('2025-03-01', 'Stadion Test'),
    ]

    expect(stadiumsOf(visits).map((stadium) => stadium.name)).toEqual(['Stadion Test'])
  })

  it('leaves out the matches we played at home, where the stadium is ours', () => {
    expect(stadiumsOf([match(2, 0, { stadium: 'Abe Lenstra Stadion' })])).toEqual([])
  })

  it('leaves out a match that is not played, and a match without a stadium', () => {
    const visits = [
      visit('2026-04-04', 'Komend Stadion', { goalsAgainst: null, goalsFor: null, status: 'scheduled' }),
      visit('2026-03-03', 'Uitgesteld Stadion', { goalsAgainst: null, goalsFor: null, status: 'postponed' }),
      visit('2025-03-01', null),
      visit('2025-02-01', '  '),
    ]

    expect(stadiumsOf(visits)).toEqual([])
  })

  it('counts a stopped match for where it began: it is a played match with the stadium of the club', () => {
    // The match was stopped in minute 82 and finished in another stadium; the match keeps the
    // stadium where it began (see `matches.note`).
    const stopped = visit('2025-10-19', 'Stadion Test', { goalsAgainst: 0, goalsFor: 6 })

    expect(stadiumsOf([stopped])).toEqual([{ firstDay: '2025-10-19', lastDay: '2025-10-19', name: 'Stadion Test' }])
  })

  it('takes spellings that differ in capitals, spaces or hyphens for one name, as the first match wrote it', () => {
    const visits = [
      visit('2026-02-01', 'stadion  de-kuip'),
      visit('2025-02-01', 'Stadion de kuip'),
      visit('2024-02-01', 'Stadion De Kuip'),
    ]

    expect(stadiumsOf(visits)).toEqual([{ firstDay: '2024-02-01', lastDay: '2026-02-01', name: 'Stadion De Kuip' }])
  })

  it('keeps two names that may be one, such as one with "Stadion" in front', () => {
    const visits = [visit('2025-02-01', 'Galgenwaard'), visit('2024-02-01', 'Stadion Galgenwaard')]

    expect(stadiumsOf(visits).map((stadium) => stadium.name)).toEqual(['Stadion Galgenwaard', 'Galgenwaard'])
  })

  it('gives an empty list for a club we never visited in the league', () => {
    expect(stadiumsOf([])).toEqual([])
    expect(stadiumsOf(matches.filter((item) => item.competition === 'KNVB Beker'))).toEqual([])
  })
})
