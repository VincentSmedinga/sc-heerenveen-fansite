import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, matchEdits, matches, matchGoals, persons, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { OldSiteEvent, OldSiteMatch, OldSitePlayer } from './old-site-file.ts'

import { importOldSiteClubs, oldSiteClubIds } from './old-site-clubs.ts'
import { importOldSiteGoals } from './old-site-goals.ts'
import { importOldSiteMatches } from './old-site-matches.ts'
import {
  decideName,
  importOldSiteOpponentGoals,
  opponentGoalReport,
  personIdsByName,
} from './old-site-opponent-goals.ts'
import { importOldSitePlayers } from './old-site-players.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const none = { differ: [], namesakes: [] }

const oldClubs = [{ code: 'nec', country: 'NL', name: 'NEC' }]

const oldPlayers: OldSitePlayer[] = [
  { code: 'jan.janssen', country: null, firstName: 'Jan', infix: null, lastName: 'Janssen', line: null },
]

const goal = (minute: number, who: string, ours = false): OldSiteEvent => ({
  assist: null,
  event: 1,
  kind: null,
  minute,
  playerCode: ours ? who : null,
  playerName: ours ? null : who,
})

/** A match lost 0-2, with two goals of opponents, so each name is a goal against us. */
const lost = (code: string, names: [string, string], overrides: Partial<OldSiteMatch> = {}): OldSiteMatch => ({
  attendance: null,
  code,
  competition: 1,
  dateTime: '2001-09-01 20:00:00',
  events: [goal(10, names[0]), goal(30, names[1])],
  lineup: [],
  note: null,
  referee: null,
  result: { awayFullTime: 2, awayHalfTime: 0, homeFullTime: 0, homeHalfTime: 0, note: null },
  round: 1,
  season: '0102',
  statistics: {
    awayCorners: 0,
    awayFouls: 0,
    awayOffside: 0,
    homeCorners: 0,
    homeFouls: 0,
    homeOffside: 0,
  },
  ...overrides,
})

const goalRows = () => database.db.select().from(matchGoals).orderBy(asc(matchGoals.id))

