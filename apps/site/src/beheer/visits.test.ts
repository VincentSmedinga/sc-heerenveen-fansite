import type { TestDatabase } from '@fansite/db/test-database'

import { dailyVisitors, pageViews } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { days, lastDays, topLength, visitNumbers } from './visits'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM page_views')
  await database.pool.query('DELETE FROM daily_visitors')
})

// Noon in the Netherlands on Monday 26 October 2026, the day the clocks went back.
const now = new Date('2026-10-26T11:00:00Z')

describe('lastDays', () => {
  it('gives today first and then the days before it, across a month and a year', () => {
    expect(lastDays(now, 3)).toEqual(['2026-10-26', '2026-10-25', '2026-10-24'])
    expect(lastDays(new Date('2027-01-02T12:00:00Z'), 4)).toEqual([
      '2027-01-02',
      '2027-01-01',
      '2026-12-31',
      '2026-12-30',
    ])
  })

  it('takes the day in the Netherlands, not in UTC', () => {
    // 23:30 UTC on the 25th is half past midnight on the 26th in the Netherlands (UTC+1).
    expect(lastDays(new Date('2026-10-25T23:30:00Z'), 1)).toEqual(['2026-10-26'])
  })
})

describe('visitNumbers', () => {
  it('gives every one of the 30 days, newest first, a day without counters as zero', async () => {
    await database.db.insert(dailyVisitors).values({ day: '2026-10-26', visitors: 4 })
    await database.db.insert(pageViews).values({ day: '2026-10-26', path: '/', views: 9 })

    const { perDay } = await visitNumbers(database.db, now)

    expect(perDay).toHaveLength(days)
    expect(perDay[0]).toEqual({ day: '2026-10-26', views: 9, visitors: 4 })
    expect(perDay[1]).toEqual({ day: '2026-10-25', views: 0, visitors: 0 })
    expect(perDay.at(-1)?.day).toBe('2026-09-27')
  })

  it('adds the views of all pages of a day', async () => {
    await database.db.insert(pageViews).values([
      { day: '2026-10-26', path: '/', views: 5 },
      { day: '2026-10-26', path: '/nieuws/podcasts', views: 2 },
    ])

    expect((await visitNumbers(database.db, now)).perDay[0]).toEqual({ day: '2026-10-26', views: 7, visitors: 0 })
  })

  it('totals the last 7 and the last 30 days, and leaves out what is older', async () => {
    await database.db.insert(dailyVisitors).values([
      { day: '2026-10-26', visitors: 10 },
      { day: '2026-10-20', visitors: 5 },
      { day: '2026-10-19', visitors: 3 },
      { day: '2026-09-27', visitors: 2 },
      { day: '2026-09-26', visitors: 100 },
    ])
    await database.db.insert(pageViews).values([
      { day: '2026-10-26', path: '/', views: 20 },
      { day: '2026-10-20', path: '/', views: 8 },
      { day: '2026-10-19', path: '/', views: 4 },
      { day: '2026-09-27', path: '/', views: 3 },
      { day: '2026-09-26', path: '/', views: 1000 },
    ])

    const { total, totalShort } = await visitNumbers(database.db, now)

    // The 7 days run from the 20th to the 26th.
    expect(totalShort).toEqual({ views: 28, visitors: 15 })
    expect(total).toEqual({ views: 35, visitors: 20 })
  })

  it('lists the most viewed pages of the 30 days, most first, ties by path', async () => {
    await database.db.insert(pageViews).values([
      { day: '2026-10-26', path: '/nieuws/podcasts', views: 3 },
      { day: '2026-10-25', path: '/nieuws/podcasts', views: 4 },
      { day: '2026-10-26', path: '/', views: 5 },
      { day: '2026-10-26', path: '/bronnen', views: 7 },
      { day: '2026-10-26', path: '/contact', views: 7 },
      { day: '2026-09-26', path: '/over-ons', views: 99 },
    ])

    expect((await visitNumbers(database.db, now)).topPages).toEqual([
      { path: '/bronnen', views: 7 },
      { path: '/contact', views: 7 },
      { path: '/nieuws/podcasts', views: 7 },
      { path: '/', views: 5 },
    ])
  })

  it('lists at most as many pages as the page shows', async () => {
    await database.db
      .insert(pageViews)
      .values(
        Array.from({ length: topLength + 5 }, (_, index) => ({ day: '2026-10-26', path: `/p${index}`, views: 1 })),
      )

    expect((await visitNumbers(database.db, now)).topPages).toHaveLength(topLength)
  })

  it('gives zeros and no pages when nothing has been counted', async () => {
    const numbers = await visitNumbers(database.db, now)

    expect(numbers.topPages).toEqual([])
    expect(numbers.total).toEqual({ views: 0, visitors: 0 })
    expect(numbers.totalShort).toEqual({ views: 0, visitors: 0 })
    expect(numbers.perDay.every((row) => row.views === 0 && row.visitors === 0)).toBe(true)
  })
})
