import type { Mail } from '@fansite/shared/mail'

import { MailError } from '@fansite/shared/mail'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { AlertRun } from './alerts.ts'
import type { TestDatabase } from './test-database.ts'

import { alertAfterFailures, recordBackupRun, recordRun, remindAfterMs, scrubError } from './alerts.ts'
import { connect } from './client.ts'
import { importAlerts } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

const hour = 60 * 60 * 1000

const settings = {
  ALERT_MAIL_TO: 'eigenaar@example.org',
  MAIL_FROM: 'fansite@example.org',
  SITE_ENV: 'acceptance',
  SMTP_HOST: 'mail.example.org',
  SMTP_PASSWORD: 'zeer-geheim-wachtwoord',
  SMTP_PORT: '465',
  SMTP_USER: 'fansite@example.org',
}

const subject = { label: 'De import van de wedstrijden 2026/27', subject: 'matches:2026/27' }

/** The settings without some of the variables. */
function without(...names: (keyof typeof settings)[]): Record<string, string> {
  return Object.fromEntries(Object.entries(settings).filter(([name]) => !names.includes(name as keyof typeof settings)))
}

let database: TestDatabase
let mails: Mail[]
let lines: string[]
let now: Date

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.db.delete(importAlerts)
  mails = []
  lines = []
  now = new Date('2026-11-01T10:00:00Z')
})

/** One run, a given number of hours after the start of the test, with a fake mailer. */
async function run(
  result: { error: string; ok: false } | { ok: true },
  {
    after = 0,
    env = settings,
    send,
  }: { after?: number; env?: Record<string, string>; send?: (mail: Mail) => Promise<void> } = {},
) {
  now = new Date(new Date('2026-11-01T10:00:00Z').getTime() + after * hour)

  await recordRun(database.db, { ...subject, ...result } as AlertRun, {
    clock: () => now,
    env,
    send: send ?? ((mail) => Promise.resolve(void mails.push(mail))),
    write: (line) => lines.push(line),
  })
}

const failed = { error: 'Wikipedia: HTTP 500', ok: false } as const

