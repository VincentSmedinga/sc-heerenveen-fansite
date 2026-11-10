import type { Person } from '@fansite/db/schema'
import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, auditLog, personPages, persons, players, squadCompleteness } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createAccount } from './accounts'
import { personLabels } from './person-labels'
import { defaultKept, describeMerge, findMerge, mergeDifferences, mergePersons, personFacts } from './person-merge'

let database: TestDatabase
let userId: number
let old: number
let renamed: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const t0 = new Date('2026-11-10T12:00:00Z')

// A made-up player who changed his name: a person under the old name with one season, and a
// person under the new name with the seasons after it.
beforeEach(async () => {
  for (const table of ['audit_log', 'squad_completeness', 'matches', 'players', 'persons']) {
    await database.pool.query(`DELETE FROM ${table}`)
  }

  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  ;[{ insertId: old }] = await database.db.insert(persons).values({
    birthDate: '1999-03-01',
    birthDatePrecision: 'month',
    line: 'aanvaller',
    lineSource: 'manual',
    name: 'Oude Naam',
    wikidataId: 'Q900001',
    wikipediaPage: 'Oude Naam (voetballer)',
  })
  ;[{ insertId: renamed }] = await database.db.insert(persons).values({
    country: 'NL',
    countrySource: 'wikidata',
    line: 'middenvelder',
    lineSource: 'wikidata',
    name: 'Nieuwe Naam',
    wikipediaPage: 'Nieuwe Naam',
  })
  await database.db.insert(personPages).values([
    { page: 'Oude Naam (voetballer)', personId: old },
    { page: 'Nieuwe Naam', personId: renamed },
  ])
  await database.db.insert(players).values([
    { name: 'Oude Naam', personId: old, searchTerm: 'Naam', season: '2020/21', shirtNumber: 9 },
    { name: 'Nieuwe Naam', personId: renamed, searchTerm: 'Naam', season: '2021/22' },
    { name: 'Nieuwe Naam', personId: renamed, searchTerm: 'Naam', season: '2022/23' },
  ])
})

const person = (values: Partial<Person>) => ({ englishTitle: false, id: 1, wikipediaPage: null, ...values }) as Person

describe('defaultKept', () => {
  it('keeps the person with a Dutch article, and of two alike the oldest', () => {
    const dutch = person({ id: 9, wikipediaPage: 'Nieuwe Naam' })
    const english = person({ englishTitle: true, id: 2, wikipediaPage: 'New Name' })
    const untitled = person({ id: 1 })

    expect(defaultKept(untitled, dutch)).toBe(9)
    expect(defaultKept(dutch, english)).toBe(9)
    expect(defaultKept(english, untitled)).toBe(1)
    expect(defaultKept(dutch, person({ id: 4, wikipediaPage: 'Oude Naam' }))).toBe(4)
  })
})

describe('personLabels', () => {
  it('names two persons, and tells two of one name apart by their number', () => {
    expect(personLabels(person({ id: 1, name: 'Oude Naam' }), person({ id: 2, wikipediaPage: 'Nieuwe Naam' }))).toEqual(
      ['Oude Naam', 'Nieuwe Naam'],
    )
    expect(personLabels(person({ id: 1, name: 'Jan Vos' }), person({ id: 2, name: 'Jan Vos' }))).toEqual([
      'Jan Vos (persoon 1)',
      'Jan Vos (persoon 2)',
    ])
    expect(personLabels(person({ id: 1 }), person({ id: 2 }))).toEqual(['persoon 1', 'persoon 2'])
  })
})

describe('findMerge', () => {
  it('keeps the person the editor chose, and the default for anything else', async () => {
    // Both have a Dutch article, so the oldest stays by default.
    expect(await findMerge(database.db, renamed, old)).toMatchObject({ kept: { id: old }, other: { id: renamed } })
    expect(await findMerge(database.db, old, renamed, renamed)).toMatchObject({ kept: { id: renamed } })
    expect(await findMerge(database.db, old, renamed, 999_999)).toMatchObject({ kept: { id: old } })
  })

  it('says so for one person twice and for a person who is not there', async () => {
    expect(await findMerge(database.db, old, old)).toBe('same')
    expect(await findMerge(database.db, old, 999_999)).toBe('missing')
  })

  it('names what the two do not share, with the source and what stays', async () => {
    const plan = await findMerge(database.db, old, renamed, renamed)

    expect(plan).not.toBeTypeOf('string')
    expect(personFacts((plan as Exclude<typeof plan, string>).other)).toEqual([
      { label: 'Naam', value: 'Oude Naam' },
      { label: 'Wikipedia-pagina', value: 'Oude Naam (voetballer)' },
      { label: 'Wikidata', value: 'Q900001' },
      { label: 'Linie', value: 'aanvaller (redactie)' },
      { label: 'Land', value: 'geen' },
      { label: 'Geboortedatum', value: 'maart 1999' },
    ])
    expect(mergeDifferences(plan as Exclude<typeof plan, string>)).toEqual([
      { kept: 'Nieuwe Naam', label: 'Naam', other: 'Oude Naam', result: 'Nieuwe Naam' },
      {
        kept: 'Nieuwe Naam',
        label: 'Wikipedia-pagina',
        other: 'Oude Naam (voetballer)',
        result: 'Nieuwe Naam',
      },
      { kept: 'geen', label: 'Wikidata', other: 'Q900001', result: 'Q900001' },
      // The line of the editors goes before the line of Wikidata.
      {
        kept: 'middenvelder (Wikidata)',
        label: 'Linie',
        other: 'aanvaller (redactie)',
        result: 'aanvaller (redactie)',
      },
      { kept: 'Nederland (NL) (Wikidata)', label: 'Land', other: 'geen', result: 'Nederland (NL) (Wikidata)' },
      { kept: 'geen', label: 'Geboortedatum', other: 'maart 1999', result: 'maart 1999' },
    ])
  })
})

