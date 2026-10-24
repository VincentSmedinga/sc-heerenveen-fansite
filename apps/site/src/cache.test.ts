import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cacheFor, cacheForKey } from './cache'

const hour = 60 * 60 * 1000

beforeEach(() => {
  vi.useFakeTimers()
})

afterEach(() => {
  vi.useRealTimers()
})

describe('cacheFor', () => {
  it('loads once and gives the same result within the period', async () => {
    const load = vi.fn(() => Promise.resolve(['Testkrant']))
    const get = cacheFor(hour, load)

    await expect(get()).resolves.toEqual(['Testkrant'])
    vi.advanceTimersByTime(hour - 1)
    await expect(get()).resolves.toEqual(['Testkrant'])

    expect(load).toHaveBeenCalledTimes(1)
  })

  it('loads again once the period is over, so a change shows within it', async () => {
    const load = vi.fn().mockResolvedValueOnce(['Testkrant']).mockResolvedValueOnce(['Testkrant', 'Proefnieuws'])
    const get = cacheFor(hour, load)

    await get()
    vi.advanceTimersByTime(hour)

    await expect(get()).resolves.toEqual(['Testkrant', 'Proefnieuws'])
    expect(load).toHaveBeenCalledTimes(2)
  })

  it('shares a load that is still running', async () => {
    const load = vi.fn(() => Promise.resolve(['Testkrant']))
    const get = cacheFor(hour, load)

    await Promise.all([get(), get(), get()])

    expect(load).toHaveBeenCalledTimes(1)
  })

  it('runs a thenable that works on each await only once, as a Drizzle query is', async () => {
    let runs = 0
    const query: PromiseLike<string[]> = {
      then(onFulfilled, onRejected) {
        runs++

        return Promise.resolve(['Testkrant']).then(onFulfilled, onRejected)
      },
    }
    const get = cacheFor(hour, () => query)

    await get()
    await get()
    await get()

    expect(runs).toBe(1)
  })

  it('keeps no failed load, so the next call tries again', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('no database')).mockResolvedValueOnce(['Testkrant'])
    const get = cacheFor(hour, load)

    await expect(get()).rejects.toThrow('no database')
    await expect(get()).resolves.toEqual(['Testkrant'])
    expect(load).toHaveBeenCalledTimes(2)
  })
})

describe('cacheForKey', () => {
  it('loads once per key within the period, and gives each key its own result', async () => {
    const load = vi.fn((key: string) => Promise.resolve(`pagina ${key}`))
    const get = cacheForKey(hour, load)

    await expect(get('1')).resolves.toBe('pagina 1')
    await expect(get('2')).resolves.toBe('pagina 2')
    vi.advanceTimersByTime(hour - 1)
    await expect(get('1')).resolves.toBe('pagina 1')
    await expect(get('2')).resolves.toBe('pagina 2')

    expect(load.mock.calls.map(([key]) => key)).toEqual(['1', '2'])
  })

  it('loads a key again once its period is over, without touching the others', async () => {
    const load = vi.fn((key: string) => Promise.resolve(key))
    const get = cacheForKey(hour, load)

    await get('1')
    vi.advanceTimersByTime(hour / 2)
    await get('2')
    vi.advanceTimersByTime(hour / 2)
    await get('1')
    await get('2')

    expect(load.mock.calls.map(([key]) => key)).toEqual(['1', '2', '1'])
  })

  it('shares a load that is still running for the same key', async () => {
    const load = vi.fn((key: string) => Promise.resolve(key))
    const get = cacheForKey(hour, load)

    await Promise.all([get('1'), get('1'), get('1')])

    expect(load).toHaveBeenCalledTimes(1)
  })

  it('keeps no failed load, so the next call for that key tries again', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('no database')).mockResolvedValueOnce('pagina 1')
    const get = cacheForKey(hour, load)

    await expect(get('1')).rejects.toThrow('no database')
    await expect(get('1')).resolves.toBe('pagina 1')
    expect(load).toHaveBeenCalledTimes(2)
  })
})
