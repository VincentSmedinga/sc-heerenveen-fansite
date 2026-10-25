import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { db, findNewestArticle, findPublishedArticle } = vi.hoisted(() => ({
  db: { name: 'db' },
  findNewestArticle: vi.fn(),
  findPublishedArticle: vi.fn(),
}))

vi.mock('@fansite/db/queries', () => ({ findNewestArticle, findPublishedArticle }))
vi.mock('./database', () => ({ getDatabase: () => ({ db }) }))

import { getArticle, getNewestArticle } from './articles'

const now = new Date('2026-10-26T12:00:00Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  findNewestArticle.mockReset()
  findPublishedArticle.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getNewestArticle', () => {
  it('asks for the newest article published until now, and asks again on every call', async () => {
    findNewestArticle.mockResolvedValue({ slug: 'wie-zijn-wij' })

    await getNewestArticle()
    await getNewestArticle()

    expect(findNewestArticle).toHaveBeenCalledTimes(2)
    expect(findNewestArticle).toHaveBeenCalledWith(db, now)
  })

  it('gives what the query gives, also nothing', async () => {
    findNewestArticle.mockResolvedValue(undefined)

    expect(await getNewestArticle()).toBeUndefined()
  })
})

describe('getArticle', () => {
  it('asks for the article with the slug, published until now', async () => {
    findPublishedArticle.mockResolvedValue({ slug: 'wie-zijn-wij' })

    expect(await getArticle('wie-zijn-wij')).toEqual({ slug: 'wie-zijn-wij' })
    expect(findPublishedArticle).toHaveBeenCalledWith(db, 'wie-zijn-wij', now)
  })

  it.each([
    '',
    'Wie-zijn-wij',
    'wie_zijn_wij',
    '-wie',
    'wie-',
    'wie--zijn',
    'wie zijn',
    '../wie',
    'a'.repeat(81),
    '%00',
    "x'; DROP TABLE articles; --",
  ])('does not ask the database for the address %j, which cannot be a slug', async (slug) => {
    expect(await getArticle(slug)).toBeUndefined()
    expect(findPublishedArticle).not.toHaveBeenCalled()
  })

  it('lets an error of the database through, for the page to handle', async () => {
    findPublishedArticle.mockRejectedValue(new Error('connection lost'))

    await expect(getArticle('wie-zijn-wij')).rejects.toThrow('connection lost')
  })
})
