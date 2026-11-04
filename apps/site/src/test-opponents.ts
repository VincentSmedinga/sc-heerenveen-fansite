import type { PublicClubMatch, PublicClubRecord, PublicSeasonWikipediaPage } from '@fansite/db/queries'

import type { ClubPage } from './opponents'

/*
 * Made-up clubs and matches for the tests of the pages of the opponents. The records are what
 * `listClubRecords` gives, A to Z: one for the choice `all` and one for `league`, where the
 * club we only met in the cup is missing.
 */

const record = (
  slug: string,
  name: string,
  played: number,
  won: number,
  drawn: number,
  lost: number,
  goals: [number, number],
) =>
  ({
    drawn,
    goalsAgainst: goals[1],
    goalsFor: goals[0],
    id: slug.length,
    lost,
    name,
    played,
    slug,
    won,
  }) satisfies PublicClubRecord

// Testclub has the same record in both, but for a cup tie that ended 1–1: a draw gives a point
// there, so its points differ between the two choices while its goal difference does not.
export const allRecords: PublicClubRecord[] = [
  record('beker-united', 'Beker United', 1, 0, 0, 1, [0, 2]),
  record('fc-voorbeeld', 'FC Voorbeeld', 3, 1, 1, 1, [4, 4]),
  record('testclub', 'Testclub', 5, 3, 2, 0, [11, 4]),
]

export const leagueRecords: PublicClubRecord[] = [
  record('fc-voorbeeld', 'FC Voorbeeld', 3, 1, 1, 1, [4, 4]),
  record('testclub', 'Testclub', 4, 3, 1, 0, [10, 3]),
]

let id = 0

/** A goal of one of our players, at `minute`, as the query gives it. */
const goal = (minute: number, player: string, more: Partial<PublicClubMatch['goals'][number]> = {}) => ({
  minute,
  ours: true,
  ownGoal: false,
  penalty: false,
  player,
  playerId: null,
  playerName: null,
  playerPage: null,
  playerSearchTerm: null,
  stoppageMinutes: null,
  ...more,
})

function match(ours: number, theirs: number, more: Partial<PublicClubMatch> = {}): PublicClubMatch {
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
    matchDate: '2025-10-24',
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

/**
 * Testclub: four matches in the Eredivisie and one in the cup, one under an old name. We
 * visited it twice in the Eredivisie, in two stadiums, and once in the cup at a neutral ground;
 * the stadium of the matches at home is ours.
 */
export const testclub: ClubPage = {
  club: {
    id: 3,
    name: 'Testclub',
    otherNames: ['Oude Testclub', 'Testclub 1900'],
    slug: 'testclub',
    wikipediaPage: null,
  },
  matches: [
    match(0, 1, {
      afterNinetyAgainst: 0,
      afterNinetyFor: 0,
      competition: 'KNVB Beker',
      extraTime: true,
      goals: [goal(112, 'Voorbeeld', { ours: false })],
      home: false,
      matchDate: '2026-09-20',
      season: '2026/27',
      stadium: 'Neutraal Stadion',
    }),
    match(3, 0, {
      goals: [goal(12, 'Vroeg', { penalty: true }), goal(40, 'Midden'), goal(77, 'Laat')],
      matchDate: '2025-10-24',
      stadium: 'Abe Lenstra Stadion',
    }),
    match(1, 1, {
      home: false,
      matchDate: '2025-03-01',
      opponent: 'Oude Testclub',
      season: '2024/25',
      stadium: 'Nieuw Testpark',
    }),
    match(2, 0, { matchDate: '2024-11-09', season: '2024/25', stadium: 'Abe Lenstra Stadion' }),
    match(4, 2, { home: false, matchDate: '2023-04-02', season: '2022/23', stadium: 'Oud Testpark' }),
  ],
}

/** A club with a single match, in the cup, at its stadium: not a name for the card Stadion. */
export const beker: ClubPage = {
  club: { id: 1, name: 'Beker United', otherNames: [], slug: 'beker-united', wikipediaPage: null },
  matches: [
    match(0, 2, {
      competition: 'KNVB Beker',
      home: false,
      matchDate: '2026-09-20',
      season: '2026/27',
      stadium: 'Bekerveld',
    }),
  ],
}

/** A match that has not been played, scheduled unless `more` says it is postponed. */
function upcoming(more: Partial<PublicClubMatch> = {}): PublicClubMatch {
  return match(0, 0, {
    goalsAgainst: null,
    goalsFor: null,
    kickoffAt: new Date('2026-12-05T19:30:00Z'),
    matchDate: '2026-12-05',
    opponent: 'Komend FC',
    season: '2026/27',
    status: 'scheduled',
    ...more,
  })
}

/**
 * Komend FC: one match played and three still to come on the afternoon of 30 October 2026, the
 * newest first as the query gives them. The next one is called off, the cup tie is on a
 * Wednesday evening and the match in the Eredivisie is at their ground.
 */
export const komend: ClubPage = {
  club: { id: 5, name: 'Komend FC', otherNames: [], slug: 'komend-fc', wikipediaPage: null },
  matches: [
    upcoming({ home: false, round: 'Speelronde 15', stadium: 'Komend Stadion' }),
    upcoming({
      competition: 'KNVB Beker',
      home: true,
      kickoffAt: new Date('2026-11-18T19:45:00Z'),
      matchDate: '2026-11-18',
      round: 'Achtste finale',
      stadium: 'Abe Lenstra Stadion',
    }),
    upcoming({ kickoffAt: null, matchDate: '2026-11-07', round: 'Speelronde 11', status: 'postponed' }),
    match(2, 0, { matchDate: '2026-10-24', opponent: 'Komend FC', season: '2026/27', stadium: 'Abe Lenstra Stadion' }),
  ],
}

/** A club we have not played yet, such as a promoted one, with a match to come. */
export const promovendus: ClubPage = {
  club: { id: 6, name: 'Nieuw Promovendus', otherNames: [], slug: 'nieuw-promovendus', wikipediaPage: null },
  matches: [
    upcoming({ home: false, opponent: 'Nieuw Promovendus', round: 'Speelronde 20', stadium: 'Promovendus Park' }),
  ],
}

const readAt = new Date('2026-10-25T12:00:00Z')

export const sourcePages: PublicSeasonWikipediaPage[] = [
  { kind: 'standings', readAt, season: '2026/27', title: 'Eredivisie 2026/27 (mannenvoetbal)' },
  { kind: 'cup', readAt, season: '2026/27', title: 'KNVB Beker 2026/27 (mannen)' },
  { kind: 'standings', readAt, season: '2025/26', title: 'Eredivisie 2025/26 (mannenvoetbal)' },
  { kind: 'standings', readAt, season: '2024/25', title: 'Eredivisie 2024/25 (mannenvoetbal)' },
  { kind: 'standings', readAt, season: '2023/24', title: 'Eredivisie 2023/24 (mannenvoetbal)' },
  { kind: 'standings', readAt, season: '2022/23', title: 'Eredivisie 2022/23 (mannenvoetbal)' },
]

/** The seasons with matches, the newest first, as `getMatchSeasons` gives them. */
export const matchSeasons = ['2026/27', '2025/26', '2024/25', '2023/24', '2022/23']
