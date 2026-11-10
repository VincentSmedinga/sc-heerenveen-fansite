// `pnpm db:pull-acceptance` (see acceptance-copy.ts). `ssh`, `docker` and the database client
// are small programs of our own here: no test reaches the host, and the dump is made up. The
// copy goes into a database of the test, never into `fansite_acc`: a test must not drop the
// copy on the computer it runs on.
import type { RowDataPacket } from 'mysql2/promise'

import { chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PullEnv } from './acceptance-copy.ts'

import { pullAcceptanceCopy, pullEnvSchema, runPullCommand } from './acceptance-copy.ts'
import { readDatabaseEnv } from './env.ts'
import { connectToServer, scratchDatabaseName } from './test-database.ts'

const now = new Date('2026-11-10T09:31:15.500Z')
const serverUrl = readDatabaseEnv().DATABASE_URL
const madeUpDump = [
  '-- A made-up dump, as `backup.mjs export` prints one.',
  "CREATE TABLE admin_users (id int unsigned AUTO_INCREMENT PRIMARY KEY, email varchar(254) NOT NULL UNIQUE, role enum('beheerder','moderator') NOT NULL, created_at datetime NOT NULL DEFAULT (UTC_TIMESTAMP()), disabled_at datetime);",
  "INSERT INTO admin_users (id, email, role, created_at) VALUES (3, 'beheerder-3@example.invalid', 'moderator', '2026-10-01 08:00:00');",
  'CREATE TABLE items (id int unsigned PRIMARY KEY, title varchar(100));',
  "INSERT INTO items VALUES (1, 'Een verzonnen kop');",
  'CREATE TABLE `acceptance_copy` (`dumped_at` datetime NOT NULL, `loaded_at` datetime DEFAULT NULL);',
  "INSERT INTO `acceptance_copy` (`dumped_at`) VALUES ('2026-11-10 09:30:07');",
]
const completeDump = [...madeUpDump, '-- Export completed', ''].join('\n')

let work: string
let record: string
let database: string
let counter = 0
let programs = 0
let server: Awaited<ReturnType<typeof connectToServer>>

beforeAll(async () => {
  work = mkdtempSync(path.join(tmpdir(), 'fansite-pull-test-'))
  server = await connectToServer(serverUrl)
})

afterAll(async () => {
  await server?.end()
  rmSync(work, { force: true, recursive: true })
})

beforeEach(() => {
  counter += 1
  record = path.join(work, `record-${counter}`)
  mkdirSync(record)
  database = scratchDatabaseName('test', serverUrl)
  process.env['FAKE_RECORD'] = record
  process.env['FAKE_SERVER_URL'] = serverUrl
})

afterEach(async () => {
  delete process.env['FAKE_RECORD']
  delete process.env['FAKE_SERVER_URL']
  vi.restoreAllMocks()
  await server.query('DROP DATABASE IF EXISTS ??', [database])
})

function env(overrides: Partial<PullEnv> = {}): PullEnv {
  return {
    ACCEPTANCE_APP_PATH: '/home/made-up/domains/acc.example.test/app',
    ACCEPTANCE_SSH_HOST: 'ssh.example.test',
    ACCEPTANCE_SSH_KEY: '/Users/made-up/.ssh/made-up-key',
    ACCEPTANCE_SSH_PORT: 26,
    ACCEPTANCE_SSH_USER: 'made-up',
    DATABASE_URL: serverUrl,
    MYSQL_COMMAND: fakeClient('mysql'),
    ...overrides,
  }
}

/**
 * A client that runs what it reads on the database in its last argument, on the server of the
 * tests, with the mysql2 of this package. It keeps its arguments under `name`.
 */
