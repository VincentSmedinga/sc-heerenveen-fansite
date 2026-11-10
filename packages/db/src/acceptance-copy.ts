import type { RowDataPacket } from 'mysql2/promise'

// `pnpm db:pull-acceptance`: puts a copy of the acceptance database on the owner's computer, in
// the database `fansite_acc`, without personal data (see docs/back-ups.md, _Een kopie van
// acceptatie_). It starts `backup.mjs export` on the host over SSH and gives what that prints
// straight to the local database client: the dump is never a file. The made-up addresses are
// put in on the host, so a real one never gets here.
//
// Only the owner runs it: it uses the SSH key of the host, which agents don't have. Agents
// query the copy and read its age in the table `acceptance_copy`.
import { parseEnv } from '@fansite/shared/env'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { pipeline } from 'node:stream/promises'
import * as z from 'zod'

import { exportCompletionMarker, readConnection, watch, withOptionFile } from './backup.ts'
import { databaseEnvSchema } from './env.ts'
import { acceptanceCopyDatabase, copyInfoTable, localLogin } from './export-plan.ts'
import { connectToServer } from './test-database.ts'

/**
 * Node and the file with `DATABASE_URL` on the host, as docs/back-ups.md has them for the
 * nightly dump. The shell of the host fills in `$HOME`.
 */
const remoteNode = '/opt/alt/alt-nodejs24/root/usr/bin/node'
const remoteEnvFile = '"$HOME/fansite-acceptatie.env"'

/**
 * The variables of the command, from the .env in the root. The four of the host are checked
 * strictly, because they end up in the arguments of `ssh` and in a command for the shell of the
 * host: a name can't start with a dash or hold a space or a quote. `MYSQL_COMMAND` is the
 * client that loads the dump; without it the command uses the one in the container of `docker
 * compose`.
 */
export const pullEnvSchema = databaseEnvSchema.extend({
  ACCEPTANCE_APP_PATH: z.string().regex(/^\/[\w./-]+$/, 'must be an absolute path of letters, digits, ., _, - and /'),
  ACCEPTANCE_SSH_HOST: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9.-]*$/, 'must be a host name or an IPv4 address'),
  ACCEPTANCE_SSH_KEY: z.string().refine((file) => path.isAbsolute(file), 'must be an absolute path'),
  ACCEPTANCE_SSH_PORT: z.coerce.number().int().min(1).max(65_535).default(26),
  ACCEPTANCE_SSH_USER: z.string().regex(/^[A-Za-z0-9_][\w.-]*$/, 'must be a user name of letters, digits, ., _ and -'),
  MYSQL_COMMAND: z.string().optional(),
})

export type PullEnv = z.output<typeof pullEnvSchema>

export type PullOptions = {
  /**
   * The database the copy goes into. Only the tests give another one, a database of their own:
   * a test must never drop the real copy.
   */
  database?: string
  /** The program that runs `compose exec` when there is no `MYSQL_COMMAND`. */
  docker?: string
  /** The folder with compose.yaml. */
  root?: string
  ssh?: string
}

const utc = (moment: Date) => moment.toISOString().slice(0, 19).replace('T', ' ')

/**
 * Gets the export from the host and loads it into the local copy, which it makes anew. It
 * returns the two times in the copy and how many tables it has.
 *
 * The old copy stays until the host has started to send a dump, so a wrong key or a host that
 * is away costs nothing. When the dump stops halfway or the client fails, the half copy is
 * removed: no copy is better than one that looks whole.
 */
