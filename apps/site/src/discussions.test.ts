import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { db, listNewestDiscussions } = vi.hoisted(() => ({ db: { name: 'db' }, listNewestDiscussions: vi.fn() }))

vi.mock('@fansite/db/queries', () => ({ listNewestDiscussions }))
vi.mock('./database', () => ({ getDatabase: () => ({ db }) }))

const minute = 60 * 1000

/** The cache lives in the module, so every test loads a module of its own, with an empty cache. */
async function loadDiscussions() {
  vi.resetModules()

  return (await import('./discussions')).getDiscussions
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-23T12:30:00Z'))
  listNewestDiscussions.mockReset()
  listNewestDiscussions.mockResolvedValue([])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getDiscussions', () => {
  it('asks the query for the newest five discussions in the database', async () => {
    await (
      await loadDiscussions()
    )()

    expect(listNewestDiscussions).toHaveBeenCalledExactlyOnceWith(db, 5)
  })

  it('gives what the query gives', async () => {
    const discussions = [{ title: 'Een discussie' }]
    listNewestDiscussions.mockResolvedValue(discussions)

    expect(await (await loadDiscussions())()).toBe(discussions)
  })

  it('asks the database once in five minutes, however many visits', async () => {
    const getDiscussions = await loadDiscussions()

    await getDiscussions()
    vi.advanceTimersByTime(4 * minute + 59_000)
    await getDiscussions()
    await getDiscussions()

    expect(listNewestDiscussions).toHaveBeenCalledTimes(1)
  })

  it('asks again after five minutes', async () => {
    const getDiscussions = await loadDiscussions()

    await getDiscussions()
    vi.advanceTimersByTime(5 * minute)
    await getDiscussions()

    expect(listNewestDiscussions).toHaveBeenCalledTimes(2)
  })

  it('does not keep a load that fails, so the next visit tries again', async () => {
    const getDiscussions = await loadDiscussions()
    listNewestDiscussions.mockRejectedValueOnce(new Error('connect ECONNREFUSED'))

    await expect(getDiscussions()).rejects.toThrow('connect ECONNREFUSED')
    await getDiscussions()

    expect(listNewestDiscussions).toHaveBeenCalledTimes(2)
  })
})
