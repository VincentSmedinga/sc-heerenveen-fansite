import type { NamePeriodLine } from '@fansite/db/club-name-periods'
import type { StadiumLine } from '@fansite/db/club-stadiums'
import type { PublicClubMatch, PublicClubRecord, PublicMatch } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import { overviewOf } from './matches'
import {
  clubNameViewsOf,
  clubScorersMinimum,
  earlierNames,
  hasClubScorers,
  hasTimeline,
  lastResultsOf,
  meetingsOf,
  pointsOf,
  seasonsOf,
  stadiumsOf,
  stadiumViewsOf,
  summaryOf,
  tallyOf,
  timelineOf,
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
  const line = (name: string, extra: Partial<NamePeriodLine> = {}): NamePeriodLine => ({
    name,
    note: null,
    startDay: null,
    startSeason: null,
    ...extra,
  })

  it('names the names before the one of now, each with its period', () => {
    expect(earlierNames([line('FC Zwolle'), line('PEC Zwolle', { startSeason: '2012/13' })], 'PEC Zwolle')).toBe(
      'FC Zwolle t/m 2011/12',
    )
  })

  it('has the period of a name in the middle, of one season and of more seasons, and of a day', () => {
    const names = [
      line('Een'),
      line('Twee', { startSeason: '2005/06' }),
      line('Drie', { startSeason: '2006/07' }),
      line('Vier', { startDay: '2010-03-01' }),
      line('Vijf', { startSeason: '2012/13' }),
    ]

    expect(earlierNames(names, 'Vijf')).toBe(
      'Een t/m 2004/05, Twee 2005/06, Drie 2006/07 tot 1 mrt 2010, Vier 1 mrt 2010 t/m 2011/12',
    )
  })

  it('says nothing for a club without a list or with one name, and keeps a changed heading apart', () => {
    expect(earlierNames([], 'Be Quick')).toBeUndefined()
    expect(earlierNames([line('Be Quick')], 'Be Quick')).toBeUndefined()
    expect(earlierNames([line('Oud'), line('Nieuw', { startSeason: '2020/21' })], 'Heel Nieuw')).toBe(
      'Oud t/m 2019/20, Nieuw vanaf 2020/21',
    )
  })

  it('takes the last name of the list for the heading whatever the capitals, accents and punctuation', () => {
    expect(earlierNames([line('Oud'), line('N.E.C.', { startSeason: '2020/21' })], 'NEC')).toBe('Oud t/m 2019/20')
  })
})

