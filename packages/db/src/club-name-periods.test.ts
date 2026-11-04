import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { NamePeriodLine } from './club-name-periods.ts'
import type { NewMatchWithoutClub } from './clubs.ts'
import type { TestDatabase } from './test-database.ts'

import {
  listClubNamePeriods,
  listClubsWithNamePeriods,
  nameOnDay,
  removeClubNamePeriods,
  replaceClubNamePeriods,
  withSeasonNames,
} from './club-name-periods.ts'
import { createClubBook, withClubs } from './clubs.ts'
import { listClubMatches, listSeasonMatches } from './queries.ts'
import { adminUsers, auditLog, clubNamePeriods, clubNames, clubs, matches } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase
let adminId: number
let zwolleId: number
let otherId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM club_name_periods')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM club_names')
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM clubs')
  await database.pool.query('DELETE FROM admin_users')
  await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('redactie@example.org', 'beheerder')")
  adminId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  await database.db.insert(clubs).values([
    { name: 'PEC Oefenstad', slug: 'pec-oefenstad' },
    { name: 'Oefenstad AZ', slug: 'oefenstad-az' },
  ])
  zwolleId = (await database.db.select().from(clubs).where(eq(clubs.slug, 'pec-oefenstad')))[0]?.id ?? 0
  otherId = (await database.db.select().from(clubs).where(eq(clubs.slug, 'oefenstad-az')))[0]?.id ?? 0
})

const line = (name: string, extra: Partial<NamePeriodLine> = {}): NamePeriodLine => ({
  name,
  note: null,
  startDay: null,
  startSeason: null,
  ...extra,
})

const list: NamePeriodLine[] = [
  line('FC Oefenstad'),
  line('Oefenstad Boys', { note: 'Tijdelijk onder een andere naam.', startDay: '2008-03-01' }),
  line('PEC Oefenstad', { startSeason: '2012/13' }),
]

describe('nameOnDay', () => {
  it('has the one name for every day', () => {
    expect(nameOnDay([line('PEC Oefenstad')], '1990-01-01')).toBe('PEC Oefenstad')
    expect(nameOnDay([line('PEC Oefenstad')], '2030-01-01')).toBe('PEC Oefenstad')
  })

  it('switches at 1 July for a season, on the day itself', () => {
    const names = [line('FC Oefenstad'), line('PEC Oefenstad', { startSeason: '2012/13' })]

    expect(nameOnDay(names, '2012-06-30')).toBe('FC Oefenstad')
    expect(nameOnDay(names, '2012-07-01')).toBe('PEC Oefenstad')
    expect(nameOnDay(names, '2013-01-01')).toBe('PEC Oefenstad')
  })

  it('switches on the day for a start with a day, for a match in the middle of a season', () => {
    const names = [line('FC Oefenstad'), line('PEC Oefenstad', { startDay: '2012-06-05' })]

    expect(nameOnDay(names, '2012-06-04')).toBe('FC Oefenstad')
    expect(nameOnDay(names, '2012-06-05')).toBe('PEC Oefenstad')
  })

  it('finds a name in the middle of three, of one season and of more seasons', () => {
    const one = [line('A'), line('B', { startSeason: '2005/06' }), line('C', { startSeason: '2006/07' })]
    const more = [line('A'), line('B', { startSeason: '2005/06' }), line('C', { startSeason: '2009/10' })]

    expect(nameOnDay(one, '2005-08-01')).toBe('B')
    expect(nameOnDay(one, '2006-06-30')).toBe('B')
    expect(nameOnDay(one, '2006-07-01')).toBe('C')
    expect(nameOnDay(more, '2008-10-10')).toBe('B')
    expect(nameOnDay(more, '2004-10-10')).toBe('A')
  })

  it('has no name before the first start, so the spelling of Wikipedia stays', () => {
    const names = [line('FC Oefenstad', { startSeason: '2000/01' })]

    expect(nameOnDay(names, '2000-06-30')).toBeUndefined()
    expect(nameOnDay(names, '2000-07-01')).toBe('FC Oefenstad')
    expect(nameOnDay([], '2000-07-01')).toBeUndefined()
  })
})

