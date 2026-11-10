import type { RowDataPacket } from 'mysql2/promise'

import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { auditActions, personNameSources, playerSources } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const migration = '0061_add_players_of_the_editors'

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

const list = (values: readonly string[]) => `enum(${values.map((value) => `'${value}'`).join(',')})`

describe(`the migration ${migration}`, () => {
  it('keeps the persons and the players that were there, and its statements can run again', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO persons (wikipedia_page, name_source) VALUES ('Luca Oyen', 'manual')")
    await database.pool.query(
      "INSERT INTO players (season, name, search_term, source) VALUES ('2025/26', 'Luca Oyen', 'Oyen', 'verslag')",
    )
    await expect(database.pool.query('INSERT INTO persons (wikipedia_page) VALUES (NULL)')).rejects.toThrow()

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    // The journal keeps the migration from running again, so run the statements themselves.
    const sql = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of sql.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect(await rows('SELECT wikipedia_page, name_source FROM persons')).toEqual([
      { name_source: 'manual', wikipedia_page: 'Luca Oyen' },
    ])
    expect(await rows('SELECT name, source FROM players')).toEqual([{ name: 'Luca Oyen', source: 'verslag' }])
  })

  it('has the source redactie, last in the lists of the players and of the completeness of the squad', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(playerSources.at(-1)).toBe('redactie')
    expect(await rows("SHOW COLUMNS FROM players LIKE 'source'")).toMatchObject([
      { Default: 'selectie', Type: list(playerSources) },
    ])
    expect(await rows("SHOW COLUMNS FROM squad_completeness LIKE 'best_source'")).toMatchObject([
      { Type: list(playerSources) },
    ])
  })

  it('lets more than one person have no title, with a name of the editors, and keeps a title unique', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows("SHOW COLUMNS FROM persons LIKE 'name_source'")).toMatchObject([
      { Type: list(personNameSources) },
    ])

    await database.pool.query(
      "INSERT INTO persons (name, family_name, name_source) VALUES ('Jansen', 'Jansen', 'redactie')",
    )
    await database.pool.query(
      "INSERT INTO persons (name, family_name, name_source) VALUES ('Pietersen', 'Pietersen', 'redactie')",
    )
    await database.pool.query("INSERT INTO persons (wikipedia_page) VALUES ('Luca Oyen')")

    expect(await rows('SELECT COUNT(*) AS n FROM persons WHERE wikipedia_page IS NULL')).toMatchObject([{ n: 2 }])
    await expect(database.pool.query("INSERT INTO persons (wikipedia_page) VALUES ('Luca Oyen')")).rejects.toThrow()
  })

  it('has the three actions of a player in the log of the admin', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(auditActions.slice(-3)).toEqual(['player.add', 'player.edit', 'player.remove'])
    expect(await rows("SHOW COLUMNS FROM audit_log LIKE 'action'")).toMatchObject([{ Type: list(auditActions) }])
  })
})
