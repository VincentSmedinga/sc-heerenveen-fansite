import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { linkOpponentPersons } from './opponent-persons.ts'
import * as personsModule from './persons.ts'
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
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase
let clubId: number
let matchId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  for (const table of [
    'club_squad_players',
    'match_goals',
    'match_appearances',
    'match_reports',
    'matches',
    'players',
    'persons',
    'clubs',
  ]) {
    await database.pool.query(`DELETE FROM ${table}`)
  }

  const [club] = await database.db.insert(clubs).values({ name: 'N.E.C.', slug: 'nec' }).$returningId()

  clubId = club?.id ?? 0

  const [match] = await database.db
    .insert(matches)
    .values({
      clubId,
      competition: 'Eredivisie',
      goalsAgainst: 1,
      goalsFor: 2,
      home: true,
      kickoffAt: new Date('2026-10-24T18:45:00Z'),
      matchDate: '2026-10-24',
      opponent: 'N.E.C.',
      round: 'Speelronde 10',
      season: '2026/27',
      status: 'played',
    })
    .$returningId()

  matchId = match?.id ?? 0
  await database.db.insert(matchReports).values({ matchId, status: 'klaar' })
})

const addPerson = async (name: string) => {
  const [added] = await database.db.insert(persons).values({ name }).$returningId()

  return added?.id ?? 0
}

const addAppearance = async (name: string, values: Partial<typeof matchAppearances.$inferInsert> = {}) => {
  const [added] = await database.db
    .insert(matchAppearances)
    .values({ matchId, name, ours: false, starter: true, ...values })
    .$returningId()

  return added?.id ?? 0
}

const personOf = async (id: number) =>
  (await database.db.select().from(matchAppearances).where(eq(matchAppearances.id, id)))[0]?.personId

