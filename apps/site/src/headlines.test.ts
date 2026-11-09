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
  it('asks the query for the twenty newest headlines, up to now, with no start in time', async () => {
    const { getHeadlines } = await loadHeadlines()

    await getHeadlines()

    expect(listRecentItems).toHaveBeenCalledExactlyOnceWith(db, {
      limit: 20,
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
      limit: 20,
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

const hour = 60 * minute
const clock = new Date('2026-10-22T12:30:00Z')

/** Headlines of a made-up source, each published the given number of hours before the clock. */
const aged = (...hours: number[]) =>
  hours.map((ago, index) => ({
    paywalled: false,
    publishedAt: new Date(clock.getTime() - ago * hour),
    sourceName: 'Testkrant',
    title: `Kop ${index + 1}`,
    url: `https://testkrant.test/${index + 1}`,
  }))

describe('headlinesOfTheWindow', () => {
  it('takes every headline of the last 72 hours, including one of exactly 72 hours old', async () => {
    const { headlinesOfTheWindow } = await loadHeadlines()
    const result = headlinesOfTheWindow(aged(1, 10, 30, 50, 60, 70, 72, 72.01, 100), clock)

    expect(result.items.map((item) => item.title)).toEqual(aged(1, 10, 30, 50, 60, 70, 72).map((item) => item.title))
  })

  it('tops up to the 5 newest headlines, however old, and shows all there are when there are fewer', async () => {
    const { headlinesOfTheWindow } = await loadHeadlines()

    expect(headlinesOfTheWindow(aged(1, 80, 100, 120, 150, 200, 300), clock).items).toHaveLength(5)
    expect(headlinesOfTheWindow(aged(1, 80, 100), clock).items).toHaveLength(3)
    expect(headlinesOfTheWindow([], clock)).toEqual({ days: 1, items: [] })
  })

  it('cuts the list at the 20 newest headlines', async () => {
    const { headlinesOfTheWindow } = await loadHeadlines()
    const result = headlinesOfTheWindow(aged(...Array.from({ length: 30 }, (_, index) => index + 1)), clock)

    expect(result.items).toHaveLength(20)
    expect(result.items[19]?.title).toBe('Kop 20')
    expect(result.days).toBe(1)
  })

  it('counts the age of the oldest headline shown in whole days, rounded up, and at least 1', async () => {
    const { headlinesOfTheWindow } = await loadHeadlines()
    const days = (...hours: number[]) => headlinesOfTheWindow(aged(...hours), clock).days

    expect(days(1, 2, 3, 4, 18)).toBe(1)
    expect(days(1, 2, 3, 4, 24)).toBe(1)
    expect(days(1, 2, 3, 4, 24.01)).toBe(2)
    expect(days(1, 2, 3, 4, 53)).toBe(3)
    expect(days(1, 2, 3, 4, 72)).toBe(3)
    expect(days(1, 2, 3, 4, 156)).toBe(7)
    expect(days(0, 0, 0, 0, 0)).toBe(1)
  })
})

describe('headlineCount', () => {
  it('writes the count with the singular for 1 article and 1 day', async () => {
    const { headlineCount } = await loadHeadlines()

    expect(headlineCount(15, 3)).toBe('15 artikelen over de laatste 3 dagen')
    expect(headlineCount(20, 1)).toBe('20 artikelen over de laatste dag')
    expect(headlineCount(1, 1)).toBe('1 artikel over de laatste dag')
    expect(headlineCount(1, 7)).toBe('1 artikel over de laatste 7 dagen')
  })
})
