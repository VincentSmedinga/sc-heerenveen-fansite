import type { RowDataPacket } from 'mysql2/promise'

import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { playerSources } from './schema.ts'
import { seedSquad } from './seed.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const migration = '0042_add_player_source'

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
  it('gives the players that were there the source selectie, keeps their position, and does nothing the second time', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query(
      "INSERT INTO players (season, name, position, search_term) VALUES ('2025/26', 'Luca Oyen', 'aanvaller', 'Oyen')",
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT name, position, source FROM players')).toEqual([
      { name: 'Luca Oyen', position: 'aanvaller', source: 'selectie' },
    ])
  })

  it('lets a player have no position, and needs a source that is in the list', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows("SHOW COLUMNS FROM players LIKE 'position'")).toMatchObject([{ Null: 'YES' }])
    expect(await rows("SHOW COLUMNS FROM players LIKE 'source'")).toMatchObject([{ Default: 'selectie', Null: 'NO' }])

    await database.pool.query(
      "INSERT INTO players (season, name, search_term, source) VALUES ('1995/96', 'Jan Vos', 'Vos', 'transfers')",
    )

    expect(await rows('SELECT position, source FROM players')).toEqual([{ position: null, source: 'transfers' }])
    await expect(
      database.pool.query(
        "INSERT INTO players (season, name, search_term, source) VALUES ('1995/96', 'Piet Bos', 'Bos', 'gok')",
      ),
    ).rejects.toThrow()
  })

  it('has the sources in the database in the order of the list, from the most complete', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    const [column] = await rows("SHOW COLUMNS FROM players LIKE 'source'")

    expect(column.Type).toBe(`enum(${playerSources.map((source) => `'${source}'`).join(',')})`)
  })

  it('gives the players of the seed the source selectie', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await seedSquad(database.db)).toBe(true)
    expect(await rows("SELECT COUNT(*) AS n FROM players WHERE source <> 'selectie'")).toMatchObject([{ n: 0 }])
    expect(await rows('SELECT COUNT(*) AS n FROM players')).not.toMatchObject([{ n: 0 }])
  })
})
