import type { TestDatabase } from '@fansite/db/test-database'

import { clubs, importRuns, matches, supporterLoginLinks, supporterReminders, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { runImport } from './import-feeds.ts'

const now = new Date('2026-11-21T10:00:00Z')
const env = { FANS_ACCOUNTS: 'on', SITE_ENV: 'acceptance' }

let database: TestDatabase
let lines: string[]
let sent: string[]

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  lines = []
  sent = []
  await database.db.delete(importRuns)
  await database.db.delete(supporterLoginLinks)
  await database.db.delete(supporters)
})

function run(settings: Record<string, string>, at = now) {
  return runImport(database.url, {
    clock: () => at,
    supporters: {
      env: settings,
      send: (mail) => {
        sent.push(mail.to)

        return Promise.resolve()
      },
    },
    wikipediaOrigin: null,
    write: (line) => lines.push(line),
  })
}

describe('the clean-up of supporter accounts in the import', () => {
  it('mails an unused account and removes an expired sign-up, and logs counts only', async () => {
    await database.db
      .insert(supporters)
      .values({ email: 'oud@example.org', lastVisitOn: '2024-01-01', screenName: 'Oud', screenNameKey: 'oud' })
    await database.db.insert(supporterLoginLinks).values({
      email: 'nieuw@example.org',
      expiresAt: new Date(now.getTime() - 1000),
      screenName: 'Nieuw',
      screenNameKey: 'nieuw',
      tokenHash: 'a'.repeat(64),
    })

    await run(env)

    expect(sent).toEqual(['oud@example.org'])
    expect(await database.db.select().from(supporterLoginLinks)).toEqual([])
    expect(lines).toContain(
      'Supporter accounts: 1 mailed about being unused, 0 closed, 0 mails failed; 1 unconfirmed sign-ups removed',
    )
    expect(lines.join('\n')).not.toMatch(/example\.org|Oud/u)
  })

  it('handles the accounts once a day, in the first run, and retries a failed mail the next day', async () => {
    const hour = 60 * 60 * 1000
    const day = 24 * hour

    await database.db
      .insert(supporters)
      .values({ email: 'oud@example.org', lastVisitOn: '2024-01-01', screenName: 'Oud', screenNameKey: 'oud' })

    const failing = { ...env }

    // The first run of the day: the mail fails.
    await runImport(database.url, {
      clock: () => now,
      supporters: { env: failing, send: () => Promise.reject(new Error('down')) },
      wikipediaOrigin: null,
      write: (line) => lines.push(line),
    })

    // Later the same day the server works again, but the accounts are not handled twice.
    await run(env, new Date(now.getTime() + 2 * hour))

    expect(sent).toEqual([])

    // The sign-ups still go with every run.
    await database.db.insert(supporterLoginLinks).values({
      email: 'nieuw@example.org',
      expiresAt: new Date(now.getTime() + 2 * hour),
      screenName: 'Nieuw',
      screenNameKey: 'nieuw',
      tokenHash: 'c'.repeat(64),
    })
    await run(env, new Date(now.getTime() + 3 * hour))

    expect(await database.db.select().from(supporterLoginLinks)).toEqual([])
    expect(sent).toEqual([])

    // The first run of the next day tries again.
    await run(env, new Date(now.getTime() + day))

    expect(sent).toEqual(['oud@example.org'])
  })

  it('mails nobody while accounts are off', async () => {
    await database.db
      .insert(supporters)
      .values({ email: 'oud@example.org', lastVisitOn: '2024-01-01', screenName: 'Oud', screenNameKey: 'oud' })

    await run({ ...env, FANS_ACCOUNTS: 'off' })

    expect(sent).toEqual([])
  })
})

describe('the reminders for the Prognose in the import', () => {
  const secret = 'een-geheim-van-minstens-tweeendertig-tekens'
  // Friday 20 November 2026, 11:00 Dutch time; the match is on Saturday 21 November.
  const friday = new Date('2026-11-20T10:00:00Z')

  async function setUp() {
    await database.db.delete(supporterReminders)
    await database.db.delete(matches)
    await database.db
      .insert(clubs)
      .values({ name: 'FC Twente', slug: 'fc-twente' })
      .onDuplicateKeyUpdate({ set: { name: 'FC Twente' } })

    const [club] = await database.db.select().from(clubs)

    await database.db.insert(matches).values({
      clubId: club?.id ?? 0,
      competition: 'Eredivisie',
      home: true,
      kickoffAt: new Date('2026-11-21T15:45:00Z'),
      matchDate: '2026-11-21',
      opponent: 'FC Twente',
      round: 'Speelronde 14',
      season: '2026/27',
      status: 'scheduled',
    })
    await database.db
      .insert(supporters)
      .values({ email: 'aan@example.org', remindByEmail: true, screenName: 'Aan', screenNameKey: 'aan' })
  }

  it('mails a supporter with the reminder on, once, and logs counts only', async () => {
    await setUp()

    const settings = { ...env, FANS_PROGNOSE: 'on', FANS_REMINDER_SECRET: secret }

    await run(settings, friday)
    await run(settings, new Date(friday.getTime() + 15 * 60 * 1000))

    expect(sent).toEqual(['aan@example.org'])
    expect(lines).toContain('Reminders: 1 sent, 0 failed')
    expect(lines.join('\n')).not.toMatch(/example\.org|Aan/u)
  })

  it('says in the log, as a warning, that nothing was sent without the secret, and the import goes on', async () => {
    await setUp()

    const code = await run({ ...env, FANS_PROGNOSE: 'on' }, friday)

    expect(sent).toEqual([])
    expect(
      lines.some((line) => line.startsWith('Reminders: warning, not sent:') && line.includes('FANS_REMINDER_SECRET')),
    ).toBe(true)
    expect(code).toBe(0)
  })

  it('sends nothing while Prognose is off', async () => {
    await setUp()
    await run({ ...env, FANS_PROGNOSE: 'off', FANS_REMINDER_SECRET: secret }, friday)

    expect(sent).toEqual([])
  })
})
