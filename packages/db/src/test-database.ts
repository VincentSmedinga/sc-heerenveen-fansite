import { createConnection } from 'mysql2/promise'
import { randomBytes } from 'node:crypto'

import { connect } from './client.ts'
import { readDatabaseEnv } from './env.ts'
import { migrateDatabase } from './migrate.ts'

export type TestDatabase = Awaited<ReturnType<typeof createTestDatabase>>

/**
 * Connects to the server in `DATABASE_URL`, without choosing a database. Stops with a clear
 * message when the server isn't there, so a missing database never looks like a failing test.
 */
export async function connectToServer(databaseUrl: string = readDatabaseEnv().DATABASE_URL) {
  const url = new URL(databaseUrl)

  url.pathname = ''

  try {
    return await createConnection({ uri: url.href })
  } catch (error) {
    const code = error instanceof Error && 'code' in error ? String(error.code) : 'unknown error'

    throw new Error(
      `Can't connect to MariaDB at ${url.host} (${code}). The database tests need a server: start it with ` +
        '`docker compose up -d --wait` and run them again, or point DATABASE_URL at another MariaDB 10.11. ' +
        'See packages/db/README.md.',
      { cause: error },
    )
  }
}

/**
 * Makes a database of its own on the server in `DATABASE_URL`, with the migrations run, and
 * leaves the development database alone. Call `drop()` when the tests are done. With `migrate:
 * false` the database stays empty, for a test that runs the migrations itself.
 *
 * The database starts with the character set latin1, which MariaDB 10.11 uses unless the server
 * says otherwise. Our tables must come out as utf8mb4 anyway.
 */
export async function createTestDatabase({ migrate = true }: { migrate?: boolean } = {}) {
  const server = await connectToServer()
  const name = scratchDatabaseName('test', readDatabaseEnv().DATABASE_URL)

  async function drop() {
    await server.query('DROP DATABASE IF EXISTS ??', [name])
    await server.end()
  }

  await server.query('CREATE DATABASE ?? CHARACTER SET latin1', [name])

  const url = new URL(readDatabaseEnv().DATABASE_URL)

  url.pathname = `/${name}`

  const { close, db, pool } = connect(url.href)

  try {
    if (migrate) {
      await migrateDatabase(db)
    }
  } catch (error) {
    await close()
    await drop()

    throw error
  }

  return {
    db,
    async drop() {
      await close()
      await drop()
    },
    pool,
    url: url.href,
  }
}

/**
 * The name of a database that a test or the smoke test makes for one run:
 * `fansite_<kind>_<hex>`, with the name of the worktree between them when `databaseUrl` holds
 * the database of one (`fansite_<name>`, see scripts/worktree-env.js). So the databases of two
 * runs never collide, in one worktree or in two. The name stays under the 64 characters that
 * MariaDB allows.
 */
export function scratchDatabaseName(kind: 'smoke' | 'test', databaseUrl: string) {
  const worktree = /^\/fansite_([a-z0-9_]+)$/.exec(new URL(databaseUrl).pathname)?.[1]
  const middle = worktree === undefined ? '' : `${worktree.slice(0, 32)}_`

  return `fansite_${kind}_${middle}${randomBytes(6).toString('hex')}`
}