describe('clubNameViewsOf', () => {
  it('has the name, the period and the note of each line, and nothing for fewer than two names', () => {
    const lines: NamePeriodLine[] = [
      { name: 'Oud', note: null, startDay: null, startSeason: null },
      { name: 'Nieuw', note: 'Een toelichting.', startDay: null, startSeason: '2020/21' },
    ]

    expect(clubNameViewsOf(lines)).toEqual([
      { name: 'Oud', note: undefined, period: 't/m 2019/20' },
      { name: 'Nieuw', note: 'Een toelichting.', period: 'vanaf 2020/21' },
    ])
    expect(clubNameViewsOf([lines[1]!])).toEqual([])
    expect(clubNameViewsOf([])).toEqual([])
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

describe('stadiumViewsOf', () => {
  const visit = (matchDate: string, stadium: string, season: string) =>
    match(1, 0, { home: false, matchDate, season, stadium })
  const visits = [visit('2022-10-02', 'Oud Stadion', '2022/23'), visit('2024-11-10', 'Nieuwe Arena', '2024/25')]
  const own = (name: string, more: Partial<StadiumLine> = {}): StadiumLine => ({
    name,
    note: null,
    startDay: null,
    startSeason: null,
    ...more,
  })

  it('gives what the matches say, with their periods, for a club without a list of its own', () => {
    expect(stadiumViewsOf([], visits)).toEqual([
      { name: 'Oud Stadion', period: 't/m 2022/23' },
      { name: 'Nieuwe Arena', period: 'vanaf 2024/25' },
    ])
  })

  it('gives a list of one line as the name alone, whatever the matches say', () => {
    expect(stadiumViewsOf([own('Eigen Stadion')], visits)).toEqual([
      { name: 'Eigen Stadion', note: undefined, period: undefined },
    ])
  })

  it('gives the periods of a list with a season and a day as a start, with its notes', () => {
    expect(
      stadiumViewsOf(
        [
          own('AFAS Stadion'),
          own('Cars Jeans Stadion', { note: 'Tijdelijk in Den Haag.', startDay: '2019-08-10' }),
          own('AFAS Stadion', { startSeason: '2020/21' }),
        ],
        visits,
      ),
    ).toEqual([
      { name: 'AFAS Stadion', note: undefined, period: 'tot 10 aug 2019' },
      { name: 'Cars Jeans Stadion', note: 'Tijdelijk in Den Haag.', period: '10 aug 2019 t/m 2019/20' },
      { name: 'AFAS Stadion', note: undefined, period: 'vanaf 2020/21' },
    ])
  })

  it('gives the list of its own for a club we never visited, and nothing for a club without either', () => {
    expect(stadiumViewsOf([own('Eigen Stadion')], [])).toEqual([
      { name: 'Eigen Stadion', note: undefined, period: undefined },
    ])
    expect(stadiumViewsOf([], [])).toEqual([])
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

describe('timelineOf', () => {
  // The afternoon of 30 October 2026: the season 2026/27, the 37th since 1990/91.
  const now = new Date('2026-10-30T13:40:00Z')
  const played = (season: string, matchDate: string, ours: number, theirs: number, more = {}) =>
    match(ours, theirs, { matchDate, season, ...more })

  it('has two places for each season from 1990/91 up to and including the season of now', () => {
    expect(timelineOf([], now)).toHaveLength(74)
    expect(timelineOf([], new Date('2000-10-30T12:00:00Z'))).toHaveLength(22)
    expect(timelineOf([], new Date('1990-07-01T00:00:00Z'))).toHaveLength(2)
  })

  it('has only empty places without matches', () => {
    expect(timelineOf([], now).every((place) => place === null)).toBe(true)
  })

  it('puts the first match of a season on the left and the second on the right, by the day', () => {
    // The matches are given newest first, as the query has them.
    const places = timelineOf([played('2025/26', '2026-02-01', 0, 1), played('2025/26', '2025-09-13', 3, 0)], now)

    expect(places.slice(70, 74)).toEqual(['W', 'V', null, null])
  })

  it('fills only the first place of a season with one match', () => {
    expect(timelineOf([played('2024/25', '2025-03-01', 1, 1)], now).slice(68, 72)).toEqual(['G', null, null, null])
  })

  it('leaves a season without a match empty, so a club that played lower leaves a gap', () => {
    const places = timelineOf([played('2012/13', '2013-03-02', 2, 0), played('2010/11', '2011-02-12', 0, 2)], now)

    expect(places.slice(40, 46)).toEqual(['V', null, null, null, 'W', null])
  })

  it('leaves out a cup match, a play-off match and a match that was not played', () => {
    const places = timelineOf(
      [
        played('2025/26', '2026-03-01', 2, 0, { competition: 'KNVB Beker' }),
        played('2025/26', '2026-05-24', 2, 0, { competition: 'Play-offs' }),
        played('2025/26', '2026-04-01', 2, 0, { goalsAgainst: null, goalsFor: null, status: 'scheduled' }),
        played('2025/26', '2025-10-04', 0, 0),
      ],
      now,
    )

    expect(places.slice(70, 72)).toEqual(['G', null])
  })

  it('shows the first match of the current season when only the match at home has been played', () => {
    const places = timelineOf(
      [
        played('2026/27', '2026-10-24', 2, 0),
        played('2026/27', '2027-03-01', 0, 0, { goalsAgainst: null, goalsFor: null, status: 'scheduled' }),
      ],
      now,
    )

    expect(places.slice(72)).toEqual(['W', null])
  })

  it('leaves out a third match of a season, because the chart has two places for it', () => {
    const places = timelineOf(
      [
        played('2025/26', '2026-05-01', 0, 5),
        played('2025/26', '2026-02-01', 1, 0),
        played('2025/26', '2025-09-13', 1, 1),
      ],
      now,
    )

    expect(places.slice(70, 72)).toEqual(['G', 'W'])
  })

  it('leaves out a match from before 1990/91 and a match past the season of now', () => {
    const places = timelineOf(
      [
        played('2027/28', '2027-09-01', 1, 0),
        played('1990/91', '1991-02-02', 1, 0),
        played('1989/90', '1990-02-02', 1, 0),
      ],
      now,
    )

    expect(places.filter((place) => place !== null)).toEqual(['W'])
    expect(places[1]).toBeNull()
    expect(places[0]).toBe('W')
  })

  it('starts a new season on 1 July', () => {
    const matches = [played('2025/26', '2026-02-01', 1, 0), played('2026/27', '2026-08-15', 0, 1)]

    // Until the end of 30 June 2026 the last season is 2025/26 and the axis ends there.
    expect(timelineOf(matches, new Date('2026-06-30T21:59:59Z'))).toHaveLength(72)
    expect(timelineOf(matches, new Date('2026-06-30T21:59:59Z')).slice(70)).toEqual(['W', null])
    // From 1 July the axis has the season 2026/27, with its two empty places.
    expect(timelineOf(matches, new Date('2026-07-01T00:00:00Z'))).toHaveLength(74)
    expect(timelineOf(matches, new Date('2026-07-01T00:00:00Z')).slice(70)).toEqual(['W', null, 'V', null])
  })

  it('does not depend on the order the matches are given in', () => {
    const matches = [played('2025/26', '2025-09-13', 3, 0), played('2025/26', '2026-02-01', 0, 1)]

    expect(timelineOf(matches, now)).toEqual(timelineOf([...matches].reverse(), now))
  })
})

describe('hasTimeline', () => {
  it('needs four matches played in the Eredivisie, and the cup does not count', () => {
    const league = (count: number) => Array.from({ length: count }, () => match(1, 0))

    expect(hasTimeline(league(3))).toBe(false)
    expect(hasTimeline(league(4))).toBe(true)
    expect(hasTimeline([...league(3), match(1, 0, { competition: 'KNVB Beker' })])).toBe(false)
    expect(hasTimeline([...league(3), match(null, null, { status: 'scheduled' })])).toBe(false)
  })
})
