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

const migration = '0056_add_editor_matches'

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

describe(`the migration ${migration}`, () => {
  it('keeps the matches as they are, and lets the editors add one with its source', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('NEC', 'nec')")
    await database.pool.query(
      "INSERT INTO matches (season, competition, round, opponent, club_id, home, status, match_date, kickoff_at, data_source) SELECT '2026/27', 'Eredivisie', 'Speelronde 1', 'NEC', id, 1, 'scheduled', '2026-10-31', '2026-10-31 17:45:00', 'wikipedia' FROM clubs LIMIT 1",
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT data_source, source_line FROM matches')).toMatchObject([
      { data_source: 'wikipedia', source_line: null },
    ])

    const add = (source: string, line: null | string, extra = '') =>
      database.pool.query(
        `INSERT INTO matches (season, competition, round, opponent, club_id, home, status, match_date, data_source, source_line${extra === '' ? '' : ', date_text'}) SELECT '2008/09', 'KNVB Beker', 'Finale', 'NEC', id, 1, 'scheduled', '2009-05-12', '${source}', ${line === null ? 'NULL' : `'${line}'`}${extra === '' ? '' : `, '${extra}'`} FROM clubs LIMIT 1`,
      )

    // A match of the editors needs its source, and may have a day without a time.
    await expect(add('redactie', null)).rejects.toThrow()
    await expect(add('redactie', '')).rejects.toThrow()
    await add('redactie', 'Leeuwarder Courant, 12 mei 2009')
    // A match from Wikipedia still needs a time or a text.
    await database.pool.query('DELETE FROM matches WHERE data_source = ?', ['redactie'])
    await expect(add('wikipedia', null)).rejects.toThrow()
    await add('wikipedia', null, 'mei 2009')
  })

  it('lets the log take the two actions of the editors', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    for (const action of ['match.add', 'match.delete']) {
      await database.pool.query('INSERT INTO audit_log (created_at, action, item_id) VALUES (?, ?, 1)', [
        '2026-11-09 10:00:00',
        action,
      ])
    }

    expect(await rows('SELECT COUNT(*) AS n FROM audit_log')).toMatchObject([{ n: 2 }])
  })

  it('does nothing the second time', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows("SHOW COLUMNS FROM matches LIKE 'source_line'")).toHaveLength(1)
  })
})