function fakeClient(name: 'docker' | 'mysql') {
  const script = path.join(work, `client-${counter}.mjs`)

  writeFileSync(
    script,
    [
      `import { createConnection } from '${import.meta.resolve('mysql2/promise')}'`,
      'const chunks = []',
      'for await (const chunk of process.stdin) chunks.push(chunk)',
      'const url = new URL(process.env.FAKE_SERVER_URL)',
      'url.pathname = `/${process.argv.at(-1)}`',
      'const connection = await createConnection({ multipleStatements: true, uri: url.href })',
      'await connection.query(Buffer.concat(chunks).toString())',
      'await connection.end()',
    ].join('\n'),
  )

  return program(name, [
    `printf "%s\\n" "$@" > "$FAKE_RECORD/${name}-args"`,
    `pwd > "$FAKE_RECORD/${name}-folder"`,
    `exec "${process.execPath}" "${script}" "$@"`,
  ])
}

/** An `ssh` that keeps its arguments and prints `dump`, then stops with `code`. */
function fakeSsh(dump = completeDump, code = 0, complaint = '') {
  const file = path.join(work, `dump-${counter}.sql`)

  writeFileSync(file, dump)

  return program('ssh', [
    'printf "%s\\n" "$@" > "$FAKE_RECORD/ssh-args"',
    `cat "${file}"`,
    ...(complaint === '' ? [] : [`echo "${complaint}" >&2`]),
    `exit ${code}`,
  ])
}

/** Writes a program that the command can start, and returns its path. */
function program(name: string, lines: string[]) {
  programs += 1

  const file = path.join(work, `${name}-${programs}`)

  writeFileSync(file, ['#!/bin/sh', ...lines, ''].join('\n'))
  chmodSync(file, 0o755)

  return file
}

const recorded = (name: string) => readFileSync(path.join(record, name), 'utf8').trim().split('\n')

async function exists(name: string) {
  const [rows] = await server.query<RowDataPacket[]>(
    'SELECT schema_name FROM information_schema.schemata WHERE schema_name = ?',
    [name],
  )

  return rows.length === 1
}

