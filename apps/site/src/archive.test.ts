import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { countArchiveItems, db, listArchivePage, listArchiveSources } = vi.hoisted(() => ({
  countArchiveItems: vi.fn(),
  db: { name: 'db' },
  listArchivePage: vi.fn(),
  listArchiveSources: vi.fn(),
}))

vi.mock('@fansite/db/queries', () => ({ countArchiveItems, listArchivePage, listArchiveSources }))
vi.mock('./database', () => ({ getDatabase: () => ({ db }) }))

const minute = 60 * 1000
const now = new Date('2026-10-30T12:30:00Z')

const sources = [
  { name: 'Leeuwarder Courant', slug: 'leeuwarder-courant' },
  { name: 'NOS', slug: 'nos' },
]

/**
 * The caches live in the module, so every test loads a module of its own, with empty caches.
 */
async function load() {
  vi.resetModules()

  return import('./archive')
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(now)
  for (const mock of [countArchiveItems, listArchivePage, listArchiveSources]) {
    mock.mockReset()
  }
  countArchiveItems.mockResolvedValue(120)
  listArchivePage.mockResolvedValue([])
  listArchiveSources.mockResolvedValue(sources)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getArchivePage', () => {
  it('gives the first page of all sources: 50 headlines from the start, the number of pages and the sources for the filter', async () => {
    const headlines = [{ title: 'Kop 1' }]

    listArchivePage.mockResolvedValue(headlines)

    const { getArchivePage } = await load()

    expect(await getArchivePage(undefined, 1)).toEqual({ headlines, pageCount: 3, selected: undefined, sources })
    expect(listArchivePage).toHaveBeenCalledExactlyOnceWith(db, { limit: 50, offset: 0, until: now })
    expect(countArchiveItems).toHaveBeenCalledExactlyOnceWith(db, { until: now })
    expect(listArchiveSources).toHaveBeenCalledExactlyOnceWith(db, now)
  })

  it('starts a later page at the right headline', async () => {
    const { getArchivePage } = await load()

    await getArchivePage(undefined, 3)

    expect(listArchivePage).toHaveBeenCalledExactlyOnceWith(db, { limit: 50, offset: 100, until: now })
  })

  it('limits the headlines and the total to the source that is chosen, and gives it as selected', async () => {
    countArchiveItems.mockResolvedValue(50)

    const { getArchivePage } = await load()
    const page = await getArchivePage('nos', 1)

    expect(page).toMatchObject({ pageCount: 1, selected: { name: 'NOS', slug: 'nos' } })
    expect(listArchivePage).toHaveBeenCalledWith(db, expect.objectContaining({ source: 'nos' }))
    expect(countArchiveItems).toHaveBeenCalledWith(db, expect.objectContaining({ source: 'nos' }))
  })

  it('has one page, an empty one, when there are no headlines', async () => {
    countArchiveItems.mockResolvedValue(0)
    listArchiveSources.mockResolvedValue([])

    const { getArchivePage } = await load()

    expect(await getArchivePage(undefined, 1)).toMatchObject({ headlines: [], pageCount: 1, sources: [] })
    expect(await getArchivePage(undefined, 2)).toBeUndefined()
  })

  it('gives nothing for a page after the last one, and asks for no headlines', async () => {
    countArchiveItems.mockResolvedValue(100)

    const { getArchivePage } = await load()

    expect(await getArchivePage(undefined, 2)).toBeDefined()
    expect(await getArchivePage(undefined, 3)).toBeUndefined()
    expect(listArchivePage).toHaveBeenCalledTimes(1)
  })

  it('gives nothing for a source that is not in the filter, and asks the database for nothing about it', async () => {
    const { getArchivePage } = await load()

    expect(await getArchivePage('bestaat-niet', 1)).toBeUndefined()
    expect(await getArchivePage('', 1)).toBeUndefined()
    expect(await getArchivePage('NOS', 1)).toBeUndefined()
    expect(countArchiveItems).not.toHaveBeenCalled()
    expect(listArchivePage).not.toHaveBeenCalled()
  })

  it('puts nothing in the cache for an unknown source or a page after the last, however many a visitor tries', async () => {
    const { getArchivePage } = await load()

    for (let index = 0; index < 20; index += 1) {
      await getArchivePage(`bron-${index}`, 1)
      await getArchivePage(undefined, 4 + index)
      await getArchivePage('nos', 4 + index)
    }

    // One count for all sources and one for NOS, and no page: the pages after the last one were
    // refused after the count, and the unknown sources before it.
    expect(countArchiveItems).toHaveBeenCalledTimes(2)
    expect(listArchivePage).not.toHaveBeenCalled()
  })

  it('keeps each page and each source for five minutes, so a visit costs no query', async () => {
    const { getArchivePage } = await load()

    await getArchivePage(undefined, 1)
    await getArchivePage(undefined, 1)
    await getArchivePage(undefined, 2)
    await getArchivePage('nos', 1)
    vi.advanceTimersByTime(5 * minute - 1)
    await getArchivePage(undefined, 1)

    expect(listArchiveSources).toHaveBeenCalledTimes(1)
    expect(listArchivePage).toHaveBeenCalledTimes(3)

    vi.advanceTimersByTime(1)
    await getArchivePage(undefined, 1)

    expect(listArchivePage).toHaveBeenCalledTimes(4)
  })

  it('passes on an error of the database, and does not keep it', async () => {
    listArchiveSources.mockRejectedValueOnce(new Error('no database'))

    const { getArchivePage } = await load()

    await expect(getArchivePage(undefined, 1)).rejects.toThrow('no database')
    await expect(getArchivePage(undefined, 1)).resolves.toBeDefined()
  })
})
