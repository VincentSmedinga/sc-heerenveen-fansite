import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, auditLog, clubs } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createAccount } from './accounts'
import { chooseClubColour, findClubColour, readClubColour } from './club-colour'

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
  await database.pool.query('DELETE FROM clubs')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
})

async function addClub(slug: string) {
  const [club] = await database.db.insert(clubs).values({ name: slug, slug }).$returningId()

  return club?.id ?? 0
}

const stored = async (id: number) => (await database.db.select().from(clubs).where(eq(clubs.id, id)))[0]?.colourChoice

describe('readClubColour', () => {
  it('takes the list, none, and an own colour in small letters', () => {
    expect(readClubColour('lijst', 'nonsense')).toEqual({ choice: null })
    expect(readClubColour('geen', '')).toEqual({ choice: 'none' })
    expect(readClubColour('eigen', ' #E30613 ')).toEqual({ choice: '#e30613' })
  })

  it('refuses anything that is not a colour, at the field it is about', () => {
    for (const wrong of ['', 'e30613', '#e306', '#gggggg', 'red', undefined]) {
      expect(readClubColour('eigen', wrong)).toMatchObject({ field: 'kleur' })
    }

    expect(readClubColour('iets', '#e30613')).toMatchObject({ field: 'keuze' })
  })
})

describe('chooseClubColour', () => {
  it('stores a choice, gives the colour that holds, and writes the change in the log', async () => {
    const id = await addClub('feyenoord')

    expect(await findClubColour(database.db, id)).toBe('#e30613')
    expect(await chooseClubColour(database.db, userId, id, '#00a651')).toEqual({
      colour: '#00a651',
      status: 'done',
    })
    expect(await stored(id)).toBe('#00a651')
    expect(await findClubColour(database.db, id)).toBe('#00a651')
    expect((await database.db.select().from(auditLog))[0]).toMatchObject({
      action: 'club.edit',
      detail: 'feyenoord, kleur van de club: uit de lijst → #00a651',
      itemId: id,
      userId,
    })
  })

  it('gives no colour, and the list again', async () => {
    const id = await addClub('feyenoord')

    expect(await chooseClubColour(database.db, userId, id, 'none')).toEqual({ colour: null, status: 'done' })
    expect(await findClubColour(database.db, id)).toBeNull()
    expect(await chooseClubColour(database.db, userId, id, null)).toEqual({ colour: '#e30613', status: 'done' })
    expect(await stored(id)).toBeNull()
  })

  it('writes nothing for the same choice, and says a club is gone', async () => {
    const id = await addClub('feyenoord')

    expect(await chooseClubColour(database.db, userId, id, null)).toMatchObject({ status: 'unchanged' })
    expect(await database.db.select().from(auditLog)).toHaveLength(0)
    expect(await chooseClubColour(database.db, userId, 99999, 'none')).toEqual({ status: 'missing' })
  })

  it('refuses a choice that is not checked', async () => {
    const id = await addClub('feyenoord')

    await expect(chooseClubColour(database.db, userId, id, 'red')).rejects.toThrow()
  })
})