describe('pullAcceptanceCopy', () => {
  it('loads what the host prints into the copy, and says when the dump was made and loaded', async () => {
    const result = await pullAcceptanceCopy(env(), now, { database, ssh: fakeSsh() })

    expect(result).toEqual({ database, dumpedAt: '2026-11-10 09:30:07', loadedAt: '2026-11-10 09:31:15', tables: 3 })

    const [items] = await server.query(`SELECT title FROM \`${database}\`.items`)
    const [times] = await server.query({
      dateStrings: true,
      sql: `SELECT dumped_at, loaded_at FROM \`${database}\`.acceptance_copy`,
    })

    expect(items).toEqual([{ title: 'Een verzonnen kop' }])
    expect(times).toEqual([{ dumped_at: '2026-11-10 09:30:07', loaded_at: '2026-11-10 09:31:15' }])
  })

  it('adds one made-up account to log in with, next to the accounts of the dump', async () => {
    await pullAcceptanceCopy(env(), now, { database, ssh: fakeSsh() })

    const [users] = await server.query(
      `SELECT id, email, role, disabled_at FROM \`${database}\`.admin_users ORDER BY id`,
    )

    expect(users).toEqual([
      { disabled_at: null, email: 'beheerder-3@example.invalid', id: 3, role: 'moderator' },
      { disabled_at: null, email: 'beheer@example.test', id: 4, role: 'beheerder' },
    ])
  })

  it('starts the export on the host with the key, the port and the folder of the settings', async () => {
    await pullAcceptanceCopy(env({ ACCEPTANCE_SSH_PORT: 2222 }), now, { database, ssh: fakeSsh() })

    expect(recorded('ssh-args')).toEqual([
      '-p',
      '2222',
      '-i',
      '/Users/made-up/.ssh/made-up-key',
      '-o',
      'IdentitiesOnly=yes',
      '-o',
      'BatchMode=yes',
      'made-up@ssh.example.test',
      '/opt/alt/alt-nodejs24/root/usr/bin/node --env-file="$HOME/fansite-acceptatie.env" /home/made-up/domains/acc.example.test/app/packages/db/backup.mjs export',
    ])
  })

  it('gives its own client the login in an option file, and the dump on its standard input', async () => {
    await pullAcceptanceCopy(env(), now, { database, ssh: fakeSsh() })

    const [optionFile, ...rest] = recorded('mysql-args')

    expect(optionFile).toMatch(/^--defaults-extra-file=.*client\.cnf$/)
    expect(rest).toEqual(['--default-character-set=utf8mb4', database])
  })

  it('uses the client in the container of docker compose when no client is set', async () => {
    const root = path.join(work, `root-${counter}`)

    mkdirSync(root)
    await pullAcceptanceCopy(env({ MYSQL_COMMAND: undefined }), now, {
      database,
      docker: fakeClient('docker'),
      root,
      ssh: fakeSsh(),
    })

    expect(recorded('docker-args')).toEqual([
      'compose',
      'exec',
      '-T',
      'mariadb',
      'mariadb',
      '--default-character-set=utf8mb4',
      database,
    ])
    expect(recorded('docker-folder')[0]).toMatch(new RegExp(`root-${counter}$`))
    expect(await exists(database)).toBe(true)
  })

  it('makes the copy anew: nothing of the copy before it stays', async () => {
    await server.query('CREATE DATABASE ??', [database])
    await server.query(`CREATE TABLE \`${database}\`.left_over (id int)`)
    await pullAcceptanceCopy(env(), now, { database, ssh: fakeSsh() })

    const [rows] = await server.query<RowDataPacket[]>(
      'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = ? ORDER BY table_name',
      [database],
    )

    expect(rows.map((row) => String(row['name']))).toEqual(['acceptance_copy', 'admin_users', 'items'])
  })

  it('leaves the copy that was there alone when the host sends nothing, and says what ssh said', async () => {
    await server.query('CREATE DATABASE ??', [database])
    await server.query(`CREATE TABLE \`${database}\`.the_copy_before (id int)`)

    await expect(
      pullAcceptanceCopy(env(), now, { database, ssh: fakeSsh('', 255, 'Permission denied (publickey).') }),
    ).rejects.toThrow(/stopped with code 255\. It said:\nPermission denied \(publickey\)\./)

    const [rows] = await server.query<RowDataPacket[]>(
      'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = ?',
      [database],
    )

    expect(rows.map((row) => String(row['name']))).toEqual(['the_copy_before'])
    expect(() => recorded('mysql-args')).toThrow(/ENOENT/)
  })

  it('removes the half copy when the dump stops before its last line', async () => {
    await expect(
      pullAcceptanceCopy(env(), now, { database, ssh: fakeSsh(`${madeUpDump.slice(0, 5).join('\n')}\n`) }),
    ).rejects.toThrow(/The dump stopped before its last line, so the copy is not complete\./)
    expect(await exists(database)).toBe(false)
  })

  it('removes the half copy when the host fails halfway, and says what the host said', async () => {
    await expect(
      pullAcceptanceCopy(env(), now, {
        database,
        ssh: fakeSsh(`${madeUpDump.slice(0, 3).join('\n')}\n`, 1, 'The export failed: mysqldump stopped with code 2.'),
      }),
    ).rejects.toThrow(/stopped with code 1\. It said:\nThe export failed: mysqldump stopped with code 2\./)
    expect(await exists(database)).toBe(false)
  })

  it('removes the half copy when the client fails, and says what the client said', async () => {
    const failing = program('mysql', ['cat > /dev/null', 'echo "ERROR 1064 near line 2" >&2', 'exit 1'])

    await expect(
      pullAcceptanceCopy(env({ MYSQL_COMMAND: failing }), now, { database, ssh: fakeSsh() }),
    ).rejects.toThrow(/stopped with code 1\. It said:\nERROR 1064 near line 2/)
    expect(await exists(database)).toBe(false)
  })

  it('stops the host and does not hang when the client stops before a large dump is in', async () => {
    const large = path.join(work, `large-${counter}.sql`)

    // Far more than a pipe holds, so the host waits for a reader that is gone.
    writeFileSync(large, `${'-- a line of a made-up dump that nobody reads\n'.repeat(100_000)}${completeDump}`)

    const waitingHost = program('ssh', [`exec cat "${large}"`])
    const failing = program('mysql', ['echo "ERROR 1064 near line 1" >&2', 'exit 1'])

    await expect(
      pullAcceptanceCopy(env({ MYSQL_COMMAND: failing }), now, { database, ssh: waitingHost }),
    ).rejects.toThrow(/mysql-\d+ stopped with code 1\. It said:\nERROR 1064 near line 1/)
    await expect(
      pullAcceptanceCopy(env({ MYSQL_COMMAND: path.join(work, 'no-client') }), now, { database, ssh: waitingHost }),
    ).rejects.toThrow(/no-client is not installed here, or not on the path\. Set MYSQL_COMMAND to its full path\./)
    expect(await exists(database)).toBe(false)
  }, 10_000)

  it('says how to start the database when the server of DATABASE_URL is not there', async () => {
    await expect(
      pullAcceptanceCopy(env({ DATABASE_URL: 'mysql://root@127.0.0.1:1/fansite' }), now, { database, ssh: fakeSsh() }),
    ).rejects.toThrow(
      'Can not connect to the database server of DATABASE_URL on this computer. Start it with `docker compose up -d --wait` and try again.',
    )
  })

  it('says so when the client loaded somewhere else than the database of DATABASE_URL', async () => {
    const elsewhere = program('mysql', ['cat > /dev/null'])

    await expect(
      pullAcceptanceCopy(env({ MYSQL_COMMAND: elsewhere }), now, { database, ssh: fakeSsh() }),
    ).rejects.toThrow(/has no table acceptance_copy\. Does the client load into the database server of DATABASE_URL\?/)
    expect(await exists(database)).toBe(false)
  })

  it('says what to do when ssh or the client is not there', async () => {
    await expect(pullAcceptanceCopy(env(), now, { database, ssh: path.join(work, 'no-ssh') })).rejects.toThrow(
      /no-ssh is not installed here, or not on the path\. Install an SSH client\./,
    )
    await expect(
      pullAcceptanceCopy(env({ MYSQL_COMMAND: undefined }), now, {
        database,
        docker: path.join(work, 'no-docker'),
        ssh: fakeSsh(),
      }),
    ).rejects.toThrow(/no-docker is not installed here.*Start Docker, or set MYSQL_COMMAND to a client of your own\./)
  })

  it('only goes into fansite_acc or a database of a test, never into fansite or one of a worktree', async () => {
    for (const name of ['fansite', 'fansite_514_worktree_env', 'mysql', 'fansite_acc_2']) {
      await expect(pullAcceptanceCopy(env(), now, { database: name, ssh: fakeSsh() }), name).rejects.toThrow(
        `The copy goes into fansite_acc, never into ${name}.`,
      )
    }
    expect(() => recorded('ssh-args')).toThrow(/ENOENT/)
  })

  it('refuses a database server that is not on this computer, before it reaches the host', async () => {
    await expect(
      pullAcceptanceCopy(env({ DATABASE_URL: 'mysql://fansite:s3cret-word@db.example.test:3306/fansite' }), now, {
        database,
        ssh: fakeSsh(),
      }),
    ).rejects.toThrow(/DATABASE_URL does not point at this computer/)
    expect(() => recorded('ssh-args')).toThrow(/ENOENT/)
  })
})

