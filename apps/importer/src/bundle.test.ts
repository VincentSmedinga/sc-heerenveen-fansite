import type { TestDatabase } from '@fansite/db/test-database'

import { matchImports, squadImports } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { createTestDatabase } from '@fansite/db/test-database'
import { execFile } from 'node:child_process'
import { mkdtempSync, readdirSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { bundleImporter } from './bundle.ts'

let database: TestDatabase
let folder: string

beforeAll(async () => {
  database = await createTestDatabase()
  // The command reads the real clock and would ask the real Wikipedia for the matches and the
  // squad. An import that waits for its hour does not.
  const waiting = {
    lastOutcome: 'imported',
    retryAt: new Date('2099-01-01T00:00:00Z'),
    season: seasonOf(new Date()),
  } as const

  await database.db.insert(matchImports).values(waiting)
  await database.db.insert(squadImports).values(waiting)
  folder = mkdtempSync(path.join(tmpdir(), 'fansite-importer-'))
})

afterAll(async () => {
  rmSync(folder, { force: true, recursive: true })
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

// A folder in the system's temporary folder has no node_modules above it, so the file must hold
// everything.
it('bundles the import command into one file that runs on its own, without node_modules', async () => {
  const file = path.join(folder, 'import.mjs')

  await bundleImporter(file)

  expect(readdirSync(folder)).toEqual(['import.mjs'])
  // Node only has `import.meta.main` since 24.2, and the host may run an older Node 24.
  expect(readFileSync(file, 'utf8')).not.toContain('import.meta.main')

  const run = (...args: string[]) =>
    promisify(execFile)(process.execPath, [file, ...args], {
      cwd: folder,
      env: { DATABASE_URL: database.url, PATH: process.env['PATH'] },
    })

  expect((await run()).stdout).toContain('There are no feeds to read')
  // The same file shows the health of the feeds, so the host needs no second one.
  expect((await run('--status')).stdout).toContain('There are no feeds: no source that is switched on has a feed')
}, 30_000)
