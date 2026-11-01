import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { findSquadPage, listSquad, searchPublic } from './queries.ts'
import { adminUsers, articles, feeds, items, players, sources, wikipediaPages } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase
let userId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM article_versions')
  await database.pool.query('DELETE FROM articles')
  await database.pool.query('DELETE FROM admin_users')
  await database.pool.query('DELETE FROM sources')
  await database.pool.query('DELETE FROM players')
  await database.pool.query('DELETE FROM wikipedia_pages')

  const [user] = await database.db
    .insert(adminUsers)
    .values({ email: 'beheerder@example.test', role: 'beheerder' })
    .$returningId()

  userId = user?.id ?? 0
})

const now = new Date('2026-10-26T12:00:00Z')
const day = 24 * 60 * 60 * 1000

/** Puts a source with a feed in the register and returns the ids that an item needs. */
async function addSource(overrides: Partial<typeof sources.$inferInsert> = {}) {
  const domain = overrides.domain ?? 'testkrant.test'
  const [source] = await database.db
    .insert(sources)
    .values({ domain, kind: 'news', name: 'Testkrant', ...overrides })
    .$returningId()
  const sourceId = source?.id ?? 0
  const [feed] = await database.db
    .insert(feeds)
    .values({ sourceId, url: `https://${domain}/rss/` })
    .$returningId()

  return { feedId: feed?.id ?? 0, sourceId }
}

let counter = 0

async function addArticle(
  slug: string,
  title: string,
  intro: string,
  publishedAt: Date | null = new Date(now.getTime() - day),
) {
  await database.db.insert(articles).values({
    author: 'de redactie',
    body: 'Tekst.',
    createdBy: userId,
    intro,
    publishedAt,
    slug,
    title,
    updatedBy: userId,
  })
}

async function addItem(
  ids: { feedId: number; sourceId: number },
  title: string,
  daysAgo: number,
  overrides: Partial<typeof items.$inferInsert> = {},
) {
  counter += 1
  await database.db.insert(items).values({
    ...ids,
    key: `kop-${counter}`,
    publishedAt: new Date(now.getTime() - daysAgo * day),
    title,
    url: `https://testkrant.test/kop-${counter}`,
    ...overrides,
  })
}

async function titlesFor(...words: string[]) {
  return (await searchPublic(database.db, { limit: 50, until: now, words })).hits.map((hit) => hit.title)
}