describe('pullEnvSchema', () => {
  const source = {
    ACCEPTANCE_APP_PATH: '/home/made-up/domains/acc.example.test/app',
    ACCEPTANCE_SSH_HOST: 'ssh.example.test',
    ACCEPTANCE_SSH_KEY: '/Users/made-up/.ssh/made-up-key',
    ACCEPTANCE_SSH_USER: 'made-up',
    DATABASE_URL: 'mysql://root@127.0.0.1:3306/fansite',
  }

  it('takes the settings of the host, with port 26 unless another is set', () => {
    expect(pullEnvSchema.parse(source)).toMatchObject({ ACCEPTANCE_SSH_PORT: 26 })
    expect(pullEnvSchema.parse(source).MYSQL_COMMAND).toBeUndefined()
    expect(pullEnvSchema.parse({ ...source, ACCEPTANCE_SSH_PORT: '2222' }).ACCEPTANCE_SSH_PORT).toBe(2222)
  })

  it('refuses a value that ssh would read as an option or the shell of the host as a command', () => {
    for (const [name, value] of [
      ['ACCEPTANCE_SSH_HOST', '-oProxyCommand=touch /tmp/x'],
      ['ACCEPTANCE_SSH_HOST', 'ssh.example.test; id'],
      ['ACCEPTANCE_SSH_USER', '-l root'],
      ['ACCEPTANCE_SSH_USER', 'made up'],
      ['ACCEPTANCE_APP_PATH', '/home/made-up/app; rm -rf ~'],
      ['ACCEPTANCE_APP_PATH', '/home/made-up/$(id)'],
      ['ACCEPTANCE_APP_PATH', 'domains/app'],
      ['ACCEPTANCE_SSH_KEY', '~/.ssh/made-up-key'],
      ['ACCEPTANCE_SSH_PORT', '0'],
    ] as const) {
      expect(pullEnvSchema.safeParse({ ...source, [name]: value }).success, `${name}=${value}`).toBe(false)
    }
  })
})

