import type { TestDatabase } from '@fansite/db/test-database'

import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { addItem, addSource } from './beheer/test-items'

// The importer keeps the items it finds doubtful or not about the club (#74), and no page may
// show them. This reads the headlines and the episodes the way the pages do, from a real
// database.

vi.mock('./database', () => ({ getDatabase: () => database }))

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  vi.resetModules()
  await database.pool.query('DELETE FROM sources')
})

describe('the headlines of the homepage', () => {
  it('hold relevant items only, however new the others are', async () => {
    const ids = await addSource(database)

    await addItem(database, ids, 'twijfel', { publishedAt: new Date('2026-10-20T12:00:00Z'), relevance: 'doubtful' })
    await addItem(database, ids, 'elders', { publishedAt: new Date('2026-10-20T11:00:00Z'), relevance: 'irrelevant' })
    await addItem(database, ids, 'club', { publishedAt: new Date('2026-10-20T10:00:00Z') })

    const { getHeadlines } = await import('./headlines')
    const headlines = await getHeadlines()

    expect(headlines.map((item) => item.title)).toEqual(['Kop club'])
  })
})

describe('the podcast episodes', () => {
  it('hold relevant episodes only', async () => {
    const ids = await addSource(database, 'podcast.test', 'podcast')

    await addItem(database, ids, 'twijfel', { publishedAt: new Date('2026-10-20T12:00:00Z'), relevance: 'doubtful' })
    await addItem(database, ids, 'club', { publishedAt: new Date('2026-10-20T10:00:00Z') })

    const { getLatestEpisodes, getPodcastPage } = await import('./podcasts')

    expect((await getLatestEpisodes()).map((episode) => episode.title)).toEqual(['Kop club'])
    expect((await getPodcastPage([], 1))?.episodes.map((episode) => episode.title)).toEqual(['Kop club'])
  })
})
