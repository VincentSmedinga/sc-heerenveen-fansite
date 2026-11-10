import { parseEnv } from '@fansite/shared/env'
import { createConnection, escape, escapeId, type RowDataPacket } from 'mysql2/promise'
import { spawn } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { mkdir, mkdtemp, open, readdir, rename, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { type Writable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { createGunzip, createGzip } from 'node:zlib'
import * as z from 'zod'

import { databaseEnvSchema } from './env.ts'
import { copiedTablesOutsideSchema, copyInfoTable, exportPlan } from './export-plan.ts'

const day = 24 * 60 * 60 * 1000

/**
 * The tables whose rows a dump leaves out, so it keeps their structure only. Each holds data
 * that the site or the importer promises to throw away, and 14 days of dumps would keep it:
 *
 * - `visitor_hashes` and `visitor_salts`: the visit counters throw them away at the end of the
 *   day (see _We tellen paginaweergaven en unieke bezoekers per dag_ in
 *   docs/beslissingen/redactie.md), and the salt turns the hashes back into addresses;
 * - `discussions`: the screen name of the last commenter, which the importer replaces at every
 *   run (see the Redactie chapter in Storybook);
 * - `admin_sessions` and `admin_login_links`: a restore would bring back a session or a link
 *   that was revoked after the dump.
 *
 * The importer fills the discussions again within a quarter of an hour, and signing in again
 * makes a session.
 */
export const structureOnlyTables = [
  'admin_login_links',
  'admin_sessions',
  'discussions',
  'visitor_hashes',
  'visitor_salts',
] as const

/** The line `mysqldump` ends a complete dump with. A dump without it was cut short. */
const completionMarker = '-- Dump completed'

/**
 * The variables the backup commands need, on top of `DATABASE_URL`. `BACKUP_FOLDER` must be an
 * absolute path, since cron starts the command in a folder nobody chose. The two commands are
 * the clients of the database server; the host may keep them somewhere cron's `PATH` doesn't
 * reach.
 */
export const backupEnvSchema = databaseEnvSchema.extend({
  BACKUP_FOLDER: z.string().refine((folder) => path.isAbsolute(folder), 'must be an absolute path'),
  BACKUP_KEEP_DAYS: z.coerce.number().int().min(1).max(365).default(14),
  MYSQL_COMMAND: z.string().default('mysql'),
  MYSQLDUMP_COMMAND: z.string().default('mysqldump'),
})

export type BackupEnv = z.output<typeof backupEnvSchema>

/** The variables `export` needs. It writes no file, so it asks for no folder. */
export const exportEnvSchema = databaseEnvSchema.extend({
  MYSQLDUMP_COMMAND: z.string().default('mysqldump'),
})

export type ExportEnv = z.output<typeof exportEnvSchema>

/** The line the export ends with. `pnpm db:pull-acceptance` refuses a copy without it. */
export const exportCompletionMarker = '-- Export completed'

const usage = [
  'Usage:',
  '  backup            makes a dump of the database and removes the dumps that are too old',
  '  export            writes a dump without personal data to the standard output',
  '  restore <file>    puts a dump back into an empty database',
].join('\n')

/**
 * Makes a compressed dump of the database in `DATABASE_URL`, in the backup folder, and removes
 * the dumps of the same database that are older than `BACKUP_KEEP_DAYS`. A dump that fails
 * leaves no file and removes nothing: the older dumps are all there is.
 */
export async function backUp(env: BackupEnv, now = new Date()) {
  const connection = readConnection(env.DATABASE_URL)
  const folder = await prepareFolder(env.BACKUP_FOLDER)
  const name = backupName(connection.database, now)
  const partial = path.join(folder, `${name}.partial`)
  const target = path.join(folder, name)

  // Two runs in the same second, such as the cron job and a dump before a deploy, would give
  // the same name. The second must not replace the first.
  if (await stat(target).catch(() => null)) {
    throw new Error(`${target} exists already. Try again in a moment.`)
  }
  const bytes = await withOptionFile(connection, async (optionFile) => {
    // `wx` fails when another run has the same `.partial` open. That run's file stays: only a
    // file this run made is removed below.
    const file = await open(partial, 'wx', 0o600).catch((error: NodeJS.ErrnoException) => {
      throw error.code === 'EEXIST' ? new Error(`${partial} exists already. Try again in a moment.`) : error
    })

    try {
      const common = [
        `--defaults-extra-file=${optionFile}`,
        '--single-transaction',
        '--skip-lock-tables',
        '--skip-add-drop-table',
        '--default-character-set=utf8mb4',
        '--hex-blob',
      ]

      // The first pass has the tables with their rows, except those that keep no data. The
      // second has only the structure of those: a restore needs the tables, not their rows.
      await dumpTo(file.createWriteStream(), env.MYSQLDUMP_COMMAND, [
        [
          ...common,
          ...structureOnlyTables.map((table) => `--ignore-table=${connection.database}.${table}`),
          connection.database,
        ],
        [...common, '--no-data', connection.database, ...structureOnlyTables],
      ])
    } catch (error) {
      await file.close().catch(() => {})
      await rm(partial, { force: true })

      throw error
    }

    await rename(partial, target)

    return (await stat(target)).size
  })
  const removed = await pruneBackups(folder, connection.database, env.BACKUP_KEEP_DAYS, now)

  return { bytes, database: connection.database, file: target, removed }
}

/**
 * The name of a dump: the database, then the moment in UTC, such as
 * `fansite-2026-10-26T031507Z.sql.gz`.
 */
export function backupName(database: string, now: Date) {
  return `${database}-${now
    .toISOString()
    .replace(/\.\d{3}Z$/, 'Z')
    .replaceAll(':', '')}.sql.gz`
}

/** Chooses the names to remove: the pure part of `pruneBackups`, so tests can try the rules. */
export function expiredBackups(names: readonly string[], database: string, keepDays: number, now: Date) {
  const pattern = new RegExp(`^${escapeRegExp(database)}-(\\d{4}-\\d{2}-\\d{2}T\\d{6}Z)\\.sql\\.gz(\\.partial)?$`)
  const found = names.flatMap((name) => {
    const match = pattern.exec(name)
    const taken = match?.[1] === undefined ? Number.NaN : Date.parse(stampToIso(match[1]))

    return Number.isNaN(taken) ? [] : [{ name, partial: match?.[2] !== undefined, taken }]
  })
  const newest = Math.max(...found.filter(({ partial }) => !partial).map(({ taken }) => taken))
  // The name holds whole seconds, so a dump from exactly `keepDays` ago stays.
  const cutoff = Math.floor(now.getTime() / 1000) * 1000 - keepDays * day

  return found.filter(({ partial, taken }) => taken < cutoff && (partial || taken !== newest)).map(({ name }) => name)
}

/**
 * Writes a dump of the database in `DATABASE_URL` to `out`, for the copy of acceptance on the
 * owner's computer: `pnpm db:pull-acceptance` starts it on the host over SSH and loads what it
 * prints. It follows `exportPlan`: the tables that are copied with their rows, the tables that
 * keep their structure only, and the rows of `admin_users` with a made-up address. The dump
 * ends with a small table that holds the time of the dump (`now`, in UTC) and the line that
 * says it is complete. Nothing is written to a file, except the option file with the login
 * that the client reads, which is removed again (see `withOptionFile`).
 *
 * It stops before it writes anything when the database has a table or a column that
 * `exportPlan` doesn't name, so nothing leaves the host that nobody looked at.
 */
export async function exportDump(env: ExportEnv, out: Writable, now = new Date()) {
  const connection = readConnection(env.DATABASE_URL)
  const { copy, replaced, structure } = await readExportPlan(env.DATABASE_URL)
  const info = escapeId(copyInfoTable)
  const closing = [
    '',
    '-- The rows with made-up values, and the time of this dump (UTC).',
    ...replaced,
    `CREATE TABLE ${info} (\`dumped_at\` datetime NOT NULL, \`loaded_at\` datetime DEFAULT NULL);`,
    `INSERT INTO ${info} (\`dumped_at\`) VALUES (${escape(now.toISOString().slice(0, 19).replace('T', ' '))});`,
    exportCompletionMarker,
    '',
  ].join('\n')

  await withOptionFile(connection, async (optionFile) => {
    const common = [
      `--defaults-extra-file=${optionFile}`,
      '--single-transaction',
      '--skip-lock-tables',
      '--skip-add-drop-table',
      '--default-character-set=utf8mb4',
      '--hex-blob',
    ]

    await pipeline(
      async function* () {
        // The tables are named one by one. Without a name `mysqldump` takes every table.
        yield* dumpOutput(env.MYSQLDUMP_COMMAND, [
          [...common, connection.database, ...copy],
          [...common, '--no-data', connection.database, ...structure],
        ])

        yield closing
      },
      out,
      // The standard output is not ours to close.
      { end: false },
    )
  })

  return { copied: copy.length, database: connection.database, structureOnly: structure.length }
}

/**
 * The text of the option file the clients read the login from. Passing it this way keeps the
 * password out of the command line, where every account on the host can read it with `ps`.
 */
export function optionFileText(connection: ReturnType<typeof readConnection>) {
  const quote = (value: string) => {
    // eslint-disable-next-line no-control-regex -- an option file has no room for a line break
    if (/[\u0000-\u001F]/.test(value)) {
      throw new Error('DATABASE_URL has a control character, which an option file can not hold.')
    }

    return `"${value.replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`
  }

  return [
    '[client]',
    `host=${quote(connection.host)}`,
    `port=${connection.port}`,
    `user=${quote(connection.user)}`,
    `password=${quote(connection.password)}`,
    'protocol=tcp',
    '',
  ].join('\n')
}

/**
 * Removes the dumps of one database that are older than `keepDays`, and the half dumps that a
 * stopped run left. It only touches files that have the name a dump of this database gets, so
 * other files and the dumps of another database stay. The newest dump is never removed, also
 * when it is old: if the cron job stopped, the last dump is the only one there is.
 */
export async function pruneBackups(folder: string, database: string, keepDays: number, now: Date) {
  const names = await readdir(folder)
  const expired = expiredBackups(names, database, keepDays, now)

  await Promise.all(expired.map((name) => rm(path.join(folder, name))))

  return expired
}

/** The parts of `DATABASE_URL` that the clients need, with the percent-encoding undone. */
export function readConnection(url: string) {
  const parsed = new URL(url)
  const database = decodeURIComponent(parsed.pathname.slice(1))

  if (database === '' || !/^[\w$-]+$/.test(database)) {
    throw new Error('DATABASE_URL must end in the name of a database of letters, digits, _, $ or -.')
  }

  return {
    database,
    host: parsed.hostname,
    password: decodeURIComponent(parsed.password),
    port: parsed.port === '' ? '3306' : parsed.port,
    user: decodeURIComponent(parsed.username),
  }
}

/**
 * Puts a dump into the database in `DATABASE_URL`, which must have no tables. A database with
 * tables is refused before anything is written, so a restore never mixes a dump with data that
 * is already there.
 */
export async function restore(env: BackupEnv, file: string) {
  const connection = readConnection(env.DATABASE_URL)
  const plain = file.endsWith('.sql')

  if (!plain && !file.endsWith('.sql.gz')) {
    throw new Error('The file must be a dump: a name that ends in .sql.gz or .sql.')
  }

  if (!(await stat(file).catch(() => null))?.isFile()) {
    throw new Error(`There is no file at ${file}.`)
  }

  const before = await countTables(env.DATABASE_URL)

  if (before > 0) {
    throw new Error(
      `The database ${connection.database} has ${before} tables. A dump goes into an empty database: ` +
        'make a new one and point DATABASE_URL at it.',
    )
  }

  await withOptionFile(connection, async (optionFile) => {
    const child = spawn(
      env.MYSQL_COMMAND,
      [`--defaults-extra-file=${optionFile}`, '--default-character-set=utf8mb4', connection.database],
      { stdio: ['pipe', 'ignore', 'pipe'] },
    )
    const finished = watch(child, env.MYSQL_COMMAND)
    const input = plain
      ? pipeline(createReadStream(file), child.stdin)
      : pipeline(createReadStream(file), createGunzip(), child.stdin)
    const [exit, piped] = await Promise.allSettled([finished, input])

    // A client that stops early closes its input, which makes the pipe fail as well. The
    // client's own message says more than that.
    if (exit.status === 'rejected') throw exit.reason

    if (piped.status === 'rejected') throw piped.reason
  })

  const tables = await countTables(env.DATABASE_URL)

  if (tables === 0) {
    throw new Error('The client ran without an error, but the database still has no tables.')
  }

  return { database: connection.database, file, tables }
}

/**
 * Runs one of the backup commands and returns the exit code: 0 when it did what was asked, 1
 * when it failed (the message says why), and 2 when the command is wrong. `pnpm db:backup` and
 * `pnpm db:restore` run it locally, and the file that `assemble` makes of
 * `backup-command.ts` runs it on the host (see docs/back-ups.md). `export` only runs on the
 * host, started over SSH by `pnpm db:pull-acceptance`.
 *
 * `report` hears how a backup went, so the host can mail the owner about a backup that keeps
 * failing (see `alerts.ts`). It is not called for a restore or a wrong command, and what it
 * does never changes the result.
 */
export async function runBackupCommand(
  args: readonly string[],
  source: Record<string, string | undefined> = process.env,
  now = new Date(),
  report: (outcome: { error: string; ok: false } | { ok: true }) => Promise<void> = async () => {},
) {
  const [command, file, ...rest] = args

  if (!(
    ((command === 'backup' || command === 'export') && file === undefined) ||
    (command === 'restore' && file !== undefined && rest.length === 0)
  )) {
    console.error(usage)

    return 2
  }

  if (command === 'export') {
    try {
      // The dump is the only thing on the standard output: what is said, is said on stderr.
      await exportDump(parseEnv(exportEnvSchema, source), process.stdout, now)

      return 0
    } catch (error) {
      console.error(`The export failed: ${messageOf(error)}`)

      return 1
    }
  }

  try {
    const env = parseEnv(backupEnvSchema, source)

    if (command === 'backup') {
      const result = await backUp(env, now)

      await report({ ok: true }).catch(() => {})

      console.log(
        `Dumped ${result.database} to ${result.file} (${formatBytes(result.bytes)}). ` +
          `Removed ${result.removed.length} ${result.removed.length === 1 ? 'dump' : 'dumps'} older than ${env.BACKUP_KEEP_DAYS} days.`,
      )
    } else {
      const result = await restore(env, path.resolve(file ?? ''))

      console.log(`Restored ${result.tables} tables from ${result.file} into ${result.database}.`)
    }

    return 0
  } catch (error) {
    console.error(`${command === 'backup' ? 'The backup' : 'The restore'} failed: ${messageOf(error)}`)

    if (command === 'backup') {
      await report({ error: messageOf(error), ok: false }).catch(() => {})
    }

    return 1
  }
}

/**
 * Resolves when a program has stopped with code 0, and rejects with what it printed on stderr
 * when it didn't start or stopped with another code. The password is never in that text: it is
 * not on the command line, and the clients don't print it.
 */
export function watch(
  child: ReturnType<typeof spawn>,
  command: string,
  howToFix = 'Set MYSQLDUMP_COMMAND or MYSQL_COMMAND to its full path.',
) {
  let stderr = ''

  child.stderr?.on('data', (chunk: Buffer) => {
    stderr = (stderr + chunk.toString()).slice(-2000)
  })

  return new Promise<void>((resolve, reject) => {
    child.once('error', (error: NodeJS.ErrnoException) => {
      reject(
        new Error(
          error.code === 'ENOENT'
            ? `${command} is not installed here, or not on the path. ${howToFix}`
            : `${command} could not start (${error.code ?? 'unknown error'}).`,
        ),
      )
    })
    child.once('close', (code, signal) => {
      if (code === 0) {
        resolve()
      } else {
        reject(
          new Error(
            `${command} stopped with ${signal ?? `code ${code}`}.${stderr === '' ? '' : ` It said:\n${stderr.trim()}`}`,
          ),
        )
      }
    })
  })
}

/** Runs `use` with an option file that only this account can read, then removes the file. */
export async function withOptionFile<Result>(
  connection: ReturnType<typeof readConnection>,
  use: (optionFile: string) => Promise<Result>,
) {
  const folder = await mkdtemp(path.join(tmpdir(), 'fansite-backup-'))
  const optionFile = path.join(folder, 'client.cnf')

  try {
    await writeFile(optionFile, optionFileText(connection), { flag: 'wx', mode: 0o600 })

    return await use(optionFile)
  } finally {
    await rm(folder, { force: true, recursive: true })
  }
}

/** How many tables the database in the URL has. */
async function countTables(url: string) {
  const connection = await createConnection({ uri: url })

  try {
    const [rows] = await connection.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE()',
    )

    return Number(rows[0]?.['total'] ?? 0)
  } finally {
    await connection.end()
  }
}

/**
 * Runs `mysqldump` once for each list of arguments and gives what they print, one after the
 * other. It fails when the program can't start, stops with a code other than 0, or ends
 * without the line that closes a complete dump.
 */
async function* dumpOutput(command: string, passes: readonly (readonly string[])[]) {
  for (const args of passes) {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
    const finished = watch(child, command)
    let tail = ''

    // The loop below reads the output first. A failure is handled when it gets its turn.
    finished.catch(() => {})

    for await (const chunk of child.stdout) {
      tail = (tail + (chunk as Buffer).toString('latin1')).slice(-200)

      yield chunk as Buffer
    }

    await finished

    if (!tail.includes(completionMarker)) {
      throw new Error(`${command} ended without the line that closes a dump, so the dump is not complete.`)
    }
  }
}

/** Writes what the passes of `mysqldump` print, compressed, to a file. */
async function dumpTo(file: Writable, command: string, passes: readonly (readonly string[])[]) {
  await pipeline(() => dumpOutput(command, passes), createGzip(), file)
}

function escapeRegExp(text: string) {
  return text.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`)
}

function formatBytes(bytes: number) {
  return bytes < 1024 * 1024
    ? `${Math.max(1, Math.round(bytes / 1024))} KB`
    : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function messageOf(error: unknown) {
  return error instanceof Error ? error.message : 'unknown error'
}

/**
 * Makes sure the backup folder exists and is for this account only. It makes a missing folder
 * with 0700, and refuses an existing one that others can read, because changing the rights of a
 * folder that is not ours to make (such as the home folder) could break the host. A folder in
 * `public_html` is refused too: a visitor could download it.
 */
async function prepareFolder(folder: string) {
  const resolved = path.resolve(folder)

  if (resolved.split(path.sep).includes('public_html')) {
    throw new Error(`${resolved} is in public_html, so a visitor could download the dumps. Choose a folder outside it.`)
  }

  await mkdir(resolved, { mode: 0o700, recursive: true })

  const { mode } = await stat(resolved)

  if ((mode & 0o077) !== 0) {
    throw new Error(
      `${resolved} can be read by other accounts (${(mode & 0o777).toString(8)}). ` +
        `Run "chmod 700 ${resolved}" and try again.`,
    )
  }

  return resolved
}

/**
 * Reads what the export needs from the database: which tables it copies, which it takes
 * without rows, and the `INSERT` lines for the tables with a made-up column. It throws when
 * the database has a table or a column that `exportPlan` doesn't name.
 */
async function readExportPlan(url: string) {
  // The times come back as the text the database holds, and that text goes into the dump.
  const connection = await createConnection({ dateStrings: true, uri: url })

  try {
    const [tables] = await connection.query<RowDataPacket[]>(
      'SELECT table_name AS name FROM information_schema.tables WHERE table_schema = DATABASE() ORDER BY table_name',
    )
    const names = tables.map((row) => String(row['name']))
    const outside: readonly string[] = copiedTablesOutsideSchema
    const unknown = names.filter((name) => !Object.hasOwn(exportPlan, name) && !outside.includes(name))

    if (unknown.length > 0) {
      throw new Error(
        `The database has ${unknown.length === 1 ? 'a table' : 'tables'} the export does not know: ${unknown.join(', ')}. ` +
          'Say what the export does with it in packages/db/src/export-plan.ts.',
      )
    }

    const copy = names.filter((name) => outside.includes(name) || exportPlan[name] === 'copy')
    const structure = names.filter((name) => !copy.includes(name))
    const replaced: string[] = []

    if (copy.length === 0 || structure.length === 0) {
      throw new Error('The database has no tables to export. Has it been migrated?')
    }

    for (const table of structure) {
      const rule = exportPlan[table]

      if (rule === undefined || typeof rule === 'string') {
        continue
      }

      const [found] = await connection.query<RowDataPacket[]>(
        'SELECT column_name AS name FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name = ? ORDER BY ordinal_position',
        [table],
      )
      const columns = found.map((row) => String(row['name']))
      const known = [...rule.keep, ...Object.keys(rule.replace)]
      const strange = [...columns.filter((name) => !known.includes(name)), ...known.filter((n) => !columns.includes(n))]

      if (strange.length > 0) {
        throw new Error(
          `The columns of ${table} are not the ones the export knows (${strange.join(', ')}). ` +
            'Say what the export does with each in packages/db/src/export-plan.ts.',
        )
      }

      // A column in `replace` is never read: the database answers with the made-up value.
      const [rows] = await connection.query<RowDataPacket[]>(
        `SELECT ${columns.map((name) => `${rule.replace[name] ?? escapeId(name)} AS ${escapeId(name)}`).join(', ')} ` +
          `FROM ${escapeId(table)} ORDER BY 1`,
      )

      for (const row of rows) {
        replaced.push(
          `INSERT INTO ${escapeId(table)} (${columns.map((name) => escapeId(name)).join(', ')}) ` +
            `VALUES (${columns.map((name) => escape(row[name])).join(', ')});`,
        )
      }
    }

    return { copy, replaced, structure }
  } finally {
    await connection.end()
  }
}

function stampToIso(stamp: string) {
  return `${stamp.slice(0, 13)}:${stamp.slice(13, 15)}:${stamp.slice(15)}`
}
