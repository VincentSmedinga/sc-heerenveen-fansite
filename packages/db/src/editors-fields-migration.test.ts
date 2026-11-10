import type { RowDataPacket } from 'mysql2/promise'

import { cp, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { prepareDatabase } from './prepare.ts'
import { auditActions, playerFields } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

const migrationsFolder = fileURLToPath(new URL('../drizzle', import.meta.url))

const migration = '0062_add_editors_fields_of_players'

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

const list = (kind: string, values: readonly string[]) => `${kind}(${values.map((value) => `'${value}'`).join(',')})`

describe(`the migration ${migration}`, () => {
  it('marks what the editors set since issue 1020, and its statements can run again', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query(
      `INSERT INTO players (id, season, name, search_term, source, shirt_number, position, wikipedia_page) VALUES
        (1, '2025/26', 'Sanne Spits', 'Spits', 'redactie', 9, NULL, NULL),
        (2, '2025/26', 'Jelle Jong', 'Jong', 'redactie', NULL, 'aanvaller', 'Jelle Jong'),
        (3, '2025/26', 'Luca Oyen', 'Oyen', 'selectie', 7, 'aanvaller', NULL),
        (4, '2025/26', 'Pelle Proef', 'Proef', 'selectie', 8, 'aanvaller', NULL),
        (5, '2025/26', 'Mats Made', 'Made', 'selectie', 4, 'verdediger', NULL)`,
    )
    await database.pool.query(
      "INSERT INTO admin_users (id, email, role) VALUES (1, 'redactie@example.org', 'beheerder')",
    )
    await database.pool.query(
      `INSERT INTO audit_log (user_id, action, item_id, detail, created_at) VALUES
        (1, 'player.edit', 3, 'Aangepast: Luca Oyen, 2025/26. rugnummer: 17 → 7; positie: middenvelder → aanvaller', UTC_TIMESTAMP()),
        (1, 'player.edit', 4, 'Aangepast: Pelle Proeff, 2025/26. naam: Pelle Proeff → Pelle Proef; Wikipedia: geen → Pelle Proef', UTC_TIMESTAMP()),
        (1, 'player.edit', 4, 'Aangepast: Pelle Proef, 2025/26. Wikipedia: Pelle Proef → geen', UTC_TIMESTAMP()),
        (1, 'player.remove', 5, 'Uit de selectie gehaald: Mats Made, 2025/26', UTC_TIMESTAMP())`,
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    const marked = [
      { editors_fields: 'name,shirt_number', id: 1 },
      { editors_fields: 'name,position,wikipedia_page', id: 2 },
      { editors_fields: 'shirt_number,position', id: 3 },
      { editors_fields: 'name,wikipedia_page', id: 4 },
      { editors_fields: '', id: 5 },
    ]

    expect(await rows('SELECT id, editors_fields FROM players ORDER BY id')).toEqual(marked)

    // The journal keeps the migration from running again, so run the statements themselves.
    const sql = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of sql.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect(await rows('SELECT id, editors_fields FROM players ORDER BY id')).toEqual(marked)
  })

  it('has the list of the fields of the editors on a player, empty for a new one', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows("SHOW COLUMNS FROM players LIKE 'editors_fields'")).toMatchObject([
      { Default: '', Null: 'NO', Type: list('set', playerFields) },
    ])
    expect(await rows("SHOW COLUMNS FROM player_field_differences LIKE 'field'")).toMatchObject([
      { Type: list('enum', playerFields) },
    ])
  })

  it('removes the differences of a player with the player', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await database.pool.query(
      "INSERT INTO players (id, season, name, search_term) VALUES (1, '2025/26', 'Sanne Spits', 'Spits')",
    )
    await database.pool.query(
      `INSERT INTO player_field_differences (player_id, season, field, import_value, status, first_seen_at, last_seen_at)
        VALUES (1, '2025/26', 'shirt_number', '9', 'pending', UTC_TIMESTAMP(), UTC_TIMESTAMP())`,
    )
    await database.pool.query('DELETE FROM players')

    expect(await rows('SELECT COUNT(*) AS n FROM player_field_differences')).toMatchObject([{ n: 0 }])
  })

  it('has the two decisions about a field of a player in the log of the admin', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(auditActions.slice(-2)).toEqual(['player.field-take-over', 'player.field-keep'])
    expect(await rows("SHOW COLUMNS FROM audit_log LIKE 'action'")).toMatchObject([
      { Type: list('enum', auditActions) },
    ])
  })
})
