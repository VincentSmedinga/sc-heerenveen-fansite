import type { TestDatabase } from '@fansite/db/test-database'

import { feeds, itemClubs, items, sources } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { recalculateItemClubs, runItemClubsCommand, syncItemClubs } from './store-item-clubs.ts'

let database: TestDatabase
let sourceId: number
let feedId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM sources')
  ;[{ id: sourceId }] = (await database.db
    .insert(sources)
    .values({ domain: 'krant.test', kind: 'news', name: 'Krant' })
    .$returningId()) as [{ id: number }]
  ;[{ id: feedId }] = (await database.db
    .insert(feeds)
    .values({ filter: 'none', sourceId, url: 'https://krant.test/rss/' })
    .$returningId()) as [{ id: number }]
})

async function addItem(key: string, title: string) {
  const [{ id }] = (await database.db
    .insert(items)
    .values({
      feedId,
      key,
      publishedAt: new Date('2026-10-20T10:00:00Z'),
      sourceId,
      title,
      url: `https://krant.test/${key}`,
    })
    .$returningId()) as [{ id: number }]

  return id
}

const stored = async () =>
  (await database.db.select().from(itemClubs).orderBy(itemClubs.itemId, itemClubs.club)).map(
    (row) => `${row.itemId}:${row.club}`,
  )

describe('syncItemClubs', () => {
  it('adds a row for each club of a title, none for a title without a club', async () => {
    const one = await addItem('een', 'Feyenoord en Ajax')
    const two = await addItem('twee', 'sc Heerenveen wint')

    expect(
      await syncItemClubs(database.db, [
        { id: one, title: 'Feyenoord en Ajax' },
        { id: two, title: 'sc Heerenveen wint' },
      ]),
    ).toEqual({ added: 2, items: 2, removed: 0 })
    expect(await stored()).toEqual([`${one}:Ajax`, `${one}:Feyenoord`])
  })

  it('follows a new title: the club that is gone goes, the new one comes, the rest stays', async () => {
    const id = await addItem('een', 'Feyenoord en Ajax')

    await syncItemClubs(database.db, [{ id, title: 'Feyenoord en Ajax' }])

    expect(await syncItemClubs(database.db, [{ id, title: 'Ajax en PSV' }])).toEqual({
      added: 1,
      items: 1,
      removed: 1,
    })
    expect(await stored()).toEqual([`${id}:Ajax`, `${id}:PSV`])
  })

  it('writes nothing the second time', async () => {
    const id = await addItem('een', 'Feyenoord wint')

    await syncItemClubs(database.db, [{ id, title: 'Feyenoord wint' }])

    expect(await syncItemClubs(database.db, [{ id, title: 'Feyenoord wint' }])).toEqual({
      added: 0,
      items: 1,
      removed: 0,
    })
  })

  it('goes with the item', async () => {
    const id = await addItem('een', 'Feyenoord wint')

    await syncItemClubs(database.db, [{ id, title: 'Feyenoord wint' }])
    await database.pool.query('DELETE FROM items')

    expect(await stored()).toEqual([])
  })
})

describe('recalculateItemClubs', () => {
  it('gives the items that were there before the table their rows, a batch at a time', async () => {
    const ids: number[] = []

    for (let index = 0; index < 3; index++) {
      ids.push(await addItem(`k${index}`, index === 1 ? 'Een kop zonder club' : 'Vitesse wint'))
    }

    expect(await recalculateItemClubs(database.db)).toEqual([
      'Item clubs: 3 items checked, 2 rows added, 0 rows removed.',
    ])
    expect(await stored()).toEqual([`${ids[0]}:Vitesse`, `${ids[2]}:Vitesse`])
    expect(await recalculateItemClubs(database.db)).toEqual([
      'Item clubs: 3 items checked, 0 rows added, 0 rows removed.',
    ])
  })
})

describe('runItemClubsCommand', () => {
  it('writes the line of the pass and returns 0', async () => {
    await addItem('een', 'Vitesse wint')

    const lines: string[] = []

    expect(await runItemClubsCommand(database.url, { write: (line) => lines.push(line) })).toBe(0)
    expect(lines).toEqual(['Item clubs: 1 items checked, 1 rows added, 0 rows removed.'])
  })
})
