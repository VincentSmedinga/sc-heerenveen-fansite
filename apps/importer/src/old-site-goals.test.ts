import type { TestDatabase } from '@fansite/db/test-database'

import { decideConflict, decodePartProposal, oldSiteGoalsReason } from '@fansite/db/match-conflicts'
import {
  adminUsers,
  matchAppearances,
  matchChanges,
  matchEdits,
  matches,
  matchGoals,
  matchReports,
  players,
  playerSeasonStats,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { OldSiteEvent, OldSiteMatch, OldSitePlayer } from './old-site-file.ts'

import { importOldSiteClubs, oldSiteClubIds } from './old-site-clubs.ts'
import { readOldSiteData } from './old-site-file.ts'
import { deriveOldSiteGoals, importOldSiteGoals } from './old-site-goals.ts'
import { deriveOldSiteMatches, importOldSiteMatches } from './old-site-matches.ts'
import { deriveOldSitePlayers, importOldSitePlayers, oldSitePlayerName } from './old-site-players.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

const zeroStatistics = {
  awayCorners: 0,
  awayFouls: 0,
  awayOffside: 0,
  homeCorners: 0,
  homeFouls: 0,
  homeOffside: 0,
}

const oldPlayers: OldSitePlayer[] = [
  { code: 'jan.janssen', firstName: 'Jan', infix: null, lastName: 'Janssen', line: null },
  { code: 'joost.vanaken', firstName: 'Joost', infix: 'van', lastName: 'Aken', line: null },
  { code: 'rene.hake', firstName: 'René', infix: null, lastName: 'Hake', line: null },
]

/** A league match at home that sc Heerenveen won 2-1, without goals. */
function oldMatch(overrides: Partial<OldSiteMatch> = {}): OldSiteMatch {
  return {
    attendance: null,
    code: 'nec.thuis',
    competition: 1,
    dateTime: '2001-09-01 20:00:00',
    events: [],
    lineup: [],
    note: null,
    referee: null,
    result: { awayFullTime: 1, awayHalfTime: 0, homeFullTime: 2, homeHalfTime: 1, note: null },
    round: 1,
    season: '0102',
    statistics: { ...zeroStatistics },
    ...overrides,
  }
}

/** A goal of ours (a code), or of the opponent (a name), with a kind. */
const goal = (minute: number, who: string, kind: null | string = null, ours = true): OldSiteEvent => ({
  assist: null,
  event: 1,
  kind,
  minute,
  playerCode: ours ? who : null,
  playerName: ours ? null : who,
})

/** The three goals of a 2-1 win. */
const winGoals = [goal(10, 'jan.janssen'), goal(30, 'Piet Pietersen', null, false), goal(80, 'joost.vanaken')]

const goalRows = () => database.db.select().from(matchGoals).orderBy(asc(matchGoals.id))

const changeRows = () => database.db.select().from(matchChanges).orderBy(asc(matchChanges.id))

const byCode = new Map(oldPlayers.map((player) => [player.code, player]))

function derive(match: OldSiteMatch) {
  const [one] = deriveOldSiteMatches([match])

  return deriveOldSiteGoals(match, { against: one!.values!.goalsAgainst!, for: one!.values!.goalsFor! }, byCode)
}

describe('the goals of a match', () => {
  it('lists the goals of a match that add up to the score, with the full name of ours', () => {
    const { goals, state } = derive(oldMatch({ events: winGoals }))

    expect(state).toBe('adds-up')
    expect(goals).toEqual([
      {
        minute: 10,
        ours: true,
        ownGoal: false,
        penalty: false,
        player: 'Jan Janssen',
        playerKey: '2001/02|jan janssen',
      },
      { minute: 30, ours: false, ownGoal: false, penalty: false, player: 'Piet Pietersen', playerKey: null },
      {
        minute: 80,
        ours: true,
        ownGoal: false,
        penalty: false,
        player: 'Joost van Aken',
        playerKey: '2001/02|joost van aken',
      },
    ])
  })

  it('puts the goals in the order of the minute', () => {
    const { goals } = derive(oldMatch({ events: winGoals.toReversed() }))

    expect(goals.map((one) => one.minute)).toEqual([10, 30, 80])
  })

  it('counts an own goal for the club that benefits', () => {
    // 2-1 at home: the own goal of our Jan Janssen is the goal of the opponent, and the own
    // goal of the opponent's Piet Pietersen is one of ours.
    const { goals, state } = derive(
      oldMatch({
        events: [
          goal(10, 'Piet Pietersen', 'eigen doelpunt', false),
          goal(30, 'joost.vanaken'),
          goal(50, 'jan.janssen', 'eigen doelpunt'),
        ],
      }),
    )

    expect(state).toBe('adds-up')
    expect(goals).toMatchObject([
      { ours: true, ownGoal: true, player: 'Piet Pietersen', playerKey: null },
      { ours: true, ownGoal: false, player: 'Joost van Aken' },
      { ours: false, ownGoal: true, player: 'Jan Janssen', playerKey: '2001/02|jan janssen' },
    ])
  })

  it('reads the three spellings of a penalty and no other kind of goal as one', () => {
    const kinds = ['strafschop', 'srafschop', 'penalty', 'kopbal', 'vrije trap', null]
    const { goals } = derive(
      oldMatch({
        events: kinds.map((kind, index) => goal(10 + index, 'jan.janssen', kind)),
        result: { awayFullTime: 0, awayHalfTime: 0, homeFullTime: 6, homeHalfTime: 0, note: null },
      }),
    )

    expect(goals.map((one) => one.penalty)).toEqual([true, true, true, false, false, false])
  })

  it('makes minute 0 an empty minute, and puts that goal last', () => {
    const { goals } = derive(
      oldMatch({ events: [goal(0, 'jan.janssen'), goal(5, 'jan.janssen'), goal(9, 'Piet', null, false)] }),
    )

    expect(goals.map((one) => one.minute)).toEqual([5, 9, null])
  })

  it('takes the name of a player of the opponent from the field for the code when it is there', () => {
    const { goals, state } = derive(
      oldMatch({
        events: [
          goal(10, 'jan.janssen'),
          { assist: null, event: 1, kind: null, minute: 20, playerCode: 'X. Alberts', playerName: null },
          goal(80, 'joost.vanaken'),
        ],
      }),
    )

    expect(state).toBe('adds-up')
    expect(goals[1]).toMatchObject({ ours: false, player: 'X. Alberts', playerKey: null })
  })

  it('gives a match without goals and with a score no list, and a 0-0 match an empty list that adds up', () => {
    const none = derive(oldMatch())
    const nothing = derive(
      oldMatch({ result: { awayFullTime: 0, awayHalfTime: 0, homeFullTime: 0, homeHalfTime: 0, note: null } }),
    )

    expect(none).toMatchObject({ goals: [], state: 'none' })
    expect(nothing).toMatchObject({ goals: [], state: 'adds-up' })
  })

  it('gives a match with part of the goals, or too many, no list', () => {
    const part = derive(oldMatch({ events: winGoals.slice(0, 2) }))
    const many = derive(oldMatch({ events: [...winGoals, goal(85, 'Piet Pietersen', null, false)] }))

    expect(part).toMatchObject({ goals: [], listed: { against: 1, for: 1 }, state: 'partial' })
    expect(many).toMatchObject({ goals: [], listed: { against: 2, for: 2 }, state: 'partial' })
  })

  it('counts the goals of extra time in the score, and not the shoot-out', () => {
    const extra = derive(
      oldMatch({
        competition: 2,
        events: [
          goal(10, 'jan.janssen'),
          goal(70, 'Piet', null, false),
          goal(100, 'jan.janssen'),
          goal(115, 'Pim', null, false),
        ],
        result: { awayFullTime: 1, awayHalfTime: 0, homeFullTime: 1, homeHalfTime: 0, note: '2-2 n.v.' },
      }),
    )
    const shootout = derive(
      oldMatch({
        competition: 2,
        events: [goal(10, 'jan.janssen'), goal(70, 'Piet', null, false)],
        result: { awayFullTime: 1, awayHalfTime: 0, homeFullTime: 1, homeHalfTime: 0, note: '5-3 n.s.' },
      }),
    )

    expect(extra).toMatchObject({ listed: { against: 2, for: 2 }, state: 'adds-up' })
    expect(shootout).toMatchObject({ listed: { against: 1, for: 1 }, state: 'adds-up' })
  })

  it('counts a match away from the side of sc Heerenveen', () => {
    const away = derive(
      oldMatch({
        code: 'nec.uit',
        events: [goal(10, 'jan.janssen'), goal(30, 'Piet', null, false)],
        result: { awayFullTime: 1, awayHalfTime: 0, homeFullTime: 1, homeHalfTime: 0, note: null },
      }),
    )

    expect(away.state).toBe('adds-up')
  })
})

describe('the players of ours in the matches', () => {
  it('joins given name, infix and surname with single spaces', () => {
    expect(oldSitePlayerName({ firstName: 'Joost', infix: 'van', lastName: 'Aken' })).toBe('Joost van Aken')
    expect(oldSitePlayerName({ firstName: ' Jan ', infix: null, lastName: 'Janssen' })).toBe('Jan Janssen')
    expect(oldSitePlayerName({ firstName: '', infix: null, lastName: 'Simão' })).toBe('Simão')
  })

  it('finds the players of the goals, the codes of the assists and the line-up, once per season', () => {
    const found = deriveOldSitePlayers(
      [
        oldMatch({
          events: [
            { ...goal(10, 'jan.janssen'), assist: 'joost.vanaken' },
            { ...goal(20, 'Piet', null, false), assist: 'Dennis de Nooijer' },
            { assist: null, event: 2, kind: null, minute: 30, playerCode: 'foppe.dehaan', playerName: null },
          ],
          lineup: [
            { minuteIn: 0, minuteOut: 90, order: 1, playerCode: 'rene.hake', playerName: null },
            { minuteIn: 0, minuteOut: 90, order: 2, playerCode: null, playerName: 'Piet Pietersen' },
            { minuteIn: 0, minuteOut: 90, order: 3, playerCode: 'X. Alberts', playerName: null },
            { minuteIn: 0, minuteOut: 90, order: 4, playerCode: 'jan.janssen', playerName: null },
          ],
        }),
        oldMatch({ code: 'ajax.uit', dateTime: '2002-03-01 20:00:00', events: [goal(5, 'jan.janssen')] }),
        oldMatch({
          code: 'psv.uit',
          dateTime: '2002-08-01 20:00:00',
          events: [goal(5, 'jan.janssen')],
          season: '0203',
        }),
      ],
      oldPlayers,
    )

    expect(found.map((player) => `${player.season} ${player.name}`)).toEqual([
      '2001/02 Jan Janssen',
      '2001/02 Joost van Aken',
      '2001/02 René Hake',
      '2002/03 Jan Janssen',
    ])
    expect(found.find((player) => player.name === 'Joost van Aken')?.searchTerm).toBe('van Aken')
  })

  it('makes a name of a code that has no row in the old table', () => {
    const [player] = deriveOldSitePlayers(
      [oldMatch({ lineup: [{ minuteIn: 0, minuteOut: 90, order: 1, playerCode: 'ivo.visser', playerName: null }] })],
      oldPlayers,
    )

    expect(player).toMatchObject({ code: 'ivo.visser', name: 'Ivo Visser', nameFromCode: true, searchTerm: 'Visser' })
  })

  it('gives a player the spelling the owner chose, from the old table and from a code', () => {
    const list = [
      { code: 'ronnie.venema', firstName: 'Ronnie', infix: null, lastName: 'Venema', line: null },
      { code: 'ali.elkhattabi', firstName: 'Ali', infix: null, lastName: 'Elkhattabi', line: null },
    ]
    const lineup = ['ronnie.venema', 'ali.elkhattabi', 'ivan.tzvekov', 'igor.korneev'].map((code, index) => ({
      minuteIn: 0,
      minuteOut: 90,
      order: index + 1,
      playerCode: code,
      playerName: null,
    }))

    expect(deriveOldSitePlayers([oldMatch({ lineup })], list)).toMatchObject([
      { code: 'ronnie.venema', name: 'Ronny Venema', nameFromCode: false, searchTerm: 'Venema' },
      { code: 'ali.elkhattabi', name: 'Ali El Khattabi', nameFromCode: false, searchTerm: 'El Khattabi' },
      { code: 'ivan.tzvekov', name: 'Ivan Tsvetkov', nameFromCode: true, searchTerm: 'Tsvetkov' },
      { code: 'igor.korneev', name: 'Igor Korneev', nameFromCode: true, searchTerm: 'Korneev' },
    ])
  })
})

describe('the steps spelers and doelpunten', () => {
  const oldClubs = [
    { code: 'nec', country: 'NL', name: 'NEC' },
    { code: 'ajax', country: 'NL', name: 'Ajax' },
  ]
  let adminId = 0

  beforeEach(async () => {
    for (const table of [
      'match_changes',
      'match_edits',
      'match_statistics',
      'matches',
      'players',
      'clubs',
      'admin_users',
    ]) {
      await database.pool.query(`DELETE FROM ${table}`)
    }
    await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('redactie@example.org', 'beheerder')")
    adminId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  })

  /** Runs the clubs, the matches, the players and the goals; gives the last two reports. */
  async function run(list: OldSiteMatch[]) {
    await importOldSiteClubs(database.db, oldClubs)
    await importOldSiteMatches(database.db, list, oldClubs, await oldSiteClubIds(database.db, oldClubs))

    const playersReport = await importOldSitePlayers(database.db, list, oldPlayers)
    const goalsReport = await importOldSiteGoals(database.db, list, oldPlayers)

    return { goals: goalsReport, players: playersReport }
  }

  const playerRows = () => database.db.select().from(players).orderBy(asc(players.name))

  it('makes the players of ours with the source verslag, and nothing but a name', async () => {
    const { players: playersReport } = await run([oldMatch({ events: winGoals })])
    const rows = await playerRows()

    expect(playersReport).toMatchObject({ changed: 0, created: 2, skipped: 0, unchanged: 0 })
    expect(rows).toMatchObject([
      { name: 'Jan Janssen', searchTerm: 'Janssen', season: '2001/02', source: 'verslag' },
      { name: 'Joost van Aken', searchTerm: 'van Aken', season: '2001/02', source: 'verslag' },
    ])
    for (const row of rows) {
      expect(row).toMatchObject({
        inSquad: true,
        leftSquadAt: null,
        personId: null,
        position: null,
        shirtNumber: null,
        wikipediaPage: null,
      })
    }
  })

  it('uses a player that exists for the season and the name, from any source, and changes nothing of him', async () => {
    await database.db.insert(players).values({
      name: 'Rene Hake',
      position: 'doelman',
      searchTerm: 'Hake',
      season: '2001/02',
      shirtNumber: 1,
      source: 'selectie',
      wikipediaPage: 'René Hake',
    })

    const { players: playersReport } = await run([
      oldMatch({ lineup: [{ minuteIn: 0, minuteOut: 90, order: 1, playerCode: 'rene.hake', playerName: null }] }),
    ])

    expect(playersReport).toMatchObject({ created: 0, unchanged: 1 })
    expect(await playerRows()).toMatchObject([
      { name: 'Rene Hake', position: 'doelman', shirtNumber: 1, source: 'selectie', wikipediaPage: 'René Hake' },
    ])
  })

  it('makes a player of a season he is not in yet, and puts a code without a row in the log', async () => {
    await database.db.insert(players).values({ name: 'Jan Janssen', searchTerm: 'Janssen', season: '2000/01' })

    const { players: playersReport } = await run([
      oldMatch({
        events: [goal(1, 'jan.janssen')],
        lineup: [{ minuteIn: 0, minuteOut: 90, order: 1, playerCode: 'ivo.visser', playerName: null }],
        result: { awayFullTime: 0, awayHalfTime: 0, homeFullTime: 1, homeHalfTime: 0, note: null },
      }),
    ])

    expect((await playerRows()).map((row) => `${row.season} ${row.name}`)).toEqual([
      '2001/02 Ivo Visser',
      '2000/01 Jan Janssen',
      '2001/02 Jan Janssen',
    ])
    expect(playersReport.lines).toEqual([
      "ivo.visser (2001/02) has no row in the old table speler, so its name 'Ivo Visser' comes from the code",
    ])
  })

  it('makes no player of the opponent, whether his name is in the field for the name or for the code', async () => {
    await run([
      oldMatch({
        events: [
          goal(10, 'jan.janssen'),
          { assist: null, event: 1, kind: null, minute: 20, playerCode: 'X. Alberts', playerName: null },
          goal(80, 'Piet Pietersen', null, false),
        ],
      }),
    ])

    expect((await playerRows()).map((row) => row.name)).toEqual(['Jan Janssen'])
  })

  it('makes the goals with the scorer of ours, and none for the opponent', async () => {
    const { goals } = await run([
      oldMatch({
        events: [...winGoals, goal(85, 'Piet Pietersen', 'eigen doelpunt', false)],
        result: { awayFullTime: 1, awayHalfTime: 0, homeFullTime: 3, homeHalfTime: 1, note: null },
      }),
    ])
    const ids = new Map((await playerRows()).map((row) => [row.name, row.id]))

    expect(goals).toMatchObject({ changed: 0, created: 4, skipped: 0, unchanged: 0 })
    expect(await goalRows()).toMatchObject([
      { minute: 10, ours: true, ownGoal: false, player: 'Jan Janssen', playerId: ids.get('Jan Janssen') },
      { minute: 30, ours: false, player: 'Piet Pietersen', playerId: null },
      { minute: 80, ours: true, player: 'Joost van Aken', playerId: ids.get('Joost van Aken') },
      { minute: 85, ours: true, ownGoal: true, player: 'Piet Pietersen', playerId: null },
    ])
    for (const row of await goalRows()) {
      expect(row).toMatchObject({ appearanceId: null, personId: null, stoppageMinutes: null, wikipediaPage: null })
    }
  })

  it('finds a player who is in players already under the spelling the owner chose', async () => {
    const venema = { firstName: 'Ronnie', infix: null, lastName: 'Venema', line: null }
    const list = [{ code: 'ronnie.venema', ...venema }]
    const match = oldMatch({
      events: [goal(10, 'ronnie.venema'), goal(30, 'Piet Pietersen', null, false), goal(80, 'ronnie.venema')],
    })

    await database.db
      .insert(players)
      .values({ name: 'Ronny Venema', searchTerm: 'Venema', season: '2001/02', source: 'selectie' })
    await importOldSiteClubs(database.db, oldClubs)
    await importOldSiteMatches(database.db, [match], oldClubs, await oldSiteClubIds(database.db, oldClubs))

    const report = await importOldSitePlayers(database.db, [match], list)
    const rows = await playerRows()

    expect(report).toMatchObject({ created: 0, unchanged: 1 })
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ name: 'Ronny Venema', source: 'selectie' })

    await importOldSiteGoals(database.db, [match], list)
    expect((await goalRows()).filter((row) => row.ours).map((row) => row.playerId)).toEqual([rows[0]!.id, rows[0]!.id])
  })

  it('merges a stale row of the step into the player the corrections chose, and only that row', async () => {
    const venema = { code: 'ronnie.venema', firstName: 'Ronnie', infix: null, lastName: 'Venema', line: null }
    const meijer = { code: 'hennie.meijer', firstName: 'Hennie', infix: null, lastName: 'Meijer', line: null }
    const match = oldMatch({
      events: [goal(10, 'ronnie.venema'), goal(30, 'Piet Pietersen', null, false), goal(80, 'hennie.meijer')],
    })
    const second = oldMatch({ code: 'ajax.thuis', dateTime: '2001-10-01 20:00:00', events: match.events })
    const both = [match, second]
    const list = [venema, meijer]
    const season = '2001/02'

    // The stale rows of an earlier run, next to the player of the squad. Hennie Meijer is a row
    // of the squad itself, so it is not stale, whatever its name.
    await database.db.insert(players).values([
      { name: 'Ronnie Venema', searchTerm: 'Venema', season, source: 'verslag' },
      { name: 'Ronny Venema', searchTerm: 'Venema', season, source: 'selectie' },
      { name: 'Hennie Meijer', searchTerm: 'Meijer', season, source: 'selectie' },
      { name: 'Henny Meijer', searchTerm: 'Meijer', season, source: 'verslag' },
      { name: 'Ronnie Venema', searchTerm: 'Venema', season: '2002/03', source: 'verslag' },
    ])
    await importOldSiteClubs(database.db, oldClubs)
    await importOldSiteMatches(database.db, both, oldClubs, await oldSiteClubIds(database.db, oldClubs))

    const [stale] = await database.db.select().from(players).where(eq(players.name, 'Ronnie Venema'))
    const [target] = await database.db.select().from(players).where(eq(players.name, 'Ronny Venema'))
    const [row, other] = await database.db.select().from(matches).orderBy(asc(matches.matchDate))
    const ours = { name: 'Ronnie Venema', ours: true, starter: true }

    await database.db
      .insert(matchGoals)
      .values({ matchId: row!.id, minute: 10, ours: true, player: 'Ronnie Venema', playerId: stale!.id })
    await database.db.insert(matchReports).values([
      { matchId: row!.id, status: 'klaar' },
      { matchId: other!.id, status: 'klaar' },
    ])
    // The first match has the stale row only, so it moves. The second has both: the stale
    // appearance cannot move (one row for each player and match) and goes with the stale row.
    await database.db.insert(matchAppearances).values([
      { ...ours, matchId: row!.id, playerId: stale!.id },
      { ...ours, matchId: other!.id, playerId: stale!.id },
      { ...ours, matchId: other!.id, name: 'Ronny Venema', playerId: target!.id },
    ])
    // Eredivisie is in both rows, and the other row keeps its own numbers. The cup is in the
    // stale row only.
    await database.db.insert(playerSeasonStats).values([
      { appearances: 3, assists: 0, competition: 'Eredivisie', goals: 1, playerId: stale!.id, season },
      { appearances: 2, assists: 1, competition: 'KNVB Beker', goals: 0, playerId: stale!.id, season },
      { appearances: 10, assists: 2, competition: 'Eredivisie', goals: 4, playerId: target!.id, season },
    ])

    const first = await importOldSitePlayers(database.db, both, list)
    const names = (await playerRows()).map((one) => `${one.season} ${one.name} ${one.source}`)

    expect(first).toMatchObject({ changed: 1, created: 0 })
    expect(first.lines).toContain('Ronnie Venema (2001/02) is merged into Ronny Venema')
    expect(names).toEqual([
      '2001/02 Hennie Meijer selectie',
      '2001/02 Henny Meijer verslag',
      '2002/03 Ronnie Venema verslag',
      '2001/02 Ronny Venema selectie',
    ])
    expect((await goalRows())[0]).toMatchObject({ playerId: target!.id })
    expect(
      (await database.db.select().from(matchAppearances).orderBy(asc(matchAppearances.id))).map((one) => [
        one.matchId,
        one.playerId,
      ]),
    ).toEqual([
      [row!.id, target!.id],
      [other!.id, null],
      [other!.id, target!.id],
    ])
    expect(
      (await database.db.select().from(playerSeasonStats).orderBy(asc(playerSeasonStats.id))).map((one) => [
        one.playerId,
        one.competition,
        one.appearances,
      ]),
    ).toEqual([
      [target!.id, 'KNVB Beker', 2],
      [target!.id, 'Eredivisie', 10],
    ])

    const again = await importOldSitePlayers(database.db, both, list)

    expect(again).toMatchObject({ changed: 0, created: 0 })
    expect((await playerRows()).map((one) => one.name)).toHaveLength(4)
  })

  it('links the own goal of a player of ours to him, under the opponent', async () => {
    await run([
      oldMatch({
        events: [
          goal(10, 'jan.janssen', 'eigen doelpunt'),
          goal(20, 'joost.vanaken'),
          goal(30, 'joost.vanaken'),
          goal(40, 'Piet', null, false),
        ].slice(0, 4),
        result: { awayFullTime: 2, awayHalfTime: 0, homeFullTime: 2, homeHalfTime: 0, note: null },
      }),
    ])

    const [own] = await goalRows()

    expect(own).toMatchObject({ ours: false, ownGoal: true, penalty: false, player: 'Jan Janssen' })
    expect(own?.playerId).not.toBeNull()
  })

  it('stores a penalty, and a goal without a minute', async () => {
    await run([
      oldMatch({
        events: [
          goal(0, 'jan.janssen', 'strafschop'),
          goal(30, 'Piet Pietersen', null, false),
          goal(80, 'jan.janssen', 'penalty'),
        ],
      }),
    ])

    expect(await goalRows()).toMatchObject([
      { minute: 30, ours: false, penalty: false },
      { minute: 80, ours: true, penalty: true },
      { minute: null, ours: true, penalty: true },
    ])
  })

  it('gives a match that does not add up no goals, and the log says which', async () => {
    const { goals } = await run([
      oldMatch({ events: winGoals.slice(0, 2) }),
      oldMatch({ code: 'ajax.thuis', dateTime: '2001-09-08 20:00:00' }),
      oldMatch({ code: 'nec.uit', dateTime: '2001-09-15 20:00:00', events: winGoals }),
    ])

    expect(await goalRows()).toHaveLength(0)
    expect(goals.skipped).toBe(3)
    expect(goals.lines).toEqual([
      '0 matches get goals, 0 add up without goals, 1 have a score and no goals, 2 have part of the goals',
      '2001/02 nec.thuis: 2 of the goals for the score 2-1, so the match gets none',
      '2001/02 nec.thuis: the goals are kept as a change that waits for the editors',
      '2001/02 ajax.thuis: no goals for the score 2-1, so the match gets none',
      '2001/02 nec.uit: 3 of the goals for the score 1-2, so the match gets none',
      '2001/02 nec.uit: the goals are kept as a change that waits for the editors',
    ])
  })

  it('keeps the goals of the files that do not add up as a change that waits, and none for a match without a list', async () => {
    const { goals } = await run([
      oldMatch({ events: winGoals.slice(0, 2) }),
      oldMatch({ code: 'ajax.thuis', dateTime: '2001-09-08 20:00:00' }),
    ])
    const [partial] = await database.db.select().from(matches).orderBy(asc(matches.matchDate))
    const kept = await changeRows()

    expect(goals.created).toBe(0)
    expect(kept).toMatchObject([
      {
        changed: 'doelpunten',
        competition: partial!.competition,
        matchId: partial!.id,
        newValue: "10' Jan Janssen, 30' Piet Pietersen (tegenstander)",
        oldValue: 'geen doelpunten',
        part: 'goals',
        reason: oldSiteGoalsReason,
        round: partial!.round,
        season: '2001/02',
        status: 'pending',
      },
    ])
    expect(decodePartProposal(kept[0]!.proposal)).toMatchObject({
      goals: [
        { minute: 10, ours: true, player: 'Jan Janssen', playerId: expect.any(Number) },
        { minute: 30, ours: false, player: 'Piet Pietersen', playerId: null },
      ],
      part: 'goals',
      stored: [],
    })
  })

  /** The editors make the 2-1 of the only match a 3-1, and leave the goals. */
  async function correctResult() {
    const [stored] = await database.db.select().from(matches)

    await database.db.update(matches).set({ goalsFor: 3 }).where(eq(matches.id, stored!.id))
    await database.db.insert(matchEdits).values({
      beforeGoals: '[]',
      beforeMatch: '{}',
      editedAt: new Date(),
      editedBy: adminId,
      matchId: stored!.id,
      reason: 'De uitslag was 3-1',
      resultEdited: true,
    })

    return stored!.id
  }

  it('keeps the goals a match had when the editors corrected its result, and takes them off the match', async () => {
    const list = [oldMatch({ events: winGoals })]

    await run(list)

    const before = await goalRows()
    const matchId = await correctResult()
    const { goals } = await run(list)
    const kept = await changeRows()
    const line = "10' Jan Janssen, 30' Piet Pietersen (tegenstander), 80' Joost van Aken"
    const fields = before.map((goal) => ({ minute: goal.minute, player: goal.player, playerId: goal.playerId }))

    expect(await goalRows()).toHaveLength(0)
    expect(goals.lines).toEqual([
      '0 matches get goals, 0 add up without goals, 0 have a score and no goals, 1 have part of the goals',
      '2001/02 nec.thuis: 3 of the goals for the score 3-1, so the match gets none',
      '2001/02 nec.thuis: the goals are kept as a change that waits for the editors',
      '2001/02 nec.thuis: 3 goals removed, they do not add up to the score',
    ])
    expect(kept).toMatchObject([{ matchId, newValue: line, oldValue: line, part: 'goals', status: 'pending' }])
    expect(decodePartProposal(kept[0]!.proposal)).toMatchObject({ goals: fields, stored: fields })
  })

  it('makes no second change for the same list in a second run', async () => {
    const list = [oldMatch({ events: winGoals })]

    await run(list)
    await correctResult()
    await run(list)

    const before = await changeRows()
    const { goals } = await run(list)

    expect(goals).toMatchObject({ changed: 0, created: 0 })
    expect(await changeRows()).toEqual(before)
  })

  it('leaves the list the editors took over on the match, and makes no new change', async () => {
    const list = [oldMatch({ events: winGoals })]

    await run(list)
    await correctResult()
    await run(list)

    const [kept] = await changeRows()

    expect(
      await decideConflict(
        database.db,
        kept!.id,
        { kind: 'take-over', reason: 'Er mist er een', resolution: 'person', userId: null },
        new Date(),
      ),
    ).toBe('done')

    const taken = await goalRows()
    const { goals } = await run(list)

    expect(taken).toHaveLength(3)
    expect(await goalRows()).toEqual(taken)
    expect(await changeRows()).toHaveLength(1)
    expect(goals.lines).toContain(
      'skipped the goals of 2001/02 nec.thuis: the editors took the list of the files over, so it stays',
    )
  })

  it('keeps the goals again when the editors kept the result and the match had goals once more', async () => {
    const list = [oldMatch({ events: winGoals })]

    await run(list)

    const matchId = await correctResult()

    await run(list)
    await database.db.update(matchChanges).set({ resolution: 'person', status: 'rejected' })
    await database.db.insert(matchGoals).values({ matchId, minute: 10, ours: true, player: 'Jan Janssen' })
    await run(list)

    expect((await changeRows()).map((change) => change.status)).toEqual(['rejected', 'pending'])
    expect(await goalRows()).toHaveLength(0)
  })

  it('lets a change that waits lapse when the goals add up again, and stores them', async () => {
    const list = [oldMatch({ events: winGoals })]

    await run(list)

    const matchId = await correctResult()

    await run(list)
    await database.db.update(matches).set({ goalsFor: 2 }).where(eq(matches.id, matchId))
    await run(list)

    expect(await goalRows()).toHaveLength(3)
    expect(await changeRows()).toMatchObject([{ resolution: 'reverted', status: 'rejected' }])
  })

  it('replaces a change that waits when the files have another list', async () => {
    await run([oldMatch({ events: winGoals.slice(0, 2) })])
    await run([oldMatch({ events: winGoals.slice(0, 1) })])

    expect(await changeRows()).toMatchObject([
      { newValue: "10' Jan Janssen, 30' Piet Pietersen (tegenstander)", resolution: 'replaced', status: 'rejected' },
      { newValue: "10' Jan Janssen", status: 'pending' },
    ])
  })

  it('changes nothing in a second run, and keeps the id of a goal', async () => {
    const list = [oldMatch({ events: winGoals })]

    await run(list)

    const before = { goals: await goalRows(), players: await playerRows() }
    const { goals, players: playersReport } = await run(list)

    expect(goals).toMatchObject({ changed: 0, created: 0, unchanged: 3 })
    expect(playersReport).toMatchObject({ changed: 0, created: 0, unchanged: 2 })
    expect({ goals: await goalRows(), players: await playerRows() }).toEqual(before)
  })

  it('follows a change in the files in place, and removes goals that no longer add up', async () => {
    await run([oldMatch({ events: winGoals })])

    const [first, second] = await goalRows()
    const changed = [goal(11, 'jan.janssen'), goal(30, 'Piet Pietersen', null, false), goal(80, 'joost.vanaken')]
    const { goals } = await run([oldMatch({ events: changed })])
    const [after] = await goalRows()

    expect(goals).toMatchObject({ changed: 1, created: 0, unchanged: 2 })
    expect(after).toMatchObject({ id: first?.id, minute: 11 })
    expect((await goalRows())[1]?.id).toBe(second?.id)

    const gone = await run([oldMatch({ events: changed.slice(0, 2) })])

    expect(gone.goals).toMatchObject({ changed: 3 })
    expect(await goalRows()).toHaveLength(0)
  })

  it('leaves a match with goals of the editors or a saved report alone, and a match of another source', async () => {
    const list = [
      oldMatch({ events: winGoals }),
      oldMatch({ code: 'ajax.thuis', dateTime: '2001-09-08 20:00:00', events: winGoals }),
      oldMatch({
        code: 'nec.uit',
        dateTime: '2001-09-15 20:00:00',
        events: [goal(5, 'jan.janssen'), goal(9, 'Piet', null, false)],
        result: { awayFullTime: 1, awayHalfTime: 0, homeFullTime: 1, homeHalfTime: 0, note: null },
      }),
    ]

    await importOldSiteClubs(database.db, oldClubs)
    await importOldSiteMatches(database.db, list, oldClubs, await oldSiteClubIds(database.db, oldClubs))

    const [edited, reported, other] = await database.db.select().from(matches).orderBy(asc(matches.matchDate))

    await database.db.insert(matchEdits).values({
      beforeGoals: '[]',
      beforeMatch: '{}',
      editedAt: new Date(),
      editedBy: adminId,
      goalsEdited: true,
      matchId: edited!.id,
      reason: 'De redactie wist het beter',
    })
    await database.db.insert(matchReports).values({ matchId: reported!.id, savedBy: adminId, status: 'bezig' })
    await database.db.update(matches).set({ dataSource: 'wikipedia' }).where(eq(matches.id, other!.id))
    await database.db.insert(matchGoals).values({ matchId: edited!.id, minute: 1, ours: true, player: 'Handmatig' })
    await importOldSitePlayers(database.db, list, oldPlayers)

    const report = await importOldSiteGoals(database.db, list, oldPlayers)

    expect(report).toMatchObject({ changed: 0, created: 0, skipped: 3 })
    expect(await goalRows()).toMatchObject([{ matchId: edited!.id, player: 'Handmatig' }])
  })

  it('makes a goal list for a match with a report that has no editor yet', async () => {
    const list = [oldMatch({ events: winGoals })]

    await importOldSiteClubs(database.db, oldClubs)
    await importOldSiteMatches(database.db, list, oldClubs, await oldSiteClubIds(database.db, oldClubs))

    const [stored] = await database.db.select().from(matches)

    await database.db.insert(matchReports).values({ matchId: stored!.id, status: 'bezig' })
    await importOldSitePlayers(database.db, list, oldPlayers)

    expect(await importOldSiteGoals(database.db, list, oldPlayers)).toMatchObject({ created: 3 })
  })
})

