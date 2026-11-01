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

export const allRecords: PublicClubRecord[] = [
  record('beker-united', 'Beker United', 1, 0, 0, 1, [0, 2]),
  record('fc-voorbeeld', 'FC Voorbeeld', 3, 1, 1, 1, [4, 4]),
  record('testclub', 'Testclub', 5, 3, 1, 1, [10, 4]),
]

export const leagueRecords: PublicClubRecord[] = [
  record('fc-voorbeeld', 'FC Voorbeeld', 3, 1, 1, 1, [4, 4]),
  record('testclub', 'Testclub', 4, 3, 1, 0, [10, 3]),
]

let id = 0

function match(ours: number, theirs: number, more: Partial<PublicClubMatch> = {}): PublicClubMatch {
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
    matchDate: '2025-10-24',
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

/** Testclub: four matches in the Eredivisie and one in the cup, one under an old name. */
export const testclub: ClubPage = {
  club: {
    id: 3,
    name: 'Testclub',
    otherNames: ['Oude Testclub', 'Testclub 1900'],
    slug: 'testclub',
    wikipediaPage: null,
  },
  matches: [
    match(0, 1, { competition: 'KNVB Beker', home: false, matchDate: '2026-09-20', season: '2026/27' }),
    match(3, 0, { matchDate: '2025-10-24' }),
    match(1, 1, { home: false, matchDate: '2025-03-01', opponent: 'Oude Testclub', season: '2024/25' }),
    match(2, 0, { matchDate: '2024-11-09', season: '2024/25' }),
    match(4, 2, { home: false, matchDate: '2023-04-02', season: '2022/23' }),
  ],
}

/** A club with a single match, in the cup. */
export const beker: ClubPage = {
  club: { id: 1, name: 'Beker United', otherNames: [], slug: 'beker-united', wikipediaPage: null },
  matches: [match(0, 2, { competition: 'KNVB Beker', home: false, matchDate: '2026-09-20', season: '2026/27' })],
}

const readAt = new Date('2026-10-25T12:00:00Z')

export const sourcePages: PublicSeasonWikipediaPage[] = [
  {
    kind: 'standings',
    readAt,
    season: '2026/27',
    title: 'Eredivisie 2026/27 (mannenvoetbal)',
    version: 'Sat, 24 Oct 2026 08:00:00 GMT',
  },
  {
    kind: 'cup',
    readAt,
    season: '2026/27',
    title: 'KNVB Beker 2026/27 (mannen)',
    version: 'Sun, 25 Oct 2026 07:00:00 GMT',
  },
  {
    kind: 'standings',
    readAt,
    season: '2025/26',
    title: 'Eredivisie 2025/26 (mannenvoetbal)',
    version: 'Mon, 05 May 2025 10:00:00 GMT',
  },
  {
    kind: 'standings',
    readAt,
    season: '2024/25',
    title: 'Eredivisie 2024/25 (mannenvoetbal)',
    version: 'Mon, 06 May 2024 10:00:00 GMT',
  },
  {
    kind: 'standings',
    readAt,
    season: '2023/24',
    title: 'Eredivisie 2023/24 (mannenvoetbal)',
    version: 'Tue, 09 May 2023 10:00:00 GMT',
  },
  {
    kind: 'standings',
    readAt,
    season: '2022/23',
    title: 'Eredivisie 2022/23 (mannenvoetbal)',
    version: null,
  },
]

/** The seasons with matches, the newest first, as `getMatchSeasons` gives them. */
export const matchSeasons = ['2026/27', '2025/26', '2024/25', '2023/24', '2022/23']