describe('replaceClubNamePeriods and listClubNamePeriods', () => {
  it('keeps the lines in the order they were given, and the lines of another club apart', async () => {
    await replaceClubNamePeriods(database.db, adminId, otherId, [line('Oefenstad AZ')])

    expect(await replaceClubNamePeriods(database.db, adminId, zwolleId, list)).toBe('saved')
    expect(await listClubNamePeriods(database.db, zwolleId)).toEqual(list)
    expect(await listClubNamePeriods(database.db, otherId)).toEqual([line('Oefenstad AZ')])
  })

  it('replaces the whole list', async () => {
    await replaceClubNamePeriods(database.db, adminId, zwolleId, list)
    await replaceClubNamePeriods(database.db, adminId, zwolleId, [line('Alleen Dit')])

    expect(await listClubNamePeriods(database.db, zwolleId)).toEqual([line('Alleen Dit')])
  })

  it('writes a row in the log in the same transaction, with the numbers and no text of a note', async () => {
    const now = new Date('2026-11-04T10:00:00Z')

    await replaceClubNamePeriods(database.db, adminId, zwolleId, list, now)

    expect(await database.db.select().from(auditLog)).toEqual([
      {
        action: 'club-name.save',
        createdAt: now,
        detail: '3 regels, 1 met toelichting, 2 namen erbij voor de import',
        id: expect.any(Number),
        itemId: zwolleId,
        reason: null,
        userId: adminId,
      },
    ])
  })

  it('stores nothing and writes no row when the lines break a rule of the table', async () => {
    await expect(
      replaceClubNamePeriods(database.db, adminId, zwolleId, [line('Eerste'), line('Zonder start')]),
    ).rejects.toBeDefined()

    expect(await listClubNamePeriods(database.db, zwolleId)).toEqual([])
    expect(await database.db.select().from(clubNames)).toEqual([])
    expect(await database.db.select().from(auditLog)).toEqual([])
  })

  it('says the club is missing and writes nothing for a number no club has', async () => {
    expect(await replaceClubNamePeriods(database.db, adminId, zwolleId + 1000, list)).toBe('missing')
    expect(await database.db.select().from(auditLog)).toEqual([])
  })
})

describe('the names of a list and the importer', () => {
  it('puts the names in club_names, except the name in the heading, and does not duplicate them', async () => {
    await replaceClubNamePeriods(database.db, adminId, zwolleId, list)
    await replaceClubNamePeriods(database.db, adminId, zwolleId, list)

    expect(
      (await database.db.select({ name: clubNames.name }).from(clubNames).where(eq(clubNames.clubId, zwolleId)))
        .map((row) => row.name)
        .toSorted(),
    ).toEqual(['FC Oefenstad', 'Oefenstad Boys'])
  })

  it('leaves club_names as it is when a name leaves the list or the list goes', async () => {
    await replaceClubNamePeriods(database.db, adminId, zwolleId, list)
    await replaceClubNamePeriods(database.db, adminId, zwolleId, [line('PEC Oefenstad')])
    await removeClubNamePeriods(database.db, adminId, zwolleId)

    expect(await database.db.select().from(clubNames)).toHaveLength(2)
  })

  it('keeps one club one club: a match against the old name goes to the same club and makes no new one', async () => {
    await replaceClubNamePeriods(database.db, adminId, zwolleId, [
      line('FC Oefenstad'),
      line('PEC Oefenstad', { startSeason: '2012/13' }),
    ])

    const book = await createClubBook(database.db)
    const result = await book.resolve({ name: 'FC Oefenstad', page: null, season: '2011/12' })

    expect(result.id).toBe(zwolleId)
    expect(result.events).toEqual([])
    expect(await database.db.select().from(clubs)).toHaveLength(2)
    expect((await database.db.select().from(clubs).where(eq(clubs.id, zwolleId)))[0]?.name).toBe('PEC Oefenstad')
  })

  it('refuses a name of another club, as the importer would find it, and saves nothing', async () => {
    await database.db.insert(clubNames).values({ clubId: otherId, name: 'A.Z.' })

    const outcome = await replaceClubNamePeriods(database.db, adminId, zwolleId, [
      line('oefenstad az'),
      line('Eigen Naam', { startSeason: '2000/01' }),
      line('AZ', { startSeason: '2010/11' }),
    ])

    expect(outcome).toEqual({
      conflicts: [
        { club: 'Oefenstad AZ', index: 0, name: 'oefenstad az' },
        { club: 'Oefenstad AZ', index: 2, name: 'AZ' },
      ],
    })
    expect(await listClubNamePeriods(database.db, zwolleId)).toEqual([])
    expect(await database.db.select().from(clubNames)).toHaveLength(1)
    expect(await database.db.select().from(auditLog)).toEqual([])
  })

  it('does not call a name of its own club a conflict', async () => {
    await database.db.insert(clubNames).values({ clubId: zwolleId, name: 'P.E.C. Oefenstad' })

    expect(
      await replaceClubNamePeriods(database.db, adminId, zwolleId, [
        line('P.E.C. Oefenstad'),
        line('PEC Oefenstad', { startSeason: '2012/13' }),
      ]),
    ).toBe('saved')
    expect(await database.db.select().from(clubNames)).toHaveLength(1)
  })
})

