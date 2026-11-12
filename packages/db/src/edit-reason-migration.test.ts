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

const migration = '0074_make_edit_reason_optional'

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
  it('lets an entry have no reason, and clears every reason with Wikipedia or Transfermarkt in it', async () => {
    await prepareDatabase({ migrationsFolder: oldFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('NEC', 'nec')")
    await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('redactie@example.org', 'editor')")

    for (const [round, reason] of [
      ['Speelronde 1', 'Wikipedia'],
      ['Speelronde 2', 'Wikipedia-pagina van de club'],
      ['Speelronde 3', 'Gegevens van TRANSFERMARKT.nl'],
      ['Speelronde 4', 'Uit het clubblad'],
    ] as const) {
      await database.pool.query(
        "INSERT INTO matches (season, competition, round, opponent, club_id, home, status, match_date, kickoff_at, data_source) SELECT '2026/27', 'Eredivisie', ?, 'NEC', id, 1, 'scheduled', '2026-10-31', '2026-10-31 17:45:00', 'wikipedia' FROM clubs LIMIT 1",
        [round],
      )
      await database.pool.query(
        "INSERT INTO match_edits (match_id, kickoff_edited, edited_by, edited_at, reason, before_match, before_goals) SELECT m.id, 1, a.id, '2026-11-09 10:00:00', ?, '{}', '[]' FROM matches m, admin_users a WHERE m.round = ?",
        [reason, round],
      )
    }

    // The log: reasons of a person, one of the importer, one without words, and the detail of a
    // person.edit with the reason at the end.
    const log = async (action: string, user: boolean, reason: null | string, detail: null | string) =>
      database.pool.query(
        `INSERT INTO audit_log (created_at, user_id, action, item_id, reason, detail) SELECT '2026-11-09 10:00:00', ${user ? 'id' : 'NULL'}, ?, 1, ?, ? FROM admin_users`,
        [action, reason, detail],
      )

    await log('match.edit', true, 'wikipedia', 'x')
    await log('match.edit', true, 'Wikipedia-pagina van de club', 'x')
    await log('match.undo', true, 'Via Transfermarkt', 'x')
    await log('match.undo', true, 'Uit het clubblad', 'x')
    await log('match.take-over', false, 'Niemand besliste in zeven dagen, dus de import nam Wikipedia over', 'x')
    await log(
      'person.edit',
      true,
      null,
      'Aangepast: Jan Verzonnen. land: geen → NL. Reden: Wikipedia-pagina van de club',
    )
    await log('person.edit', true, null, 'Aangepast: Jan Verzonnen. land: geen → NL. Reden: transfermarkt')
    await log('person.edit', true, null, 'Aangepast: Jan Verzonnen. land: geen → NL. Reden: Uit het clubblad')
    await log('person.edit', true, null, 'Aangepast: Jan Verzonnen. land: geen → NL')

    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })

    expect(
      await rows('SELECT m.round, e.reason FROM match_edits e JOIN matches m ON m.id = e.match_id ORDER BY m.round'),
    ).toEqual([
      { reason: null, round: 'Speelronde 1' },
      { reason: null, round: 'Speelronde 2' },
      { reason: null, round: 'Speelronde 3' },
      { reason: 'Uit het clubblad', round: 'Speelronde 4' },
    ])
    expect(await rows('SELECT action, reason, detail FROM audit_log ORDER BY id')).toEqual([
      { action: 'match.edit', detail: 'x', reason: null },
      { action: 'match.edit', detail: 'x', reason: null },
      { action: 'match.undo', detail: 'x', reason: null },
      { action: 'match.undo', detail: 'x', reason: 'Uit het clubblad' },
      {
        action: 'match.take-over',
        detail: 'x',
        reason: 'Niemand besliste in zeven dagen, dus de import nam Wikipedia over',
      },
      { action: 'person.edit', detail: 'Aangepast: Jan Verzonnen. land: geen → NL.', reason: null },
      { action: 'person.edit', detail: 'Aangepast: Jan Verzonnen. land: geen → NL.', reason: null },
      {
        action: 'person.edit',
        detail: 'Aangepast: Jan Verzonnen. land: geen → NL. Reden: Uit het clubblad',
        reason: null,
      },
      { action: 'person.edit', detail: 'Aangepast: Jan Verzonnen. land: geen → NL', reason: null },
    ])
  })

  it('can run again after it stopped halfway, and a new entry may have no reason', async () => {
    await prepareDatabase({ migrationsFolder, seed: false, url: database.url })
    await database.pool.query("INSERT INTO clubs (name, slug) VALUES ('NEC', 'nec')")
    await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('redactie@example.org', 'editor')")
    await database.pool.query(
      "INSERT INTO matches (season, competition, round, opponent, club_id, home, status, match_date, kickoff_at, data_source) SELECT '2026/27', 'Eredivisie', 'Speelronde 1', 'NEC', id, 1, 'scheduled', '2026-10-31', '2026-10-31 17:45:00', 'wikipedia' FROM clubs LIMIT 1",
    )
    await database.pool.query(
      "INSERT INTO match_edits (match_id, kickoff_edited, edited_by, edited_at, reason, before_match, before_goals) SELECT m.id, 1, a.id, '2026-11-09 10:00:00', NULL, '{}', '[]' FROM matches m, admin_users a LIMIT 1",
    )

    const file = await readFile(join(migrationsFolder, `${migration}.sql`), 'utf8')

    for (const statement of file.split('--> statement-breakpoint')) {
      await database.pool.query(statement)
    }

    expect(await rows('SELECT reason FROM match_edits')).toEqual([{ reason: null }])
  })
})