describe('linkOpponentPersons (#1544)', () => {
  it('gives a player of the opponent the person of a goal of the same match', async () => {
    const person = await addPerson('Jan de Vries')
    const row = await addAppearance('De Vries')

    await database.db.insert(matchGoals).values({
      appearanceId: row,
      matchId,
      ours: false,
      personId: person,
      player: 'De Vries',
    })

    expect(await linkOpponentPersons(database.db)).toMatchObject({ goal: 1, name: 0 })
    expect(await personOf(row)).toBe(person)
  })

  it('gives him the one person whose name is his name, whatever the capitals and accents', async () => {
    const person = await addPerson('Éric van Dijk')
    const row = await addAppearance('eric VAN dijk')

    expect(await linkOpponentPersons(database.db)).toMatchObject({ goal: 0, name: 1 })
    expect(await personOf(row)).toBe(person)
  })

  it('gives him the person of the squad of the club, also when two persons carry his name (#1542)', async () => {
    const wanted = await addPerson('Jan Jansen')

    await addPerson('Jan Jansen')
    await database.db
      .insert(clubSquadPlayers)
      .values({ clubId, name: 'Jan Jansen', personId: wanted, readAt: new Date('2026-11-20T10:00:00Z') })

    const row = await addAppearance('Jan Jansen')

    expect(await linkOpponentPersons(database.db)).toMatchObject({ name: 0, several: 0, squad: 1 })
    expect(await personOf(row)).toBe(wanted)
  })

  it('does not use the squad of another club, or a squad player without a person', async () => {
    const person = await addPerson('Jan Jansen')
    const [other] = await database.db.insert(clubs).values({ name: 'Ajax', slug: 'ajax' }).$returningId()
    const readAt = new Date('2026-11-20T10:00:00Z')

    await database.db
      .insert(clubSquadPlayers)
      .values({ clubId: other?.id ?? 0, name: 'Jan Jansen', personId: person, readAt })
    await database.db.insert(clubSquadPlayers).values({ clubId, name: 'Piet Bakker', personId: null, readAt })
    await addPerson('Piet Bakker')
    await addPerson('Piet Bakker')

    const jan = await addAppearance('Jan Jansen')
    const piet = await addAppearance('Piet Bakker')

    expect(await linkOpponentPersons(database.db)).toMatchObject({ several: 1, squad: 0 })
    expect(await personOf(jan)).toBe(person)
    expect(await personOf(piet)).toBeNull()
  })

  it('leaves him without a person when his name fits nobody', async () => {
    await addPerson('Piet Jansen')

    const row = await addAppearance('Klaas Bakker')

    expect(await linkOpponentPersons(database.db)).toMatchObject({ name: 0, nobody: 1, several: 0, squad: 0 })
    expect(await personOf(row)).toBeNull()
  })

  it('leaves him without a person when his name fits two persons', async () => {
    await addPerson('Jan Jansen')
    await addPerson('Jan Jansen')

    const row = await addAppearance('Jan Jansen')

    expect(await linkOpponentPersons(database.db)).toMatchObject({ name: 0, nobody: 0, several: 1 })
    expect(await personOf(row)).toBeNull()
  })

  it('never touches a row of ours, who has his person through his player', async () => {
    await addPerson('Jan de Vries')

    const [player] = await database.db
      .insert(players)
      .values({ name: 'Jan de Vries', searchTerm: 'jan de vries', season: '2026/27' })
      .$returningId()
    const row = await addAppearance('Jan de Vries', { ours: true, playerId: player?.id ?? 0 })

    expect(await linkOpponentPersons(database.db)).toEqual({
      excepted: 0,
      goal: 0,
      name: 0,
      nobody: 0,
      several: 0,
      squad: 0,
    })
    expect(await personOf(row)).toBeNull()
  })

  it('never changes a row that has a person already, not even when the name says another', async () => {
    const kept = await addPerson('Piet Jansen')

    await addPerson('Jan de Vries')

    const row = await addAppearance('Jan de Vries', { personId: kept })

    expect(await linkOpponentPersons(database.db)).toEqual({
      excepted: 0,
      goal: 0,
      name: 0,
      nobody: 0,
      several: 0,
      squad: 0,
    })
    expect(await personOf(row)).toBe(kept)
  })

  it('does not link a name on the list of namesakes, for that club only', async () => {
    await addPerson('Jan de Vries')

    const row = await addAppearance('Jan de Vries')

    expect(
      await linkOpponentPersons(database.db, { exceptions: [{ club: 'n.e.c.', name: 'jan de vries' }] }),
    ).toMatchObject({ excepted: 1, name: 0 })
    expect(await personOf(row)).toBeNull()
    expect(
      await linkOpponentPersons(database.db, { exceptions: [{ club: 'Ajax', name: 'Jan de Vries' }] }),
    ).toMatchObject({
      excepted: 0,
      name: 1,
    })
    expect(await personOf(row)).not.toBeNull()
  })

  it('has an empty list of namesakes to begin with', () => {
    expect(personsModule.opponentPersonExceptions).toEqual([])
  })

  it('finds nothing to do the second time, and limits a run to one match', async () => {
    const person = await addPerson('Jan de Vries')
    const first = await addAppearance('Jan de Vries')
    const [other] = await database.db
      .insert(matches)
      .values({
        clubId,
        competition: 'Eredivisie',
        goalsAgainst: 0,
        goalsFor: 0,
        home: false,
        kickoffAt: new Date('2026-11-01T18:45:00Z'),
        matchDate: '2026-11-01',
        opponent: 'N.E.C.',
        round: 'Speelronde 12',
        season: '2026/27',
        status: 'played',
      })
      .$returningId()

    await database.db.insert(matchReports).values({ matchId: other?.id ?? 0, status: 'klaar' })

    const second = await addAppearance('Jan de Vries', { matchId: other?.id ?? 0 })

    expect(await linkOpponentPersons(database.db, { matchId })).toMatchObject({ name: 1 })
    expect(await personOf(first)).toBe(person)
    expect(await personOf(second)).toBeNull()
    expect(await linkOpponentPersons(database.db)).toMatchObject({ name: 1 })
    expect(await linkOpponentPersons(database.db)).toEqual({
      excepted: 0,
      goal: 0,
      name: 0,
      nobody: 0,
      several: 0,
      squad: 0,
    })
    expect(await personOf(second)).toBe(person)
  })

  it('lets a person who is deleted go from the row, and keeps the row', async () => {
    const person = await addPerson('Jan de Vries')
    const row = await addAppearance('Jan de Vries')

    await linkOpponentPersons(database.db)
    await database.db.delete(persons).where(eq(persons.id, person))

    expect(await personOf(row)).toBeNull()
  })
})
