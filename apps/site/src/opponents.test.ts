import type { PublicClubMatch, PublicClubRecord, PublicMatch } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import { overviewOf } from './matches'
import {
  clubScorersMinimum,
  earlierNames,
  hasClubScorers,
  lastResultsOf,
  meetingsOf,
  pointsOf,
  seasonsOf,
  stadiumsOf,
  summaryOf,
  tallyOf,
  topPointsOf,
  upcomingOf,
} from './opponents'

let id = 0

/** A match against the club, played at home in the Eredivisie unless `more` says otherwise. */
function match(ours: null | number, theirs: null | number, more: Partial<PublicClubMatch> = {}): PublicClubMatch {
  id += 1

  return {
    afterNinetyAgainst: null,
    afterNinetyFor: null,
    competition: 'Eredivisie',
    dateText: null,
    extraTime: false,
    goals: [],
    goalsAgainst: theirs,
    goalsFor: ours,
    home: true,
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

  it('does not count a cancelled match, in the record or in the latest five', () => {
    const cancelled = match(0, 0, { goalsAgainst: null, goalsFor: null, status: 'cancelled' })
    const played = [match(1, 0), match(2, 0), match(3, 0), match(0, 1), match(0, 0)]
    const meetings = meetingsOf([cancelled, ...played], 'all')

    expect(meetings).toEqual(played)
    expect(tallyOf(meetings)).toMatchObject({ played: 5 })
    expect(lastResultsOf(meetingsOf([cancelled, ...played.slice(0, 4)], 'all'))).toBeUndefined()
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

describe('hasClubScorers', () => {
  const played = (count: number) => Array.from({ length: count }, () => match(1, 0))

  it('has the card from five played matches with a result, and not with four or fewer', () => {
    expect(clubScorersMinimum).toBe(5)
    expect(hasClubScorers(played(4))).toBe(false)
    expect(hasClubScorers(played(5))).toBe(true)
    expect(hasClubScorers(played(6))).toBe(true)
  })

  it('does not count a match still to be played, a cancelled one or one without a result', () => {
    const notCounted = [
      match(null, null, { status: 'scheduled' }),
      match(null, null, { status: 'postponed' }),
      match(0, 0, { goalsAgainst: null, goalsFor: null, status: 'cancelled' }),
      match(null, null),
    ]

    expect(hasClubScorers([...played(4), ...notCounted])).toBe(false)
    expect(hasClubScorers([...played(5), ...notCounted])).toBe(true)
  })

  it('counts every competition, so it does not depend on the choice of the visitor', () => {
    const mixed = [...played(3), match(0, 1, { competition: 'KNVB Beker' }), match(2, 2, { competition: 'KNVB Beker' })]

    expect(meetingsOf(mixed, 'league')).toHaveLength(3)
    expect(hasClubScorers(mixed)).toBe(true)
  })
})

describe('lastResultsOf', () => {
  it('gives the latest five as W, G and V from our side, the oldest first and the newest last', () => {
    // The newest first: V (cup), G (league), G (cup, level after extra time), W, W.
    expect(lastResultsOf(meetingsOf(matches, 'all').slice(0, 5))).toEqual(['W', 'W', 'G', 'G', 'V'])
  })

  it('leaves older meetings out when there are more than five', () => {
    expect(lastResultsOf(meetingsOf(matches, 'all'))).toEqual(['W', 'W', 'G', 'G', 'V'])
  })

  it('counts a cup tie that a shoot-out decided after a level score as a draw', () => {
    const results = lastResultsOf([
      ...meetingsOf([match(1, 1, { competition: 'KNVB Beker', penaltiesAgainst: 5, penaltiesFor: 3 })], 'all'),
      ...meetingsOf(matches, 'league').slice(1, 5),
    ])

    expect(results?.at(-1)).toBe('G')
  })

  it('has no row for four meetings, and one for five', () => {
    const meetings = meetingsOf(matches, 'all')

    expect(lastResultsOf(meetings.slice(0, 4))).toBeUndefined()
    expect(lastResultsOf(meetings.slice(0, 5))).toHaveLength(5)
    expect(lastResultsOf([])).toBeUndefined()
  })

  it('only counts the meetings of the choice it is given', () => {
    // Five in the league: 2-2, 4-1, 1-0, 0-1, 5-1 (newest first).
    expect(lastResultsOf(meetingsOf(matches, 'league'))).toEqual(['W', 'V', 'W', 'W', 'G'])
    expect(lastResultsOf(meetingsOf(matches, 'all'))).toEqual(['W', 'W', 'G', 'G', 'V'])
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
    const visits = [
      visit('2025-03-01', 'Stadion Test', { season: '2024/25' }),
      visit('2022-10-02', 'Stadion Test', { season: '2022/23' }),
    ]

    expect(stadiumsOf(visits)).toEqual([{ firstSeason: '2022/23', lastSeason: '2024/25', name: 'Stadion Test' }])
  })

  it('gives the names in the order of the matches, whatever the order they come in', () => {
    const visits = [
      visit('2026-02-01', 'Nieuwe Arena', { season: '2025/26' }),
      visit('2024-11-10', 'Nieuwe Arena', { season: '2024/25' }),
      visit('2023-04-02', 'Oud Stadion', { season: '2022/23' }),
      visit('2021-09-12', 'Oud Stadion', { season: '2021/22' }),
    ]

    expect(stadiumsOf(visits)).toEqual([
      { firstSeason: '2021/22', lastSeason: '2022/23', name: 'Oud Stadion' },
      { firstSeason: '2024/25', lastSeason: '2025/26', name: 'Nieuwe Arena' },
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
    const visits = [
      visit('2024-01-01', 'A', { season: '2023/24' }),
      visit('2023-01-01', 'B', { season: '2022/23' }),
      visit('2022-01-01', 'A', { season: '2021/22' }),
    ]

    expect(stadiumsOf(visits)).toEqual([
      { firstSeason: '2021/22', lastSeason: '2021/22', name: 'A' },
      { firstSeason: '2022/23', lastSeason: '2022/23', name: 'B' },
      { firstSeason: '2023/24', lastSeason: '2023/24', name: 'A' },
    ])
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
    const stopped = visit('2025-10-19', 'Stadion Test', { goalsAgainst: 0, goalsFor: 6, season: '2025/26' })

    expect(stadiumsOf([stopped])).toEqual([{ firstSeason: '2025/26', lastSeason: '2025/26', name: 'Stadion Test' }])
  })

  it('takes spellings that differ in capitals, spaces or hyphens for one name, as the first match wrote it', () => {
    const visits = [
      visit('2026-02-01', 'stadion  de-kuip', { season: '2025/26' }),
      visit('2025-02-01', 'Stadion de kuip', { season: '2024/25' }),
      visit('2024-02-01', 'Stadion De Kuip', { season: '2023/24' }),
    ]

    expect(stadiumsOf(visits)).toEqual([{ firstSeason: '2023/24', lastSeason: '2025/26', name: 'Stadion De Kuip' }])
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

describe('upcomingOf', () => {
  // Between the played match of 24 October and the two that are still to come.
  const now = new Date('2026-10-30T13:40:00Z')
  const scheduled = (round: string, more: Partial<PublicClubMatch> = {}) =>
    match(null, null, {
      kickoffAt: new Date('2026-11-07T19:30:00Z'),
      matchDate: '2026-11-07',
      round,
      status: 'scheduled',
      ...more,
    })
  const rounds = (matches: readonly { round: string }[]) => matches.map((item) => item.round)

  it('gives the matches that have not begun, the next one first, whatever order the query gave', () => {
    const matches = [
      scheduled('Later', { kickoffAt: new Date('2027-02-14T15:30:00Z'), matchDate: '2027-02-14' }),
      scheduled('Eerst', { kickoffAt: new Date('2026-11-07T19:30:00Z') }),
      match(2, 0, { matchDate: '2026-10-24', round: 'Gespeeld' }),
    ]

    expect(rounds(upcomingOf(matches, 'all', now))).toEqual(['Eerst', 'Later'])
  })

  it('keeps a postponed match, and leaves out one that has begun without a result', () => {
    const matches = [
      scheduled('Uitgesteld', { matchDate: '2026-11-07', status: 'postponed' }),
      scheduled('Begonnen', { kickoffAt: new Date('2026-10-30T12:30:00Z'), matchDate: '2026-10-30' }),
      scheduled('Gepland', { kickoffAt: new Date('2026-12-05T19:30:00Z'), matchDate: '2026-12-05' }),
    ]

    expect(rounds(upcomingOf(matches.toReversed(), 'all', now)).toSorted()).toEqual(['Gepland', 'Uitgesteld'])
  })

  it('leaves out a cancelled match, whatever its day, as it is not played any more', () => {
    const matches = [
      scheduled('Geannuleerd', { matchDate: '2026-12-12', status: 'cancelled' }),
      scheduled('Oud', { kickoffAt: new Date('2020-03-14T17:30:00Z'), matchDate: '2020-03-14', status: 'cancelled' }),
      scheduled('Gepland', { kickoffAt: new Date('2026-12-05T19:30:00Z'), matchDate: '2026-12-05' }),
    ]

    expect(rounds(upcomingOf(matches, 'all', now))).toEqual(['Gepland'])
  })

  it('leaves out the cup with the choice league, and keeps it with all', () => {
    const matches = [scheduled('Beker', { competition: 'KNVB Beker' }), scheduled('Competitie')]

    expect(rounds(upcomingOf(matches, 'league', now))).toEqual(['Competitie'])
    expect(rounds(upcomingOf(matches, 'all', now)).toSorted()).toEqual(['Beker', 'Competitie'])
  })

  it('gives nothing for a club with only played matches, and does not change the list it is given', () => {
    const matches = [match(1, 0), match(0, 0)]
    const copy = [...matches]

    expect(upcomingOf(matches, 'all', now)).toEqual([])
    expect(matches).toEqual(copy)
  })

  it('agrees with Programma on what is to come and in which order, for the same matches', () => {
    // The query gives a season oldest first and a club newest first; the matches are the same.
    const season = [
      match(1, 0, { matchDate: '2026-10-24', round: 'Gespeeld', status: 'played' }),
      scheduled('Begonnen', { kickoffAt: new Date('2026-10-30T12:30:00Z'), matchDate: '2026-10-30' }),
      scheduled('Weekend', { dateText: 'weekend 12–14 februari', kickoffAt: null, matchDate: '2027-02-12' }),
      scheduled('Uitgesteld', { matchDate: '2026-11-21', status: 'postponed' }),
      scheduled('Avond', { kickoffAt: new Date('2026-11-07T19:30:00Z') }),
      scheduled('Middag', { kickoffAt: new Date('2026-11-07T14:30:00Z') }),
    ].toSorted(
      (a, b) =>
        a.matchDate.localeCompare(b.matchDate) ||
        (a.kickoffAt?.getTime() ?? 0) - (b.kickoffAt?.getTime() ?? 0) ||
        a.id - b.id,
    )
    const seasonMatches = season.map((item) => ({
      attendance: null,
      referee: null,
      ...item,
    })) satisfies PublicMatch[]

    expect(rounds(upcomingOf(season.toReversed(), 'all', now))).toEqual(
      rounds(overviewOf(seasonMatches, now).programme),
    )
    expect(rounds(upcomingOf(season.toReversed(), 'all', now))).toEqual(['Middag', 'Avond', 'Uitgesteld', 'Weekend'])
  })
})

describe('topPointsOf', () => {
  /** A record with the results given, the goals do not matter for the average. */
  const record = (name: string, won: number, drawn: number, lost: number): PublicClubRecord => ({
    drawn,
    goalsAgainst: 0,
    goalsFor: 0,
    id: name.length,
    lost,
    name,
    played: won + drawn + lost,
    slug: name.toLowerCase().replaceAll(' ', '-'),
    won,
  })

  it('counts 3 points for a win and 1 for a draw, as the column Punten does', () => {
    expect(pointsOf(record('A', 2, 1, 3))).toBe(7)
  })

  it('divides the points by the played matches and puts the highest average first', () => {
    const { places } = topPointsOf([record('Laag', 1, 1, 3), record('Hoog', 4, 1, 0), record('Midden', 2, 2, 1)])

    expect(places.map(({ name, place, played, points }) => [place, name, points, played])).toEqual([
      [1, 'Hoog', 13, 5],
      [2, 'Midden', 8, 5],
      [3, 'Laag', 4, 5],
    ])
  })

  it('leaves out a club with fewer than five played matches, whatever its average', () => {
    const { places, played } = topPointsOf([
      record('Eén keer', 1, 0, 0),
      record('Vier keer', 4, 0, 0),
      record('Vijf', 0, 0, 5),
    ])

    expect(places.map(({ name }) => name)).toEqual(['Vijf'])
    expect(played).toBe(5)
  })

  it('counts the matches of every club that counts, not only those of the ten shown', () => {
    const records = Array.from({ length: 12 }, (_, index) =>
      record(`Club ${String(index).padStart(2, '0')}`, 5 - (index % 5), 0, index % 5),
    )
    const { places, played } = topPointsOf(records)

    expect(places).toHaveLength(10)
    expect(played).toBe(60)
  })

  it('puts the club with more matches first on a level average, and then goes by name', () => {
    // 2 points per match for each: 10 out of 5, 12 out of 6, and the same 10 out of 5 twice.
    const { places } = topPointsOf([
      record('Zeta', 3, 1, 1),
      record('Beta', 3, 1, 1),
      record('Alfa', 3, 3, 0),
      record('Gamma', 3, 0, 3),
    ])

    expect(places.map(({ name }) => name)).toEqual(['Alfa', 'Beta', 'Zeta', 'Gamma'])
  })

  it('orders on the real ratio and not on the rounded average', () => {
    // 19 out of 8 (2,375) and 31 out of 13 (2,3846) both show as 2,38; the second is higher.
    const { places } = topPointsOf([record('Acht', 6, 1, 1), record('Dertien', 10, 1, 2)])

    expect(places.map(({ name }) => name)).toEqual(['Dertien', 'Acht'])
  })

  it('gives clubs with the same average each a place of their own, from 1', () => {
    const { places } = topPointsOf([record('B', 2, 1, 2), record('A', 2, 1, 2)])

    expect(places.map(({ name, place }) => [place, name])).toEqual([
      [1, 'A'],
      [2, 'B'],
    ])
  })

  it('shows fewer than ten places when fewer clubs count', () => {
    expect(topPointsOf([record('Eén', 5, 0, 0), record('Twee', 0, 5, 0)]).places).toHaveLength(2)
  })

  it('has no places, and no matches, when no club has five played matches', () => {
    expect(topPointsOf([record('Vier', 4, 0, 0)])).toEqual({ places: [], played: 0 })
    expect(topPointsOf([])).toEqual({ places: [], played: 0 })
  })
})
