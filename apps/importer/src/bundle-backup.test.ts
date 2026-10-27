// The command that backs up the database and puts a dump back is the fourth command that
// `bundleCommand` bundles (see packages/db/src/backup-command.ts). Cron starts it on the host
// with Node and the file that holds DATABASE_URL for the importer, plus BACKUP_FOLDER. The
// dump itself comes from a small program of our own here: the clients are not on every
// computer (see packages/db/src/backup.test.ts for the rules, and docs/back-ups.md for the
// test with the real clients).
import { execFile } from 'node:child_process'
import { chmodSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { gunzipSync } from 'node:zlib'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { bundleCommand } from './bundle.ts'

let folder: string
let file: string
let envFile: string
let backups: string

beforeAll(async () => {
  folder = mkdtempSync(path.join(tmpdir(), 'fansite-backup-bundle-'))
  file = path.join(folder, 'backup.mjs')
  backups = path.join(folder, 'fansite-backups')
  envFile = path.join(folder, 'fansite-acceptatie.env')

  const dump = path.join(folder, 'mysqldump')

  writeFileSync(dump, "#!/bin/sh\nprintf -- '-- Dump of a test\\n-- Dump completed on today\\n'\n")
  chmodSync(dump, 0o755)
  writeFileSync(
    envFile,
    [
      'DATABASE_URL=mysql://fansite:secret@localhost:3306/fansite_acc',
      `BACKUP_FOLDER=${backups}`,
      `MYSQLDUMP_COMMAND=${dump}`,
      '',
    ].join('\n'),
  )
  await bundleCommand(path.resolve(import.meta.dirname, '../../../packages/db/src/backup-command.ts'), file)
})

afterAll(() => {
  rmSync(folder, { force: true, recursive: true })
})

// A folder in the system's temporary folder has no node_modules above it, so the file must hold
// everything. The process has no variables of its own: it reads the file, as `node
// --env-file=<file> backup.mjs backup` does in the cron job.
const run = (args: string[], useEnvFile = true) =>
  promisify(execFile)(process.execPath, [...(useEnvFile ? [`--env-file=${envFile}`] : []), file, ...args], {
    cwd: folder,
    env: { PATH: process.env['PATH'] },
  }).then(
    ({ stderr, stdout }) => ({ code: 0, output: stdout + stderr }),
    (error: { code: number; stderr: string; stdout: string }) => ({
      code: error.code,
      output: error.stdout + error.stderr,
    }),
  )

it('makes a dump on its own, with its settings from a file, and exits with 0', async () => {
  const { code, output } = await run(['backup'])

  expect(code).toBe(0)
  expect(output).toMatch(/^Dumped fansite_acc to .*fansite-backups\/fansite_acc-.*\.sql\.gz \(1 KB\)/)
  expect(output).not.toContain('secret')

  const [name, ...others] = readdirSync(backups)

  expect(others).toEqual([])
  expect((statSync(backups).mode & 0o777).toString(8)).toBe('700')
  expect((statSync(path.join(backups, name ?? '')).mode & 0o777).toString(8)).toBe('600')
  expect(gunzipSync(readFileSync(path.join(backups, name ?? ''))).toString()).toContain('Dump completed')
}, 30_000)

it('exits with 1 and names the variable when the file has no BACKUP_FOLDER', async () => {
  writeFileSync(envFile, 'DATABASE_URL=mysql://fansite:secret@localhost:3306/fansite_acc\n')

  const { code, output } = await run(['backup'])

  expect(code).toBe(1)
  expect(output).toContain('- BACKUP_FOLDER is missing')
  expect(output).not.toContain('secret')
}, 30_000)

it('exits with 2 and shows the usage when the command is wrong', async () => {
  expect(await run(['dump'])).toMatchObject({ code: 2, output: expect.stringContaining('Usage:') })
}, 30_000)