describe('runPullCommand', () => {
  const source = (overrides: Record<string, string | undefined> = {}) => ({
    ACCEPTANCE_APP_PATH: '/home/made-up/domains/acc.example.test/app',
    ACCEPTANCE_SSH_HOST: 'ssh.example.test',
    ACCEPTANCE_SSH_KEY: '/Users/made-up/.ssh/made-up-key',
    ACCEPTANCE_SSH_USER: 'made-up',
    DATABASE_URL: serverUrl,
    MYSQL_COMMAND: fakeClient('mysql'),
    ...overrides,
  })

  it('exits with 0 and ends with the time of the copy', async () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {})

    expect(await runPullCommand([], source(), now, { database, ssh: fakeSsh() })).toBe(0)
    expect(log).toHaveBeenCalledTimes(1)
    expect(String(log.mock.calls[0]?.[0])).toBe(
      [
        `Copied the acceptance database into ${database} (3 tables).`,
        'The dump was made on the host at 2026-11-10 09:30:07 UTC and loaded here at 2026-11-10 09:31:15 UTC.',
        'Log in on the copy as beheer@example.test.',
      ].join('\n'),
    )
  })

  it('exits with 1 and says why when getting the dump fails, without the settings of the host', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await runPullCommand([], source(), now, { database, ssh: fakeSsh('', 255, 'Connection timed out') })).toBe(1)
    expect(String(error.mock.calls[0]?.[0])).toMatch(
      /^The copy failed: .* stopped with code 255\. It said:\nConnection timed out$/,
    )
    expect(String(error.mock.calls[0]?.[0])).not.toMatch(/made-up-key|ssh\.example\.test|acc\.example\.test/)
  })

  it('exits with 1 and names the settings that are missing, and starts nothing', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(
      await runPullCommand([], { ACCEPTANCE_SSH_HOST: '', DATABASE_URL: serverUrl }, now, { database, ssh: fakeSsh() }),
    ).toBe(1)

    const message = String(error.mock.calls[0]?.[0])

    for (const name of ['ACCEPTANCE_APP_PATH', 'ACCEPTANCE_SSH_HOST', 'ACCEPTANCE_SSH_KEY', 'ACCEPTANCE_SSH_USER']) {
      expect(message).toContain(`- ${name} is missing`)
    }
    expect(() => recorded('ssh-args')).toThrow(/ENOENT/)
  })

  it('exits with 2 when it gets an argument', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})

    expect(await runPullCommand(['fansite'], source(), now, { database, ssh: fakeSsh() })).toBe(2)
    expect(String(error.mock.calls[0]?.[0])).toContain('Usage: pnpm db:pull-acceptance')
  })
})
