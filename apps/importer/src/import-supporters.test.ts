import type { TestDatabase } from '@fansite/db/test-database'

import { supporterLoginLinks, supporters } from '@fansite/db/schema'
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
  await database.db.delete(supporterLoginLinks)
  await database.db.delete(supporters)
})

function run(settings: Record<string, string>) {
  return runImport(database.url, {
    clock: () => now,
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

  it('mails nobody while accounts are off', async () => {
    await database.db
      .insert(supporters)
      .values({ email: 'oud@example.org', lastVisitOn: '2024-01-01', screenName: 'Oud', screenNameKey: 'oud' })

    await run({ ...env, FANS_ACCOUNTS: 'off' })

    expect(sent).toEqual([])
  })
})
