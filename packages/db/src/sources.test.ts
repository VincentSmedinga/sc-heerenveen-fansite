import type { RowDataPacket } from 'mysql2/promise'

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { sources } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM sources')
})

afterEach(() => {
  vi.unstubAllEnvs()
})

async function insert(columns: Record<string, boolean | number | string>) {
  const names = Object.keys(columns)

  await database.pool.query(
    `INSERT INTO sources (${names.map(() => '??').join(', ')}) VALUES (${names.map(() => '?').join(', ')})`,
    [...names, ...Object.values(columns)],
  )
}

const minimal = { domain: 'testkrant.test', kind: 'news', name: 'Testkrant' } as const

describe('a source with only a name, a domain and a kind', () => {
  const strictest = {
    allowEmbed: false,
    allowImage: false,
    attribution: null,
    consentDate: null,
    consentNote: null,
    consentStatus: 'none',
    enabled: true,
    introMaxLength: 0,
  }

  it('gets the strictest values when SQL inserts it', async () => {
    await insert(minimal)

    const rows = await database.db.select().from(sources)

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ ...minimal, ...strictest })
  })

  it('gets the strictest values when Drizzle inserts it', async () => {
    await database.db.insert(sources).values({ domain: 'testpodcast.test', kind: 'podcast', name: 'Testpodcast' })

    const rows = await database.db.select().from(sources)

    expect(rows[0]).toMatchObject({ domain: 'testpodcast.test', kind: 'podcast', name: 'Testpodcast', ...strictest })
  })
})

describe('the permission', () => {
  const policies = [
    ['an intro', { intro_max_length: 200 }],
    ['an image', { allow_image: true }],
    ['embedding', { allow_embed: true }],
  ] as const

  describe.each(['none', 'asked'])('when it is %s', (consentStatus) => {
    it.each(policies)('refuses a source that allows %s', async (_, policy) => {
      await expect(insert({ ...minimal, ...policy, consent_status: consentStatus })).rejects.toThrow(
        /sources_display_needs_consent/,
      )
      await expect(database.db.select().from(sources)).resolves.toHaveLength(0)
    })
  })

  it('accepts a source that allows an intro, an image and embedding once it has given permission', async () => {
    await insert({
      ...minimal,
      allow_embed: true,
      allow_image: true,
      consent_status: 'given',
      intro_max_length: 200,
    })

    await expect(database.db.select().from(sources)).resolves.toHaveLength(1)
  })

  it('refuses to widen the policy of a source without permission', async () => {
    await insert(minimal)

    await expect(database.pool.query('UPDATE sources SET intro_max_length = 200')).rejects.toThrow(
      /sources_display_needs_consent/,
    )
    await expect(database.pool.query('UPDATE sources SET allow_image = true')).rejects.toThrow(
      /sources_display_needs_consent/,
    )
    await expect(database.pool.query('UPDATE sources SET allow_embed = true')).rejects.toThrow(
      /sources_display_needs_consent/,
    )
  })

  it('refuses to withdraw the permission while the policy still goes beyond a headline', async () => {
    await insert({ ...minimal, allow_image: true, consent_status: 'given' })

    await expect(database.pool.query("UPDATE sources SET consent_status = 'none'")).rejects.toThrow(
      /sources_display_needs_consent/,
    )

    await database.pool.query("UPDATE sources SET allow_image = false, consent_status = 'none'")
  })
})

describe('the domain', () => {
  it('is unique, whatever the case', async () => {
    await insert(minimal)

    await expect(insert({ ...minimal, domain: 'Testkrant.TEST', name: 'Dubbel' })).rejects.toThrow(/Duplicate entry/)
  })
})

describe('times', () => {
  it('are UTC when the database fills them in, whatever the time zone of the session', async () => {
    const connection = await database.pool.getConnection()

    try {
      await connection.query("SET time_zone = '+05:00'")
      await connection.query('INSERT INTO sources (name, domain, kind) VALUES (?, ?, ?)', [
        'Testkrant',
        'testkrant.test',
        'news',
      ])

      const [rows] = await connection.query<RowDataPacket[]>(
        'SELECT TIMESTAMPDIFF(SECOND, created_at, UTC_TIMESTAMP()) AS age FROM sources',
      )

      expect(rows[0]?.['age']).toBeGreaterThanOrEqual(0)
      expect(rows[0]?.['age']).toBeLessThan(60)
    } finally {
      connection.release()
    }
  })

  it('are UTC when Drizzle writes and reads them, whatever the time zone of the computer', async () => {
    vi.stubEnv('TZ', 'Pacific/Auckland')

    await database.db.insert(sources).values({ ...minimal, createdAt: new Date('2026-10-21T22:30:00Z') })

    const [raw] = await database.pool.query<RowDataPacket[]>(
      'SELECT CAST(created_at AS CHAR) AS createdAt FROM sources',
    )
    const rows = await database.db.select().from(sources)

    expect(raw[0]?.['createdAt']).toBe('2026-10-21 22:30:00')
    expect(rows[0]?.createdAt).toEqual(new Date('2026-10-21T22:30:00Z'))
  })
})

describe('the tables', () => {
  it('store text as utf8mb4, whatever the default of the database is', async () => {
    const [tables] = await database.pool.query<RowDataPacket[]>(
      `SELECT table_name AS tableName, table_collation AS collation FROM information_schema.tables
       WHERE table_schema = DATABASE() AND table_type = 'BASE TABLE' AND table_name <> '__drizzle_migrations'`,
    )

    expect(tables.length).toBeGreaterThan(0)

    for (const table of tables) {
      expect(table['collation'], `the table ${String(table['tableName'])}`).toBe('utf8mb4_unicode_ci')
    }

    await insert({ ...minimal, name: 'Ûnôfhinklik Fryslân 🗞️' })

    const rows = await database.db.select().from(sources)

    expect(rows[0]?.name).toBe('Ûnôfhinklik Fryslân 🗞️')
  })
})
