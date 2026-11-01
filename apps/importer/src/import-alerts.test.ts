import type { AlertMail as Mail } from '@fansite/db/alerts'
import type { TestDatabase } from '@fansite/db/test-database'

import { feeds, importAlerts, items, matchImports, sources, squadImports } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { Handler, TestServer } from './test-server.ts'

import { runImport } from './import-feeds.ts'
import { fetcherFor, reply, startServer } from './test-server.ts'

const hour = 60 * 60 * 1000
const start = new Date('2026-11-01T10:00:00Z')

const settings = {
  ALERT_MAIL_TO: 'eigenaar@example.org',
  MAIL_FROM: 'fansite@example.org',
  SITE_ENV: 'acceptance',
  SMTP_HOST: 'mail.example.org',
  SMTP_PASSWORD: 'zeer-geheim-wachtwoord',
  SMTP_PORT: '465',
  SMTP_USER: 'fansite@example.org',
}

const feedXml = `<?xml version="1.0" encoding="UTF-8"?><rss version="2.0"><channel><title>Een feed</title><item><title>Kop</title><link>https://krant.test/kop</link><guid isPermaLink="false">kop</guid><pubDate>Tue, 20 Oct 2026 11:58:00 GMT</pubDate></item></channel></rss>`

/** The settings without some of the variables. */
function without(...names: (keyof typeof settings)[]): Record<string, string> {
  return Object.fromEntries(Object.entries(settings).filter(([name]) => !names.includes(name as keyof typeof settings)))
}

let database: TestDatabase
let mails: Mail[]
let lines: string[]
let answer: Handler
const servers: TestServer[] = []

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  mails = []
  lines = []
  answer = reply(500, 'Kapot')
  await database.pool.query('DELETE FROM sources')
  await database.pool.query('DELETE FROM import_alerts')
  await database.pool.query('DELETE FROM match_imports')
  await database.pool.query('DELETE FROM squad_imports')
})

afterEach(async () => {
  await Promise.all(servers.splice(0).map((server) => server.close()))
})

/** Puts a source with a feed in the register, which gives whatever `answer` is at the time. */
async function addFeed(name: string) {
  const server = await startServer({ '/rss/': (request, response) => answer(request, response) })

  servers.push(server)

  const [source] = await database.db
    .insert(sources)
    .values({ domain: `${name}.test`, kind: 'news', name })
    .$returningId()

  await database.db.insert(feeds).values({ sourceId: source?.id ?? 0, url: `${server.origin}/rss/` })
}

/** One run of the import, a number of hours after the start, with a fake mailer. */
async function runAt(
  hours: number,
  {
    env = settings,
    send,
    wikipedia = false,
  }: { env?: Record<string, string>; send?: (mail: Mail) => Promise<void>; wikipedia?: boolean } = {},
) {
  const code = await runImport(database.url, {
    alerts: { env, send: send ?? ((mail) => Promise.resolve(void mails.push(mail))) },
    clock: () => new Date(start.getTime() + hours * hour),
    makeFetcher: (robots) => fetcherFor(servers, { robots }),
    wikipediaOrigin: wikipedia ? (servers[0]?.origin ?? null) : null,
    write: (line) => lines.push(line),
  })

  return code
}

describe('the alerts of the import', () => {
  it('mails once when a feed fails three runs in a row, and once when it works again', async () => {
    await addFeed('Voorbeeldkrant')

    expect(await runAt(0)).toBe(1)
    expect(await runAt(1)).toBe(1)
    expect(mails).toEqual([])

    await runAt(2)

    expect(mails).toHaveLength(1)
    expect(mails[0]?.subject).toBe('[acceptatie] De feed van Voorbeeldkrant staat stil sinds 1 november 2026')
    expect(mails[0]?.text).toContain('3 keer achter elkaar mislukt')
    expect(mails[0]?.text).toContain('HTTP 500')

    // The fourth and fifth run are in the same failure, and the feed is tried once an hour.
    await runAt(3)
    await runAt(4)

    expect(mails).toHaveLength(1)

    answer = reply(200, feedXml, { 'Content-Type': 'text/xml' })

    expect(await runAt(5)).toBe(0)
    expect(mails).toHaveLength(2)
    expect(mails[1]?.subject).toBe('[acceptatie] De feed van Voorbeeldkrant werkt weer')

    await runAt(6)

    expect(mails).toHaveLength(2)
    expect(await database.db.select().from(items)).toHaveLength(1)
  })

  it('does not count a request to wait or a run that does not ask as a failed run', async () => {
    await addFeed('Voorbeeldkrant')
    answer = reply(429, 'Te druk', { 'Retry-After': '60' })

    for (let hours = 0; hours < 5; hours++) {
      await runAt(hours)
    }

    expect(mails).toEqual([])
    await expect(database.db.select().from(importAlerts)).resolves.toEqual([])
  })

  it('mails about the matches and the squad of the season when Wikipedia keeps failing', async () => {
    await addFeed('Voorbeeldkrant')
    answer = reply(200, feedXml, { 'Content-Type': 'text/xml' })

    for (let hours = 0; hours < 3; hours++) {
      expect(await runAt(hours, { wikipedia: true })).toBe(0)
    }

    expect(mails.map((mail) => mail.subject).sort()).toEqual([
      '[acceptatie] De import van de selectie 2026/27 staat stil sinds 1 november 2026',
      '[acceptatie] De import van de wedstrijden 2026/27 staat stil sinds 1 november 2026',
    ])
    await expect(database.db.select().from(matchImports)).resolves.toMatchObject([{ failuresInARow: 3 }])
    await expect(database.db.select().from(squadImports)).resolves.toMatchObject([{ failuresInARow: 3 }])
  })

  it('goes on without ALERT_MAIL_TO: a line in the output, the same exit code, nothing sent', async () => {
    await addFeed('Voorbeeldkrant')

    for (let hours = 0; hours < 3; hours++) {
      expect(await runAt(hours, { env: without('ALERT_MAIL_TO') })).toBe(1)
    }

    expect(mails).toEqual([])
    expect(lines.filter((line) => line.startsWith('Alert:'))).toEqual([
      'Alert: De feed van Voorbeeldkrant needs a mail, but ALERT_MAIL_TO is not set, so none is sent.',
    ])
  })

  it('does not fail or stop the import when the mail can not be sent', async () => {
    await addFeed('Voorbeeldkrant')

    const broken = () => Promise.reject(new Error('connect ECONNREFUSED'))

    for (let hours = 0; hours < 3; hours++) {
      expect(await runAt(hours, { send: broken })).toBe(1)
    }

    expect(lines.filter((line) => line.startsWith('Alert:'))).toEqual([
      'Alert: the mail about feed:' +
        (await database.db.select().from(feeds))[0]?.id +
        ' could not be sent: connect ECONNREFUSED',
    ])

    answer = reply(200, feedXml, { 'Content-Type': 'text/xml' })

    expect(await runAt(3, { send: broken })).toBe(0)
    expect(await database.db.select().from(items)).toHaveLength(1)
  })
})
