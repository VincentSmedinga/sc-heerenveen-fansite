// The command that sends a test mail is the second command that `bundleCommand` bundles (see
// apps/site/src/send-test-mail.ts).
import { execFile } from 'node:child_process'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { promisify } from 'node:util'
import { afterAll, beforeAll, expect, it } from 'vitest'

import { bundleCommand } from './bundle.ts'

let folder: string
let file: string

beforeAll(async () => {
  folder = mkdtempSync(path.join(tmpdir(), 'fansite-test-mail-'))
  file = path.join(folder, 'send-test-mail.mjs')
  await bundleCommand(path.resolve(import.meta.dirname, '../../site/src/send-test-mail.ts'), file)
})

afterAll(() => {
  rmSync(folder, { force: true, recursive: true })
})

// A folder in the system's temporary folder has no node_modules above it, so the file must hold everything.
const run = (env: Record<string, string>, ...args: string[]) =>
  promisify(execFile)(process.execPath, [file, ...args], {
    cwd: folder,
    env: { ...env, PATH: process.env['PATH'] },
  }).then(
    ({ stderr, stdout }) => ({ code: 0, output: stdout + stderr }),
    (error: { code: number; stderr: string; stdout: string }) => ({
      code: error.code,
      output: error.stdout + error.stderr,
    }),
  )

it('runs on its own, without node_modules, and shows the mail on local instead of sending it', async () => {
  const { code, output } = await run({ SITE_ENV: 'local' }, 'fansite@example.org')

  expect(code).toBe(0)
  expect(output).toContain('No mail was sent')
  expect(output).toContain('To: fansite@example.org')
})

it('says how to use it when it gets no address', async () => {
  const { code, output } = await run({ SITE_ENV: 'local' })

  expect(code).toBe(2)
  expect(output).toContain('Usage: node send-test-mail.mjs')
})

it('stops with the name of a setting that is missing on acceptance, without sending anything', async () => {
  const { code, output } = await run({ SITE_ENV: 'acceptance' }, 'fansite@example.org')

  expect(code).toBe(1)
  expect(output).toContain('SMTP_HOST is missing')
})

it('fails with a short message, not the settings, when the server cannot be reached', async () => {
  const { code, output } = await run(
    {
      MAIL_FROM: 'fansite@example.org',
      SITE_ENV: 'acceptance',
      SMTP_HOST: '127.0.0.1',
      SMTP_PASSWORD: 'geheim-wachtwoord',
      SMTP_PORT: '1',
      SMTP_USER: 'fansite@example.org',
    },
    'iemand@example.net',
  )

  expect(code).toBe(1)
  expect(output.trim()).toBe('Could not send the mail (ESOCKET)')
}, 20_000)
