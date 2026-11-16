import { createPool, type RowDataPacket } from 'mysql2/promise'
import { createServer, type Server, type Socket } from 'node:net'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { connect } from './client.ts'
import { lockNameFor, withLock } from './lock.ts'
import { createTestDatabase } from './test-database.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase({ migrate: false })
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

async function isFree(name: string) {
  const [rows] = await database.pool.query<RowDataPacket[]>('SELECT IS_FREE_LOCK(?) AS free', [name])

  return rows[0]?.['free'] === 1
}

describe('lockNameFor', () => {
  it('gives each task and each database a lock of its own', () => {
    expect(lockNameFor('mysql://root@127.0.0.1:3306/fansite', 'import')).toBe('fansite_import_fansite')
    expect(lockNameFor('mysql://root@127.0.0.1:3306/fansite', 'migrate')).toBe('fansite_migrate_fansite')
    expect(lockNameFor('mysql://root@127.0.0.1:3306/fansite_acc', 'import')).toBe('fansite_import_fansite_acc')
  })

  it('stays within the 64 characters MariaDB allows', () => {
    expect(lockNameFor(`mysql://root@127.0.0.1:3306/${'d'.repeat(64)}`, 'migrate')).toHaveLength(64)
  })
})

describe('withLock', () => {
  // A MariaDB server shares its lock names, so the name has the test database in it.
  const name = () => lockNameFor(database.url, 'import')

  it('runs the task while it holds the lock, and lets go afterwards', async () => {
    const outcome = await withLock(database.pool, name(), 0, async () => isFree(name()))

    expect(outcome).toEqual({ ran: true, result: false })
    expect(await isFree(name())).toBe(true)
  })

  it('does not run the task when another connection holds the lock', async () => {
    const holder = await database.pool.getConnection()
    let ran = false

    try {
      await holder.query('SELECT GET_LOCK(?, 0)', [name()])

      expect(
        await withLock(database.pool, name(), 0, async () => {
          ran = true
        }),
      ).toEqual({ ran: false })
      expect(ran).toBe(false)
    } finally {
      await holder.query('DO RELEASE_LOCK(?)', [name()])
      holder.release()
    }
  })

  it('lets go of the lock when the task fails', async () => {
    await expect(
      withLock(database.pool, name(), 0, async () => {
        throw new Error('Mislukt')
      }),
    ).rejects.toThrow('Mislukt')
    expect(await isFree(name())).toBe(true)
  })
})

/**
 * A proxy to the database that can go silent: it keeps every connection open and passes on
 * nothing, as a firewall does that drops an idle connection without a word. The client then
 * waits for ever for an answer it will not get.
 */
async function silentProxy() {
  const target = new URL(database.url)
  const sockets = new Set<Socket>()
  let silent = false
  const server: Server = createServer((client) => {
    const upstream = new (client.constructor as new () => Socket)()

    upstream.connect(Number(target.port || 3306), target.hostname)
    sockets.add(client).add(upstream)
    client.on('data', (chunk) => silent || upstream.write(chunk))
    upstream.on('data', (chunk) => silent || client.write(chunk))
    client.on('error', () => undefined)
    upstream.on('error', () => undefined)
  })

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve))

  const address = server.address()
  const url = new URL(database.url)

  url.host = `127.0.0.1:${typeof address === 'object' && address !== null ? address.port : 0}`

  return {
    close: () => {
      for (const socket of sockets) {
        socket.destroy()
      }
      server.close()
    },
    goSilent: () => {
      silent = true
    },
    url: url.href,
  }
}

describe('withLock on a connection that goes silent', () => {
  it('returns when the connection dies during a long task, and the pool closes', async () => {
    const proxy = await silentProxy()
    const { close, pool } = connect(proxy.url)

    try {
      const outcome = await withLock(
        pool,
        `${lockNameFor(database.url, 'import')}_silent`,
        0,
        async () => {
          proxy.goSilent()

          return 'done'
        },
        { releaseTimeoutMs: 500 },
      )

      expect(outcome).toEqual({ ran: true, result: 'done' })
      await close()
    } finally {
      proxy.close()
    }
  }, 10_000)
})

describe('withLock on a long task', () => {
  it('keeps the lock when the server drops idle connections', async () => {
    const pool = createPool({ uri: database.url })
    const lockName = `${lockNameFor(database.url, 'import')}_idle`

    // The pool.pool of the promise pool is the pool that makes the connections.
    pool.pool.on('connection', (connection) => connection.query('SET SESSION wait_timeout = 2'))

    try {
      const outcome = await withLock(
        pool,
        lockName,
        0,
        async () => {
          await new Promise((resolve) => setTimeout(resolve, 3500))

          const [rows] = await database.pool.query<RowDataPacket[]>('SELECT IS_FREE_LOCK(?) AS free', [lockName])

          return rows[0]?.['free']
        },
        { keepAliveMs: 500 },
      )

      expect(outcome).toEqual({ ran: true, result: 0 })
    } finally {
      await pool.end()
    }
  }, 15_000)
})