describe('searchPublic', () => {
  it('finds a headline that has every word, in any order', async () => {
    const ids = await addSource()

    await addItem(ids, 'Klaverboer scoort twee keer in Zwolle', 1)
    await addItem(ids, 'Klaverboer blijft thuis', 2)
    await addItem(ids, 'Zwolle wint', 3)

    expect(await titlesFor('klaverboer', 'zwolle')).toEqual(['Klaverboer scoort twee keer in Zwolle'])
    expect(await titlesFor('zwolle', 'klaverboer')).toEqual(['Klaverboer scoort twee keer in Zwolle'])
    expect(await titlesFor('klaverboer')).toEqual(['Klaverboer scoort twee keer in Zwolle', 'Klaverboer blijft thuis'])
  })

  it('finds a part of a word', async () => {
    const ids = await addSource()

    await addItem(ids, 'Klaverboers goal beslist de wedstrijd', 1)

    expect(await titlesFor('klaverboer')).toEqual(['Klaverboers goal beslist de wedstrijd'])
    expect(await titlesFor('verboe')).toEqual(['Klaverboers goal beslist de wedstrijd'])
  })

  it('does not care about capitals, and finds a word of two letters', async () => {
    const ids = await addSource()

    await addItem(ids, 'LC en VI over de selectie', 1)

    expect(await titlesFor('lc')).toEqual(['LC en VI over de selectie'])
    expect(await titlesFor('VI')).toEqual(['LC en VI over de selectie'])
    expect(await titlesFor('SELECTIE')).toEqual(['LC en VI over de selectie'])
  })

  it('does not care about accents, in the word or in the headline', async () => {
    const ids = await addSource()

    await addItem(ids, 'Fryslân en Café Heerenveen', 1)
    await addItem(ids, 'Zoë scoort', 2)

    expect(await titlesFor('fryslan')).toEqual(['Fryslân en Café Heerenveen'])
    expect(await titlesFor('Fryslân')).toEqual(['Fryslân en Café Heerenveen'])
    expect(await titlesFor('cafe')).toEqual(['Fryslân en Café Heerenveen'])
    expect(await titlesFor('zoé')).toEqual(['Zoë scoort'])
  })

  it('takes %, _ and \\ as the characters they are', async () => {
    const ids = await addSource()

    await addItem(ids, '100% inzet', 1)
    await addItem(ids, 'Zonder procent', 2)
    await addItem(ids, 'Een_streepje', 3)
    await addItem(ids, 'Eenxstreepje', 4)
    await addItem(ids, 'Pad C:\\Heerenveen', 5)
    await addItem(ids, 'Een rechte|streep', 6)

    expect(await titlesFor('%')).toEqual(['100% inzet'])
    expect(await titlesFor('0%')).toEqual(['100% inzet'])
    expect(await titlesFor('n_s')).toEqual(['Een_streepje'])
    expect(await titlesFor('_')).toEqual(['Een_streepje'])
    expect(await titlesFor('\\')).toEqual(['Pad C:\\Heerenveen'])
    expect(await titlesFor('c:\\h')).toEqual(['Pad C:\\Heerenveen'])
    expect(await titlesFor('|')).toEqual(['Een rechte|streep'])
    expect(await titlesFor('e|s')).toEqual(['Een rechte|streep'])
  })

  it('finds nothing when a word does not occur', async () => {
    const ids = await addSource()

    await addItem(ids, 'Klaverboer scoort', 1)

    expect(await searchPublic(database.db, { limit: 10, until: now, words: ['klaverboer', 'nergens'] })).toEqual({
      hits: [],
      total: 0,
    })
  })

  it('does not search the link or the name of the source', async () => {
    const ids = await addSource({ name: 'Zoekkrant' })

    await addItem(ids, 'Een kop', 1, { url: 'https://testkrant.test/klaverboer' })

    expect(await titlesFor('klaverboer')).toEqual([])
    expect(await titlesFor('zoekkrant')).toEqual([])
  })

  it('leaves out hidden items and items that are not relevant, and items of a source that is off', async () => {
    const on = await addSource()
    const off = await addSource({ domain: 'uit.test', enabled: false, name: 'Uitgezet' })

    await addItem(on, 'Kop zichtbaar', 1)
    await addItem(on, 'Kop verborgen', 1, { hiddenAt: now, hiddenReason: 'Fout' })
    await addItem(on, 'Kop twijfel', 1, { relevance: 'doubtful' })
    await addItem(on, 'Kop niet over de club', 1, { relevance: 'irrelevant' })
    await addItem(off, 'Kop van een bron die uit staat', 1)

    expect(await titlesFor('kop')).toEqual(['Kop zichtbaar'])
    expect((await searchPublic(database.db, { limit: 10, until: now, words: ['kop'] })).total).toBe(1)
  })

  it('leaves out an item dated after now', async () => {
    const ids = await addSource()

    await addItem(ids, 'Kop van morgen', -1)
    await addItem(ids, 'Kop van gisteren', 1)

    expect(await titlesFor('kop')).toEqual(['Kop van gisteren'])
  })

  it('counts and shows the items of every kind of source that is not a podcast as news, as the homepage does', async () => {
    const club = await addSource({ domain: 'club.test', kind: 'club', name: 'Clubsite' })
    const video = await addSource({ domain: 'video.test', kind: 'video', name: 'Videokanaal' })
    const news = await addSource()

    await addItem(club, 'Kop van de club', 1)
    await addItem(video, 'Kop van een video', 2)
    await addItem(news, 'Kop van de krant', 3)

    const { hits, total } = await searchPublic(database.db, { limit: 2, until: now, words: ['kop'] })

    expect(total).toBe(3)
    expect(hits.map((hit) => [hit.kind, hit.title])).toEqual([
      ['news', 'Kop van de club'],
      ['news', 'Kop van een video'],
    ])
    expect(hits.map((hit) => hit.kind === 'news' && hit.sourceName)).toEqual(['Clubsite', 'Videokanaal'])
  })

  it('gives podcast episodes as episodes, with their facts', async () => {
    const news = await addSource()
    const podcast = await addSource({ domain: 'podcast.test', kind: 'podcast', name: 'Testpodcast' })

    await addItem(news, 'Nieuws over de wedstrijd', 2)
    await addItem(podcast, 'Aflevering over de wedstrijd', 1, {
      durationSeconds: 2220,
      episodeNumber: 16,
      seasonNumber: 9,
    })

    const { hits, total } = await searchPublic(database.db, { limit: 10, until: now, words: ['wedstrijd'] })

    expect(total).toBe(2)
    expect(hits.map((hit) => hit.kind)).toEqual(['podcast', 'news'])
    expect(hits[0]).toMatchObject({
      durationSeconds: 2220,
      episodeNumber: 16,
      seasonNumber: 9,
      sourceName: 'Testpodcast',
    })
    expect(hits[1]).toMatchObject({
      paywalled: false,
      sourceName: 'Testkrant',
      url: expect.stringContaining('https://'),
    })
  })

  it('uses the attribution of a source as its name', async () => {
    const ids = await addSource({ attribution: 'Testkrant, met dank' })

    await addItem(ids, 'Kop', 1)

    expect((await searchPublic(database.db, { limit: 10, until: now, words: ['kop'] })).hits[0]).toMatchObject({
      sourceName: 'Testkrant, met dank',
    })
  })

  it('finds an article in its title and in its intro, with every word in either', async () => {
    await addArticle('over-klaverboer', 'Over Klaverboer', 'Een verhaal over een speler.')
    await addArticle('de-selectie', 'De selectie', 'Klaverboer is de nieuwe aanvoerder.')
    await addArticle('iets-anders', 'Iets anders', 'Niets over hem.')

    expect(await titlesFor('klaverboer')).toEqual(['De selectie', 'Over Klaverboer'])
    expect(await titlesFor('klaverboer', 'speler')).toEqual(['Over Klaverboer'])
    expect(await titlesFor('selectie', 'aanvoerder')).toEqual(['De selectie'])
  })

  it('does not search the text of an article', async () => {
    await database.db.insert(articles).values({
      author: 'de redactie',
      body: 'Het woord ZEPPELIN staat alleen in de tekst.',
      createdBy: userId,
      intro: 'Een intro.',
      publishedAt: new Date(now.getTime() - day),
      slug: 'tekst',
      title: 'Titel',
      updatedBy: userId,
    })

    expect(await titlesFor('zeppelin')).toEqual([])
  })

  it('leaves out a draft and an article for later', async () => {
    await addArticle('concept', 'Concept over Klaverboer', 'Intro.', null)
    await addArticle('later', 'Later over Klaverboer', 'Intro.', new Date(now.getTime() + day))
    await addArticle('klaar', 'Klaar over Klaverboer', 'Intro.')

    expect(await titlesFor('klaverboer')).toEqual(['Klaar over Klaverboer'])
    expect((await searchPublic(database.db, { limit: 10, until: now, words: ['klaverboer'] })).total).toBe(1)
  })

  it('gives news, episodes and articles together, newest first', async () => {
    const news = await addSource()
    const podcast = await addSource({ domain: 'podcast.test', kind: 'podcast', name: 'Testpodcast' })

    await addItem(news, 'Kop 3 dagen oud', 3)
    await addItem(podcast, 'Aflevering 1 dag oud', 1)
    await addArticle('artikel', 'Artikel 2 dagen oud', 'Intro.', new Date(now.getTime() - 2 * day))
    await addItem(news, 'Kop 4 dagen oud', 4)

    const { hits } = await searchPublic(database.db, { limit: 10, until: now, words: ['oud'] })

    expect(hits.map((hit) => [hit.kind, hit.title])).toEqual([
      ['podcast', 'Aflevering 1 dag oud'],
      ['article', 'Artikel 2 dagen oud'],
      ['news', 'Kop 3 dagen oud'],
      ['news', 'Kop 4 dagen oud'],
    ])
    expect(hits.find((hit) => hit.kind === 'article')).toMatchObject({ slug: 'artikel' })
  })

  it('gives the newest hits up to the limit, and how many there are in all', async () => {
    const news = await addSource()

    for (let number = 1; number <= 7; number++) {
      await addItem(news, `Kop ${number}`, number)
    }
    await addArticle('artikel', 'Artikel kop', 'Intro.', new Date(now.getTime() - 2.5 * day))

    const { hits, total } = await searchPublic(database.db, { limit: 4, until: now, words: ['kop'] })

    expect(total).toBe(8)
    expect(hits.map((hit) => hit.title)).toEqual(['Kop 1', 'Kop 2', 'Artikel kop', 'Kop 3'])
  })
})

