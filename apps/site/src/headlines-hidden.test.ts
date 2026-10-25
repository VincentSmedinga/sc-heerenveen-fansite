import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from './beheer/accounts'
import { hideItem, showItem } from './beheer/items'
import { addItem, addSource } from './beheer/test-items'

// The page of the admin tells the moderator that a hidden item "staat binnen vijf minuten niet meer op de site". This test
// reads the headlines of the homepage the way the homepage does, from a real database and its cache, and shows that
// it is true: the headlines are kept for five minutes, so the item is gone when the five minutes are over, and not a moment later.

vi.mock('./database', () => ({ getDatabase: () => database }))

const minute = 60 * 1000
const start = new Date('2026-10-26T12:00:00Z')

let database: TestDatabase
let userId: number
let itemId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  // Only the clock is fake, so the database keeps working.
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(start)
  vi.resetModules()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM sources')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'jelle@example.org', 'moderator')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0

  const ids = await addSource(database)

  itemId = await addItem(database, ids, 'een', { publishedAt: new Date(start.getTime() - 60 * minute) })
  await addItem(database, ids, 'twee', { publishedAt: new Date(start.getTime() - 120 * minute) })
})

afterEach(() => {
  vi.useRealTimers()
})

const titles = async (getHeadlines: (count: number) => Promise<{ headlines: { title: string }[] }>) =>
  (await getHeadlines(10)).headlines.map((item) => item.title)

describe('the headlines of the homepage', () => {
  it('lose a hidden item within five minutes, and no later', async () => {
    const { getHeadlines } = await import('./headlines')

    expect(await titles(getHeadlines)).toEqual(['Kop een', 'Kop twee'])

    await hideItem(database.db, userId, itemId, 'Fout in het bericht')

    // The list is in the memory of the server for five minutes, so the first moments it is still the old one.
    vi.setSystemTime(new Date(start.getTime() + 4 * minute + 59_000))
    expect(await titles(getHeadlines)).toEqual(['Kop een', 'Kop twee'])

    vi.setSystemTime(new Date(start.getTime() + 5 * minute))
    expect(await titles(getHeadlines)).toEqual(['Kop twee'])
  })

  it('get a hidden item back within five minutes of showing it', async () => {
    const { getHeadlines } = await import('./headlines')

    await hideItem(database.db, userId, itemId, 'Fout in het bericht')
    expect(await titles(getHeadlines)).toEqual(['Kop twee'])

    await showItem(database.db, userId, itemId)
    vi.setSystemTime(new Date(start.getTime() + 5 * minute))
    expect(await titles(getHeadlines)).toEqual(['Kop een', 'Kop twee'])
  })

  it('fill the list with visible items when an item on top is hidden', async () => {
    const { getHeadlines } = await import('./headlines')

    await hideItem(database.db, userId, itemId, 'Fout in het bericht')

    expect((await getHeadlines(10)).more).toBe(false)
    expect(await titles(getHeadlines)).toEqual(['Kop twee'])
  })
})

describe('the episodes of the podcasts', () => {
  it('lose a hidden episode within five minutes, and no later', async () => {
    const ids = await addSource(database, 'podcast.test', 'podcast')
    const episode = await addItem(database, ids, 'aflevering', { publishedAt: new Date(start.getTime() - 60 * minute) })
    const { getLatestEpisodes } = await import('./podcasts')

    expect((await getLatestEpisodes()).map((item) => item.title)).toEqual(['Kop aflevering'])

    await hideItem(database.db, userId, episode, 'Op verzoek van de bron')

    vi.setSystemTime(new Date(start.getTime() + 4 * minute + 59_000))
    expect((await getLatestEpisodes()).map((item) => item.title)).toEqual(['Kop aflevering'])

    vi.setSystemTime(new Date(start.getTime() + 5 * minute))
    expect(await getLatestEpisodes()).toEqual([])
  })
})
