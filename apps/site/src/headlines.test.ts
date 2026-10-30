import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { db, listRecentItems } = vi.hoisted(() => ({ db: { name: 'db' }, listRecentItems: vi.fn() }))

vi.mock('@fansite/db/queries', () => ({ listRecentItems }))
vi.mock('./database', () => ({ getDatabase: () => ({ db }) }))

const minute = 60 * 1000

/**
 * The cache lives in the module, so every test loads a module of its own, with an empty cache.
 */
async function loadHeadlines() {
  vi.resetModules()

  return import('./headlines')
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-22T12:30:00Z'))
  listRecentItems.mockReset()
  listRecentItems.mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getHeadlines', () => {
  it('asks the query for the ten newest headlines, up to now, with no start in time', async () => {
    const { getHeadlines } = await loadHeadlines()

    await getHeadlines()

    expect(listRecentItems).toHaveBeenCalledExactlyOnceWith(db, {
      limit: 10,
      until: new Date('2026-10-22T12:30:00.000Z'),
    })
  })

  it('gives what the query gives, and nothing when the sources have none', async () => {
    const found = [{ title: 'Kop 1' }, { title: 'Kop 2' }]
    const { getHeadlines } = await loadHeadlines()

    listRecentItems.mockResolvedValueOnce(found)
    expect(await getHeadlines()).toEqual(found)

    vi.advanceTimersByTime(5 * minute)
    listRecentItems.mockResolvedValueOnce([])
    expect(await getHeadlines()).toEqual([])
  })

  it('asks the database once in five minutes, however many visits', async () => {
    const { getHeadlines } = await loadHeadlines()

    await getHeadlines()
    vi.advanceTimersByTime(4 * minute + 59_000)
    await getHeadlines()
    await getHeadlines()

    expect(listRecentItems).toHaveBeenCalledTimes(1)
  })

  it('asks again after five minutes, up to the moment of then', async () => {
    const { getHeadlines } = await loadHeadlines()

    await getHeadlines()
    vi.advanceTimersByTime(5 * minute)
    await getHeadlines()

    expect(listRecentItems).toHaveBeenCalledTimes(2)
    expect(listRecentItems).toHaveBeenNthCalledWith(2, db, {
      limit: 10,
      until: new Date('2026-10-22T12:35:00.000Z'),
    })
  })

  it('does not keep a load that fails, so the next visit tries again', async () => {
    const { getHeadlines } = await loadHeadlines()
    listRecentItems.mockRejectedValueOnce(new Error('connect ECONNREFUSED'))

    await expect(getHeadlines()).rejects.toThrow('connect ECONNREFUSED')
    await getHeadlines()

    expect(listRecentItems).toHaveBeenCalledTimes(2)
  })
})