describe('listSquad', () => {
  it('gives the players of the season by shirt number, those without a number last, and nobody who left the squad', async () => {
    await database.db.insert(players).values([
      { name: 'Zonder Nummer', position: 'doelman', searchTerm: 'Nummer', season: '2026/27', shirtNumber: null },
      { name: 'Tien Speler', position: 'aanvaller', searchTerm: 'Speler', season: '2026/27', shirtNumber: 10 },
      { name: 'Een Keeper', position: 'doelman', searchTerm: 'Keeper', season: '2026/27', shirtNumber: 1 },
      { name: 'Oud Speler', position: 'aanvaller', searchTerm: 'Oud', season: '2025/26', shirtNumber: 9 },
      {
        inSquad: false,
        leftSquadAt: new Date('2027-01-31T12:00:00Z'),
        name: 'Vertrokken Speler',
        position: 'aanvaller',
        searchTerm: 'Speler',
        season: '2026/27',
        shirtNumber: 7,
      },
    ])

    expect(await listSquad(database.db, '2026/27')).toEqual([
      { name: 'Een Keeper', position: 'doelman', searchTerm: 'Keeper' },
      { name: 'Tien Speler', position: 'aanvaller', searchTerm: 'Speler' },
      { name: 'Zonder Nummer', position: 'doelman', searchTerm: 'Nummer' },
    ])
  })
})

describe('findSquadPage', () => {
  it('gives the title, the time of reading and the version of the page of the squad, and not those of the matches', async () => {
    const readAt = new Date('2026-10-25T12:05:00Z')

    await database.db.insert(wikipediaPages).values([
      {
        kind: 'squad',
        readAt,
        season: '2026/27',
        title: 'Sc Heerenveen in het seizoen 2026/27 (mannen)',
        version: 'Sat, 24 Oct 2026 10:30:00 GMT',
      },
      { kind: 'standings', readAt: new Date(), season: '2026/27', title: 'Eredivisie 2026/27' },
    ])

    expect(await findSquadPage(database.db, '2026/27')).toEqual({
      readAt,
      title: 'Sc Heerenveen in het seizoen 2026/27 (mannen)',
      version: 'Sat, 24 Oct 2026 10:30:00 GMT',
    })
    expect(await findSquadPage(database.db, '2025/26')).toBeUndefined()
  })
})
