import type { RowDataPacket } from 'mysql2/promise'

// The backup commands start `mysqldump` and `mysql`. These tests give them small programs of
// our own instead (shell scripts in a temporary folder), so the retention, the rights of the
// files, the password handling and the exit codes are tested without a client on the computer.
// That the real clients take what the commands give them is tested by hand, with the restore
// test in docs/back-ups.md.
import { chmodSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { BackupEnv } from './backup.ts'
import type { TestDatabase } from './test-database.ts'

import {
  backUp,
  backupName,
  dayTables,
  expiredBackups,
  optionFileText,
  readConnection,
  restore,
  runBackupCommand,
} from './backup.ts'
import { createTestDatabase } from './test-database.ts'

const password = 'p@ss"w\\ord#1;x'
const databaseUrl = `mysql://fansite_user:${encodeURIComponent(password)}@localhost:3306/fansite_acc`
const now = new Date('2026-10-26T03:15:07.123Z')
const day = 24 * 60 * 60 * 1000

let work: string
let folder: string
let counter = 0
let programs = 0

beforeAll(() => {
  work = mkdtempSync(path.join(tmpdir(), 'fansite-backup-test-'))
})

afterAll(() => {
  rmSync(work, { force: true, recursive: true })
})

beforeEach(() => {
  counter += 1
  folder = path.join(work, `backups-${counter}`)
  process.env['FAKE_RECORD'] = path.join(work, `record-${counter}`)
  mkdirSync(process.env['FAKE_RECORD'])
})

afterEach(() => {
  delete process.env['FAKE_RECORD']
  vi.restoreAllMocks()
})

function env(overrides: Partial<BackupEnv> = {}): BackupEnv {
  return {
    BACKUP_FOLDER: folder,
    BACKUP_KEEP_DAYS: 14,
    DATABASE_URL: databaseUrl,
    MYSQL_COMMAND: 'mysql',
    MYSQLDUMP_COMMAND: fakeDump(),
    ...overrides,
  }
}

/** A `mysqldump` that keeps what it was given, and prints a complete dump. */
function fakeDump(extra = '') {
  return program(
    'mysqldump',
    [
      'pass=$(ls "$FAKE_RECORD" | grep -c "^args-")',
      'printf "%s\\n" "$@" > "$FAKE_RECORD/args-$pass"',
      'option_file="${1#--defaults-extra-file=}"',
      'cp "$option_file" "$FAKE_RECORD/option-file"',
      'ls -l "$option_file" | cut -c1-10 > "$FAKE_RECORD/option-file-rights"',
      'echo "$option_file" > "$FAKE_RECORD/option-file-path"',
      extra,
      "printf -- '-- fake dump\\nCREATE TABLE t (id int);\\n-- Dump completed on 2026-10-26 03:15:07\\n'",
    ].join('\n'),
  )
}

/** Writes a program that the commands can start, and returns its path. */
function program(name: string, body: string) {
  programs += 1

  const file = path.join(work, `${name}-${programs}`)

  writeFileSync(file, `#!/bin/sh\n${body}\n`, { mode: 0o755 })
  chmodSync(file, 0o755)

  return file
}

const rights = (file: string) => (statSync(file).mode & 0o777).toString(8)

describe('backupName', () => {
  it('names a dump after the database and the moment in UTC, to the second', () => {
    expect(backupName('fansite_acc', now)).toBe('fansite_acc-2026-10-26T031507Z.sql.gz')
  })
})

describe('expiredBackups', () => {
  const name = (daysAgo: number, database = 'fansite_acc') =>
    backupName(database, new Date(now.getTime() - daysAgo * day))

  it('keeps the dumps of the last 14 days and removes the older ones', () => {
    const names = [name(0), name(13), name(14), name(14.5), name(20), name(60)]

    expect(expiredBackups(names, 'fansite_acc', 14, now)).toEqual([name(14.5), name(20), name(60)])
  })

  it('keeps the number of days it is given', () => {
    expect(expiredBackups([name(0), name(3), name(8)], 'fansite_acc', 7, now)).toEqual([name(8)])
  })

  it('never removes the newest dump, so a cron job that stopped leaves the last dump', () => {
    expect(expiredBackups([name(30), name(40)], 'fansite_acc', 14, now)).toEqual([name(40)])
  })

  it('only touches the dumps of its own database, and no other files', () => {
    const names = [
      name(30),
      name(0),
      name(30, 'fansite'),
      name(30, 'other_fansite_acc'),
      'notes.txt',
      'fansite_acc-2026-10-01T000000Z.sql',
      'fansite_acc-latest.sql.gz',
    ]

    expect(expiredBackups(names, 'fansite_acc', 14, now)).toEqual([name(30)])
  })

  it('also removes a half dump that a stopped run left behind, once it is old', () => {
    expect(expiredBackups([name(0), `${name(20)}.partial`, `${name(1)}.partial`], 'fansite_acc', 14, now)).toEqual([
      `${name(20)}.partial`,
    ])
  })
})

describe('readConnection and optionFileText', () => {
  it('takes the login from DATABASE_URL, with the percent-encoding undone', () => {
    expect(readConnection(databaseUrl)).toEqual({
      database: 'fansite_acc',
      host: 'localhost',
      password,
      port: '3306',
      user: 'fansite_user',
    })
  })

  it('writes values that an option file reads back, even with quotes and backslashes', () => {
    expect(optionFileText(readConnection(databaseUrl))).toBe(
      [
        '[client]',
        'host="localhost"',
        'port=3306',
        'user="fansite_user"',
        String.raw`password="p@ss\"w\\ord#1;x"`,
        'protocol=tcp',
        '',
      ].join('\n'),
    )
  })

  it('refuses a database name that is not plain', () => {
    expect(() => readConnection('mysql://u:p@localhost:3306/a%20b;c')).toThrow(/name of a database/)
    expect(() => readConnection('mysql://u:p@localhost:3306/')).toThrow(/name of a database/)
  })

  it('refuses a value with a line break, and does not repeat it', () => {
    const connection = readConnection('mysql://u:pass%0Aword@localhost:3306/fansite')

    expect(() => optionFileText(connection)).toThrow(/control character/)
    expect(() => optionFileText(connection)).not.toThrow(/pass/)
  })
})

describe('backUp', () => {
  it('writes the dump compressed, in a folder and a file for this account only', async () => {
    const result = await backUp(env(), now)

    expect(result.file).toBe(path.join(folder, 'fansite_acc-2026-10-26T031507Z.sql.gz'))
    expect(readdirSync(folder)).toEqual(['fansite_acc-2026-10-26T031507Z.sql.gz'])
    expect(rights(folder)).toBe('700')
    expect(rights(result.file)).toBe('600')
    expect(gunzipSync(readFileSync(result.file)).toString()).toContain('CREATE TABLE t (id int);')
    expect(result.bytes).toBe(statSync(result.file).size)
    expect(result.database).toBe('fansite_acc')
  })

  it('gives the client the login in an option file and never on the command line', async () => {
    await backUp(env(), now)

    const record = process.env['FAKE_RECORD'] ?? ''
    const args = readFileSync(path.join(record, 'args-0'), 'utf8') + readFileSync(path.join(record, 'args-1'), 'utf8')

    expect(args).not.toContain(password)
    expect(args).not.toContain('p%40ss')
    expect(args).toContain('--single-transaction')
    expect(readFileSync(path.join(record, 'option-file'), 'utf8')).toContain(String.raw`password="p@ss\"w\\ord#1;x"`)
    expect(readFileSync(path.join(record, 'option-file-rights'), 'utf8').trim()).toBe('-rw-------')
    // The option file is gone when the dump is done.
    expect(() => statSync(readFileSync(path.join(record, 'option-file-path'), 'utf8').trim())).toThrow(/ENOENT/)
  })

  it('dumps the tables of the day without their rows, so the salt does not stay for 14 days', async () => {
    await backUp(env(), now)

    const record = process.env['FAKE_RECORD'] ?? ''
    const rows = readFileSync(path.join(record, 'args-0'), 'utf8').trim().split('\n')
    const structure = readFileSync(path.join(record, 'args-1'), 'utf8').trim().split('\n')

    expect(rows).toContain('--ignore-table=fansite_acc.visitor_hashes')
    expect(rows).toContain('--ignore-table=fansite_acc.visitor_salts')
    expect(rows.at(-1)).toBe('fansite_acc')
    expect(rows).not.toContain('--no-data')
    expect(structure).toContain('--no-data')
    expect(structure.slice(-3)).toEqual(['fansite_acc', 'visitor_hashes', 'visitor_salts'])
    expect(readdirSync(process.env['FAKE_RECORD'] ?? '').filter((name) => name.startsWith('args-'))).toHaveLength(2)
  })

  it('fails, and leaves no file, when the second pass fails', async () => {
    const second = program(
      'mysqldump',
      [
        'if [ -e "$FAKE_RECORD/first-done" ]; then echo "mysqldump: Couldn\'t find table: visitor_hashes" >&2; exit 2; fi',
        'touch "$FAKE_RECORD/first-done"',
        "printf -- '-- Dump completed on today\\n'",
      ].join('\n'),
    )

    await expect(backUp(env({ MYSQLDUMP_COMMAND: second }), now)).rejects.toThrow(/Couldn't find table/)
    expect(readdirSync(folder)).toEqual([])
  })

  it('removes the dumps that are too old after a dump that worked, and leaves other files', async () => {
    mkdirSync(folder, { mode: 0o700 })

    const old = backupName('fansite_acc', new Date(now.getTime() - 15 * day))
    const recent = backupName('fansite_acc', new Date(now.getTime() - 13 * day))

    for (const file of [old, recent, 'notes.txt', backupName('fansite', new Date(now.getTime() - 30 * day))]) {
      writeFileSync(path.join(folder, file), 'x')
    }

    const result = await backUp(env(), now)

    expect(result.removed).toEqual([old])
    expect(readdirSync(folder).sort()).toEqual(
      [
        backupName('fansite_acc', now),
        backupName('fansite', new Date(now.getTime() - 30 * day)),
        recent,
        'notes.txt',
      ].sort(),
    )
  })

  it('fails when the dump fails, leaves no file, and removes nothing', async () => {
    mkdirSync(folder, { mode: 0o700 })

    const old = backupName('fansite_acc', new Date(now.getTime() - 40 * day))

    writeFileSync(path.join(folder, old), 'x')

    const failing = program('mysqldump', 'echo "mysqldump: Got error: 1045: Access denied" >&2\nexit 2')

    await expect(backUp(env({ MYSQLDUMP_COMMAND: failing }), now)).rejects.toThrow(
      /stopped with code 2.*Access denied/s,
    )
    expect(readdirSync(folder)).toEqual([old])
  })

  it('fails when the dump ends without the line that closes it', async () => {
    const cut = program('mysqldump', "printf -- '-- fake dump\\nCREATE TABLE t (id int);\\n'")

    await expect(backUp(env({ MYSQLDUMP_COMMAND: cut }), now)).rejects.toThrow(/not complete/)
    expect(readdirSync(folder)).toEqual([])
  })

  it('says what to do when mysqldump is not there', async () => {
    await expect(backUp(env({ MYSQLDUMP_COMMAND: path.join(work, 'does-not-exist') }), now)).rejects.toThrow(
      /MYSQLDUMP_COMMAND/,
    )
    expect(readdirSync(folder)).toEqual([])
  })

  it('refuses a folder in public_html', async () => {
    await expect(backUp(env({ BACKUP_FOLDER: path.join(work, 'domains/x/public_html/backups') }), now)).rejects.toThrow(
      /public_html/,
    )
    expect(() => statSync(path.join(work, 'domains'))).toThrow(/ENOENT/)
  })

  it('refuses a folder that other accounts can read, and leaves its rights alone', async () => {
    mkdirSync(folder, { mode: 0o755 })
    chmodSync(folder, 0o755)

    await expect(backUp(env(), now)).rejects.toThrow(/chmod 700/)
    expect(rights(folder)).toBe('755')
    expect(readdirSync(folder)).toEqual([])
  })

  it('refuses to overwrite a dump of the same second', async () => {
    await backUp(env(), now)
    await expect(backUp(env(), now)).rejects.toThrow()
    expect(readdirSync(folder)).toEqual([backupName('fansite_acc', now)])
  })
})

describe('runBackupCommand', () => {
  const source = (overrides: Record<string, string | undefined> = {}) => ({
    BACKUP_FOLDER: folder,
    DATABASE_URL: databaseUrl,
    MYSQLDUMP_COMMAND: fakeDump(),
    ...overrides,
  })

  it('exits with 0 and says what it did', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    expect(await runBackupCommand(['backup'], source(), now)).toBe(0)
    expect(log).toHaveBeenCalledTimes(1)
    expect(String(log.mock.calls[0]?.[0])).toMatch(
      /^Dumped fansite_acc to .*T031507Z\.sql\.gz \(\d+ KB\)\. Removed 0 dumps older than 14 days\.$/,
    )
    expect(String(log.mock.calls[0]?.[0])).not.toContain('p@ss')
  })

  it('exits with 1 when the dump fails, and says why without repeating the login', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    const failing = program('mysqldump', 'echo "Access denied for user" >&2\nexit 2')

    expect(await runBackupCommand(['backup'], source({ MYSQLDUMP_COMMAND: failing }), now)).toBe(1)
    expect(String(error.mock.calls[0]?.[0])).toMatch(/^The backup failed: .*Access denied/s)
    expect(String(error.mock.calls[0]?.[0])).not.toContain('p@ss')
  })

  it('exits with 1 when a variable is missing, and names it', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await runBackupCommand(['backup'], source({ BACKUP_FOLDER: undefined }), now)).toBe(1)
    expect(String(error.mock.calls[0]?.[0])).toContain('- BACKUP_FOLDER is missing')
  })

  it('wants an absolute folder and a number of days that makes sense', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await runBackupCommand(['backup'], source({ BACKUP_FOLDER: 'backups' }), now)).toBe(1)
    expect(String(error.mock.calls[0]?.[0])).toContain('- BACKUP_FOLDER: must be an absolute path')
    expect(await runBackupCommand(['backup'], source({ BACKUP_KEEP_DAYS: '0' }), now)).toBe(1)
    expect(String(error.mock.calls[1]?.[0])).toContain('- BACKUP_KEEP_DAYS')
  })

  it('exits with 2 and shows the usage when the command is wrong', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await runBackupCommand([], source(), now)).toBe(2)
    expect(await runBackupCommand(['backup', 'extra'], source(), now)).toBe(2)
    expect(await runBackupCommand(['restore'], source(), now)).toBe(2)
    expect(await runBackupCommand(['dump'], source(), now)).toBe(2)
    expect(String(error.mock.calls[0]?.[0])).toContain('Usage:')
  })
})

