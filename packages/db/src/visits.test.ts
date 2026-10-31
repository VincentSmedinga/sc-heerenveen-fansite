import type { RowDataPacket } from 'mysql2/promise'

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { createTestDatabase } from './test-database.ts'
import { createVisitCounter, removeVisitorData, visitDay, visitorHash } from './visits.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  for (const table of ['page_views', 'daily_visitors', 'visitor_salts', 'visitor_hashes']) {
    await database.pool.query('DELETE FROM ??', [table])
  }
})

const morning = new Date('2026-10-26T08:00:00Z')

const browser = 'Mozilla/5.0 (X11; Linux x86_64; rv:130.0) Gecko/20100101 Firefox/130.0'

async function rows(table: string) {
  const [result] = await database.pool.query<RowDataPacket[]>('SELECT * FROM ?? ORDER BY 1, 2', [table])

  return result.map((row) => ({ ...row, day: row['day'] instanceof Date ? visitDay(row['day']) : row['day'] }))
}

describe('visitDay', () => {
  it('gives the day in the Netherlands, in summer and winter time', () => {
    expect(visitDay(new Date('2026-10-26T08:00:00Z'))).toBe('2026-10-26')
    // 23:30 UTC on 24 October is already 25 October in the Netherlands (UTC+2), and on 26
    // October after the clocks went back (UTC+1) it is 00:30 on the 27th.
    expect(visitDay(new Date('2026-10-24T22:30:00Z'))).toBe('2026-10-25')
    expect(visitDay(new Date('2026-10-26T23:30:00Z'))).toBe('2026-10-27')
  })
})

describe('visitorHash', () => {
  it('depends on the salt, the address and the browser', () => {
    const hash = visitorHash('salt', '203.0.113.7', browser)

    expect(hash).toMatch(/^[0-9a-f]{64}$/)
    expect(visitorHash('salt', '203.0.113.7', browser)).toBe(hash)
    expect(visitorHash('other salt', '203.0.113.7', browser)).not.toBe(hash)
    expect(visitorHash('salt', '203.0.113.8', browser)).not.toBe(hash)
    expect(visitorHash('salt', '203.0.113.7', 'Safari')).not.toBe(hash)
  })

  it('does not mix up an address and a browser text that run into each other', () => {
    expect(visitorHash('salt', '1.2.3.4', '5 Safari')).not.toBe(visitorHash('salt', '1.2.3.45', ' Safari'))
  })
})