export async function pullAcceptanceCopy(
  env: PullEnv,
  now = new Date(),
  {
    database = acceptanceCopyDatabase,
    docker = 'docker',
    root = path.resolve(import.meta.dirname, '../../..'),
    ssh = 'ssh',
  }: PullOptions = {},
) {
  const local = readConnection(env.DATABASE_URL)

  if (database !== acceptanceCopyDatabase && !/^fansite_test_[a-z0-9_]+$/.test(database)) {
    throw new Error(`The copy goes into ${acceptanceCopyDatabase}, never into ${database}.`)
  }

  if (!['127.0.0.1', '[::1]', 'localhost'].includes(local.host)) {
    throw new Error(
      'DATABASE_URL does not point at this computer. The copy only goes into a database on 127.0.0.1 or localhost.',
    )
  }

  const remote = spawn(
    ssh,
    [
      '-p',
      String(env.ACCEPTANCE_SSH_PORT),
      '-i',
      env.ACCEPTANCE_SSH_KEY,
      '-o',
      'IdentitiesOnly=yes',
      // Never wait for a password or a question nobody sees: fail and say why.
      '-o',
      'BatchMode=yes',
      `${env.ACCEPTANCE_SSH_USER}@${env.ACCEPTANCE_SSH_HOST}`,
      `${remoteNode} --env-file=${remoteEnvFile} ${env.ACCEPTANCE_APP_PATH}/packages/db/backup.mjs export`,
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  )
  const remoteDone = watch(remote, ssh, 'Install an SSH client.')

  // What the host sends is read first. A failure is handled when it gets its turn.
  remoteDone.catch(() => {})

  const dump = remote.stdout[Symbol.asyncIterator]() as AsyncIterator<Buffer>
  const first = await dump.next()

  if (first.done === true) {
    await remoteDone

    throw new Error('The host sent nothing.')
  }

  const server = await connectToServer(env.DATABASE_URL).catch((error: unknown) => {
    remote.kill()
    remote.stdout.destroy()

    // `connectToServer` wraps the error of the driver, which has the code.
    const cause = error instanceof Error ? error.cause : undefined
    const code = cause instanceof Error && 'code' in cause ? String(cause.code) : 'unknown error'

    throw new Error(
      `Can not connect to the database server of DATABASE_URL on this computer (${code}). ` +
        'Is it running? Start it with `docker compose up -d --wait`. Otherwise check DATABASE_URL.',
      { cause: error },
    )
  })

  try {
    await server.query('DROP DATABASE IF EXISTS ??', [database])
    await server.query('CREATE DATABASE ??', [database])

    let tail = ''

    async function* received() {
      for (let next = first; next.done !== true; next = await dump.next()) {
        tail = (tail + next.value.toString('latin1')).slice(-200)

        yield next.value
      }
    }

    const load = async (command: string, args: string[], howToFix: string, cwd?: string) => {
      const client = spawn(command, args, { cwd, stdio: ['pipe', 'ignore', 'pipe'] })
      const loaded = watch(client, command, howToFix)
      const piped = pipeline(received, client.stdin)
      let hostStopped = false
      let stoppedByUs = false
      // A client that stops early reads no more, and then the host would wait for ever with a
      // dump nobody takes. So the host is stopped as soon as the client or the pipe fails.
      const stopHost = () => {
        if (!hostStopped) {
          stoppedByUs = true
          remote.kill()
          // What it sent and nobody read would keep it from closing.
          remote.stdout.destroy()
        }
      }

      remoteDone.then(
        () => (hostStopped = true),
        () => (hostStopped = true),
      )
      loaded.catch(stopHost)
      piped.catch(stopHost)

      const [sent, ended, pipe] = await Promise.allSettled([remoteDone, loaded, piped])

      // A host that failed by itself comes first: the client and the pipe fail because of it.
      // A host that we stopped says nothing useful: then the client says what went wrong.
      for (const result of stoppedByUs ? [ended, pipe, sent] : [sent, ended, pipe]) {
        if (result.status === 'rejected') throw result.reason
      }
    }

    await (env.MYSQL_COMMAND === undefined
      ? load(
          docker,
          ['compose', 'exec', '-T', 'mariadb', 'mariadb', '--default-character-set=utf8mb4', database],
          'Start Docker, or set MYSQL_COMMAND to a client of your own.',
          root,
        )
      : withOptionFile(local, (optionFile) =>
          load(
            env.MYSQL_COMMAND ?? '',
            [`--defaults-extra-file=${optionFile}`, '--default-character-set=utf8mb4', database],
            'Set MYSQL_COMMAND to its full path.',
          ),
        ))

    if (!tail.includes(exportCompletionMarker)) {
      throw new Error('The dump stopped before its last line, so the copy is not complete.')
    }

    await server.query('USE ??', [database])

    // Read back from the database in DATABASE_URL: it also shows that the client loaded there.
    const [info] = await server
      .query<RowDataPacket[]>({ dateStrings: true, sql: 'SELECT dumped_at FROM ??', values: [copyInfoTable] })
      .catch(() => {
        throw new Error(
          `The client ran without an error, but ${database} has no table ${copyInfoTable}. ` +
            'Does the client load into the database server of DATABASE_URL?',
        )
      })
    const dumpedAt = String(info[0]?.['dumped_at'] ?? '')
    const loadedAt = utc(now)

    await server.query('INSERT INTO admin_users (email, role) VALUES (?, ?)', [localLogin.email, localLogin.role])
    await server.query('UPDATE ?? SET loaded_at = ?', [copyInfoTable, loadedAt])

    const [counted] = await server.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS total FROM information_schema.tables WHERE table_schema = DATABASE()',
    )

    return { database, dumpedAt, loadedAt, tables: Number(counted[0]?.['total'] ?? 0) }
  } catch (error) {
    remote.kill()
    remote.stdout.destroy()
    await server.query('DROP DATABASE IF EXISTS ??', [database]).catch(() => {})

    throw error
  } finally {
    await server.end()
  }
}

/**
 * Runs the command and returns the exit code: 0 when the copy is there, 1 when it failed (the
 * message says why) and 2 when it got arguments, which it doesn't take.
 */
export async function runPullCommand(
  args: readonly string[],
  source: Record<string, string | undefined> = process.env,
  now = new Date(),
  options: PullOptions = {},
) {
  if (args.length > 0) {
    console.error('Usage: pnpm db:pull-acceptance (no arguments; the settings are in the .env in the root)')

    return 2
  }

  try {
    const result = await pullAcceptanceCopy(parseEnv(pullEnvSchema, source), now, options)

    console.log(
      [
        `Copied the acceptance database into ${result.database} (${result.tables} tables).`,
        `The dump was made on the host at ${result.dumpedAt} UTC and loaded here at ${result.loadedAt} UTC.`,
        `Log in on the copy as ${localLogin.email}.`,
      ].join('\n'),
    )

    return 0
  } catch (error) {
    console.error(`The copy failed: ${error instanceof Error ? error.message : 'unknown error'}`)

    return 1
  }
}

if (import.meta.main) {
  process.exitCode = await runPullCommand(process.argv.slice(2))
}