describe('dayTables', () => {
  it('are tables of the database, so the second pass of the dump finds them', async () => {
    const database = await createTestDatabase()

    try {
      const [rows] = await database.pool.query<RowDataPacket[]>(
        'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE()',
      )
      const names = rows.map((row) => String(row['name']))

      for (const table of dayTables) {
        expect(names).toContain(table)
      }
    } finally {
      await database.drop()
    }
  })
})

describe('restore', () => {
  let empty: TestDatabase
  let full: TestDatabase
  let dump: string

  beforeAll(async () => {
    full = await createTestDatabase()
  })

  afterAll(async () => {
    // Undefined when the server wasn't there, which beforeAll has already reported.
    await full?.drop()
  })

  // Every test restores into a database of its own, since a restore fills it.
  beforeEach(async () => {
    empty = await createTestDatabase({ migrate: false })
    dump = path.join(work, `dump-${counter}.sql.gz`)
    writeFileSync(
      dump,
      gzipSync("CREATE TABLE notes (text varchar(20));\nINSERT INTO notes VALUES ('Ik ben terug');\n"),
    )
  })

  afterEach(async () => {
    await empty?.drop()
  })

  /**
   * A `mysql` that runs what it reads on the database in `FAKE_DATABASE_URL`, with the mysql2
   * of this package, and keeps the arguments it was given.
   */
  function fakeClient() {
    const script = path.join(work, `client-${counter}.mjs`)
    const driver = import.meta.resolve('mysql2/promise')

    writeFileSync(
      script,
      [
        `import { createConnection } from '${driver}'`,
        'const chunks = []',
        'for await (const chunk of process.stdin) chunks.push(chunk)',
        'const connection = await createConnection({ multipleStatements: true, uri: process.env.FAKE_DATABASE_URL })',
        'await connection.query(Buffer.concat(chunks).toString())',
        'await connection.end()',
      ].join('\n'),
    )

    return program(
      'mysql',
      `printf "%s\\n" "$@" > "$FAKE_RECORD/args"\ncp "\${1#--defaults-extra-file=}" "$FAKE_RECORD/option-file"\nexec "${process.execPath}" "${script}"`,
    )
  }

  it('puts a dump into an empty database', async () => {
    process.env['FAKE_DATABASE_URL'] = empty.url

    try {
      const result = await restore(env({ DATABASE_URL: empty.url, MYSQL_COMMAND: fakeClient() }), dump)

      expect(result.tables).toBe(1)
    } finally {
      delete process.env['FAKE_DATABASE_URL']
    }

    const [rows] = await empty.pool.query('SELECT text FROM notes')

    expect(rows).toEqual([{ text: 'Ik ben terug' }])
    expect(readFileSync(path.join(process.env['FAKE_RECORD'] ?? '', 'args'), 'utf8')).not.toContain('password')
  })

  it('refuses a database that has tables, and starts no client', async () => {
    await expect(restore(env({ DATABASE_URL: full.url, MYSQL_COMMAND: fakeClient() }), dump)).rejects.toThrow(
      /has \d+ tables\. A dump goes into an empty database/,
    )
    expect(readdirSync(process.env['FAKE_RECORD'] ?? '')).toEqual([])
  })

  it('refuses a file that is not a dump, or not there', async () => {
    await expect(restore(env({ DATABASE_URL: empty.url }), path.join(work, 'notes.txt'))).rejects.toThrow(/\.sql\.gz/)
    await expect(restore(env({ DATABASE_URL: empty.url }), path.join(work, 'nothing.sql.gz'))).rejects.toThrow(
      /no file at/,
    )
  })

  it('fails when the client fails, with what the client said', async () => {
    const failing = program(
      'mysql',
      'cat > /dev/null\necho "ERROR 1064: You have an error in your SQL syntax" >&2\nexit 1',
    )

    await expect(restore(env({ DATABASE_URL: empty.url, MYSQL_COMMAND: failing }), dump)).rejects.toThrow(
      /stopped with code 1.*ERROR 1064/s,
    )
  })

  it('fails when the client ran but nothing arrived in the database', async () => {
    const idle = program('mysql', 'cat > /dev/null')

    await expect(restore(env({ DATABASE_URL: empty.url, MYSQL_COMMAND: idle }), dump)).rejects.toThrow(
      /still has no tables/,
    )
  })

  it('exits with 1 for the command when the database has tables', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(
      await runBackupCommand(['restore', dump], {
        BACKUP_FOLDER: folder,
        DATABASE_URL: full.url,
        MYSQL_COMMAND: fakeClient(),
      }),
    ).toBe(1)
    expect(String(error.mock.calls[0]?.[0])).toMatch(/^The restore failed: /)
  })
})