describe('createVisitCounter', () => {
  it('counts each view of a page, and each visitor once a day', async () => {
    const counter = createVisitCounter(database.db)

    await counter.record({ address: '203.0.113.7', now: morning, path: '/', userAgent: browser })
    await counter.record({ address: '203.0.113.7', now: morning, path: '/', userAgent: browser })
    await counter.record({ address: '203.0.113.7', now: morning, path: '/nieuws/podcasts', userAgent: browser })
    await counter.record({ address: '203.0.113.8', now: morning, path: '/', userAgent: browser })
    await counter.record({ address: '203.0.113.7', now: morning, path: '/', userAgent: 'Safari' })

    expect(await rows('page_views')).toEqual([
      { day: '2026-10-26', path: '/', views: 4 },
      { day: '2026-10-26', path: '/nieuws/podcasts', views: 1 },
    ])
    // Three visitors: two addresses, and the first address with another browser.
    expect(await rows('daily_visitors')).toEqual([{ day: '2026-10-26', visitors: 3 }])
    expect(await rows('visitor_hashes')).toHaveLength(3)
  })

  it('counts a visitor again on the next day, with a salt of its own', async () => {
    const counter = createVisitCounter(database.db)
    const visit = { address: '203.0.113.7', path: '/', userAgent: browser }

    await counter.record({ ...visit, now: morning })
    await counter.record({ ...visit, now: new Date('2026-10-27T08:00:00Z') })

    expect(await rows('daily_visitors')).toEqual([
      { day: '2026-10-26', visitors: 1 },
      { day: '2026-10-27', visitors: 1 },
    ])

    // The counters are kept, but nothing is left of the first day: the salt and the hash.
    const salts = await rows('visitor_salts')

    expect(salts).toHaveLength(1)
    expect(salts[0]).toMatchObject({ day: '2026-10-27' })
    expect(await rows('visitor_hashes')).toMatchObject([{ day: '2026-10-27' }])
  })

  it('gives the same salt to a second process and counts the visitor once', async () => {
    const first = createVisitCounter(database.db)
    const second = createVisitCounter(database.db)
    const visit = { address: '203.0.113.7', now: morning, path: '/', userAgent: browser }

    await Promise.all([first.record(visit), second.record(visit)])
    await second.record(visit)

    expect(await rows('visitor_salts')).toHaveLength(1)
    expect(await rows('daily_visitors')).toEqual([{ day: '2026-10-26', visitors: 1 }])
    expect(await rows('page_views')).toEqual([{ day: '2026-10-26', path: '/', views: 3 }])
  })

  it('counts the view but no visitor when there is no address', async () => {
    const counter = createVisitCounter(database.db)

    await counter.record({ address: undefined, now: morning, path: '/', userAgent: browser })

    expect(await rows('page_views')).toEqual([{ day: '2026-10-26', path: '/', views: 1 }])
    expect(await rows('daily_visitors')).toEqual([])
    expect(await rows('visitor_hashes')).toEqual([])
  })

  it('keeps the address and the browser text out of every table', async () => {
    const counter = createVisitCounter(database.db)
    const address = '2001:db8:85a3::8a2e:370:7334'

    await counter.record({ address, now: morning, path: '/', userAgent: browser })
    await counter.record({ address: '198.51.100.23', now: morning, path: '/privacy', userAgent: browser })

    const [tables] = await database.pool.query<RowDataPacket[]>(
      'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()',
    )

    expect(tables.length).toBeGreaterThan(4)

    for (const { name } of tables) {
      const content = JSON.stringify(await rows(String(name)))

      for (const secret of [address, '198.51.100.23', browser, 'Firefox', 'Mozilla', '2001:db8', '198.51']) {
        expect(content, `the table ${String(name)} holds "${secret}"`).not.toContain(secret)
      }
    }
  })
})

describe('removeVisitorData', () => {
  it('removes the salt and the hashes of the days before today, and keeps the counters', async () => {
    const counter = createVisitCounter(database.db)
    const visit = { address: '203.0.113.7', path: '/', userAgent: browser }

    await counter.record({ ...visit, now: new Date('2026-10-25T08:00:00Z') })
    await counter.record({ ...visit, now: morning })
    await database.pool.query("INSERT INTO visitor_hashes (day, hash) VALUES ('2026-10-25', REPEAT('a', 64))")
    await database.pool.query("INSERT INTO visitor_salts (day, salt) VALUES ('2026-10-25', REPEAT('b', 64))")

    await removeVisitorData(database.db, morning)

    expect(await rows('visitor_salts')).toMatchObject([{ day: '2026-10-26' }])
    expect(await rows('visitor_hashes')).toMatchObject([{ day: '2026-10-26' }])
    expect(await rows('daily_visitors')).toHaveLength(2)
    expect(await rows('page_views')).toHaveLength(2)
  })

  it('leaves nothing of yesterday when the day is over and nobody visits', async () => {
    const counter = createVisitCounter(database.db)

    await counter.record({ address: '203.0.113.7', now: morning, path: '/', userAgent: browser })
    await removeVisitorData(database.db, new Date('2026-10-27T00:05:00Z'))

    // 00:05 UTC on the 27th is 01:05 in the Netherlands: the 26th is over.
    expect(await rows('visitor_salts')).toEqual([])
    expect(await rows('visitor_hashes')).toEqual([])
    expect(await rows('daily_visitors')).toEqual([{ day: '2026-10-26', visitors: 1 }])
  })

  it('keeps today when it is still today in the Netherlands', async () => {
    const counter = createVisitCounter(database.db)

    await counter.record({
      address: '203.0.113.7',
      now: new Date('2026-10-26T20:00:00Z'),
      path: '/',
      userAgent: browser,
    })
    // 22:30 UTC is 23:30 in the Netherlands: still the 26th.
    await removeVisitorData(database.db, new Date('2026-10-26T22:30:00Z'))

    expect(await rows('visitor_salts')).toHaveLength(1)
    expect(await rows('visitor_hashes')).toHaveLength(1)
  })
})
