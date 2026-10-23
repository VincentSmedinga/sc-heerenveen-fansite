import { eq } from 'drizzle-orm'
import { execFile } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { consentStatuses, feeds, sourceKinds, sources } from './schema.ts'
import { realSources, seedSources, testSources } from './seed.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

const seedScript = fileURLToPath(new URL('./seed.ts', import.meta.url))

/** Runs `pnpm db:seed` against the test database, with the given SITE_ENV. */
function runSeedScript(siteEnv: string) {
  return promisify(execFile)(process.execPath, [seedScript], {
    env: { ...process.env, DATABASE_URL: database.url, SITE_ENV: siteEnv },
  })
}

describe('the seed', () => {
  beforeEach(async () => {
    await database.pool.query('DELETE FROM sources')
  })

  it('makes no duplicates when it runs again', async () => {
    await seedSources(database.db)
    await seedSources(database.db)

    expect(await database.db.select().from(sources)).toHaveLength(testSources.length + realSources.length)
    expect(await database.db.select().from(feeds)).toHaveLength(
      realSources.reduce((count, source) => count + source.feeds.length, 0),
    )
  })

  it('leaves the ETag and Last-Modified of a feed alone when it runs again', async () => {
    await seedSources(database.db)
    await database.pool.query("UPDATE feeds SET etag = '\"v1\"', last_modified = 'Wed, 21 Oct 2026 07:28:00 GMT'")
    await seedSources(database.db)

    const rows = await database.db.select().from(feeds)

    expect(rows).not.toHaveLength(0)
    expect(rows.every((feed) => feed.etag === '"v1"' && feed.lastModified === 'Wed, 21 Oct 2026 07:28:00 GMT')).toBe(
      true,
    )
  })

  it('puts the Leeuwarder Courant in the register with its feed and the strictest policy', async () => {
    await seedSources(database.db)

    const [courant] = await database.db.select().from(sources).where(eq(sources.domain, 'www.lc.nl'))
    const courantFeeds = await database.db
      .select()
      .from(feeds)
      .where(eq(feeds.sourceId, courant?.id ?? 0))

    expect(courant).toMatchObject({
      allowEmbed: false,
      allowImage: false,
      enabled: true,
      introMaxLength: 0,
      kind: 'news',
      name: 'Leeuwarder Courant',
    })
    expect(courant?.consentStatus).not.toBe('given')
    expect(courant?.description).toBeTruthy()
    expect(courant?.description?.length).toBeLessThanOrEqual(300)
    expect(courantFeeds.map((feed) => feed.url)).toEqual(['https://www.lc.nl/sport/sc-heerenveen/rss/'])
  })

  it('puts Voetbal International in the register with its feed and the strictest policy', async () => {
    await seedSources(database.db)

    const [vi] = await database.db.select().from(sources).where(eq(sources.domain, 'www.vi.nl'))
    const viFeeds = await database.db
      .select()
      .from(feeds)
      .where(eq(feeds.sourceId, vi?.id ?? 0))

    expect(vi).toMatchObject({
      allowEmbed: false,
      allowImage: false,
      enabled: true,
      introMaxLength: 0,
      kind: 'news',
      name: 'Voetbal International',
    })
    expect(vi?.consentStatus).not.toBe('given')
    expect(vi?.description).toBeTruthy()
    expect(vi?.description?.length).toBeLessThanOrEqual(300)
    expect(viFeeds.map((feed) => feed.url)).toEqual(['https://www.vi.nl/feed/news.xml?tag=sc-heerenveen'])
  })

  it('puts the forum in the register as a forum, with its API as the feed and the strictest policy', async () => {
    await seedSources(database.db)

    const [forum] = await database.db.select().from(sources).where(eq(sources.domain, 'forum.heerenveen.org'))
    const forumFeeds = await database.db
      .select()
      .from(feeds)
      .where(eq(feeds.sourceId, forum?.id ?? 0))

    expect(forum).toMatchObject({
      allowEmbed: false,
      allowImage: false,
      enabled: true,
      introMaxLength: 0,
      kind: 'forum',
      name: 'sc Heerenveen Forum',
    })
    expect(forum?.consentStatus).not.toBe('given')
    expect(forum?.description).toBeTruthy()
    expect(forum?.description?.length).toBeLessThanOrEqual(300)
    expect(forumFeeds.map((feed) => feed.url)).toEqual([
      'https://forum.heerenveen.org/api/discussions?sort=-lastPostedAt&page[limit]=30&include=lastPostedUser,tags',
    ])
  })

  it('holds made-up test sources only, and real sources that are not made up', () => {
    for (const source of testSources) {
      expect(source.domain, source.name).toMatch(/\.test$/)
    }
    for (const source of realSources) {
      expect(source.domain, source.name).not.toMatch(/\.test$/)
    }
  })

  it('covers every kind, every permission, and a source that is switched off', () => {
    expect(new Set(testSources.map((source) => source.kind))).toEqual(new Set(sourceKinds))
    expect(new Set(testSources.map((source) => source.consentStatus ?? 'none'))).toEqual(new Set(consentStatuses))
    expect(testSources.some((source) => source.enabled === false)).toBe(true)
  })

  it('has sources with different policies', () => {
    expect(testSources.some((source) => (source.introMaxLength ?? 0) > 0)).toBe(true)
    expect(testSources.some((source) => source.allowImage === true)).toBe(true)
    expect(testSources.some((source) => source.allowEmbed === true)).toBe(true)
    expect(testSources.some((source) => source.attribution !== undefined)).toBe(true)
  })

  it('has sources with a description and a source without one', () => {
    expect(testSources.some((source) => source.description !== undefined)).toBe(true)
    expect(testSources.some((source) => source.enabled !== false && source.description === undefined)).toBe(true)
  })

  it('runs from the command line when SITE_ENV is local', async () => {
    const { stdout } = await runSeedScript('local')

    expect(stdout).toContain(`${testSources.length} test sources`)
    expect(await database.db.select().from(sources)).toHaveLength(testSources.length + realSources.length)
  })

  it('refuses to run from the command line when SITE_ENV is production, and writes nothing', async () => {
    await expect(runSeedScript('production')).rejects.toMatchObject({
      code: 1,
      stderr: expect.stringContaining('SITE_ENV=production'),
    })
    expect(await database.db.select().from(sources)).toHaveLength(0)
    expect(await database.db.select().from(feeds)).toHaveLength(0)
  })
})
