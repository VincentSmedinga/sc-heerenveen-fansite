import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { StadiumLine } from './club-stadiums.ts'
import type { TestDatabase } from './test-database.ts'

import { listClubStadiums, listClubsWithStadiums, removeClubStadiums, replaceClubStadiums } from './club-stadiums.ts'
import { adminUsers, auditLog, clubs, clubStadiums } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase
let adminId: number
let azId: number
let nacId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM club_stadiums')
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM clubs')
  await database.pool.query('DELETE FROM admin_users')
  await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('redactie@example.org', 'editor')")
  adminId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  await database.db.insert(clubs).values([
    { name: 'Oefenstad AZ', slug: 'oefenstad-az' },
    { name: 'Oefenstad NAC', slug: 'oefenstad-nac' },
  ])
  azId = (await database.db.select().from(clubs).where(eq(clubs.slug, 'oefenstad-az')))[0]?.id ?? 0
  nacId = (await database.db.select().from(clubs).where(eq(clubs.slug, 'oefenstad-nac')))[0]?.id ?? 0
})

const line = (name: string, extra: Partial<StadiumLine> = {}): StadiumLine => ({
  name,
  note: null,
  startDay: null,
  startSeason: null,
  ...extra,
})

const list: StadiumLine[] = [
  line('Oefenstadion Een'),
  line('Tijdelijk Stadion', { note: 'Tijdelijk elders.', startDay: '2019-08-10' }),
  line('Oefenstadion Twee', { startSeason: '2020/21' }),
]

describe('replaceClubStadiums and listClubStadiums', () => {
  it('keeps the lines in the order they were given, and the lines of another club apart', async () => {
    await replaceClubStadiums(database.db, adminId, nacId, [line('Andere Arena')])

    expect(await replaceClubStadiums(database.db, adminId, azId, list)).toBe('saved')
    expect(await listClubStadiums(database.db, azId)).toEqual(list)
    expect(await listClubStadiums(database.db, nacId)).toEqual([line('Andere Arena')])
  })

  it('replaces the whole list, so a line that is not given any more is gone', async () => {
    await replaceClubStadiums(database.db, adminId, azId, list)
    await replaceClubStadiums(database.db, adminId, azId, [line('Alleen Dit')])

    expect(await listClubStadiums(database.db, azId)).toEqual([line('Alleen Dit')])
  })

  it('writes a row in the log in the same transaction, with the numbers and no text of a note', async () => {
    const now = new Date('2026-11-04T10:00:00Z')

    await replaceClubStadiums(database.db, adminId, azId, list, now)

    expect(await database.db.select().from(auditLog)).toEqual([
      {
        action: 'stadium.save',
        createdAt: now,
        detail: '3 regels, 1 met toelichting',
        id: expect.any(Number),
        itemId: azId,
        reason: null,
        userId: adminId,
      },
    ])
  })

  it('stores nothing and writes no row when the lines break a rule of the table', async () => {
    await expect(
      replaceClubStadiums(database.db, adminId, azId, [line('Eerste'), line('Zonder start')]),
    ).rejects.toBeDefined()

    expect(await listClubStadiums(database.db, azId)).toEqual([])
    expect(await database.db.select().from(auditLog)).toEqual([])
  })

  it('keeps the old list when the new lines break a rule', async () => {
    await replaceClubStadiums(database.db, adminId, azId, list)
    await expect(
      replaceClubStadiums(database.db, adminId, azId, [
        line('Eerste'),
        line('Beide', { startDay: '2020-01-01', startSeason: '2020/21' }),
      ]),
    ).rejects.toBeDefined()

    expect(await listClubStadiums(database.db, azId)).toEqual(list)
    expect(await database.db.select().from(auditLog)).toHaveLength(1)
  })

  it('says the club is missing and writes nothing for a number no club has', async () => {
    expect(await replaceClubStadiums(database.db, adminId, azId + 1000, list)).toBe('missing')
    expect(await database.db.select().from(auditLog)).toEqual([])
  })
})

describe('the table club_stadiums', () => {
  const insert = (values: Partial<typeof clubStadiums.$inferInsert>) =>
    database.db.insert(clubStadiums).values({ clubId: azId, name: 'Stadion', position: 0, ...values })

  it('lets the first name have no start, and no other name', async () => {
    await expect(insert({})).resolves.toBeDefined()
    await expect(insert({ position: 1 })).rejects.toBeDefined()
    await expect(insert({ position: 1, startSeason: '2020/21' })).resolves.toBeDefined()
    await expect(insert({ position: 2, startDay: '2021-02-14' })).resolves.toBeDefined()
  })

  it('refuses a start that is a season and a day, and a season that is not written as one', async () => {
    await expect(insert({ startDay: '2020-01-01', startSeason: '2020/21' })).rejects.toBeDefined()
    await expect(insert({ startSeason: '2020-21' })).rejects.toBeDefined()
    await expect(insert({ startSeason: '20/21' })).rejects.toBeDefined()
  })

  it('refuses two lines at one place of a list', async () => {
    await insert({})
    await expect(insert({ name: 'Tweede' })).rejects.toBeDefined()
  })

  it('goes with its club', async () => {
    await replaceClubStadiums(database.db, adminId, azId, list)
    await database.db.delete(clubs).where(eq(clubs.id, azId))

    expect(await database.db.select().from(clubStadiums)).toEqual([])
  })
})

describe('listClubsWithStadiums', () => {
  it('has the clubs with an own list, each once', async () => {
    expect(await listClubsWithStadiums(database.db)).toEqual(new Set())

    await replaceClubStadiums(database.db, adminId, azId, list)

    expect(await listClubsWithStadiums(database.db)).toEqual(new Set([azId]))
  })
})

describe('removeClubStadiums', () => {
  it('takes the whole list away, and writes a row in the log with how many lines went', async () => {
    const now = new Date('2026-11-04T11:00:00Z')

    await replaceClubStadiums(database.db, adminId, azId, list)
    await replaceClubStadiums(database.db, adminId, nacId, [line('Andere Arena')])

    expect(await removeClubStadiums(database.db, adminId, azId, now)).toBe('done')
    expect(await listClubStadiums(database.db, azId)).toEqual([])
    expect(await listClubStadiums(database.db, nacId)).toEqual([line('Andere Arena')])
    expect((await database.db.select().from(auditLog)).at(-1)).toMatchObject({
      action: 'stadium.reset',
      createdAt: now,
      detail: '3 regels weggehaald',
      itemId: azId,
      userId: adminId,
    })
  })

  it('changes nothing and writes no row for a club without a list or one that is gone', async () => {
    expect(await removeClubStadiums(database.db, adminId, azId)).toBe('none')
    expect(await removeClubStadiums(database.db, adminId, azId + 1000)).toBe('missing')
    expect(await database.db.select().from(auditLog)).toEqual([])
  })
})
