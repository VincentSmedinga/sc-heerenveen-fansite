import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { countPodcastEpisodes, db, findPodcast, listPodcastEpisodes, listPodcasts } = vi.hoisted(() => ({
  countPodcastEpisodes: vi.fn(),
  db: { name: 'db' },
  findPodcast: vi.fn(),
  listPodcastEpisodes: vi.fn(),
  listPodcasts: vi.fn(),
}))

vi.mock('@fansite/db/queries', () => ({ countPodcastEpisodes, findPodcast, listPodcastEpisodes, listPodcasts }))
vi.mock('./database', () => ({ getDatabase: () => ({ db }) }))

const minute = 60 * 1000

const podcasts = [
  { name: 'Omroep Abe', slug: 'omroep-abe' },
  { name: 'Radio Camataru', slug: 'radio-camataru' },
]

const links = {
  applePodcastsUrl: 'https://podcasts.apple.com/nl/podcast/omroep-abe/id1',
  description: 'De podcast van de Leeuwarder Courant over sc Heerenveen.',
  name: 'Omroep Abe',
  slug: 'omroep-abe',
  spotifyUrl: null,
}

/**
 * The caches live in the module, so every test loads a module of its own, with empty caches.
 */
async function load() {
  vi.resetModules()

  return import('./podcasts')
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-23T12:30:00Z'))
  for (const mock of [countPodcastEpisodes, findPodcast, listPodcastEpisodes, listPodcasts]) {
    mock.mockReset()
  }
  countPodcastEpisodes.mockResolvedValue(60)
  findPodcast.mockResolvedValue(links)
  listPodcastEpisodes.mockResolvedValue([])
  listPodcasts.mockResolvedValue(podcasts)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getLatestEpisodes', () => {
  it('asks the query for the five newest episodes of all podcasts, up to now, and caches them for five minutes', async () => {
    const { getLatestEpisodes } = await load()

    await getLatestEpisodes()
    vi.advanceTimersByTime(5 * minute - 1)
    await getLatestEpisodes()

    expect(listPodcastEpisodes).toHaveBeenCalledExactlyOnceWith(db, {
      limit: 5,
      until: new Date('2026-10-23T12:30:00Z'),
    })

    vi.advanceTimersByTime(1)
    await getLatestEpisodes()

    expect(listPodcastEpisodes).toHaveBeenCalledTimes(2)
  })
})