describe('mergePersons', () => {
  it('merges with the function of the importer and writes one row of the log that says what moved', async () => {
    const [row] = await database.db.select().from(players).orderBy(asc(players.season))

    expect(await mergePersons(database.db, userId, { keptId: renamed, otherId: old }, t0)).toMatchObject({
      rows: [{ season: '2020/21' }],
    })
    expect(await database.db.select().from(persons)).toMatchObject([
      { id: renamed, line: 'aanvaller', lineSource: 'manual', name: 'Nieuwe Naam', wikidataId: 'Q900001' },
    ])
    expect(await database.db.select().from(players).orderBy(asc(players.season))).toMatchObject([
      { personId: renamed, season: '2020/21' },
      { personId: renamed, season: '2021/22' },
      { personId: renamed, season: '2022/23' },
    ])
    expect(await database.db.select().from(personPages).orderBy(asc(personPages.page))).toEqual([
      { page: 'Nieuwe Naam', personId: renamed },
      { page: 'Oude Naam (voetballer)', personId: renamed },
    ])
    expect(await database.db.select().from(auditLog)).toEqual([
      {
        action: 'person.merge',
        createdAt: t0,
        detail: `Samengevoegd: persoon ${old} (Oude Naam, Wikipedia: Oude Naam (voetballer)) in persoon ${renamed} (Nieuwe Naam, Wikipedia: Nieuwe Naam). Verdwenen: naam Oude Naam, wikipedia-pagina Oude Naam (voetballer), linie middenvelder (Wikidata). Verhuisd: 0 doelpunten, 0 wedstrijdoptredens, 1 waarde van de redactie, spelersrijen: ${row?.id} (2020/21), titels: Oude Naam (voetballer).`,
        id: expect.any(Number),
        itemId: renamed,
        reason: null,
        userId,
      },
    ])
  })

  it('makes two rows of one season one row, names them in the log and rates the season again', async () => {
    await database.db
      .insert(players)
      .values({ name: 'Oude Naam', personId: old, searchTerm: 'Naam', season: '2021/22', shirtNumber: 14 })

    const rows = await database.db.select().from(players).orderBy(asc(players.id))
    const stays = rows.find((row) => row.season === '2021/22' && row.personId === renamed)
    const gone = rows.find((row) => row.season === '2021/22' && row.personId === old)
    const plan = await mergePersons(database.db, userId, { keptId: renamed, otherId: old }, t0)

    expect(plan).toMatchObject({ doubles: [{ gone: { id: gone?.id }, season: '2021/22', stays: { id: stays?.id } }] })
    expect(describeMerge(plan as Exclude<typeof plan, string>)).toContain(
      `Eén rij geworden: ${gone?.id} (Oude Naam, 2021/22) in ${stays?.id}.`,
    )
    expect(
      (await database.db.select().from(players).orderBy(asc(players.season))).map((row) => [
        row.season,
        row.name,
        row.shirtNumber,
      ]),
    ).toEqual([
      ['2020/21', 'Oude Naam', 9],
      // The row that stays gets the number it lacked.
      ['2021/22', 'Nieuwe Naam', 14],
      ['2022/23', 'Nieuwe Naam', null],
    ])
    expect(await database.db.select({ season: squadCompleteness.season }).from(squadCompleteness)).toEqual([
      { season: '2021/22' },
    ])
  })

  it('names what went before the lists, so a long line of the log does not cut it off', async () => {
    const plan = await findMerge(database.db, old, renamed, renamed)
    const detail = describeMerge(plan as Exclude<typeof plan, string>)

    expect(detail.indexOf('Verdwenen:')).toBeLessThan(detail.indexOf('Verhuisd:'))
    expect(detail.indexOf('Verdwenen:')).toBeGreaterThan(0)
  })

  it('writes nothing for one person twice or a person who is gone', async () => {
    expect(await mergePersons(database.db, userId, { keptId: old, otherId: old })).toBe('same')
    expect(await mergePersons(database.db, userId, { keptId: old, otherId: 999_999 })).toBe('missing')
    expect(await database.db.select().from(persons)).toHaveLength(2)
    expect(await database.db.select().from(auditLog)).toEqual([])
  })
})