describe('recordRun', () => {
  it('stays quiet until the same import fails three runs in a row, then sends one mail', async () => {
    for (let hours = 0; hours < alertAfterFailures - 1; hours++) {
      await run(failed, { after: hours })
    }

    expect(mails).toEqual([])

    await run(failed, { after: 2 })

    expect(mails).toHaveLength(1)
    expect(mails[0]?.to).toBe('eigenaar@example.org')
    expect(mails[0]?.subject).toBe('[acceptatie] De import van de wedstrijden 2026/27 staat stil sinds 1 november 2026')
    expect(mails[0]?.text).toContain('3 keer achter elkaar mislukt')
    expect(mails[0]?.text).toContain('De eerste mislukte keer was op 1 november 2026 om 11:00.')
    expect(mails[0]?.text).toContain('De laatste foutmelding: Wikipedia: HTTP 500')
    expect(mails[0]?.text).toContain('https://acc.sc.heerenveen.org')
  })

  it('does not mail again in the same failure, except for one reminder after a day', async () => {
    for (let hours = 0; hours <= 2; hours++) {
      await run(failed, { after: hours })
    }

    expect(mails).toHaveLength(1)

    // The 4th run up to the run an hour before the day is over.
    for (let hours = 3; hours < 2 + 24; hours++) {
      await run(failed, { after: hours })
    }

    expect(mails).toHaveLength(1)

    await run(failed, { after: 2 + remindAfterMs / hour })

    expect(mails).toHaveLength(2)
    expect(mails[1]?.subject).toContain('Herinnering')
    expect(mails[1]?.text).toContain('27 keer achter elkaar mislukt')

    // And the next reminder waits another day.
    await run(failed, { after: 2 + remindAfterMs / hour + 1 })

    expect(mails).toHaveLength(2)

    await run(failed, { after: 2 + (2 * remindAfterMs) / hour })

    expect(mails).toHaveLength(3)
  })

  it('sends one mail when the import works again after a mail, and none after that', async () => {
    for (let hours = 0; hours <= 3; hours++) {
      await run(failed, { after: hours })
    }

    await run({ ok: true }, { after: 4 })

    expect(mails).toHaveLength(2)
    expect(mails[1]?.subject).toBe('[acceptatie] De import van de wedstrijden 2026/27 werkt weer')
    expect(mails[1]?.text).toContain('4 keer achter elkaar')

    await run({ ok: true }, { after: 5 })

    expect(mails).toHaveLength(2)
    await expect(database.db.select().from(importAlerts)).resolves.toEqual([])
  })

  it('sends nothing for a success without a mail before it, and a short failure starts over', async () => {
    await run(failed, { after: 0 })
    await run(failed, { after: 1 })
    await run({ ok: true }, { after: 2 })
    await run(failed, { after: 3 })
    await run(failed, { after: 4 })

    expect(mails).toEqual([])
    await expect(database.db.select().from(importAlerts)).resolves.toMatchObject([{ failuresInARow: 2 }])
  })

  it('counts every import apart', async () => {
    const other = { label: 'De feed van Voorbeeld', subject: 'feed:12' }

    for (let hours = 0; hours < 3; hours++) {
      await recordRun(
        database.db,
        { ...subject, ...failed },
        {
          clock: () => now,
          env: settings,
          send: (mail) => Promise.resolve(void mails.push(mail)),
          write: (line) => lines.push(line),
        },
      )
      await recordRun(
        database.db,
        { ...other, ok: true },
        {
          clock: () => now,
          env: settings,
          send: (mail) => Promise.resolve(void mails.push(mail)),
          write: (line) => lines.push(line),
        },
      )
    }

    expect(mails).toHaveLength(1)
    expect(mails[0]?.subject).toContain('De import van de wedstrijden')
  })

  it('only writes a line without ALERT_MAIL_TO, and mails as soon as it is set', async () => {
    for (let hours = 0; hours < 4; hours++) {
      await run(failed, { after: hours, env: without('ALERT_MAIL_TO') })
    }

    expect(mails).toEqual([])
    expect(lines).toEqual([
      'Alert: De import van de wedstrijden 2026/27 needs a mail, but ALERT_MAIL_TO is not set, so none is sent.',
      'Alert: De import van de wedstrijden 2026/27 needs a mail, but ALERT_MAIL_TO is not set, so none is sent.',
    ])

    await run(failed, { after: 4 })

    expect(mails).toHaveLength(1)
    expect(mails[0]?.text).toContain('5 keer achter elkaar mislukt')
  })

  it('only writes a line without the mailbox, and does not touch the password in the line', async () => {
    for (let hours = 0; hours < 3; hours++) {
      await run(failed, {
        after: hours,
        env: { ...without('MAIL_FROM', 'SMTP_HOST', 'SMTP_PASSWORD', 'SMTP_PORT', 'SMTP_USER'), SITE_ENV: 'local' },
      })
    }

    expect(mails).toEqual([])
    expect(lines).toEqual([
      'Alert: De import van de wedstrijden 2026/27 needs a mail, but the settings of the mailbox are not set, so none is sent.',
    ])

    // On acceptance the settings are required, and a missing one is a wrong setting.
    await run(failed, { after: 3, env: without('MAIL_FROM', 'SMTP_HOST', 'SMTP_PASSWORD', 'SMTP_PORT', 'SMTP_USER') })

    expect(mails).toEqual([])
    expect(lines.at(-1)).toContain('the settings are wrong, so none is sent')
    expect(lines.join('\n')).not.toContain('zeer-geheim')
  })

  it('takes a mail that fails for what it is: a line, no exception, and a new try at the next failed run', async () => {
    const broken = () => Promise.reject(new MailError('Could not send the mail', 'ECONNECTION'))

    for (let hours = 0; hours < 3; hours++) {
      await run(failed, { after: hours, send: broken })
    }

    expect(lines).toEqual(['Alert: the mail about matches:2026/27 could not be sent: error ECONNECTION'])

    await run(failed, { after: 3 })

    expect(mails).toHaveLength(1)
    expect(mails[0]?.text).toContain('4 keer achter elkaar mislukt')
  })

  it('does not fail when the database does', async () => {
    // Nothing listens on port 1.
    const { close, db } = connect('mysql://root@127.0.0.1:1/fansite')

    try {
      await expect(
        recordRun(
          db,
          { ...subject, ...failed },
          { clock: () => now, env: settings, send: () => Promise.resolve(), write: (line) => lines.push(line) },
        ),
      ).resolves.toBeUndefined()
    } finally {
      await close()
    }

    expect(lines).toEqual(['Alert: could not keep track of matches:2026/27: error ECONNREFUSED'])
  })

  it('keeps the first failure, the count and the scrubbed error in the table', async () => {
    await run({ error: 'failed: https://example.org/feed?key=geheim', ok: false }, { after: 0 })
    await run({ error: 'failed: https://example.org/feed?key=geheim', ok: false }, { after: 1 })

    const [row] = await database.db.select().from(importAlerts).where(eq(importAlerts.subject, subject.subject))

    expect(row).toEqual({
      failingSince: new Date('2026-11-01T10:00:00Z'),
      failuresInARow: 2,
      lastError: 'failed: https://example.org/feed',
      mailedAt: null,
      subject: 'matches:2026/27',
    })
  })

  it('puts no secret and no personal data in the mail, and scrubs an address with a key', async () => {
    const error =
      'GET https://user:wachtwoord@example.org/feed/abcdefghij0123456789xyz?apikey=GEHEIM#top failed for jan@example.org, token=GEHEIM2 at /home/gebruiker/fansite/import.mjs'

    for (let hours = 0; hours < 3; hours++) {
      await run({ error, ok: false }, { after: hours })
    }

    const text = `${mails[0]?.subject}\n${mails[0]?.text}`

    expect(text).toContain('https://example.org/feed/…')
    for (const secret of [
      'wachtwoord',
      'GEHEIM',
      'abcdefghij0123456789xyz',
      'jan@example.org',
      'gebruiker',
      'zeer-geheim',
    ]) {
      expect(text).not.toContain(secret)
    }
    expect(text).not.toContain(settings.SMTP_PASSWORD)
  })
})

