import type { TestDatabase } from '@fansite/db/test-database'

import { matches, standings, wikipediaPages } from '@fansite/db/schema'
import { madeUpMatches, madeUpTable } from '@fansite/db/seed'
import { seedStaff } from '@fansite/db/staff-seed'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

// The matches page asks the database for one season at a time. This reads them the way the page
// does, from a real database with two seasons in it: the current one and an earlier one, made
// up, whose matches, table and Wikipedia pages differ, so a question about the wrong season
// shows.

vi.mock('./database', () => ({ getDatabase: () => database }))

let database: TestDatabase

// Friday 23 October 2026, in the season 2026/27.
const now = new Date('2026-10-23T13:40:00Z')
const earlier = new Date('2025-10-23T13:40:00Z')

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  vi.resetModules()
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(now)
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM standings')
  await database.pool.query('DELETE FROM wikipedia_pages')
  await database.pool.query('DELETE FROM staff')
  await seedStaff(database.db)
  await database.db.insert(matches).values(madeUpMatches(now))
  await database.db.insert(matches).values(madeUpMatches(earlier).slice(0, 3))
  await database.db.insert(standings).values(madeUpTable(now))
  await database.db.insert(standings).values(madeUpTable(earlier).slice(0, 4))
  await database.db.insert(wikipediaPages).values([
    { kind: 'standings', readAt: now, season: '2026/27', title: 'Eredivisie 2026/27' },
    { kind: 'standings', readAt: earlier, season: '2025/26', title: 'Eredivisie 2025/26' },
    { kind: 'cup', readAt: earlier, season: '2025/26', title: 'KNVB Beker 2025/26' },
  ])
})

afterEach(() => {
  vi.useRealTimers()
})

describe('getMatchData', () => {
  it('gives the current season when it is asked for no season, as the homepage does', async () => {
    const { getMatchData } = await import('./matches')
    const data = await getMatchData()

    expect(data.season).toBe('2026/27')
    expect(data.matches).toHaveLength(madeUpMatches(now).length)
    expect(data.standings).toHaveLength(madeUpTable(now).length)
    expect(data.pages.map((page) => page.title)).toEqual(['Eredivisie 2026/27'])
  })

  it('gives the matches, the table and the pages of the season it is asked for and of no other', async () => {
    const { getMatchData } = await import('./matches')
    const data = await getMatchData('2025/26')

    expect(data.season).toBe('2025/26')
    expect(data.matches).toHaveLength(3)
    expect(data.matches.every((match) => match.matchDate.startsWith('2025-'))).toBe(true)
    expect(data.standings).toHaveLength(4)
    expect(data.pages.map((page) => page.title).toSorted()).toEqual(['Eredivisie 2025/26', 'KNVB Beker 2025/26'])
  })

  it('gives nothing for a season without data, and does not take the current season for it', async () => {
    const { getMatchData } = await import('./matches')
    const data = await getMatchData('2010/11')

    expect(data).toMatchObject({ matches: [], pages: [], season: '2010/11', standings: [] })
  })

  it('gives the head coaches of the season it is asked for, in the order they began', async () => {
    const { getMatchData } = await import('./matches')

    expect((await getMatchData()).coaches.map((coach) => coach.name)).toEqual(['Robin Veldman'])
    expect((await getMatchData('2024/25')).coaches.map((coach) => [coach.name, coach.interim])).toEqual([
      ['Robin van Persie', false],
      ['Henk Brugge', true],
      ['Robin Veldman', false],
    ])
    expect((await getMatchData('2010/11')).coaches.map((coach) => coach.name)).toEqual(['Ron Jans'])
  })

  it('keeps the current season for the homepage after a visit to an earlier season', async () => {
    const { getMatchData } = await import('./matches')

    await getMatchData('2025/26')

    expect((await getMatchData()).season).toBe('2026/27')
    expect((await getMatchData()).matches).toHaveLength(madeUpMatches(now).length)
  })

  it('keeps the current season for five minutes and an earlier season for an hour', async () => {
    const { getMatchData } = await import('./matches')
    const first = await getMatchData()
    const firstEarlier = await getMatchData('2025/26')

    vi.setSystemTime(new Date(now.getTime() + 4 * 60 * 1000))
    expect(await getMatchData()).toBe(first)
    expect(await getMatchData('2025/26')).toBe(firstEarlier)

    vi.setSystemTime(new Date(now.getTime() + 6 * 60 * 1000))
    expect(await getMatchData()).not.toBe(first)
    expect(await getMatchData('2025/26')).toBe(firstEarlier)

    vi.setSystemTime(new Date(now.getTime() + 61 * 60 * 1000))
    expect(await getMatchData('2025/26')).not.toBe(firstEarlier)
  })
})

describe('getMatchSeasons', () => {
  it('gives the seasons that have matches, the newest first', async () => {
    const { getMatchSeasons } = await import('./matches')

    expect(await getMatchSeasons()).toEqual(['2026/27', '2025/26'])
  })

  it('has the current season also before its first match is in the database', async () => {
    await database.pool.query("DELETE FROM matches WHERE season = '2026/27'")

    const { getMatchSeasons } = await import('./matches')

    expect(await getMatchSeasons()).toEqual(['2026/27', '2025/26'])
  })

  it('leaves a season after the current one out, because it has no page', async () => {
    await database.db.insert(matches).values(madeUpMatches(new Date('2027-10-23T13:40:00Z')).slice(0, 1))

    const { getMatchSeasons } = await import('./matches')

    expect(await getMatchSeasons()).toEqual(['2026/27', '2025/26'])
  })

  it('leaves a season out that has only a table or a page', async () => {
    await database.db.insert(standings).values(madeUpTable(new Date('2024-10-23T13:40:00Z')).slice(0, 1))

    const { getMatchSeasons } = await import('./matches')

    expect(await getMatchSeasons()).toEqual(['2026/27', '2025/26'])
  })
})
