import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, auditLog, clubs, matches } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createAccount } from './accounts'
import {
  chooseClubCountry,
  clubListLength,
  countClubsWithoutCountry,
  countryName,
  listClubsWithoutCountry,
} from './club-country'

let database: TestDatabase
let userId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM clubs')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
})

async function addClub(name: string, values: Partial<typeof clubs.$inferInsert> = {}) {
  const [club] = await database.db
    .insert(clubs)
    .values({ name, slug: name.toLowerCase().replaceAll(' ', '-'), ...values })
    .$returningId()

  return club?.id ?? 0
}

async function addMatch(clubId: number, competition: 'Eredivisie' | 'Europa League', day: string) {
  await database.db.insert(matches).values({
    clubId,
    competition,
    goalsAgainst: 0,
    goalsFor: 1,
    home: true,
    kickoffAt: new Date(`${day}T18:45:00Z`),
    matchDate: day,
    opponent: 'Verzonnen',
    round: day,
    season: '2024/25',
    status: 'played',
  })
}

const club = async (id: number) => (await database.db.select().from(clubs).where(eq(clubs.id, id)))[0]

describe('choosing the country of a club', () => {
  it('saves it with the source manual and writes the change in the log', async () => {
    const id = await addClub('Oefenstad FC')

    expect(await chooseClubCountry(database.db, userId, id, 'DE')).toEqual({
      country: 'DE',
      name: 'Oefenstad FC',
      status: 'done',
    })
    expect(await club(id)).toMatchObject({ country: 'DE', countrySource: 'manual' })

    const [row] = await database.db.select().from(auditLog)

    expect(row).toMatchObject({
      action: 'club.edit',
      detail: 'Oefenstad FC, land van de club: geen → Duitsland',
      itemId: id,
      userId,
    })
  })

  it('replaces a country of Wikidata, and the editors keep it as theirs', async () => {
    const id = await addClub('Oefenstad FC', { country: 'BE', countrySource: 'wikidata' })

    await chooseClubCountry(database.db, userId, id, 'NL')

    expect(await club(id)).toMatchObject({ country: 'NL', countrySource: 'manual' })
    expect((await database.db.select().from(auditLog))[0]?.detail).toBe(
      'Oefenstad FC, land van de club: België → Nederland',
    )
  })

  it('takes the country and the source away, so the import can fill it in again', async () => {
    const id = await addClub('Oefenstad FC', { country: 'DE', countrySource: 'manual' })

    expect(await chooseClubCountry(database.db, userId, id, null)).toMatchObject({ country: null, status: 'done' })
    expect(await club(id)).toMatchObject({ country: null, countrySource: null })
    expect((await database.db.select().from(auditLog))[0]?.detail).toBe(
      'Oefenstad FC, land van de club: Duitsland → geen',
    )
  })

  it('changes nothing and writes nothing when the editors chose that country already', async () => {
    const id = await addClub('Oefenstad FC', { country: 'DE', countrySource: 'manual' })
    const none = await addClub('Zonder Land')

    expect(await chooseClubCountry(database.db, userId, id, 'DE')).toMatchObject({ status: 'unchanged' })
    expect(await chooseClubCountry(database.db, userId, none, null)).toMatchObject({ status: 'unchanged' })
    expect(await database.db.select().from(auditLog)).toEqual([])
  })

  it('reports a club that is gone, and refuses a code that is not a country', async () => {
    expect(await chooseClubCountry(database.db, userId, 999_999, 'DE')).toEqual({ status: 'missing' })

    const id = await addClub('Oefenstad FC')

    await expect(chooseClubCountry(database.db, userId, id, 'XX')).rejects.toThrow()
    expect(await club(id)).toMatchObject({ country: null })
  })

  it('names a country in Dutch', () => {
    expect(countryName('DE')).toBe('Duitsland')
  })
})

describe('the clubs without a country', () => {
  it('counts them, and counts the clubs of matches in Europe among them', async () => {
    const europe = await addClub('Europese Club')
    const home = await addClub('Thuisclub')

    await addClub('Klaar FC', { country: 'NL', countrySource: 'manual' })
    await addMatch(europe, 'Europa League', '2024-10-03')
    await addMatch(home, 'Eredivisie', '2024-10-10')

    expect(await countClubsWithoutCountry(database.db)).toEqual({ europe: 1, total: 2 })
  })

  it('lists the clubs of Europe first, then by name, and leaves out clubs with a country', async () => {
    const europe = await addClub('Zeta Europa')
    const home = await addClub('Alfa Thuis')
    const other = await addClub('Beta Thuis')

    await addClub('Klaar FC', { country: 'NL', countrySource: 'wikidata' })
    await addMatch(europe, 'Europa League', '2024-10-03')
    await addMatch(europe, 'Europa League', '2024-10-24')
    await addMatch(home, 'Eredivisie', '2024-10-10')
    await addMatch(other, 'Eredivisie', '2024-10-11')

    const found = await listClubsWithoutCountry(database.db)

    expect(found.map(({ europe: inEurope, name }) => [name, inEurope])).toEqual([
      ['Zeta Europa', true],
      ['Alfa Thuis', false],
      ['Beta Thuis', false],
    ])
    expect(await listClubsWithoutCountry(database.db, { limit: 1, offset: 1 })).toMatchObject([{ name: 'Alfa Thuis' }])
    expect(clubListLength).toBe(50)
  })
})