describe('recordBackupRun', () => {
  it('mails after three failed backups in a row, from the database in DATABASE_URL', async () => {
    const env = { ...settings, DATABASE_URL: database.url }
    const options = {
      env,
      send: (mail: Mail) => Promise.resolve(void mails.push(mail)),
      write: (line: string) => lines.push(line),
    }

    for (let night = 0; night < 3; night++) {
      await recordBackupRun(
        { error: 'mysqldump: Access denied', ok: false },
        { ...options, clock: () => new Date(Date.UTC(2026, 10, 1 + night, 3)) },
      )
    }

    expect(mails).toHaveLength(1)
    expect(mails[0]?.subject).toBe('[acceptatie] De back-up van de database staat stil sinds 1 november 2026')

    await recordBackupRun({ ok: true }, options)

    expect(mails).toHaveLength(2)
    expect(mails[1]?.subject).toBe('[acceptatie] De back-up van de database werkt weer')
    expect(lines).toEqual([])
  })

  it('writes a line and goes on when there is no database', async () => {
    await recordBackupRun({ ok: true }, { env: {}, write: (line) => lines.push(line) })

    expect(lines).toHaveLength(1)
    expect(lines[0]).toContain('could not keep track of backup')
  })
})

describe('scrubError', () => {
  it('keeps the host and the path of an address, and drops the rest', () => {
    expect(scrubError('HTTP 503 for https://example.org/a/b?key=1')).toBe('HTTP 503 for https://example.org/a/b')
    expect(scrubError('see mysql://root:pw@db.example.org:3306/fansite.')).toBe(
      'see mysql://db.example.org:3306/fansite.',
    )
  })

  it('leaves text without anything secret alone, and cuts a long text', () => {
    expect(scrubError('nothing changed and the last good copy stays')).toBe(
      'nothing changed and the last good copy stays',
    )
    expect(scrubError('x'.repeat(400))).toHaveLength(300)
  })

  it('removes control characters, so a message can not add a line to the mail', () => {
    expect(scrubError('a\r\nBcc: someone')).toBe('a Bcc: someone')
  })
})
