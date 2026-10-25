// The command that makes and turns off the accounts of the admin is the third command that `bundleCommand` bundles (see
// apps/site/src/admin.ts). On the host there is no pnpm and an SSH session has no environment variables, so it runs with
// Node and a file that holds DATABASE_URL, like the importer.
import type { TestDatabase } from '@fansite/db/test-database'

import { adminSessions, adminUsers } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { execFile } from 'node:child_process'
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { bundleCommand } from './bundle.ts'

let database: TestDatabase
let folder: string
let file: string
let envFile: string

beforeAll(async () => {
  database = await createTestDatabase()
  folder = mkdtempSync(path.join(tmpdir(), 'fansite-admin-'))
  file = path.join(folder, 'admin.mjs')
  envFile = path.join(folder, 'fansite-acceptatie.env')
  writeFileSync(envFile, `DATABASE_URL=${database.url}\n`)
  await bundleCommand(path.resolve(import.meta.dirname, '../../site/src/admin.ts'), file)
})

afterAll(async () => {
  rmSync(folder, { force: true, recursive: true })
  await database?.drop()
})

// A folder in the system's temporary folder has no node_modules above it, so the file must hold everything. The process
// has no DATABASE_URL of its own: it reads the file, as `node --env-file=<file> admin.mjs` does on the host.
const run = (...args: string[]) =>
  promisify(execFile)(process.execPath, [`--env-file=${envFile}`, file, ...args], {
    cwd: folder,
    env: { PATH: process.env['PATH'] },
  }).then(
    ({ stderr, stdout }) => ({ code: 0, output: stdout + stderr }),
    (error: { code: number; stderr: string; stdout: string }) => ({
      code: error.code,
      output: error.stdout + error.stderr,
    }),
  )

it('makes an account and turns it off again, on its own, with DATABASE_URL from a file', async () => {
  expect(await run('create', 'Jelle@Example.org', 'moderator')).toEqual({
    code: 0,
    output: 'Made the account for jelle@example.org, as moderator.\n',
  })
  expect(await database.db.select({ email: adminUsers.email, role: adminUsers.role }).from(adminUsers)).toEqual([
    { email: 'jelle@example.org', role: 'moderator' },
  ])

  const [account] = await database.db.select().from(adminUsers)
  const now = new Date()

  await database.db
    .insert(adminSessions)
    .values({ createdAt: now, lastSeenAt: now, tokenHash: 'x'.repeat(64), userId: account?.id ?? 0 })

  expect(await run('revoke', 'jelle@example.org')).toEqual({
    code: 0,
    output: 'Turned off the account for jelle@example.org and ended 1 session.\n',
  })
  expect(await database.db.select().from(adminSessions)).toEqual([])
  expect((await database.db.select().from(adminUsers))[0]?.disabledAt).toBeInstanceOf(Date)
}, 30_000)

it('stops with the exit code of the case, and says what is wrong', async () => {
  expect((await run('create', 'jelle@example.org', 'beheerder')).code).toBe(0)
  expect(await run('create', 'jelle@example.org', 'beheerder')).toMatchObject({ code: 1 })
  expect(await run('revoke', 'niemand@example.org')).toEqual({
    code: 1,
    output: 'There is no account for niemand@example.org.\n',
  })
  expect(await run('create', 'jelle@example.org', 'admin')).toMatchObject({ code: 2 })
  expect((await run()).output).toContain('Usage:')
}, 30_000)

it('stops with the name of the variable when the file has no DATABASE_URL', async () => {
  const { code, output } = await promisify(execFile)(process.execPath, [file, 'create', 'a@example.org', 'beheerder'], {
    cwd: folder,
    env: { PATH: process.env['PATH'] },
  }).then(
    () => ({ code: 0, output: '' }),
    (error: { code: number; stderr: string }) => ({ code: error.code, output: error.stderr }),
  )

  expect(code).toBe(1)
  expect(output).toContain('DATABASE_URL')
}, 30_000)
