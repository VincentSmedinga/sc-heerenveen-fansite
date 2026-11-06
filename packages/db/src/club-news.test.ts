import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { listClubNews } from './queries.ts'
import { feeds, itemClubs, items, sources } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase
let sourceId: number
let feedId: number
let number = 0

const until = new Date('2026-11-06T12:00:00Z')

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM sources')

  const [source] = await database.db
    .insert(sources)
    .values({ attribution: 'De Testkrant', domain: 'testkrant.test', kind: 'news', name: 'Testkrant' })
    .$returningId()

  sourceId = source?.id ?? 0

  const [feed] = await database.db.insert(feeds).values({ sourceId, url: 'https://testkrant.test/rss/' }).$returningId()

  feedId = feed?.id ?? 0
})

/** Stores a headline that names the clubs, `minute` minutes after midnight on 5 November. */
async function store(title: string, clubs: string[], minute: number, more: Partial<typeof items.$inferInsert> = {}) {
  number++

  const [row] = await database.db
    .insert(items)
    .values({
      feedId,
      key: `kop-${number}`,
      publishedAt: new Date(Date.UTC(2026, 10, 5, 0, minute)),
      relevance: 'relevant',
      sourceId,
      title,
      url: `https://testkrant.test/kop-${number}`,
      ...more,
    })
    .$returningId()

  if (clubs.length > 0) {
    await database.db.insert(itemClubs).values(clubs.map((club) => ({ club, itemId: row?.id ?? 0 })))
  }
}

describe('listClubNews', () => {
  it('gives the newest headlines that name the club, newest first, with the credit of the source', async () => {
    await store('Oud nieuws over Ajax', ['Ajax'], 1)
    await store('Nieuw nieuws over Ajax', ['Ajax'], 3)
    await store('Over een andere club', ['FC Twente'], 5)

    expect(await listClubNews(database.db, { limit: 5, names: ['Ajax'], until })).toEqual([
      expect.objectContaining({ sourceName: 'De Testkrant', title: 'Nieuw nieuws over Ajax' }),
      expect.objectContaining({ title: 'Oud nieuws over Ajax' }),
    ])
  })

  it('gives only the fields the card shows', async () => {
    await store('Kop over Ajax', ['Ajax'], 1)

    const [row] = await listClubNews(database.db, { limit: 5, names: ['Ajax'], until })

    expect(Object.keys(row ?? {}).toSorted()).toEqual(['paywalled', 'publishedAt', 'sourceName', 'title', 'url'])
  })

  it('stops at the limit and gives fewer when there are fewer', async () => {
    for (let minute = 1; minute <= 7; minute++) {
      await store(`Kop ${minute} over Ajax`, ['Ajax'], minute)
    }

    const five = await listClubNews(database.db, { limit: 5, names: ['Ajax'], until })

    expect(five.map((row) => row.title)).toEqual([
      'Kop 7 over Ajax',
      'Kop 6 over Ajax',
      'Kop 5 over Ajax',
      'Kop 4 over Ajax',
      'Kop 3 over Ajax',
    ])
    expect(await listClubNews(database.db, { limit: 5, names: ['Nooit gehoord'], until })).toEqual([])
  })

  it('finds a headline under any of the names of the club, once', async () => {
    await store('Oude naam in de kop', ['Alkmaar'], 1)
    await store('Nieuwe naam in de kop', ['AZ Alkmaar'], 2)
    await store('Beide namen in de kop', ['Alkmaar', 'AZ Alkmaar'], 3)

    const found = await listClubNews(database.db, { limit: 5, names: ['AZ Alkmaar', 'Alkmaar'], until })

    expect(found.map((row) => row.title)).toEqual([
      'Beide namen in de kop',
      'Nieuwe naam in de kop',
      'Oude naam in de kop',
    ])
  })

  it('gives a headline that names more clubs to each of them', async () => {
    await store('Ajax tegen Feyenoord', ['Ajax', 'Feyenoord'], 1)

    expect(await listClubNews(database.db, { limit: 5, names: ['Ajax'], until })).toHaveLength(1)
    expect(await listClubNews(database.db, { limit: 5, names: ['Feyenoord'], until })).toHaveLength(1)
  })

  it('leaves out a hidden headline and one that is not relevant', async () => {
    await store('Zichtbaar over Ajax', ['Ajax'], 1)
    await store('Verborgen over Ajax', ['Ajax'], 2, { hiddenAt: new Date('2026-11-05T10:00:00Z') })
    await store('Niet relevant over Ajax', ['Ajax'], 3, { relevance: 'irrelevant' })

    expect((await listClubNews(database.db, { limit: 5, names: ['Ajax'], until })).map((row) => row.title)).toEqual([
      'Zichtbaar over Ajax',
    ])
  })

  it('leaves out a headline from after now, a switched-off source and a headline without a club', async () => {
    await store('Uit de toekomst over Ajax', ['Ajax'], 1, { publishedAt: new Date('2026-11-07T00:00:00Z') })
    await store('Zonder club', [], 2)
    await store('Zichtbaar over Ajax', ['Ajax'], 3)
    await database.pool.query('UPDATE sources SET enabled = false')

    expect(await listClubNews(database.db, { limit: 5, names: ['Ajax'], until })).toEqual([])
  })

  it('gives nothing for a club without names', async () => {
    await store('Kop over Ajax', ['Ajax'], 1)

    expect(await listClubNews(database.db, { limit: 5, names: [], until })).toEqual([])
  })
})
