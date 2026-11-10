// The export for the copy of acceptance (see export-plan.ts and `exportDump` in backup.ts).
// `mysqldump` is a small program of our own here, as in backup.test.ts: these tests are about
// which tables it is asked for, and about the rows the export writes itself. Every address in
// them is made up.
import type { RowDataPacket } from 'mysql2/promise'

import { getTableConfig, MySqlTable } from 'drizzle-orm/mysql-core'
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Writable } from 'node:stream'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { exportCompletionMarker, exportDump, runBackupCommand, structureOnlyTables } from './backup.ts'
import {
  copiedTablesOutsideSchema,
  copyInfoTable,
  exportPlan,
  madeUpAddress,
  personalColumnPattern,
  reviewedColumns,
} from './export-plan.ts'
import * as schema from './schema.ts'
import { createTestDatabase } from './test-database.ts'

const now = new Date('2026-11-10T09:30:07.123Z')
const tables = (Object.values(schema) as unknown[])
  .filter((value) => value instanceof MySqlTable)
  .map((table) => getTableConfig(table))

describe('exportPlan', () => {
  it('names every table of the schema, so a new table is never exported without a look', () => {
    expect(Object.keys(exportPlan).toSorted()).toEqual(tables.map(({ name }) => name).toSorted())
  })

  it('names every column of a table with a made-up column, so a new column is never exported without a look', () => {
    for (const { columns, name } of tables) {
      const rule = exportPlan[name]

      if (rule !== undefined && typeof rule !== 'string') {
        expect([...rule.keep, ...Object.keys(rule.replace)].toSorted(), name).toEqual(
          columns.map((column) => column.name).toSorted(),
        )
      }
    }
  })

  it('takes the tables that the nightly dump leaves empty, and the login attempts, without their rows', () => {
    for (const table of [...structureOnlyTables, 'admin_login_attempts']) {
      expect(exportPlan[table], table).toBe('structure')
    }
  })

  it('gives every account a made-up address and keeps its number, role and times', () => {
    expect(exportPlan['admin_users']).toEqual({
      keep: ['id', 'role', 'created_at', 'disabled_at'],
      replace: { email: "CONCAT('beheerder-', `id`, '@example.invalid')" },
    })
    expect(madeUpAddress(7)).toBe('beheerder-7@example.invalid')
  })

  it('copies no column whose name sounds like something about a person, unless someone looked at it', () => {
    const found = tables
      .filter(({ name }) => exportPlan[name] === 'copy')
      .flatMap(({ columns, name }) => columns.map((column) => `${name}.${column.name}`))
      .filter((column) => personalColumnPattern.test(column.split('.')[1] ?? ''))

    expect(found.toSorted()).toEqual(Object.keys(reviewedColumns).toSorted())
  })
})

