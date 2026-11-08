import { describe, expect, it, vi } from 'vitest'

import { deadlockTries, isDeadlock, retryOnDeadlock } from './retry-deadlock'

const deadlock = Object.assign(new Error('Deadlock found'), { code: 'ER_LOCK_DEADLOCK', errno: 1213 })

describe('isDeadlock', () => {
  it('recognises a deadlock by code, by number and as the cause of another error', () => {
    expect(isDeadlock(deadlock)).toBe(true)
    expect(isDeadlock({ errno: 1213 })).toBe(true)
    expect(isDeadlock(new Error('Failed query', { cause: deadlock }))).toBe(true)
  })

  it('does not take other errors for one', () => {
    expect(isDeadlock(Object.assign(new Error('Duplicate'), { code: 'ER_DUP_ENTRY', errno: 1062 }))).toBe(false)
    expect(isDeadlock(new Error('boom'))).toBe(false)
    expect(isDeadlock(null)).toBe(false)
    expect(isDeadlock('ER_LOCK_DEADLOCK')).toBe(false)
  })
})

describe('retryOnDeadlock', () => {
  it('returns the result without a retry when the first run works', async () => {
    const run = vi.fn().mockResolvedValue('done')

    expect(await retryOnDeadlock(run)).toBe('done')
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('runs again after a deadlock and returns the result of the run that works', async () => {
    const run = vi.fn().mockRejectedValueOnce(deadlock).mockRejectedValueOnce(deadlock).mockResolvedValue('done')

    expect(await retryOnDeadlock(run)).toBe('done')
    expect(run).toHaveBeenCalledTimes(3)
  })

  it('lets any other error go on at once, without a retry', async () => {
    const failure = new Error('boom')
    const run = vi.fn().mockRejectedValue(failure)

    await expect(retryOnDeadlock(run)).rejects.toBe(failure)
    expect(run).toHaveBeenCalledTimes(1)
  })

  it('gives up with the deadlock after a few runs', async () => {
    const run = vi.fn().mockRejectedValue(deadlock)

    await expect(retryOnDeadlock(run)).rejects.toBe(deadlock)
    expect(run).toHaveBeenCalledTimes(deadlockTries)
  })
})