describe('linking the goals against us to a person', () => {
  beforeEach(async () => {
    for (const table of ['match_edits', 'matches', 'players', 'persons', 'clubs', 'admin_users']) {
      await database.pool.query(`DELETE FROM ${table}`)
    }
  })

  async function load(list: OldSiteMatch[]) {
    await importOldSiteClubs(database.db, oldClubs)
    await importOldSiteMatches(database.db, list, oldClubs, await oldSiteClubIds(database.db, oldClubs))
    await importOldSitePlayers(database.db, list, oldPlayers)
    await importOldSiteGoals(database.db, list, oldPlayers)
  }

  async function person(name: null | string, title: null | string = name) {
    const [{ insertId }] = await database.db.insert(persons).values({ name, wikipediaPage: title })

    return insertId
  }

  it('links a goal to the one person with exactly that name, and only the person', async () => {
    const id = await person('Piet Pietersen')

    await load([lost('nec.thuis', ['Piet Pietersen', 'Klaas Klaassen'])])

    const report = await importOldSiteOpponentGoals(database.db, none)

    expect(report).toMatchObject({ changed: 0, created: 1, unchanged: 1 })
    expect(await goalRows()).toMatchObject([
      { personId: id, player: 'Piet Pietersen', playerId: null, wikipediaPage: null },
      { personId: null, player: 'Klaas Klaassen' },
    ])
  })

  it('changes nothing on a second run', async () => {
    await person('Piet Pietersen')
    await load([lost('nec.thuis', ['Piet Pietersen', 'Klaas Klaassen'])])
    await importOldSiteOpponentGoals(database.db, none)

    expect(await importOldSiteOpponentGoals(database.db, none)).toMatchObject({ changed: 0, created: 0, unchanged: 2 })
  })

  it('keeps the link when the goals step runs again', async () => {
    const id = await person('Piet Pietersen')
    const list = [lost('nec.thuis', ['Piet Pietersen', 'Klaas Klaassen'])]

    await load(list)
    await importOldSiteOpponentGoals(database.db, none)
    await importOldSiteGoals(database.db, list, oldPlayers)

    expect((await goalRows())[0]?.personId).toBe(id)
  })

  it('does not link a name that two persons have, and says so', async () => {
    await person('Piet Pietersen', 'Piet Pietersen')
    await person('Piet Pietersen', 'Piet Pietersen (voetballer, 1970)')
    await load([lost('nec.thuis', ['Piet Pietersen', 'Klaas Klaassen'])])

    const report = await importOldSiteOpponentGoals(database.db, none)

    expect((await goalRows()).map((row) => row.personId)).toEqual([null, null])
    expect(report.lines.join('\n')).toContain('1 names fit more than one person')
  })

  it('does not link a namesake of the list, and takes a link that was laid away', async () => {
    await person('Piet Pietersen')
    await load([lost('nec.thuis', ['Piet Pietersen', 'Klaas Klaassen'])])
    await importOldSiteOpponentGoals(database.db, none)

    const report = await importOldSiteOpponentGoals(database.db, { differ: [], namesakes: ['Piet Pietersen'] })

    expect(report.changed).toBe(1)
    expect((await goalRows()).map((row) => row.personId)).toEqual([null, null])
  })

  it('does not link a name of persons who differ', async () => {
    await person('Piet Pietersen')
    await load([lost('nec.thuis', ['Piet Pietersen', 'Klaas Klaassen'])])
    await importOldSiteOpponentGoals(database.db, { differ: [['Piet Pietersen', 'Piet Peters']], namesakes: [] })

    expect((await goalRows()).map((row) => row.personId)).toEqual([null, null])
  })

  it('leaves the goals of a match the editors filled in', async () => {
    await person('Piet Pietersen')
    await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('redactie@example.org', 'beheerder')")

    const [admin] = await database.db.select().from(adminUsers)

    await load([lost('nec.thuis', ['Piet Pietersen', 'Klaas Klaassen'])])

    const [stored] = await database.db.select().from(matches)

    await database.db.insert(matchEdits).values({
      beforeGoals: '[]',
      beforeMatch: '{}',
      editedAt: new Date(),
      editedBy: admin!.id,
      goalsEdited: true,
      matchId: stored!.id,
      reason: 'Doelpunten aangevuld',
    })

    expect(await importOldSiteOpponentGoals(database.db, none)).toMatchObject({ created: 0, unchanged: 0 })
    expect((await goalRows()).map((row) => row.personId)).toEqual([null, null])
  })

  it('does not link a goal of ours, an own goal or a name without a person', async () => {
    await person('Jan Janssen')
    await load([
      lost('nec.thuis', ['Klaas Klaassen', 'Jan Janssen'], {
        events: [
          goal(10, 'jan.janssen', true),
          { ...goal(20, 'Jan Janssen'), kind: 'eigen doelpunt' },
          goal(30, 'Klaas Klaassen'),
        ],
        result: { awayFullTime: 1, awayHalfTime: 0, homeFullTime: 2, homeHalfTime: 0, note: null },
      }),
    ])
    await importOldSiteOpponentGoals(database.db, none)

    const rows = await goalRows()

    expect(rows.map((row) => row.personId)).toEqual([null, null, null])
    expect(await database.db.select().from(players).where(eq(players.name, 'Jan Janssen'))).toHaveLength(1)
  })

  it('reports the goals by season and each linked name with its seasons', async () => {
    const id = await person('Jan Janssen')

    await load([lost('nec.thuis', ['Jan Janssen', 'Klaas Klaassen'])])
    await database.db
      .insert(players)
      .values({ name: 'Jan Janssen', personId: id, searchTerm: 'Janssen', season: '1999/00' })
    await importOldSiteOpponentGoals(database.db, none)

    expect(await opponentGoalReport(database.db, none)).toEqual({
      names: [{ against: ['2001/02'], for: ['1999/00'], name: 'Jan Janssen' }],
      seasons: [{ ambiguous: 0, linked: 1, season: '2001/02' }],
    })
  })
})

describe('deciding about a name', () => {
  const byName = personIdsByName([
    { id: 1, name: 'Jan Jansen' },
    { id: 2, name: 'Piet Peters' },
    { id: 3, name: 'Piet Peters' },
    { id: 4, name: null },
  ])

  it('links one person, and nothing for two, none or an excluded name', () => {
    expect(decideName('Jan Jansen', byName, none)).toEqual({ kind: 'linked', personId: 1 })
    expect(decideName('Piet Peters', byName, none)).toEqual({ kind: 'ambiguous', personIds: [2, 3] })
    expect(decideName('Kees Kees', byName, none)).toEqual({ kind: 'none' })
    expect(decideName('Jan Jansen', byName, { differ: [], namesakes: ['Jan Jansen'] })).toEqual({ kind: 'excluded' })
  })
})