describe('getPodcastPage', () => {
  it('gives the first page of all podcasts: 25 episodes from the start, the number of pages and the podcasts for the filter', async () => {
    const episodes = [{ title: 'Aflevering 1' }]

    listPodcastEpisodes.mockResolvedValue(episodes)

    const { getPodcastPage } = await load()

    expect(await getPodcastPage([], 1)).toEqual({
      about: undefined,
      episodes,
      pageCount: 3,
      podcasts,
      selected: [],
    })
    expect(listPodcastEpisodes).toHaveBeenCalledExactlyOnceWith(db, {
      limit: 25,
      offset: 0,
      until: new Date('2026-10-23T12:30:00Z'),
    })
    expect(countPodcastEpisodes).toHaveBeenCalledExactlyOnceWith(db, { until: new Date('2026-10-23T12:30:00Z') })
    expect(findPodcast).not.toHaveBeenCalled()
  })

  it('starts a later page at the right episode', async () => {
    const { getPodcastPage } = await load()

    await getPodcastPage([], 3)

    expect(listPodcastEpisodes).toHaveBeenCalledExactlyOnceWith(db, {
      limit: 25,
      offset: 50,
      until: new Date('2026-10-23T12:30:00Z'),
    })
  })

  it('limits the episodes, the total and the addresses to the podcast that is chosen, and gives it as selected', async () => {
    countPodcastEpisodes.mockResolvedValue(25)

    const { getPodcastPage } = await load()
    const page = await getPodcastPage(['omroep-abe'], 1)

    expect(page).toMatchObject({ about: links, pageCount: 1, selected: [{ name: 'Omroep Abe', slug: 'omroep-abe' }] })
    expect(listPodcastEpisodes).toHaveBeenCalledWith(db, expect.objectContaining({ podcasts: ['omroep-abe'] }))
    expect(countPodcastEpisodes).toHaveBeenCalledWith(db, expect.objectContaining({ podcasts: ['omroep-abe'] }))
    expect(findPodcast).toHaveBeenCalledExactlyOnceWith(db, 'omroep-abe')
  })

  it('limits the episodes and the total to some podcasts, which it puts in the order of the list whatever the order asked, and gives no addresses', async () => {
    listPodcasts.mockResolvedValue([...podcasts, { name: 'Zondag Zes', slug: 'zondag-zes' }])

    const { getPodcastPage } = await load()
    const page = await getPodcastPage(['zondag-zes', 'omroep-abe'], 1)

    expect(page).toMatchObject({
      about: undefined,
      selected: [
        { name: 'Omroep Abe', slug: 'omroep-abe' },
        { name: 'Zondag Zes', slug: 'zondag-zes' },
      ],
    })
    expect(listPodcastEpisodes).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ podcasts: ['omroep-abe', 'zondag-zes'] }),
    )
    expect(countPodcastEpisodes).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ podcasts: ['omroep-abe', 'zondag-zes'] }),
    )
    expect(findPodcast).not.toHaveBeenCalled()
  })

  it('treats all podcasts as none: all the episodes, and nothing selected', async () => {
    const { getPodcastPage } = await load()
    const page = await getPodcastPage(['radio-camataru', 'omroep-abe'], 1)

    expect(page).toMatchObject({ about: undefined, pageCount: 3, selected: [] })
    expect(listPodcastEpisodes).toHaveBeenCalledExactlyOnceWith(db, {
      limit: 25,
      offset: 0,
      until: new Date('2026-10-23T12:30:00Z'),
    })
    expect(countPodcastEpisodes).toHaveBeenCalledExactlyOnceWith(db, { until: new Date('2026-10-23T12:30:00Z') })
    expect(findPodcast).not.toHaveBeenCalled()
  })

  it('shares the cache between the same podcasts in another order, and between all podcasts and none', async () => {
    listPodcasts.mockResolvedValue([...podcasts, { name: 'Zondag Zes', slug: 'zondag-zes' }])

    const { getPodcastPage } = await load()

    await getPodcastPage(['radio-camataru', 'omroep-abe'], 1)
    await getPodcastPage(['omroep-abe', 'radio-camataru'], 1)
    await getPodcastPage(['omroep-abe', 'radio-camataru', 'zondag-zes'], 1)
    await getPodcastPage([], 1)

    expect(listPodcastEpisodes).toHaveBeenCalledTimes(2)
    expect(countPodcastEpisodes).toHaveBeenCalledTimes(2)
  })

  it('has one page, an empty one, when there are no episodes', async () => {
    countPodcastEpisodes.mockResolvedValue(0)

    const { getPodcastPage } = await load()

    expect(await getPodcastPage([], 1)).toMatchObject({ episodes: [], pageCount: 1 })
    expect(await getPodcastPage([], 2)).toBeUndefined()
  })

  it('gives nothing for a page after the last one, and asks for no episodes', async () => {
    countPodcastEpisodes.mockResolvedValue(50)

    const { getPodcastPage } = await load()

    expect(await getPodcastPage([], 2)).toBeDefined()
    expect(await getPodcastPage([], 3)).toBeUndefined()
    expect(listPodcastEpisodes).toHaveBeenCalledTimes(1)
  })

  it('gives nothing when one of the podcasts is not in the filter or a podcast is given twice, and asks the database for nothing about it', async () => {
    const { getPodcastPage } = await load()

    expect(await getPodcastPage(['bestaat-niet'], 1)).toBeUndefined()
    expect(await getPodcastPage([''], 1)).toBeUndefined()
    expect(await getPodcastPage(['Omroep-Abe'], 1)).toBeUndefined()
    expect(await getPodcastPage(['omroep-abe', 'bestaat-niet'], 1)).toBeUndefined()
    expect(await getPodcastPage(['omroep-abe', 'omroep-abe'], 1)).toBeUndefined()
    expect(countPodcastEpisodes).not.toHaveBeenCalled()
    expect(findPodcast).not.toHaveBeenCalled()
    expect(listPodcastEpisodes).not.toHaveBeenCalled()
  })

  it('puts nothing in the cache for an unknown podcast or a page after the last, however many a visitor tries', async () => {
    const { getPodcastPage } = await load()

    for (let index = 0; index < 20; index += 1) {
      await getPodcastPage([`podcast-${index}`], 1)
      await getPodcastPage([], 4 + index)
      await getPodcastPage(['omroep-abe'], 4 + index)
    }

    // One count for all podcasts and one for Omroep Abe, and no page.
    expect(countPodcastEpisodes).toHaveBeenCalledTimes(2)
    expect(listPodcastEpisodes).not.toHaveBeenCalled()
  })

  it('gives nothing when the database has no addresses for the podcast of the filter that is chosen', async () => {
    findPodcast.mockResolvedValue(undefined)

    const { getPodcastPage } = await load()

    expect(await getPodcastPage(['omroep-abe'], 1)).toBeUndefined()
  })

  it('keeps each page and each choice for five minutes, so a visit costs no query', async () => {
    const { getPodcastPage } = await load()

    await getPodcastPage([], 1)
    await getPodcastPage([], 1)
    await getPodcastPage([], 2)
    await getPodcastPage(['omroep-abe'], 1)
    vi.advanceTimersByTime(5 * minute - 1)
    await getPodcastPage([], 1)

    expect(listPodcasts).toHaveBeenCalledTimes(1)
    expect(listPodcastEpisodes).toHaveBeenCalledTimes(3)

    vi.advanceTimersByTime(1)
    await getPodcastPage([], 1)

    expect(listPodcastEpisodes).toHaveBeenCalledTimes(4)
  })

  it('passes on an error of the database, and does not keep it', async () => {
    listPodcasts.mockRejectedValueOnce(new Error('no database'))

    const { getPodcastPage } = await load()

    await expect(getPodcastPage([], 1)).rejects.toThrow('no database')
    await expect(getPodcastPage([], 1)).resolves.toBeDefined()
  })
})
