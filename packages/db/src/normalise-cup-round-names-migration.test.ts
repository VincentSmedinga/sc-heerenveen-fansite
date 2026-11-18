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

const migration = '0089_normalise_cup_round_names'

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

const insert = (competition: string, round: string, season: string, day: string) =>
  `INSERT INTO matches (competition, round, season, match_date, date_text, opponent, club_id, home, status) VALUES ('${competition}', '${round}', '${season}', '${day}', 'dag', 'Willem II', (SELECT id FROM clubs WHERE slug = 'willem-ii'), 1, 'scheduled')`

describe(`the migration ${migration}`, () => {
  it('gives the rounds of the cup one spelling and leaves the rest alone', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO clubs (slug, name) VALUES ('willem-ii', 'Willem II')")
    await database.pool.query(insert('KNVB Beker', '3e ronde', '2008/09', '2008-10-01'))
    await database.pool.query(insert('KNVB Beker', 'Derde ronde', '2015/16', '2015-10-01'))
    await database.pool.query(insert('KNVB Beker', 'Achtste finales', '2015/16', '2015-12-01'))
    await database.pool.query(insert('KNVB Beker', 'Kwartfinales', '2016/17', '2017-02-01'))
    await database.pool.query(insert('KNVB Beker', 'Halve finales', '2016/17', '2017-03-01'))
    await database.pool.query(insert('KNVB Beker', 'Wedstrijd 6', '1996/97', '1997-03-01'))
    await database.pool.query(insert('Play-offs Conference League', 'Halve finale', '2022/23', '2023-05-01'))

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    const result = await rows('SELECT competition, round FROM matches ORDER BY match_date')

    expect(result.map((row) => `${row['competition']}: ${row['round']}`)).toEqual([
      'KNVB Beker: Wedstrijd 6',
      'KNVB Beker: Derde ronde',
      'KNVB Beker: Derde ronde',
      'KNVB Beker: Achtste finale',
      'KNVB Beker: Kwartfinale',
      'KNVB Beker: Halve finale',
      'Play-offs Conference League: Halve finale',
    ])
  })
})
