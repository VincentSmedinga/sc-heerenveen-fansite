import type { TestDatabase } from '@fansite/db/test-database'

import { feeds, items, sources } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestServer } from './test-server.ts'

import { runImport } from './import-feeds.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const script = fileURLToPath(new URL('./import.ts', import.meta.url))

const recording = readFileSync(new URL('./fixtures/lc-sc-heerenveen.xml', import.meta.url), 'utf8')

let database: TestDatabase
const servers: TestServer[] = []

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM sources')
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

/** Starts a web server on this computer with a feed at `/rss/`, and puts the feed in the register. */
async function addFeed(domain: string, answer: ReturnType<typeof reply>) {
  const server = await startServer({ '/rss/': answer })

  servers.push(server)

  const [source] = await database.db.insert(sources).values({ domain, kind: 'news', name: domain }).$returningId()

  await database.db.insert(feeds).values({ sourceId: source?.id ?? 0, url: `${server.origin}/rss/` })

  return server
}

/**
 * Runs the import as the command does, with a fetcher that may reach the test servers. The command itself refuses them:
 * they are on this computer. Returns the exit code and what the command would print.
 */
async function importFromTestServers() {
  const lines: string[] = []
  const code = await runImport(database.url, fetcherFor(servers), (line) => lines.push(line))

  return { code, stdout: `${lines.join('\n')}\n` }
}

/** Runs `pnpm run import` the way it starts: as its own process, with the database from the environment. */
async function runCommand(env: Record<string, string | undefined> = { DATABASE_URL: database.url }) {
  try {
    const { stderr, stdout } = await promisify(execFile)(process.execPath, [script], {
      env: { ...process.env, ...env },
    })

    return { code: 0, stderr, stdout }
  } catch (error) {
    const { code, stderr, stdout } = error as { code: number; stderr: string; stdout: string }

    return { code, stderr, stdout }
  }
}

describe('the import', () => {
  it('reads the feeds, stores their items, and prints a line for each feed', async () => {
    const server = await addFeed('krant.test', reply(200, recording, { 'Content-Type': 'text/xml' }))

    const { code, stdout } = await importFromTestServers()

    expect(code).toBe(0)
    expect(stdout.trim().split('\n')).toEqual([`${server.origin}/rss/: 50 new, 0 updated, 0 unchanged, 0 skipped`])
    expect(await database.db.select().from(items)).toHaveLength(50)
  })

  it('makes no duplicates when it runs again', async () => {
    const server = await addFeed('krant.test', reply(200, recording, { 'Content-Type': 'text/xml' }))

    await importFromTestServers()

    const { code, stdout } = await importFromTestServers()

    expect(code).toBe(0)
    expect(stdout.trim()).toBe(`${server.origin}/rss/: 0 new, 0 updated, 50 unchanged, 0 skipped`)
    expect(await database.db.select().from(items)).toHaveLength(50)
  })

  it('exits with 1 when a feed fails, and still reads the other feeds', async () => {
    const down = await addFeed('kapot.test', reply(500, 'Kapot'))

    await addFeed('krant.test', reply(200, recording, { 'Content-Type': 'text/xml' }))

    const { code, stdout } = await importFromTestServers()
    const lines = stdout.trim().split('\n')

    expect(code).toBe(1)
    expect(lines[0]).toBe(`${down.origin}/rss/: failed, HTTP 500`)
    expect(lines[1]).toMatch(/: 50 new, 0 updated, 0 unchanged, 0 skipped$/u)
    expect(await database.db.select().from(items)).toHaveLength(50)
  })

  it('exits with 0 when the source asks us to wait or does not allow the feed: that is no failure of ours', async () => {
    await addFeed('druk.test', reply(429, 'Te druk', { 'Retry-After': '60' }))

    const { code, stdout } = await importFromTestServers()

    expect(code).toBe(0)
    expect(stdout).toContain('the source asks us to wait 60 seconds')
  })
})

describe('the import command', () => {
  it('says so when no source has a feed', async () => {
    const { code, stdout } = await runCommand()

    expect(code).toBe(0)
    expect(stdout).toContain('There are no feeds to read')
  })

  it('refuses a feed on this computer, and exits with 1', async () => {
    const server = await addFeed('lokaal.test', reply(200, recording, { 'Content-Type': 'text/xml' }))

    const { code, stdout } = await runCommand()

    expect(code).toBe(1)
    expect(stdout.trim()).toBe(`${server.origin}/rss/: failed, robots.txt: 127.0.0.1 is not on the public internet`)
    expect(server.requests).toEqual([])
    expect(await database.db.select().from(items)).toHaveLength(0)
  })

  it('stops with a clear message when there is no DATABASE_URL', async () => {
    const { code, stderr } = await runCommand({ DATABASE_URL: undefined })

    expect(code).not.toBe(0)
    expect(stderr).toContain('DATABASE_URL')
  })
})
