import type { RowDataPacket } from 'mysql2/promise'

import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { NewStaff, StaffRole } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { findStaffOn, listStaffInSeason } from './queries.ts'
import { staff, staffRoles } from './schema.ts'
import { headCoaches, seedStaff } from './staff-seed.ts'
import { coverage, partOfSeason, rangeOf, servedInSeason } from './staff.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

/**
 * A role no seed row has. The test adds it to the column by hand, to show that a person with
 * another role never comes in the answer for `coach`.
 */
const otherRole = 'test-role' as StaffRole

beforeAll(async () => {
  database = await createTestDatabase()
  await seedStaff(database.db)
  await database.pool.query("ALTER TABLE staff MODIFY role ENUM('coach', 'test-role') NOT NULL")
  await database.pool.query(
    "INSERT INTO staff (role, name, start_date, start_precision) VALUES ('test-role', 'Iemand Anders', '1990-07-01', 'day')",
  )
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

const names = (rows: { name: string }[]) => rows.map((row) => row.name)

const candidatesOf = (answer: Awaited<ReturnType<typeof findStaffOn>>) =>
  answer.kind === 'uncertain' ? names(answer.candidates) : []

describe('the table staff', () => {
  it('has the role coach and no other role', () => {
    expect(staffRoles).toEqual(['coach'])
  })

  it('gets every head coach of the seed with the role coach, with one row per period', async () => {
    const rows = (await database.db.select().from(staff)).filter((row) => row.role === 'coach')

    expect(rows).toHaveLength(headCoaches.length)
    expect(rows.filter((row) => row.name === 'Foppe de Haan')).toHaveLength(2)
  })

  it('stores text as utf8mb4', async () => {
    const [tables] = await database.pool.query<RowDataPacket[]>(
      "SELECT table_collation AS collation FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name = 'staff'",
    )

    expect(tables[0]?.['collation']).toBe('utf8mb4_unicode_ci')
  })

  const base = { name: 'Proef Trainer', role: 'coach', startDate: '2030-01-01', startPrecision: 'day' } as const

  it.each([
    ['an end before the begin', { ...base, endDate: '2029-12-31', endPrecision: 'day' }],
    ['an end date without a precision', { ...base, endDate: '2030-06-30' }],
    ['an end precision without a date', { ...base, endPrecision: 'day' }],
    [
      'a begin known to the month that is not the first of it',
      { ...base, startDate: '2030-01-15', startPrecision: 'month' },
    ],
    ['a begin known to the year that is not 1 January', { ...base, startDate: '2030-07-01', startPrecision: 'year' }],
    [
      'an end known to the month that is not the first of it',
      { ...base, endDate: '2030-06-30', endPrecision: 'month' },
    ],
    ['an end known to the year that is not 1 January', { ...base, endDate: '2030-06-30', endPrecision: 'year' }],
    ['a role that is not in the list', { ...base, role: 'chef' as StaffRole }],
    ['the same person with the same begin twice', { ...base, name: 'Fritz Korbach', startDate: '1990-07-01' }],
  ] satisfies [string, NewStaff][])('refuses %s', async (_name, row) => {
    await expect(database.db.insert(staff).values(row)).rejects.toThrow()
  })

  it('accepts an end on the begin, a month and a year, and a person still in service', async () => {
    await database.db.insert(staff).values([
      { ...base, endDate: '2030-01-01', endPrecision: 'day', name: 'Een Dag' },
      { ...base, endDate: '2030-03-01', endPrecision: 'month', name: 'Een Maand' },
      { ...base, endDate: '2031-01-01', endPrecision: 'year', name: 'Een Jaar' },
      { ...base, name: 'Nog Bezig', startDate: '2030-02-01', startPrecision: 'month' },
    ])
    await database.pool.query("DELETE FROM staff WHERE start_date >= '2030-01-01'")
  })
})

describe('the seed of the head coaches', () => {
  it('puts the same rows back when it runs again, and no duplicates', async () => {
    const before = await database.db.select().from(staff)

    await seedStaff(database.db)

    expect(await database.db.select().from(staff)).toEqual(before)
  })

  it('updates a row that is already there by its role, name and begin, and gives a database that has none all of them', async () => {
    await database.pool.query("UPDATE staff SET note = 'oud', interim = 1 WHERE name = 'Ron Jans'")
    await seedStaff(database.db)

    const [jans] = await database.db.select().from(staff).where(eq(staff.name, 'Ron Jans'))

    expect(jans).toMatchObject({ interim: false, note: expect.stringContaining('Standard Luik') })

    await database.pool.query("DELETE FROM staff WHERE role = 'coach'")
    await seedStaff(database.db)

    expect((await database.db.select().from(staff)).filter((row) => row.role === 'coach')).toHaveLength(
      headCoaches.length,
    )
  })

  it('has no end before its begin, and an end only with a precision', () => {
    for (const coach of headCoaches) {
      const { endDate, endPrecision } = { endDate: undefined, endPrecision: undefined, ...coach }

      expect(endDate === undefined || endDate >= coach.startDate, coach.name).toBe(true)
      expect(endPrecision !== undefined, coach.name).toBe(endDate !== undefined)
    }
  })

  it('has every period begin for certain on its own first day when that is known to the day', () => {
    for (const coach of headCoaches) {
      if (coach.startPrecision === 'day') {
        const period = { endDate: null, endPrecision: null, ...coach }

        expect(coverage(period, coach.startDate), coach.name).toBe('certain')
      }
    }
  })
})

describe('the staff of a season', () => {
  it('gives the one head coach of a season with one', async () => {
    expect(names(await listStaffInSeason(database.db, 'coach', '2005/06'))).toEqual(['Gertjan Verbeek'])
    expect(names(await listStaffInSeason(database.db, 'coach', '2017/18'))).toEqual(['Jurgen Streppel'])
  })

  it('gives two or three in the order their periods began, as in 2024/25 and 2009/10', async () => {
    expect(names(await listStaffInSeason(database.db, 'coach', '2024/25'))).toEqual([
      'Robin van Persie',
      'Henk Brugge',
      'Robin Veldman',
    ])
    expect(names(await listStaffInSeason(database.db, 'coach', '2009/10'))).toEqual([
      'Trond Sollied',
      'Jan de Jonge',
      'Jan Everse',
    ])
    expect(names(await listStaffInSeason(database.db, 'coach', '2021/22'))).toEqual(['Johnny Jansen', 'Ole Tobiassen'])
  })

  it('tells the interim coaches and gives the page of a coach', async () => {
    expect(await listStaffInSeason(database.db, 'coach', '2024/25')).toMatchObject([
      { interim: false, wikipediaPage: 'Robin van Persie' },
      { interim: true, wikipediaPage: 'Henk Brugge' },
      { interim: false, wikipediaPage: 'Robin Veldman' },
    ])
  })

  it('gives the coach that is still in service for this season and later, and nobody before the first match', async () => {
    expect(names(await listStaffInSeason(database.db, 'coach', '2026/27'))).toEqual(['Robin Veldman'])
    expect(names(await listStaffInSeason(database.db, 'coach', '2030/31'))).toEqual(['Robin Veldman'])
    expect(await listStaffInSeason(database.db, 'coach', '1989/90')).toEqual([])
  })

  it('leaves out a coach whose start or end is known to the month or year when the season is not surely his', async () => {
    // Van Basten stopped "in July 2014", which may be the first of July: he is not in 2014/15.
    expect(names(await listStaffInSeason(database.db, 'coach', '2014/15'))).toEqual(['Dwight Lodeweges'])
    // Lodeweges began "in 2014", so he is not in the season before.
    expect(names(await listStaffInSeason(database.db, 'coach', '2013/14'))).toEqual(['Marco van Basten'])
  })

  it('gives the people of the role that is asked for, and nobody of another role', async () => {
    expect(names(await listStaffInSeason(database.db, 'coach', '1990/91'))).toEqual(['Fritz Korbach'])
    expect(names(await listStaffInSeason(database.db, otherRole, '1990/91'))).toEqual(['Iemand Anders'])
  })
})

describe('the staff on a day', () => {
  it('gives the coach in the middle of a period', async () => {
    expect(await findStaffOn(database.db, 'coach', '2006-03-14')).toMatchObject({
      kind: 'certain',
      member: { interim: false, name: 'Gertjan Verbeek' },
    })
  })

  it('gives the new coach on the day he begins and the old one the day before, for dates known to the day', async () => {
    expect(await findStaffOn(database.db, 'coach', '2025-03-20')).toMatchObject({
      kind: 'certain',
      member: { interim: true, name: 'Henk Brugge' },
    })
    expect(await findStaffOn(database.db, 'coach', '2025-03-21')).toMatchObject({
      kind: 'certain',
      member: { name: 'Robin Veldman' },
    })
    expect(await findStaffOn(database.db, 'coach', '2010-06-30')).toMatchObject({ member: { name: 'Jan Everse' } })
    expect(await findStaffOn(database.db, 'coach', '2010-07-01')).toMatchObject({ member: { name: 'Ron Jans' } })
  })

  it('names no coach for a day in the month a date is known to, but names who it might be', async () => {
    // Sollied began "in July 2008", and Verbeek ended on 30 June.
    expect(await findStaffOn(database.db, 'coach', '2008-06-30')).toMatchObject({ member: { name: 'Gertjan Verbeek' } })

    const answer = await findStaffOn(database.db, 'coach', '2008-07-15')

    expect(answer.kind).toBe('uncertain')
    expect(candidatesOf(answer)).toEqual(['Trond Sollied'])
    expect(await findStaffOn(database.db, 'coach', '2008-08-01')).toMatchObject({ member: { name: 'Trond Sollied' } })
  })

  it('is uncertain when both coaches changed "in a month", and says who they might be', async () => {
    // Korbach ended and De Haan began "in October 1992".
    expect(await findStaffOn(database.db, 'coach', '1992-09-30')).toMatchObject({ member: { name: 'Fritz Korbach' } })
    expect(candidatesOf(await findStaffOn(database.db, 'coach', '1992-10-15'))).toEqual([
      'Fritz Korbach',
      'Foppe de Haan',
    ])
    expect(await findStaffOn(database.db, 'coach', '1992-11-01')).toMatchObject({ member: { name: 'Foppe de Haan' } })
  })

  it('is uncertain in a year a date is known to, and certain once the year is over', async () => {
    // Olde Riekerink began "in 2018", and Streppel ended on 13 May 2018.
    expect(await findStaffOn(database.db, 'coach', '2018-05-13')).toMatchObject({ member: { name: 'Jurgen Streppel' } })
    expect(candidatesOf(await findStaffOn(database.db, 'coach', '2018-08-01'))).toEqual(['Jan Olde Riekerink'])
    expect(await findStaffOn(database.db, 'coach', '2019-01-01')).toMatchObject({
      member: { name: 'Jan Olde Riekerink' },
    })
  })

  it('has no coach in the gap between Jansen and Tobiassen', async () => {
    expect(await findStaffOn(database.db, 'coach', '2022-01-24')).toMatchObject({ member: { name: 'Johnny Jansen' } })
    expect(await findStaffOn(database.db, 'coach', '2022-01-25')).toEqual({ kind: 'none' })
    expect(await findStaffOn(database.db, 'coach', '2022-02-03')).toEqual({ kind: 'none' })
    expect(await findStaffOn(database.db, 'coach', '2022-02-04')).toMatchObject({ member: { name: 'Ole Tobiassen' } })
  })

  it('has no coach before 1 July 1990', async () => {
    expect(await findStaffOn(database.db, 'coach', '1990-06-30')).toEqual({ kind: 'none' })
    expect(await findStaffOn(database.db, 'coach', '1990-07-01')).toMatchObject({ member: { name: 'Fritz Korbach' } })
  })

  it('gives the coach who is still in service, today and in the years to come', async () => {
    expect(await findStaffOn(database.db, 'coach', '2026-10-30')).toMatchObject({ member: { name: 'Robin Veldman' } })
    expect(await findStaffOn(database.db, 'coach', '2040-01-01')).toMatchObject({ member: { name: 'Robin Veldman' } })
  })

  it('never answers with a person of another role', async () => {
    // Iemand Anders has the other role from 1 July 1990, as Fritz Korbach has the coach role.
    expect(await findStaffOn(database.db, 'coach', '1990-07-02')).toMatchObject({ member: { name: 'Fritz Korbach' } })
    expect(await findStaffOn(database.db, otherRole, '1990-07-02')).toMatchObject({ member: { name: 'Iemand Anders' } })
  })
})

describe('the days a date can be', () => {
  it('lies on the day, in the month or in the year', () => {
    expect(rangeOf('2025-03-21', 'day')).toEqual({ from: '2025-03-21', to: '2025-03-21' })
    expect(rangeOf('2024-02-01', 'month')).toEqual({ from: '2024-02-01', to: '2024-02-29' })
    expect(rangeOf('2025-02-01', 'month')).toEqual({ from: '2025-02-01', to: '2025-02-28' })
    expect(rangeOf('2014-01-01', 'year')).toEqual({ from: '2014-01-01', to: '2014-12-31' })
  })

  it('counts a person in a season only for the days he surely held', () => {
    const open = { endDate: null, endPrecision: null, startDate: '2024-01-01', startPrecision: 'year' } as const

    expect(servedInSeason(open, '2023/24')).toBe(false)
    expect(servedInSeason(open, '2024/25')).toBe(true)
    expect(servedInSeason({ ...open, endDate: '2024-06-01', endPrecision: 'month' }, '2024/25')).toBe(false)
  })
})

describe('the part of a season a person had the job', () => {
  const of = async (name: string, season: string) => {
    const [member] = (await listStaffInSeason(database.db, 'coach', season)).filter((row) => row.name === name)

    return partOfSeason(member!, season)
  }

  it('has no start and no end for a coach who had the whole season', async () => {
    expect(await of('Gertjan Verbeek', '2005/06')).toEqual({ end: null, start: null })
    // He began on 1 July and ended on 30 June: both edges of the season.
    expect(await of('Gertjan Verbeek', '2004/05')).toEqual({ end: null, start: null })
    expect(await of('Robin Veldman', '2026/27')).toEqual({ end: null, start: null })
  })

  it('has an end for a coach who stopped in the season, and a start for one who began in it', async () => {
    expect(await of('Trond Sollied', '2009/10')).toEqual({ end: { date: '2009-08-31', precision: 'day' }, start: null })
    expect(await of('Robin Veldman', '2024/25')).toEqual({ end: null, start: { date: '2025-03-21', precision: 'day' } })
    expect(await of('Jan Everse', '2009/10')).toEqual({ end: null, start: { date: '2010-02-05', precision: 'day' } })
  })

  it('has both for a coach who began and stopped in the season', async () => {
    expect(await of('Jan de Jonge', '2009/10')).toEqual({
      end: { date: '2010-02-03', precision: 'day' },
      start: { date: '2009-09-01', precision: 'day' },
    })
  })

  it('keeps the precision of a date known to the month or the year, and never takes it for an edge', async () => {
    expect(await of('Henk Brugge', '2024/25')).toEqual({
      end: { date: '2025-03-20', precision: 'day' },
      start: { date: '2025-02-01', precision: 'month' },
    })
    expect(await of('Robin van Persie', '2024/25')).toEqual({
      end: { date: '2025-02-01', precision: 'month' },
      start: { date: '2024-01-01', precision: 'year' },
    })
    expect(await of('Foppe de Haan', '2003/04')).toEqual({
      end: { date: '2004-01-01', precision: 'year' },
      start: null,
    })
  })
})
