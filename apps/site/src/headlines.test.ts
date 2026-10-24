import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { db, listRecentItems } = vi.hoisted(() => ({ db: { name: 'db' }, listRecentItems: vi.fn() }))

vi.mock('@fansite/db/queries', () => ({ listRecentItems }))
vi.mock('./database', () => ({ getDatabase: () => ({ db }) }))

const minute = 60 * 1000

/** The cache lives in the module, so every test loads a module of its own, with an empty cache. */
async function loadHeadlines() {
  vi.resetModules()

  return (await import('./headlines')).getHeadlines
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
  it('asks the query for the news that starts at the first moment of the Dutch day thirteen days ago, up to now', async () => {
    await (
      await loadHeadlines()
    )()

    expect(listRecentItems).toHaveBeenCalledExactlyOnceWith(
      db,
      new Date('2026-10-08T22:00:00.000Z'),
      new Date('2026-10-22T12:30:00.000Z'),
    )
  })

  it('gives what the query gives', async () => {
    const items = [{ title: 'Kop' }]
    listRecentItems.mockResolvedValue(items)

    expect(await (await loadHeadlines())()).toBe(items)
  })

  it('asks the database once in five minutes, however many visits', async () => {
    const getHeadlines = await loadHeadlines()

    await getHeadlines()
    vi.advanceTimersByTime(4 * minute + 59_000)
    await getHeadlines()
    await getHeadlines()

    expect(listRecentItems).toHaveBeenCalledTimes(1)
  })

  it('asks again after five minutes, for the two weeks as they are by then', async () => {
    // 23:58 on Thursday 22 October in the Netherlands.
    vi.setSystemTime(new Date('2026-10-22T21:58:00Z'))
    const getHeadlines = await loadHeadlines()

    await getHeadlines()
    // Six minutes later it is just after midnight: a new day, so a new start of the two weeks.
    vi.advanceTimersByTime(6 * minute)
    await getHeadlines()

    expect(listRecentItems).toHaveBeenCalledTimes(2)
    expect(listRecentItems).toHaveBeenNthCalledWith(
      1,
      db,
      new Date('2026-10-08T22:00:00.000Z'),
      new Date('2026-10-22T21:58:00.000Z'),
    )
    expect(listRecentItems).toHaveBeenNthCalledWith(
      2,
      db,
      new Date('2026-10-09T22:00:00.000Z'),
      new Date('2026-10-22T22:04:00.000Z'),
    )
  })

  it('does not keep a load that fails, so the next visit tries again', async () => {
    const getHeadlines = await loadHeadlines()
    listRecentItems.mockRejectedValueOnce(new Error('connect ECONNREFUSED'))

    await expect(getHeadlines()).rejects.toThrow('connect ECONNREFUSED')
    await getHeadlines()

    expect(listRecentItems).toHaveBeenCalledTimes(2)
  })
})
