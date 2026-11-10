import type { TestDatabase } from '@fansite/db/test-database'

import { personPages, persons, players } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TitleAnswer, TitleLookup } from './old-site-persons.ts'

import { importOldSitePersons, linkPersonsByName, wikipediaTitleLookup } from './old-site-persons.ts'
import { pageUrl } from './read-wikipedia.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.db.delete(players)
  await database.db.delete(personPages)
  await database.db.delete(persons)
})

/** A lookup with fixed answers that remembers what it was asked. */
function fake(answers: Record<string, TitleAnswer>): { asked: string[]; lookup: TitleLookup } {
  const asked: string[] = []

  return {
    asked,
    lookup: async (title) => {
      asked.push(title)

      return answers[title] ?? { kind: 'missing' }
    },
  }
}

const row = (season: string, name: string, extra: Partial<typeof players.$inferInsert> = {}) => ({
  inSquad: true,
  name,
  searchTerm: name.split(' ').at(-1)!,
  season,
  source: 'verslag' as const,
  ...extra,
})

const stored = () => database.db.select().from(players).orderBy(asc(players.id))

describe('the step personen', () => {
  it('links a footballer to a person and gives every season of the name the same person', async () => {
    await database.db.insert(players).values([row('1990/91', 'Ger Dijk'), row('1991/92', 'Ger Dijk')])

    const { asked, lookup } = fake({ 'Ger Dijk': { article: 'Ger Dijk', kind: 'footballer' } })
    const report = await importOldSitePersons(database.db, lookup)
    const rows = await stored()

    expect(asked).toEqual(['Ger Dijk'])
    expect(report).toMatchObject({ changed: 2, skipped: 0, unchanged: 0 })
    expect(rows[0]!.personId).not.toBeNull()
    expect(rows[1]!.personId).toBe(rows[0]!.personId)
    expect((await database.db.select().from(persons)).map((person) => person.wikipediaPage)).toEqual(['Ger Dijk'])
  })

  it('follows a redirect to the article and remembers the title', async () => {
    await database.db.insert(players).values(row('1990/91', 'Gerrie Dijk'))
    await importOldSitePersons(database.db, fake({ 'Gerrie Dijk': { article: 'Ger Dijk', kind: 'footballer' } }).lookup)

    expect((await database.db.select().from(persons)).map((person) => person.wikipediaPage)).toEqual(['Ger Dijk'])
    expect((await database.db.select().from(personPages)).map((page) => page.page).toSorted()).toEqual([
      'Ger Dijk',
      'Gerrie Dijk',
    ])
  })

  it('gives a player the person of a row of another season, without asking', async () => {
    const [{ insertId }] = await database.db.insert(persons).values({ wikipediaPage: 'Ronald Koeman' })

    await database.db
      .insert(players)
      .values([
        row('2005/06', 'Ronald Koeman', { personId: insertId, source: 'selectie' }),
        row('1999/00', 'Ronald Koeman'),
      ])

    const { asked, lookup } = fake({})
    const report = await importOldSitePersons(database.db, lookup)

    expect(asked).toEqual([])
    expect(report.changed).toBe(1)
    expect((await stored())[1]!.personId).toBe(insertId)
  })

  it.each([
    ['disambiguation', 'the title is a disambiguation page'],
    ['not-a-footballer', 'the article is not about a footballer'],
  ] as const)('links nothing on %s and says why', async (kind, reason) => {
    await database.db.insert(players).values(row('1990/91', 'Jan Jansen'))

    const report = await importOldSitePersons(database.db, fake({ 'Jan Jansen': { kind } }).lookup)

    expect(report).toMatchObject({ changed: 0, skipped: 1 })
    expect(report.lines).toContain(`no person for 'Jan Jansen' (1 row): ${reason}`)
    expect((await stored())[0]!.personId).toBeNull()
    expect(await database.db.select().from(persons)).toEqual([])
  })

  it('makes a person on the name alone for a name without an article, the same one in every season', async () => {
    await database.db
      .insert(players)
      .values([row('1990/91', 'Piet van der Poel'), row('1991/92', 'Piet van der Poel'), row('1991/92', 'Dinho')])

    const report = await importOldSitePersons(database.db, fake({}).lookup)
    const rows = await stored()

    expect(report).toMatchObject({ changed: 3, created: 2, skipped: 0 })
    expect(rows[0]!.personId).not.toBeNull()
    expect(rows[1]!.personId).toBe(rows[0]!.personId)
    expect(rows[2]!.personId).not.toBe(rows[0]!.personId)
    expect(await database.db.select().from(persons).orderBy(asc(persons.name))).toMatchObject([
      { familyName: 'Dinho', givenName: null, name: 'Dinho', wikipediaPage: null },
      {
        familyName: 'Poel',
        familyNamePrefix: 'van der',
        givenName: 'Piet',
        name: 'Piet van der Poel',
        nameSource: 'guess',
        wikipediaPage: null,
      },
    ])
    expect(await database.db.select().from(personPages)).toEqual([])
  })

  it('leaves a row alone that the caller says waits, and rows outside the scope', async () => {
    await database.db
      .insert(players)
      .values([row('1990/91', 'Jan Jansen'), row('1990/91', 'Piet Poel'), row('1991/92', 'Ger Dijk')])

    const { asked, lookup } = fake({})
    const report = await linkPersonsByName(database.db, lookup, eq(players.season, '1990/91'), new Set(['jan jansen']))

    expect(asked).toEqual(['Piet Poel'])
    expect(report).toMatchObject({ changed: 1 })
    expect((await stored()).map((one) => one.personId === null)).toEqual([true, false, true])
  })

  it('links nothing when the lookup could not ask', async () => {
    await database.db.insert(players).values(row('1990/91', 'Jan Jansen'))

    const report = await importOldSitePersons(
      database.db,
      fake({ 'Jan Jansen': { kind: 'unknown', message: 'x' } }).lookup,
    )

    expect(report.lines).toContain("no person for 'Jan Jansen' (1 row): not asked: x")
  })

  it('changes nothing in a second run and never touches another source', async () => {
    await database.db
      .insert(players)
      .values([row('1990/91', 'Ger Dijk'), row('1990/91', 'Piet Poel', { source: 'selectie' })])

    const { lookup } = fake({ 'Ger Dijk': { article: 'Ger Dijk', kind: 'footballer' } })

    await importOldSitePersons(database.db, lookup)

    const before = await stored()
    const second = fake({ 'Piet Poel': { article: 'Piet Poel', kind: 'footballer' } })
    const report = await importOldSitePersons(database.db, second.lookup)

    expect(report).toMatchObject({ changed: 0, skipped: 0, unchanged: 1 })
    expect(second.asked).toEqual([])
    expect(await stored()).toEqual(before)
    expect(before[1]!.personId).toBeNull()
  })
})

describe('wikipediaTitleLookup', () => {
  const page = (category: string) => `Tekst.\n[[Categorie:${category}]]`

  it('reads the answer from the text of the page, with a redirect on the way', async () => {
    const path = (title: string) => pageUrl('', title)
    const server = await startServer({
      [path('Ger Dijk')]: reply(200, page('Nederlands voetballer')),
      [path('Gerrie Dijk')]: reply(200, '#REDIRECT [[Ger Dijk]]'),
      [path('Jan Jansen')]: reply(200, '{{dp}}\n'),
      [path('Piet Poel')]: reply(200, page('Nederlands schaker')),
    })

    try {
      const lookup = wikipediaTitleLookup(fetcherFor([server]), server.origin, 0)

      expect(await lookup('Gerrie Dijk')).toEqual({ article: 'Ger Dijk', kind: 'footballer' })
      expect(await lookup('Jan Jansen')).toEqual({ kind: 'disambiguation' })
      expect(await lookup('Piet Poel')).toEqual({ kind: 'not-a-footballer' })
      expect(await lookup('Niemand')).toEqual({ kind: 'missing' })
    } finally {
      await server.close()
    }
  })
})
