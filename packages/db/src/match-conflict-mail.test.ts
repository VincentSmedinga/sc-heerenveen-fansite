import type { Mail } from '@fansite/shared/mail'

import { MailError } from '@fansite/shared/mail'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { NewMatch } from './schema.ts'
import type { TestDatabase } from './test-database.ts'

import { withClubs } from './clubs.ts'
import { mailConflicts } from './match-conflict-mail.ts'
import { oldSiteGoalsReason } from './match-conflicts.ts'
import { matchChanges, matches } from './schema.ts'
import { createTestDatabase } from './test-database.ts'

const settings = {
  MAIL_FROM: 'fansite@example.org',
  SITE_ENV: 'acceptance',
  SMTP_HOST: 'mail.example.org',
  SMTP_PASSWORD: 'zeer-geheim-wachtwoord',
  SMTP_PORT: '465',
  SMTP_USER: 'fansite@example.org',
}

const seen = new Date('2026-11-02T10:00:00Z')

let database: TestDatabase
let matchId: number
let mails: Mail[]
let lines: string[]

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  for (const table of ['match_changes', 'matches', 'admin_users']) {
    await database.pool.query(`DELETE FROM ${table}`)
  }

  await database.pool.query(
    "INSERT INTO admin_users (email, role) VALUES ('beheer1@example.org', 'beheerder'), ('beheer2@example.org', 'beheerder'), ('mod@example.org', 'moderator')",
  )
  await database.pool.query(
    "INSERT INTO admin_users (email, role, disabled_at) VALUES ('weg@example.org', 'beheerder', '2026-10-01 10:00:00')",
  )

  const scheduled: Omit<NewMatch, 'clubId'> = {
    competition: 'Eredivisie',
    home: true,
    kickoffAt: new Date('2026-10-31T17:45:00Z'),
    matchDate: '2026-10-31',
    opponent: 'N.E.C.',
    round: 'Speelronde 11',
    season: '2026/27',
    status: 'scheduled',
  }
  const [values] = await withClubs(database.db, [scheduled])

  matchId = (await database.db.insert(matches).values(values!).$returningId())[0]?.id ?? 0
  mails = []
  lines = []
})

async function waits(values: Partial<typeof matchChanges.$inferInsert> = {}) {
  await database.db.insert(matchChanges).values({
    changed: 'uitslag',
    class: 'suspicious',
    competition: 'Eredivisie',
    firstSeenAt: seen,
    lastSeenAt: seen,
    matchId,
    newValue: 'sc Heerenveen 3–1 N.E.C.',
    oldValue: 'sc Heerenveen 2–1 N.E.C.',
    part: 'result',
    reason: 'wijkt af van de invoer van de redactie',
    round: 'Speelronde 11',
    season: '2026/27',
    status: 'pending',
    ...values,
  })
}

const collect = (mail: Mail) => {
  mails.push(mail)

  return Promise.resolve()
}

const run = (options: { env?: Record<string, string>; send?: (mail: Mail) => Promise<void> } = {}) =>
  mailConflicts(database.db, {
    clock: () => new Date('2026-11-02T11:00:00Z'),
    env: options.env ?? settings,
    send: options.send ?? collect,
    write: (line) => void lines.push(line),
  })

const changes = () => database.db.select().from(matchChanges)

