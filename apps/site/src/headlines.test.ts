import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { db, listRecentItems } = vi.hoisted(() => ({ db: { name: 'db' }, listRecentItems: vi.fn() }))

vi.mock('@fansite/db/queries', () => ({ listRecentItems }))
vi.mock('./database', () => ({ getDatabase: () => ({ db }) }))

const minute = 60 * 1000

/** `number` items, newest first, made up. */
function itemsOf(number: number) {
  return Array.from({ length: number }, (_, index) => ({ title: `Kop ${index + 1}` }))
}

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

describe('parseHeadlineCount', () => {
  it('gives ten without a number', async () => {
    expect((await loadHeadlines()).parseHeadlineCount(undefined)).toBe(10)
  })

  it.each(['10', '15', '20', '50', '95', '100'])(
    'gives %s for a whole number from 10 in steps of 5, up to 100',
    async (value) => {
      expect((await loadHeadlines()).parseHeadlineCount(value)).toBe(Number(value))
    },
  )

  it.each([
    '',
    '0',
    '1',
    '4',
    '5',
    '7',
    '9',
    '12',
    '-5',
    '+5',
    '5.0',
    '7.5',
    '1e1',
    '0x0a',
    '010',
    '05',
    ' 10',
    '10 ',
    '105',
    '110',
    '1000',
    '100000000000000000000',
    'abc',
    'tien',
    'NaN',
    'Infinity',
    '%31%30',
  ])('gives ten for %j, which is not such a number', async (value) => {
    expect((await loadHeadlines()).parseHeadlineCount(value)).toBe(10)
  })

  it('gives ten for a number that is given twice', async () => {
    expect((await loadHeadlines()).parseHeadlineCount(['10', '15'])).toBe(10)
  })
})

describe('getHeadlines', () => {
  it('asks the query for one more than the number, up to now, with no start in time', async () => {
    const { getHeadlines } = await loadHeadlines()

    await getHeadlines(10)

    expect(listRecentItems).toHaveBeenCalledExactlyOnceWith(db, {
      limit: 11,
      until: new Date('2026-10-22T12:30:00.000Z'),
    })
  })

  it('gives the number of headlines asked for, and says there are more when the extra one came back', async () => {
    const found = itemsOf(11)
    listRecentItems.mockResolvedValue(found)

    expect(await (await loadHeadlines()).getHeadlines(10)).toEqual({ headlines: found.slice(0, 10), more: true })
  })

  it('says there are no more when the query gave no more than the number', async () => {
    const found = itemsOf(10)
    listRecentItems.mockResolvedValue(found)

    expect(await (await loadHeadlines()).getHeadlines(10)).toEqual({ headlines: found, more: false })
  })

  it('gives fewer when the sources have fewer, and none when they have none', async () => {
    const { getHeadlines } = await loadHeadlines()

    listRecentItems.mockResolvedValueOnce(itemsOf(3))
    expect(await getHeadlines(10)).toEqual({ headlines: itemsOf(3), more: false })

    listRecentItems.mockResolvedValueOnce([])
    expect(await getHeadlines(15)).toEqual({ headlines: [], more: false })
  })

  it('asks for exactly a hundred at a hundred, and says there are no more: older news is for the archive', async () => {
    listRecentItems.mockResolvedValue(itemsOf(100))

    expect(await (await loadHeadlines()).getHeadlines(100)).toEqual({ headlines: itemsOf(100), more: false })
    expect(listRecentItems).toHaveBeenCalledExactlyOnceWith(db, {
      limit: 100,
      until: new Date('2026-10-22T12:30:00.000Z'),
    })
  })

  it('asks the database once in five minutes for each number, however many visits', async () => {
    const { getHeadlines } = await loadHeadlines()

    await getHeadlines(10)
    vi.advanceTimersByTime(4 * minute + 59_000)
    await getHeadlines(10)
    await getHeadlines(10)
    await getHeadlines(15)
    await getHeadlines(15)

    expect(listRecentItems).toHaveBeenCalledTimes(2)
  })

  it('asks again after five minutes, up to the moment of then', async () => {
    const { getHeadlines } = await loadHeadlines()

    await getHeadlines(10)
    vi.advanceTimersByTime(5 * minute)
    await getHeadlines(10)

    expect(listRecentItems).toHaveBeenCalledTimes(2)
    expect(listRecentItems).toHaveBeenNthCalledWith(2, db, {
      limit: 11,
      until: new Date('2026-10-22T12:35:00.000Z'),
    })
  })

  it('keeps at most nineteen lists, because a number that is not valid shares the list of ten', async () => {
    const { getHeadlines } = await loadHeadlines()

    for (const count of [10, 5, 7, 0, -5, 12, 105, 1e21, Number.NaN, 10.5, 10]) {
      await getHeadlines(count)
    }

    expect(listRecentItems).toHaveBeenCalledTimes(1)
    expect(listRecentItems).toHaveBeenCalledWith(db, expect.objectContaining({ limit: 11 }))
  })

  it('does not keep a load that fails, so the next visit tries again', async () => {
    const { getHeadlines } = await loadHeadlines()
    listRecentItems.mockRejectedValueOnce(new Error('connect ECONNREFUSED'))

    await expect(getHeadlines(10)).rejects.toThrow('connect ECONNREFUSED')
    await getHeadlines(10)

    expect(listRecentItems).toHaveBeenCalledTimes(2)
  })
})
