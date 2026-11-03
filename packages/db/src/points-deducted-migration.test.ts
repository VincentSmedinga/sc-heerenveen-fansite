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

const migration = '0033_add_points_deducted'

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
  it('gives the rows of the table that were there no deduction', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query(
      "INSERT INTO standings (season, position, club, played, won, drawn, lost, goals_for, goals_against, goal_difference, points, valid_on) VALUES ('2025/26', 1, 'Ajax', 34, 22, 7, 5, 72, 30, 42, 73, '2026-05-17')",
    )

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows('SELECT club, points, points_deducted FROM standings')).toMatchObject([
      { club: 'Ajax', points: 73, points_deducted: 0 },
    ])
  })

  it('keeps a deduction from being negative', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    await expect(
      database.pool.query(
        "INSERT INTO standings (season, position, club, played, won, drawn, lost, goals_for, goals_against, goal_difference, points, points_deducted, valid_on) VALUES ('2025/26', 1, 'Ajax', 34, 22, 7, 5, 72, 30, 42, 73, -1, '2026-05-17')",
      ),
    ).rejects.toThrow()
  })

  it('does nothing the second time', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(await rows("SHOW COLUMNS FROM standings LIKE 'points_deducted'")).toHaveLength(1)
  })
})
