import type { ReportedMatch } from '@fansite/db/match-reports'
import type { Match, MatchAppearance } from '@fansite/db/schema'

/*
 * A made-up match with a report that passes the rules, for the tests of the page of a match.
 * Read it with the afternoon of Friday 30 October 2026 (Dutch time) as now. It is a home match
 * against Testdorp FC, won 2–1, with an assist, a missed penalty, a penalty of the opponent, an
 * own goal of the opponent, a substitution of both teams and a yellow card. Our players have
 * the ids 1 to 13 (the first eleven are in the line-up) and the opponent 101 to 112.
 */

const match: Match = {
  afterNinetyAgainst: null,
  afterNinetyFor: null,
  attendance: 21022,
  clubId: 1,
  competition: 'Eredivisie',
  dateText: null,
  extraTime: false,
  goalsAgainst: 1,
  goalsFor: 2,
  home: true,
  id: 7,
  kickoffAt: new Date('2026-10-24T14:30:00Z'),
  matchDate: '2026-10-24',
  note: null,
  opponent: 'Testdorp FC',
  penaltiesAgainst: null,
  penaltiesFor: null,
  referee: 'Pieter Maquette',
  resultSetAt: null,
  round: 'Speelronde 1',
  season: '2026/27',
  stadium: 'Stadion Proeflaan',
  status: 'played',
}

const ourNames: Record<number, string> = {
  1: 'Tjerk Brandsma',
  4: 'Ruben ten Hove',
  9: 'Rick Demo',
  10: 'Thijs Idzenga',
  12: 'Gerrit Nepper',
}

const theirNames: Record<number, string> = { 103: 'Dirk Proefland', 109: 'Frank Dummydijk', 110: 'Ronald Proefveld' }

function appearances(): MatchAppearance[] {
  return [
    ...Array.from({ length: 13 }, (_, index) => {
      const id = index + 1

      return {
        captain: id === 10,
        id,
        matchId: 7,
        name: ourNames[id] ?? `Speler ${id}`,
        ours: true,
        playerId: id,
        shirtNumber: id,
        starter: id <= 11,
      }
    }),
    ...Array.from({ length: 12 }, (_, index) => {
      const id = 101 + index

      return {
        captain: id === 105,
        id,
        matchId: 7,
        name: theirNames[id] ?? `Tegenstander ${id - 100}`,
        ours: false,
        playerId: null,
        shirtNumber: id - 100,
        starter: id <= 111,
      }
    }),
  ]
}

/**
 * The names the importer kept of our players: Brandsma and ten Hove have a person, the rest
 * does not.
 */
const names: ReportedMatch['names'] = new Map([
  [1, { familyName: 'Brandsma', familyNamePrefix: null, givenName: 'Tjerk', searchTerm: 'Brandsma' }],
  [4, { familyName: 'Hove', familyNamePrefix: 'ten', givenName: 'Ruben', searchTerm: 'ten Hove' }],
  [9, { familyName: null, familyNamePrefix: null, givenName: null, searchTerm: 'Demo' }],
  [10, { familyName: null, familyNamePrefix: null, givenName: null, searchTerm: 'Idzenga' }],
])

/** The report: a copy each time, so a test can change what it wants. */
export function reportedMatch(): ReportedMatch {
  return {
    clubSlug: 'testdorp-fc',
    match: { ...match },
    names: new Map(names),
    stored: {
      appearances: appearances(),
      cards: [
        { appearanceId: 4, id: 1, kind: 'geel', matchId: 7, minute: 30, ours: true, stoppageMinutes: null },
        { appearanceId: 105, id: 2, kind: 'rood', matchId: 7, minute: 90, ours: false, stoppageMinutes: 3 },
      ],
      goals: [
        {
          appearanceId: 9,
          assistAppearanceId: 10,
          id: 1,
          matchId: 7,
          minute: 12,
          ours: true,
          ownGoal: false,
          penalty: false,
          personId: null,
          player: 'Demo',
          playerId: 9,
          stoppageMinutes: null,
          wikipediaPage: null,
        },
        {
          appearanceId: 109,
          assistAppearanceId: null,
          id: 2,
          matchId: 7,
          minute: 40,
          ours: false,
          ownGoal: false,
          penalty: true,
          personId: null,
          player: 'Dummydijk',
          playerId: null,
          stoppageMinutes: null,
          wikipediaPage: null,
        },
        {
          appearanceId: 103,
          assistAppearanceId: null,
          id: 3,
          matchId: 7,
          minute: 78,
          ours: true,
          ownGoal: true,
          penalty: false,
          personId: null,
          player: 'Proefland',
          playerId: null,
          stoppageMinutes: null,
          wikipediaPage: null,
        },
      ],
      incidents: [
        {
          appearanceId: 9,
          id: 1,
          kind: 'strafschop-gemist',
          matchId: 7,
          minute: 55,
          ours: true,
          stoppageMinutes: null,
        },
      ],
      report: {
        formationOpponent: '4-4-2',
        formationOurs: '4-3-3',
        matchId: 7,
        opponentComplete: true,
        savedAt: new Date('2026-10-25T10:00:00Z'),
        savedBy: null,
        source: 'het wedstrijdformulier',
        status: 'klaar',
      },
      shootout: [],
      substitutions: [
        {
          appearanceInId: 12,
          appearanceOutId: 10,
          id: 1,
          matchId: 7,
          minute: 60,
          ours: true,
          stoppageMinutes: null,
        },
        {
          appearanceInId: 112,
          appearanceOutId: 110,
          id: 2,
          matchId: 7,
          minute: 45,
          ours: false,
          stoppageMinutes: 2,
        },
      ],
    },
  }
}