describe('the table club_name_periods', () => {
  const insert = (values: Partial<typeof clubNamePeriods.$inferInsert>) =>
    database.db.insert(clubNamePeriods).values({ clubId: zwolleId, name: 'Naam', position: 0, ...values })

  it('lets the first name have no start, and no other name', async () => {
    await expect(insert({})).resolves.toBeDefined()
    await expect(insert({ position: 1 })).rejects.toBeDefined()
    await expect(insert({ position: 1, startSeason: '2020/21' })).resolves.toBeDefined()
    await expect(insert({ position: 2, startDay: '2021-02-14' })).resolves.toBeDefined()
  })

  it('refuses a start that is a season and a day, and a season that is not written as one', async () => {
    await expect(insert({ startDay: '2020-01-01', startSeason: '2020/21' })).rejects.toBeDefined()
    await expect(insert({ startSeason: '2020-21' })).rejects.toBeDefined()
  })

  it('refuses two lines at one place of a list', async () => {
    await insert({})
    await expect(insert({ name: 'Tweede' })).rejects.toBeDefined()
  })

  it('goes with its club', async () => {
    await replaceClubNamePeriods(database.db, adminId, zwolleId, list)
    await database.db.delete(clubs).where(eq(clubs.id, zwolleId))

    expect(await database.db.select().from(clubNamePeriods)).toEqual([])
  })
})

describe('listClubsWithNamePeriods', () => {
  it('has the clubs with an own list, each once', async () => {
    expect(await listClubsWithNamePeriods(database.db)).toEqual(new Set())

    await replaceClubNamePeriods(database.db, adminId, zwolleId, list)

    expect(await listClubsWithNamePeriods(database.db)).toEqual(new Set([zwolleId]))
  })
})

describe('removeClubNamePeriods', () => {
  it('takes the whole list away, and writes a row in the log with how many lines went', async () => {
    const now = new Date('2026-11-04T11:00:00Z')

    await replaceClubNamePeriods(database.db, adminId, zwolleId, list)

    expect(await removeClubNamePeriods(database.db, adminId, zwolleId, now)).toBe('done')
    expect(await listClubNamePeriods(database.db, zwolleId)).toEqual([])
    expect((await database.db.select().from(auditLog)).at(-1)).toMatchObject({
      action: 'club-name.reset',
      createdAt: now,
      detail: '3 regels weggehaald',
      itemId: zwolleId,
      userId: adminId,
    })
  })

  it('changes nothing and writes no row for a club without a list or one that is gone', async () => {
    expect(await removeClubNamePeriods(database.db, adminId, zwolleId)).toBe('none')
    expect(await removeClubNamePeriods(database.db, adminId, zwolleId + 1000)).toBe('missing')
    expect(await database.db.select().from(auditLog)).toEqual([])
  })
})

