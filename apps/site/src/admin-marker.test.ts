// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

import {
  adminMarkerEvent,
  adminMarkerKey,
  readAdminMarker,
  saveAdminMarker,
  subscribeToAdminMarker,
} from './admin-marker'

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

describe('the mark of a logged-in editor', () => {
  it('is not there by default', () => {
    expect(readAdminMarker(memoryStorage())).toBe(false)
  })

  it('is set for a valid session and read back', () => {
    const storage = memoryStorage()

    saveAdminMarker(true, storage)

    expect(readAdminMarker(storage)).toBe(true)
    expect(storage.length).toBe(1)
  })

  it('is taken away when there is no valid session', () => {
    const storage = memoryStorage({ [adminMarkerKey]: '1' })

    saveAdminMarker(false, storage)

    expect(readAdminMarker(storage)).toBe(false)
    expect(storage.length).toBe(0)
  })

  it('holds nothing but the sign, and any other value is no mark', () => {
    const storage = memoryStorage()

    saveAdminMarker(true, storage)

    expect(storage.getItem(adminMarkerKey)).toBe('1')
    expect(readAdminMarker(memoryStorage({ [adminMarkerKey]: 'ja' }))).toBe(false)
    expect(readAdminMarker(memoryStorage({ [adminMarkerKey]: 'admin' }))).toBe(false)
  })

  it('never throws when the storage is blocked, and then there is no mark', () => {
    expect(readAdminMarker(blockedStorage)).toBe(false)
    expect(() => {
      saveAdminMarker(true, blockedStorage)
      saveAdminMarker(false, blockedStorage)
    }).not.toThrow()
  })

  it('tells the menu in this tab, and in the other tabs through the storage event', () => {
    const onChange = vi.fn()
    const unsubscribe = subscribeToAdminMarker(onChange)

    saveAdminMarker(true, memoryStorage())
    expect(onChange).toHaveBeenCalledTimes(1)

    window.dispatchEvent(new StorageEvent('storage', { key: adminMarkerKey }))
    expect(onChange).toHaveBeenCalledTimes(2)

    // Another key, such as the theme, is not about the mark.
    window.dispatchEvent(new StorageEvent('storage', { key: 'fansite-theme' }))
    expect(onChange).toHaveBeenCalledTimes(2)

    unsubscribe()
    window.dispatchEvent(new Event(adminMarkerEvent))
    expect(onChange).toHaveBeenCalledTimes(2)
  })
})
