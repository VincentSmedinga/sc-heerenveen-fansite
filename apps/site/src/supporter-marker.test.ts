// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

import {
  readSupporterMarker,
  saveSupporterMarker,
  subscribeToSupporterMarker,
  supporterMarkerEvent,
  supporterMarkerKey,
} from './supporter-marker'

/** A storage in memory, like localStorage. */
function memoryStorage(initial: Record<string, string> = {}): Storage {
  const data = new Map(Object.entries(initial))

  return {
    clear: () => {
      data.clear()
    },
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    get length() {
      return data.size
    },
    removeItem: (key) => {
      data.delete(key)
    },
    setItem: (key, value) => {
      data.set(key, value)
    },
  }
}

/** A storage that throws as soon as it is touched, like Safari with "Block all cookies". */
const blockedStorage = new Proxy({} as Storage, {
  get: () => {
    throw new DOMException('blocked', 'SecurityError')
  },
})

describe('the mark of a supporter', () => {
  it('is the screen name in storage, and nothing without it', () => {
    const storage = memoryStorage()

    expect(readSupporterMarker(storage)).toBeUndefined()

    saveSupporterMarker('Tjalle99', storage)

    expect(storage.getItem(supporterMarkerKey)).toBe('Tjalle99')
    expect(readSupporterMarker(storage)).toBe('Tjalle99')
  })

  it('is taken away when nobody is logged in', () => {
    const storage = memoryStorage({ [supporterMarkerKey]: 'Tjalle99' })

    saveSupporterMarker(undefined, storage)

    expect(storage.getItem(supporterMarkerKey)).toBeNull()
    expect(readSupporterMarker(storage)).toBeUndefined()
  })

  it.each(['', '   ', 'x'.repeat(41)])('does not count %j as a screen name', (value) => {
    expect(readSupporterMarker(memoryStorage({ [supporterMarkerKey]: value }))).toBeUndefined()
  })

  it('reads nothing, and breaks nothing, when the browser blocks storage', () => {
    expect(readSupporterMarker(blockedStorage)).toBeUndefined()
    expect(() => {
      saveSupporterMarker('Tjalle99', blockedStorage)
    }).not.toThrow()
  })

  it('tells the header in the same tab, and in another tab through storage', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeToSupporterMarker(onChange)

    saveSupporterMarker('Tjalle99', memoryStorage())
    expect(onChange).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new StorageEvent('storage', { key: supporterMarkerKey }))
    window.dispatchEvent(new StorageEvent('storage', { key: 'fansite-theme' }))
    expect(onChange).toHaveBeenCalledTimes(2)

    unsubscribe()
    window.dispatchEvent(new Event(supporterMarkerEvent))
    expect(onChange).toHaveBeenCalledTimes(2)
  })
})