describe('the name of the season in the lists of matches', () => {
  const played = (opponent: string, matchDate: string, season: string, round: string): NewMatchWithoutClub => ({
    competition: 'Eredivisie',
    goalsAgainst: 0,
    goalsFor: 1,
    home: true,
    kickoffAt: new Date(`${matchDate}T18:45:00Z`),
    matchDate,
    opponent,
    round,
    season,
    status: 'played',
  })

  async function store() {
    // Wikipedia wrote the newest name in all of them, as it did for PEC Zwolle.
    await database.db
      .insert(matches)
      .values(
        await withClubs(database.db, [
          played('PEC Oefenstad', '2011-10-01', '2011/12', 'Ronde 1'),
          played('PEC Oefenstad', '2012-06-30', '2011/12', 'Ronde 2'),
          played('PEC Oefenstad', '2012-07-01', '2012/13', 'Ronde 3'),
        ]),
      )
  }

  it('shows the name that held on the day of the match, before, on and after a start with a season', async () => {
    await store()
    await replaceClubNamePeriods(database.db, adminId, zwolleId, [
      line('FC Oefenstad'),
      line('PEC Oefenstad', { startSeason: '2012/13' }),
    ])

    expect((await listClubMatches(database.db, zwolleId)).map((match) => match.opponent)).toEqual([
      'PEC Oefenstad',
      'FC Oefenstad',
      'FC Oefenstad',
    ])
    expect((await listSeasonMatches(database.db, '2011/12')).map((match) => match.opponent)).toEqual([
      'FC Oefenstad',
      'FC Oefenstad',
    ])
    expect((await listSeasonMatches(database.db, '2012/13')).map((match) => match.opponent)).toEqual(['PEC Oefenstad'])
  })

  it('switches on the day of a start with a day', async () => {
    await store()
    await replaceClubNamePeriods(database.db, adminId, zwolleId, [
      line('FC Oefenstad'),
      line('PEC Oefenstad', { startDay: '2012-06-30' }),
    ])

    expect((await listClubMatches(database.db, zwolleId)).map((match) => match.opponent)).toEqual([
      'PEC Oefenstad',
      'PEC Oefenstad',
      'FC Oefenstad',
    ])
  })

  it('shows the spelling of Wikipedia for a club without a list and for a match before the first start', async () => {
    await store()

    expect((await listClubMatches(database.db, zwolleId)).map((match) => match.opponent)).toEqual([
      'PEC Oefenstad',
      'PEC Oefenstad',
      'PEC Oefenstad',
    ])

    await replaceClubNamePeriods(database.db, adminId, zwolleId, [
      line('FC Oefenstad', { startSeason: '2011/12' }),
      line('Later', { startSeason: '2012/13' }),
    ])

    expect((await listClubMatches(database.db, zwolleId)).map((match) => match.opponent)).toEqual([
      'Later',
      'FC Oefenstad',
      'FC Oefenstad',
    ])
    await replaceClubNamePeriods(database.db, adminId, zwolleId, [line('FC Oefenstad', { startSeason: '2012/13' })])

    expect((await listClubMatches(database.db, zwolleId)).map((match) => match.opponent)).toEqual([
      'FC Oefenstad',
      'PEC Oefenstad',
      'PEC Oefenstad',
    ])
  })

  it('does not hand the club or the number of the match to the pages of a season', async () => {
    await store()

    expect(Object.keys((await listSeasonMatches(database.db, '2011/12'))[0] ?? {})).not.toContain('clubId')
  })

  it('does nothing for no rows', async () => {
    expect(await withSeasonNames(database.db, [])).toEqual([])
  })
})
