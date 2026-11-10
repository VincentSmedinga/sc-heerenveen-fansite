// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'

import {
  canonicalValues,
  clearAllDrafts,
  clearDraft,
  draftKey,
  draftLifetime,
  parseDraft,
  readDraftText,
  saveDraft,
} from './report-draft'
import { emptyRow, emptySide, noFormation, type ReportValues } from './report-fields'

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

const server: ReportValues = {
  bron: '',
  formatie: { wij: noFormation(), zij: noFormation() },
  status: 'bezig',
  tegenstander: 'nee',
  wij: { ...emptySide(), speler: [{ ...emptyRow('speler'), keuze: '1' }] },
  zij: emptySide(),
}
const typed: ReportValues = { ...server, bron: 'Wedstrijdformulier' }
const now = Date.UTC(2026, 10, 10, 12)

describe('saveDraft', () => {
  it('keeps the values and the moment under the key of the match, and nothing more', () => {
    const storage = memoryStorage()

    saveDraft(7, typed, server, now, storage)

    expect(storage.length).toBe(1)
    expect(draftKey(7)).toBe('fansite-verslag-7')

    const stored: unknown = JSON.parse(storage.getItem('fansite-verslag-7') ?? '')

    expect(stored).toEqual({ savedAt: now, values: typed })
    expect(Object.keys(stored as object)).toEqual(['savedAt', 'values'])
  })

  it('writes only when the values differ from what was stored', () => {
    const storage = memoryStorage()

    saveDraft(7, typed, server, now, storage)
    saveDraft(7, typed, server, now + 60_000, storage)

    expect(parseDraft(storage.getItem('fansite-verslag-7'))?.savedAt).toBe(now)

    saveDraft(7, { ...typed, bron: 'Uitzending' }, server, now + 120_000, storage)

    expect(parseDraft(storage.getItem('fansite-verslag-7'))?.savedAt).toBe(now + 120_000)
  })

  it('keeps no draft of values the server has, and takes an earlier one away', () => {
    const storage = memoryStorage()

    saveDraft(7, server, server, now, storage)

    expect(storage.length).toBe(0)

    saveDraft(7, typed, server, now, storage)
    saveDraft(7, server, server, now, storage)

    expect(storage.length).toBe(0)
  })

  it('sees a row of ours with a name left over from the squad as the same row', () => {
    const named: ReportValues = {
      ...server,
      wij: { ...server.wij, speler: [{ ...server.wij.speler[0], naam: 'Oud' }] },
    }

    expect(canonicalValues(named)).toBe(canonicalValues(server))
  })

  it('does nothing, and does not throw, when the storage is blocked', () => {
    expect(() => saveDraft(7, typed, server, now, blockedStorage)).not.toThrow()
  })
})

describe('readDraftText', () => {
  it('gives the text of a draft that is there', () => {
    const storage = memoryStorage()

    saveDraft(7, typed, server, now, storage)

    expect(parseDraft(readDraftText(7, now, storage))?.values.bron).toBe('Wedstrijdformulier')
    expect(readDraftText(8, now, storage)).toBeNull()
  })

  it('takes a draft away after thirty days, and keeps it until then', () => {
    const storage = memoryStorage()

    saveDraft(7, typed, server, now, storage)

    expect(readDraftText(7, now + draftLifetime, storage)).not.toBeNull()
    expect(readDraftText(7, now + draftLifetime + 1, storage)).toBeNull()
    expect(storage.length).toBe(0)
  })

  it('takes a broken text away without a message', () => {
    const storage = memoryStorage({ 'fansite-verslag-7': '{"savedAt": 1, "values": ' })

    expect(readDraftText(7, now, storage)).toBeNull()
    expect(storage.length).toBe(0)

    const wrongShape = memoryStorage({ 'fansite-verslag-7': JSON.stringify({ savedAt: now, values: { bron: 1 } }) })

    expect(readDraftText(7, now, wrongShape)).toBeNull()
  })

  it('gives nothing, and does not throw, when the storage is blocked', () => {
    expect(readDraftText(7, now, blockedStorage)).toBeNull()
  })
})

describe('clearDraft and clearAllDrafts', () => {
  it('takes the draft of one match away', () => {
    const storage = memoryStorage()

    saveDraft(7, typed, server, now, storage)
    saveDraft(8, typed, server, now, storage)
    clearDraft(7, storage)

    expect(storage.getItem('fansite-verslag-7')).toBeNull()
    expect(storage.getItem('fansite-verslag-8')).not.toBeNull()
  })

  it('takes every key with the prefix away at logging out, and leaves the rest', () => {
    const storage = memoryStorage({ 'fansite-beheer': '1', 'fansite-theme': 'dark' })

    saveDraft(7, typed, server, now, storage)
    saveDraft(8, typed, server, now, storage)
    clearAllDrafts(storage)

    expect([storage.key(0), storage.key(1), storage.length]).toEqual(['fansite-beheer', 'fansite-theme', 2])
  })

  it('does not throw when the storage is blocked', () => {
    expect(() => clearAllDrafts(blockedStorage)).not.toThrow()
    expect(() => clearDraft(7, blockedStorage)).not.toThrow()
  })
})
