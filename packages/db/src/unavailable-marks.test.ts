import type { RowDataPacket } from 'mysql2/promise'

import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { adminUsers, auditActions, auditLog, persons, unavailableMarks } from './schema.ts'
import { createTestDatabase } from './test-database.ts'
import {
  clearFilledMarks,
  listPersonMarks,
  markUnavailable,
  readPersonMarks,
  renewMark,
  unmark,
} from './unavailable-marks.ts'

let database: TestDatabase
let personId = 0
let userId = 0

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM unavailable_marks')
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM persons')
  await database.pool.query('DELETE FROM admin_users')
  ;[{ insertId: userId }] = await database.db.insert(adminUsers).values({ email: 'sanne@example.org', role: 'editor' })
  ;[{ insertId: personId }] = await database.db.insert(persons).values({ familyName: 'Bos', name: 'Tom Bos' })
})

const actions = async () =>
  (await database.db.select().from(auditLog)).map((row) => ({ action: row.action, userId: row.userId }))

describe('the table unavailable_marks', () => {
  it('has the three actions in the log of the admin', async () => {
    expect(auditActions).toEqual(expect.arrayContaining(['gap.mark', 'gap.renew', 'gap.unmark']))

    const [rows] = await database.pool.query<RowDataPacket[]>("SHOW COLUMNS FROM audit_log LIKE 'action'")

    expect(String(rows[0]?.['Type'])).toContain("'gap.unmark'")
  })

  it('holds one mark for one field of one subject', async () => {
    await markUnavailable(database.db, userId, personId, 'wikipedia')

    await expect(
      database.db
        .insert(unavailableMarks)
        .values({ checkedOn: '2026-11-16', field: 'wikipedia', subject: 'person', subjectId: personId }),
    ).rejects.toThrow()
  })
})

describe('marking a gap', () => {
  it('writes the mark with today and the editor, and one row in the log', async () => {
    const now = new Date('2026-11-16T10:00:00Z')

    expect(await markUnavailable(database.db, userId, personId, 'geboren', now)).toBe(true)
    expect(await markUnavailable(database.db, userId, personId, 'geboren', now)).toBe(false)
    expect(await readPersonMarks(database.db, personId)).toEqual({ geboren: '2026-11-16' })
    expect(await actions()).toEqual([{ action: 'gap.mark', userId }])
  })

  it('renews the day and logs it, and does nothing for a gap without a mark', async () => {
    await markUnavailable(database.db, userId, personId, 'wikipedia', new Date('2026-01-05T10:00:00Z'))

    expect(await renewMark(database.db, userId, personId, 'wikipedia', new Date('2026-11-16T10:00:00Z'))).toBe(true)
    expect(await renewMark(database.db, userId, personId, 'geboren')).toBe(false)
    expect(await readPersonMarks(database.db, personId)).toEqual({ wikipedia: '2026-11-16' })
    expect((await actions()).map((row) => row.action)).toEqual(['gap.mark', 'gap.renew'])
  })

  it('renews a mark that is already from today', async () => {
    const now = new Date('2026-11-16T10:00:00Z')

    await markUnavailable(database.db, userId, personId, 'wikipedia', now)

    expect(await renewMark(database.db, userId, personId, 'wikipedia', now)).toBe(true)
  })

  it('takes a mark away and logs it', async () => {
    await markUnavailable(database.db, userId, personId, 'wikipedia')

    expect(await unmark(database.db, userId, personId, 'wikipedia')).toBe(true)
    expect(await unmark(database.db, userId, personId, 'wikipedia')).toBe(false)
    expect(await readPersonMarks(database.db, personId)).toEqual({})
    expect((await actions()).map((row) => row.action)).toEqual(['gap.mark', 'gap.unmark'])
  })
})

describe('a gap that is filled', () => {
  it('loses its mark, with a row in the log for the import, which has no account', async () => {
    await markUnavailable(database.db, userId, personId, 'wikipedia')
    await markUnavailable(database.db, userId, personId, 'geboren')
    await database.db.update(persons).set({ birthDate: '1980-01-01' }).where(eq(persons.id, personId))

    expect(await clearFilledMarks(database.db, personId, null)).toEqual(['geboren'])
    expect(await readPersonMarks(database.db, personId)).toEqual({ wikipedia: expect.any(String) })
    expect((await actions()).at(-1)).toEqual({ action: 'gap.unmark', userId: null })
  })

  it('keeps a mark whose field is still empty', async () => {
    await markUnavailable(database.db, userId, personId, 'wikipedia')

    expect(await clearFilledMarks(database.db, personId, userId)).toEqual([])
    expect(await readPersonMarks(database.db, personId)).toEqual({ wikipedia: expect.any(String) })
  })

  it('is left out of the card when the field has a value, without deleting the mark', async () => {
    await markUnavailable(database.db, userId, personId, 'wikipedia')
    expect(await listPersonMarks(database.db)).toMatchObject([{ field: 'wikipedia', name: 'Tom Bos', personId }])

    await database.db.update(persons).set({ wikipediaPage: 'Tom Bos (voetballer)' }).where(eq(persons.id, personId))

    expect(await listPersonMarks(database.db)).toEqual([])
    expect(await readPersonMarks(database.db, personId)).toEqual({ wikipedia: expect.any(String) })
  })
})
