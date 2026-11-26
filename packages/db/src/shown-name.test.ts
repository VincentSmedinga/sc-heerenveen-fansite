import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import {
  clubs,
  clubSquadPlayers,
  matchAppearances,
  matches,
  matchGoals,
  matchReports,
  persons,
  players,
} from './schema.ts'
import {
  readNamedPlayers,
  rowsByName,
  shownAppearanceName,
  shownClubPlayerName,
  shownGoalName,
  shownSearchTerm,
} from './shown-name.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  for (const table of ['match_goals', 'match_appearances', 'match_reports', 'matches', 'players']) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
  await database.pool.query('DELETE FROM club_squad_players')
  await database.pool.query('DELETE FROM clubs')
  await database.pool.query('DELETE FROM persons')
})

async function person(values: Partial<typeof persons.$inferInsert>) {
  const [{ insertId }] = await database.db.insert(persons).values(values)

  return insertId
}

async function row(sourceName: string, season: string, personId: null | number = null) {
  const [{ insertId }] = await database.db
    .insert(players)
    .values({ personId, searchTerm: sourceName.split(' ').slice(1).join(' '), season, sourceName })

  return insertId
}

describe('the name of a row of a squad', () => {
  it('is that of the person in every season, whatever each source wrote', async () => {
    const id = await person({ familyName: 'Nieuw', familyNamePrefix: 'van', givenName: 'Jan', name: 'Jan van Nieuw' })

    await row('Jan Oud', '2001/02', id)
    await row('J. Ouder', '2002/03', id)
    await row('Jan Alleroudst', '2003/04', id)

    const found = await readNamedPlayers(database.db)

    expect(found.map((player) => [player.name, player.sourceName])).toEqual([
      ['Jan van Nieuw', 'Jan Oud'],
      ['Jan van Nieuw', 'J. Ouder'],
      ['Jan van Nieuw', 'Jan Alleroudst'],
    ])
    expect(await database.db.select({ term: shownSearchTerm() }).from(players).limit(1)).toEqual([
      { term: 'van Nieuw' },
    ])
  })

  it('is that of the source without a person, and for a person without a name', async () => {
    await row('Piet Zonder', '2001/02')
    await row('Klaas Naamloos', '2001/02', await person({}))

    expect((await readNamedPlayers(database.db)).map((player) => player.name)).toEqual([
      'Piet Zonder',
      'Klaas Naamloos',
    ])
    expect(await database.db.select({ term: shownSearchTerm() }).from(players).orderBy(players.id)).toEqual([
      { term: 'Zonder' },
      { term: 'Naamloos' },
    ])
  })
})

describe('the name of a line, a goal and a player of an opponent', () => {
  it('follows the person of the row for a line of ours, and its own person for the opponent', async () => {
    const ours = await person({ name: 'Onze Naam' })
    const theirs = await person({ name: 'Hun Naam' })
    const own = await person({ name: 'Naam van het doelpunt' })
    const player = await row('Onze Bron', '2001/02', ours)
    const [{ insertId: clubId }] = await database.db.insert(clubs).values({ name: 'Testdorp', slug: 'testdorp' })
    const [{ insertId: matchId }] = await database.db.insert(matches).values({
      clubId,
      competition: 'Eredivisie',
      home: true,
      kickoffAt: new Date('2001-09-01T18:00:00Z'),
      matchDate: '2001-09-01',
      opponent: 'Testdorp',
      round: '1',
      season: '2001/02',
      status: 'scheduled',
    })

    await database.db.insert(matchReports).values({ matchId, status: 'bezig' })
    await database.db.insert(matchAppearances).values([
      // A line of ours takes the person of its row, also when the line names another.
      { matchId, ours: true, personId: theirs, playerId: player, sourceName: 'Bron een', starter: true },
      { matchId, ours: false, personId: theirs, sourceName: 'Bron twee', starter: true },
      { matchId, ours: false, sourceName: 'Bron drie', starter: true },
    ])
    await database.db.insert(matchGoals).values([
      { matchId, ours: true, personId: own, playerId: player, sourceName: 'Doelpunt een' },
      { matchId, ours: true, playerId: player, sourceName: 'Doelpunt twee' },
      { matchId, ours: false, sourceName: 'Doelpunt drie' },
    ])
    await database.db.insert(clubSquadPlayers).values([
      { clubId, personId: theirs, readAt: new Date(), sourceName: 'Selectie een' },
      { clubId, readAt: new Date(), sourceName: 'Selectie twee' },
    ])

    const names = async (query: Promise<{ name: string }[]>) => (await query).map((found) => found.name)

    expect(
      await names(
        database.db.select({ name: shownAppearanceName() }).from(matchAppearances).orderBy(matchAppearances.id),
      ),
    ).toEqual(['Onze Naam', 'Hun Naam', 'Bron drie'])
    // A query on one table, and one that joins `players`, read the same names.
    expect(await names(database.db.select({ name: shownGoalName() }).from(matchGoals).orderBy(matchGoals.id))).toEqual([
      'Naam van het doelpunt',
      'Onze Naam',
      'Doelpunt drie',
    ])
    expect(
      await names(
        database.db
          .select({ name: shownGoalName() })
          .from(matchGoals)
          .leftJoin(players, eq(players.id, matchGoals.playerId))
          .orderBy(matchGoals.id),
      ),
    ).toEqual(['Naam van het doelpunt', 'Onze Naam', 'Doelpunt drie'])
    expect(
      await names(
        database.db.select({ name: shownClubPlayerName() }).from(clubSquadPlayers).orderBy(clubSquadPlayers.id),
      ),
    ).toEqual(['Hun Naam', 'Selectie twee'])
  })
})

describe('rowsByName', () => {
  const key = (name: string) => name.toLowerCase()
  const row = (sourceName: string, name = sourceName) => ({ name, sourceName })

  it('finds a row by the name of its source and by the name of its person', () => {
    const renamed = row('Jan Oud', 'Jan Nieuw')

    expect(rowsByName([renamed], key).get('jan oud')).toBe(renamed)
    expect(rowsByName([renamed], key).get('jan nieuw')).toBe(renamed)
  })

  it('lets the name of a source win, and guesses nothing between two persons of one name', () => {
    const own = row('Jan Jansen')
    const renamed = row('Jan Oud', 'Jan Jansen')

    expect(rowsByName([renamed, own], key).get('jan jansen')).toBe(own)
    expect(rowsByName([own, renamed], key).get('jan jansen')).toBe(own)
    expect(rowsByName([row('A', 'Dubbel'), row('B', 'Dubbel')], key).has('dubbel')).toBe(false)
  })
})