describe('the files of the old fansite', () => {
  it('make the players of 17 seasons and the goals of 525 matches, and a second run changes nothing', async () => {
    for (const table of ['match_changes', 'match_edits', 'match_statistics', 'matches', 'players', 'clubs']) {
      await database.pool.query(`DELETE FROM ${table}`)
    }

    const data = await readOldSiteData()

    await importOldSiteClubs(database.db, data.clubs)
    await importOldSiteMatches(database.db, data.matches, data.clubs, await oldSiteClubIds(database.db, data.clubs))

    const firstPlayers = await importOldSitePlayers(database.db, data.matches, data.players)
    const firstGoals = await importOldSiteGoals(database.db, data.matches, data.players)
    const before = { goals: await goalRows(), players: await database.db.select().from(players) }
    const secondPlayers = await importOldSitePlayers(database.db, data.matches, data.players)
    const secondGoals = await importOldSiteGoals(database.db, data.matches, data.players)
    const perSeason = new Map<string, number>()
    const stored = await database.db.select().from(matchGoals)

    for (const row of before.players) {
      perSeason.set(row.season, (perSeason.get(row.season) ?? 0) + 1)
    }

    expect(firstPlayers).toMatchObject({ changed: 0, created: 426, skipped: 0, unchanged: 0 })
    expect(secondPlayers).toMatchObject({ changed: 0, created: 0, skipped: 0, unchanged: 426 })
    expect(Object.fromEntries(perSeason)).toEqual({
      '1990/91': 23,
      '1991/92': 13,
      '1992/93': 23,
      '1993/94': 23,
      '1994/95': 29,
      '1995/96': 27,
      '1996/97': 24,
      '1997/98': 28,
      '1998/99': 26,
      '1999/00': 28,
      '2000/01': 27,
      '2001/02': 27,
      '2002/03': 28,
      '2003/04': 29,
      '2004/05': 25,
      '2005/06': 28,
      '2006/07': 18,
    })
    // 1,771 goals in the files; 8 of them are in the 2 matches whose list does not add up.
    // Those 2 lists are kept as a change that waits each, which `created` does not count.
    expect(firstGoals).toMatchObject({ changed: 0, created: 1763, skipped: 67, unchanged: 0 })
    expect((await changeRows()).map((change) => [change.part, change.status])).toEqual([
      ['goals', 'pending'],
      ['goals', 'pending'],
    ])
    expect(secondGoals).toMatchObject({ changed: 0, created: 0, skipped: 67, unchanged: 1763 })
    expect(new Set(stored.map((row) => row.matchId)).size).toBe(525)
    expect(stored.filter((row) => row.penalty)).toHaveLength(94)
    expect(stored.filter((row) => row.ownGoal)).toHaveLength(32)
    expect(stored.filter((row) => row.minute === null)).toHaveLength(1)
    expect(firstGoals.lines[0]).toBe(
      '525 matches get goals, 79 add up without goals, 65 have a score and no goals, 2 have part of the goals',
    )
    expect(await goalRows()).toEqual(before.goals)
    expect(await database.db.select().from(players)).toEqual(before.players)
    // Every goal of ours that is not an own goal has its player, and no other has one.
    expect(stored.filter((row) => row.ours && !row.ownGoal).every((row) => row.playerId !== null)).toBe(true)
    expect(stored.filter((row) => !row.ours && !row.ownGoal).every((row) => row.playerId === null)).toBe(true)
  }, 60_000)
})
