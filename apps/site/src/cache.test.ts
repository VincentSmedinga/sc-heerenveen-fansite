import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { cacheFor } from './cache'

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

  it('keeps no failed load, so the next call tries again', async () => {
    const load = vi.fn().mockRejectedValueOnce(new Error('no database')).mockResolvedValueOnce(['Testkrant'])
    const get = cacheFor(hour, load)

    await expect(get()).rejects.toThrow('no database')
    await expect(get()).resolves.toEqual(['Testkrant'])
    expect(load).toHaveBeenCalledTimes(2)
  })
})
