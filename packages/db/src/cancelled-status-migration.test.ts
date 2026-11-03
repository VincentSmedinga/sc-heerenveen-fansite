import type { RowDataPacket } from 'mysql2/promise'

import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const migration = '0037_add_cancelled_match_status'

let database: TestDatabase
let oldFolder: string

beforeEach(async () => {
  database = await createTestDatabase({ migrate: false })

  // The migrations as they were before this one: the same files, without it and the ones after
  // it in the journal.
  oldFolder = await mkdtemp(join(tmpdir(), 'fansite-migrations-'))
  await cp(migrationsFolder, oldFolder, { recursive: true })

  const journalPath = join(oldFolder, 'meta', '_journal.json')
  const journal = JSON.parse(await readFile(journalPath, 'utf8')) as { entries: { tag: string }[] }

  journal.entries = journal.entries.slice(
    0,
    journal.entries.findIndex((entry) => entry.tag === migration),
  )
  await writeFile(journalPath, JSON.stringify(journal))
})

afterEach(async () => {
  await rm(oldFolder, { force: true, recursive: true })
  // Undefined when the server wasn't there, which beforeEach has already reported.
  await database?.drop()
})

async function rows(sql: string) {
  const [result] = await database.pool.query<RowDataPacket[]>(sql)

  return result
}

const insert = (status: string, goals = 'NULL, NULL') =>
  `INSERT INTO matches (competition, round, season, match_date, date_text, opponent, club_id, home, status, goals_for, goals_against) VALUES ('Eredivisie', 'Speelronde 27', '2019/20', '2020-03-21', 'zaterdag 21 maart', 'Willem II', (SELECT id FROM clubs WHERE slug = 'willem-ii'), 1, '${status}', ${goals})`

describe(`the migration ${migration}`, () => {
  it('keeps the rows that were there as they are', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO clubs (slug, name) VALUES ('willem-ii', 'Willem II')")
    await database.pool.query(insert('postponed'))

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT opponent, status FROM matches')).toMatchObject([
      { opponent: 'Willem II', status: 'postponed' },
    ])
  })

  it('lets a match be cancelled, and not have a score', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    await database.pool.query("INSERT INTO clubs (slug, name) VALUES ('willem-ii', 'Willem II')")
    await database.pool.query(insert('cancelled'))

    expect(await rows('SELECT status, goals_for FROM matches')).toMatchObject([
      { goals_for: null, status: 'cancelled' },
    ])
    await expect(database.pool.query(insert('cancelled', '1, 0'))).rejects.toThrow()
  })

  it('does not let a cancelled match have extra time, penalties or an attendance', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO clubs (slug, name) VALUES ('willem-ii', 'Willem II')")

    await expect(
      database.pool.query(
        insert('cancelled')
          .replace('goals_against)', 'goals_against, attendance)')
          .replace('NULL, NULL)', 'NULL, NULL, 100)'),
      ),
    ).rejects.toThrow()
    await expect(
      database.pool.query(
        insert('cancelled')
          .replace('goals_against)', 'goals_against, extra_time)')
          .replace('NULL, NULL)', 'NULL, NULL, 1)'),
      ),
    ).rejects.toThrow()
    await expect(
      database.pool.query(
        insert('cancelled')
          .replace('goals_against)', 'goals_against, penalties_for, penalties_against)')
          .replace('NULL, NULL)', 'NULL, NULL, 4, 3)'),
      ),
    ).rejects.toThrow()
  })

  it('does nothing the second time', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows("SHOW COLUMNS FROM matches LIKE 'status'")).toHaveLength(1)
  })
})