describe('exportDump', () => {
  let work: string
  let database: TestDatabase
  let record: string
  let counter = 0

  beforeAll(async () => {
    work = mkdtempSync(path.join(tmpdir(), 'fansite-export-test-'))
    database = await createTestDatabase()
    await database.pool.query(
      "INSERT INTO admin_users (id, email, role, created_at, disabled_at) VALUES (3, 'sanne@example.org', 'beheerder', '2026-10-01 08:00:00', NULL), (8, 'jelle.o''brien@example.org', 'moderator', '2026-10-02 09:30:00', '2026-11-01 12:00:00')",
    )
  })

  afterAll(async () => {
    await database?.drop()
    rmSync(work, { force: true, recursive: true })
  })

  beforeEach(() => {
    counter += 1
    record = path.join(work, `record-${counter}`)
    mkdirSync(record)
    process.env['FAKE_RECORD'] = record
  })

  afterEach(() => {
    delete process.env['FAKE_RECORD']
    vi.restoreAllMocks()
  })

  /** A `mysqldump` that keeps the arguments of each pass and its option file. */
  function fakeDump(body = 'printf -- \'-- fake dump of pass %s\\n-- Dump completed on today\\n\' "$pass"') {
    const file = path.join(work, `mysqldump-${counter}`)

    writeFileSync(
      file,
      [
        '#!/bin/sh',
        'pass=$(ls "$FAKE_RECORD" | grep -c "^args-")',
        'printf "%s\\n" "$@" > "$FAKE_RECORD/args-$pass"',
        'cp "${1#--defaults-extra-file=}" "$FAKE_RECORD/option-file"',
        'echo "${1#--defaults-extra-file=}" > "$FAKE_RECORD/option-file-path"',
        body,
        '',
      ].join('\n'),
    )
    chmodSync(file, 0o755)

    return file
  }

  function collector() {
    const chunks: Buffer[] = []
    const out = new Writable({
      write(chunk: Buffer | string, _encoding, done) {
        chunks.push(Buffer.from(chunk))
        done()
      },
    })

    return { out, text: () => Buffer.concat(chunks).toString() }
  }

  const env = (url = database.url) => ({ DATABASE_URL: url, MYSQLDUMP_COMMAND: fakeDump() })
  const args = (pass: number) =>
    readFileSync(path.join(record, `args-${pass}`), 'utf8')
      .trim()
      .split('\n')

  it('asks for the copied tables by name, in one transaction, and for the others without their rows', async () => {
    const { out } = collector()
    const name = new URL(database.url).pathname.slice(1)

    await exportDump(env(), out, now)

    const rows = args(0)
    const structure = args(1)
    const copied = Object.keys(exportPlan).filter((table) => exportPlan[table] === 'copy')
    const notCopied = Object.keys(exportPlan).filter((table) => exportPlan[table] !== 'copy')

    expect(rows).toContain('--single-transaction')
    expect(rows).not.toContain('--no-data')
    expect(rows.slice(rows.indexOf(name) + 1).toSorted()).toEqual([...copiedTablesOutsideSchema, ...copied].toSorted())
    expect(structure).toContain('--single-transaction')
    expect(structure).toContain('--no-data')
    expect(structure.slice(structure.indexOf(name) + 1).toSorted()).toEqual(notCopied.toSorted())
    expect(notCopied).toEqual(expect.arrayContaining([...structureOnlyTables, 'admin_login_attempts', 'admin_users']))
    expect(readdirSync(record).filter((file) => file.startsWith('args-'))).toHaveLength(2)
  })

  it('writes every account with a made-up address, and no real address', async () => {
    const { out, text } = collector()

    await exportDump(env(), out, now)

    expect(text()).toContain(
      "INSERT INTO `admin_users` (`id`, `email`, `role`, `created_at`, `disabled_at`) VALUES (3, 'beheerder-3@example.invalid', 'beheerder', '2026-10-01 08:00:00', NULL);",
    )
    expect(text()).toContain(
      "VALUES (8, 'beheerder-8@example.invalid', 'moderator', '2026-10-02 09:30:00', '2026-11-01 12:00:00');",
    )
    expect(text()).not.toContain('example.org')
    expect(text()).not.toContain('sanne')
    expect(text()).not.toContain('brien')
  })

  it('ends with the time of the dump in UTC and the line that says it is complete', async () => {
    const { out, text } = collector()

    await exportDump(env(), out, new Date('2026-11-10T10:30:07+01:00'))

    expect(text().startsWith('-- fake dump of pass 0\n-- Dump completed on today\n-- fake dump of pass 1\n')).toBe(true)
    expect(text()).toContain(
      `CREATE TABLE \`${copyInfoTable}\` (\`dumped_at\` datetime NOT NULL, \`loaded_at\` datetime DEFAULT NULL);`,
    )
    expect(text()).toContain(`INSERT INTO \`${copyInfoTable}\` (\`dumped_at\`) VALUES ('2026-11-10 09:30:07');`)
    expect(text().endsWith(`${exportCompletionMarker}\n`)).toBe(true)
  })

  it('gives the client the login in an option file, never on the command line or in the dump', async () => {
    const { out, text } = collector()
    const url = new URL(database.url)

    // The same option file as the nightly dump: backup.test.ts tests what it holds.
    await exportDump(env(), out, now)

    expect(readFileSync(path.join(record, 'option-file'), 'utf8')).toContain(`user="${url.username}"`)
    expect([...args(0), ...args(1)].join('\n')).not.toMatch(/password|mysql:\/\//)
    expect(text()).not.toMatch(/password|mysql:\/\//)
    // The option file is gone when the export is done.
    expect(existsSync(readFileSync(path.join(record, 'option-file-path'), 'utf8').trim())).toBe(false)
    expect(args(0)[0]).toMatch(/^--defaults-extra-file=/)
  })

  it('stops before it asks for a dump when the database has a table it does not know', async () => {
    const other = await createTestDatabase()
    const { out, text } = collector()

    try {
      await other.pool.query('CREATE TABLE newsletter_readers (email varchar(254))')

      await expect(exportDump(env(other.url), out, now)).rejects.toThrow(
        /a table the export does not know: newsletter_readers\. Say what the export does with it in packages\/db\/src\/export-plan\.ts/,
      )
    } finally {
      await other.drop()
    }

    expect(text()).toBe('')
    expect(readdirSync(record)).toEqual([])
  })

  it('stops before it asks for a dump when the accounts have a column it does not know', async () => {
    const other = await createTestDatabase()
    const { out, text } = collector()

    try {
      await other.pool.query('ALTER TABLE admin_users ADD COLUMN full_name varchar(100)')

      await expect(exportDump(env(other.url), out, now)).rejects.toThrow(
        /The columns of admin_users are not the ones the export knows \(full_name\)/,
      )
    } finally {
      await other.drop()
    }

    expect(text()).toBe('')
    expect(readdirSync(record)).toEqual([])
  })

  it('fails when a pass of the dump fails or is cut short, and never writes the last line', async () => {
    const failing = collector()
    const short = collector()

    await expect(
      exportDump(
        { DATABASE_URL: database.url, MYSQLDUMP_COMMAND: fakeDump('echo "Access denied" >&2\nexit 2') },
        failing.out,
        now,
      ),
    ).rejects.toThrow(/stopped with code 2\. It said:\nAccess denied/)
    await expect(
      exportDump({ DATABASE_URL: database.url, MYSQLDUMP_COMMAND: fakeDump('echo "-- half"') }, short.out, now),
    ).rejects.toThrow(/ended without the line that closes a dump/)
    expect(failing.text() + short.text()).not.toContain(exportCompletionMarker)
  })

  describe('as a command', () => {
    it('writes the dump to the standard output and nothing else, and exits with 0', async () => {
      const written: string[] = []
      const log = vi.spyOn(console, 'log').mockImplementation(() => {})
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})

      vi.spyOn(process.stdout, 'write').mockImplementation(((chunk: Buffer | string, ...rest: unknown[]) => {
        written.push(chunk.toString())

        const done = rest.find((argument) => typeof argument === 'function') as (() => void) | undefined

        done?.()

        return true
      }) as typeof process.stdout.write)

      // No BACKUP_FOLDER: the export writes no file, so it asks for no folder.
      const code = await runBackupCommand(
        ['export'],
        { DATABASE_URL: database.url, MYSQLDUMP_COMMAND: fakeDump() },
        now,
      )

      vi.mocked(process.stdout.write).mockRestore()

      expect(code).toBe(0)
      expect(written.join('').endsWith(`${exportCompletionMarker}\n`)).toBe(true)
      expect(log).not.toHaveBeenCalled()
      expect(error).not.toHaveBeenCalled()
    })

    it('exits with 1 and says why on stderr, without the login, when the database is not there', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})
      const code = await runBackupCommand(
        ['export'],
        { DATABASE_URL: 'mysql://fansite_user:s3cret-word@127.0.0.1:1/fansite_acc', MYSQLDUMP_COMMAND: fakeDump() },
        now,
      )

      expect(code).toBe(1)
      expect(String(error.mock.calls[0]?.[0])).toMatch(/^The export failed: /)
      expect(String(error.mock.calls[0]?.[0])).not.toContain('s3cret-word')
      expect(readdirSync(record)).toEqual([])
    })

    it('exits with 2 when it gets an argument', async () => {
      const error = vi.spyOn(console, 'error').mockImplementation(() => {})

      expect(await runBackupCommand(['export', 'file.sql'], { DATABASE_URL: database.url }, now)).toBe(2)
      expect(String(error.mock.calls[0]?.[0])).toContain('export            writes a dump without personal data')
    })
  })

  it('has a table for its times that is not in the schema of the site', async () => {
    const [rows] = await database.pool.query<RowDataPacket[]>(
      'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()',
    )

    expect(rows.map((row) => String(row['name']))).not.toContain(copyInfoTable)
    expect(Object.keys(exportPlan)).not.toContain(copyInfoTable)
  })
})