describe('the mail about a difference', () => {
  it('goes to each beheerder who is not turned off, once, with both values and the link', async () => {
    await waits()
    await run()

    expect(mails.map((mail) => mail.to)).toEqual(['beheer1@example.org', 'beheer2@example.org'])
    expect(mails[0]?.subject).toBe(
      '[acceptatie] Wikipedia wijkt af van onze invoer: Speelronde 11 (Eredivisie): sc Heerenveen - N.E.C.',
    )
    expect(mails[0]?.text).toContain('Onze invoer: sc Heerenveen 2–1 N.E.C.')
    expect(mails[0]?.text).toContain('Wikipedia: sc Heerenveen 3–1 N.E.C.')
    expect(mails[0]?.text).toContain(`/beheer/wedstrijden/${matchId}`)
    expect(mails[0]?.text).toContain('9 november 2026')
    expect(await changes()).toMatchObject([{ mailedAt: new Date('2026-11-02T11:00:00Z') }])

    await run()
    await run()

    expect(mails).toHaveLength(2)
  })

  it('has no name or address of an editor in it, only the address it is sent to', async () => {
    await waits()
    await run()

    for (const mail of mails) {
      expect(mail.text).not.toMatch(/@/)
      expect(mail.subject).not.toMatch(/@/)
    }
  })

  it('is one mail for each difference', async () => {
    await waits()
    await waits({ changed: 'doelpunten', newValue: "13' Oyen", oldValue: "12' Oyen", part: 'goals' })
    await run()

    expect(mails).toHaveLength(4)
    expect(mails.filter((mail) => mail.to === 'beheer1@example.org').map((mail) => mail.text)).toEqual([
      expect.stringContaining('over de uitslag van'),
      expect.stringContaining('over de doelpunten van'),
    ])
  })

  it('does not mail about a difference that was decided already, or an ordinary change', async () => {
    await waits({ resolution: 'person', status: 'accepted' })
    await waits({ part: null })
    await run()

    expect(mails).toEqual([])
  })

  it('does not mail about the goals of the old fansite that are kept', async () => {
    await waits({ part: 'goals', reason: oldSiteGoalsReason })
    await run()

    expect(mails).toEqual([])
    expect((await changes())[0]?.mailedAt).toBeNull()
  })

  it('does not fail when a mail cannot be sent, says so, and tries again at the next run', async () => {
    await waits()
    await run({ send: () => Promise.reject(new MailError('De server nam de mail niet aan', 'ECONNECTION')) })

    expect(lines).toEqual([expect.stringContaining('could not be sent'), expect.stringContaining('could not be sent')])
    expect(lines.join('')).not.toContain('zeer-geheim-wachtwoord')
    expect(lines.join('')).not.toContain('@')
    expect(await changes()).toMatchObject([{ mailedAt: null }])

    await run()

    expect(mails).toHaveLength(2)
    expect(await changes()).not.toMatchObject([{ mailedAt: null }])
  })

  it('counts a difference as mailed when one of the beheerders got the mail', async () => {
    await waits()
    await run({
      send: (mail) => (mail.to === 'beheer1@example.org' ? Promise.reject(new Error('nee')) : collect(mail)),
    })

    expect(mails.map((mail) => mail.to)).toEqual(['beheer2@example.org'])
    expect(await changes()).not.toMatchObject([{ mailedAt: null }])
  })

  it('says so when there is nobody to mail, and does not throw', async () => {
    await waits()
    await database.pool.query('DELETE FROM admin_users')
    await run()

    expect(lines).toEqual([expect.stringContaining('no beheerder')])
    expect(await changes()).toMatchObject([{ mailedAt: null }])
  })

  it('does not throw when the settings are wrong', async () => {
    await waits()
    await run({ env: { SITE_ENV: 'nergens' } })

    expect(lines).toEqual([expect.stringContaining('could not mail the differences')])
    expect(mails).toEqual([])
  })
})

describe('the mail about a difference in a season that is over (issue 1025)', () => {
  it('promises no take-over', async () => {
    await waits({ season: '2025/26' })
    await run()

    expect(mails[0]?.text).toContain(
      'Het seizoen is voorbij of bijna voorbij, dus de import neemt de waarde van Wikipedia niet vanzelf over.',
    )
    expect(mails[0]?.text).not.toContain('Beslist niemand')
  })
})

describe('the mail about Wikipedia taken over after seven days', () => {
  it('is sent once, when the importer took the value over', async () => {
    await waits({ decidedAt: seen, mailedAt: seen, resolution: 'stood', status: 'accepted' })
    await run()
    await run()

    expect(mails.map((mail) => mail.to)).toEqual(['beheer1@example.org', 'beheer2@example.org'])
    expect(mails[0]?.subject).toBe(
      '[acceptatie] De import nam Wikipedia over: Speelronde 11 (Eredivisie): sc Heerenveen - N.E.C.',
    )
    expect(mails[0]?.text).toContain('Niemand besliste in zeven dagen')
    expect(await changes()).toMatchObject([{ takenOverMailedAt: expect.any(Date) }])
  })

  it('is not sent for a decision of a person', async () => {
    await waits({ decidedAt: seen, mailedAt: seen, resolution: 'person', status: 'accepted' })
    await run()

    expect(mails).toEqual([])
  })
})

it('uses the match of the change', async () => {
  await waits()
  await database.db.update(matches).set({ opponent: 'Ajax' }).where(eq(matches.id, matchId))
  await run()

  expect(mails[0]?.subject).toContain('sc Heerenveen - Ajax')
})
