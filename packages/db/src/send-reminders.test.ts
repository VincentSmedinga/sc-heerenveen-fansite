import type { Mail } from '@fansite/shared/mail'

import { readReminderCode } from '@fansite/shared/reminder-code'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { TestDatabase } from './test-database.ts'

import { closeAccount } from './close-account.ts'
import { clubs, matches, predictions, supporterReminders, supporters } from './schema.ts'
import { describeReminders, failuresInARow, kickoffWords, sendReminders } from './send-reminders.ts'
import { createTestDatabase } from './test-database.ts'

// Friday 20 November 2026, 11:00 Dutch time. The match of the tests is on Saturday 21 November,
// 16:45 Dutch time.
const now = new Date('2026-11-20T10:00:00Z')
const kickoff = new Date('2026-11-21T15:45:00Z')
const hour = 60 * 60 * 1000
const day = 24 * hour
const secret = 'een-geheim-van-minstens-tweeendertig-tekens'
const env = {
  FANS_ACCOUNTS: 'on',
  FANS_PROGNOSE: 'on',
  FANS_REMINDER_SECRET: secret,
  SITE_ENV: 'acceptance',
}

let database: TestDatabase
let clubId: number
let mails: Mail[]
let failFor: string[]
let rounds = 0

beforeAll(async () => {
  database = await createTestDatabase()
  await database.db.insert(clubs).values({ name: 'FC Twente', slug: 'fc-twente' })
  clubId = (await database.db.select().from(clubs).where(eq(clubs.slug, 'fc-twente')))[0]?.id ?? 0
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  mails = []
  failFor = []
  rounds = 0
  await database.db.delete(supporterReminders)
  await database.db.delete(predictions)
  await database.db.delete(matches)
  await database.db.delete(supporters)
})

async function addMatch(kickoffAt: Date | null, extra: Partial<typeof matches.$inferInsert> = {}) {
  rounds += 1

  const [result] = await database.db.insert(matches).values({
    clubId,
    competition: 'Eredivisie',
    dateText: kickoffAt === null ? 'zaterdag 21 november' : null,
    home: true,
    kickoffAt,
    matchDate: (kickoffAt ?? new Date('2026-11-21T12:00:00Z')).toISOString().slice(0, 10),
    opponent: 'FC Twente',
    round: `Speelronde ${rounds}`,
    season: '2026/27',
    status: 'scheduled',
    ...extra,
  })

  return result.insertId
}

async function addSupporter(name: string, extra: Partial<typeof supporters.$inferInsert> = {}) {
  const [result] = await database.db.insert(supporters).values({
    email: `${name}@example.org`,
    remindByEmail: true,
    screenName: name,
    screenNameKey: name.toLowerCase(),
    ...extra,
  })

  return result.insertId
}

function run(at = now, settings: Record<string, string> = env) {
  return sendReminders(database.db, at, { env: settings, send })
}

function send(mail: Mail) {
  if (failFor.includes(mail.to)) {
    return Promise.reject(new Error('mail server down'))
  }

  mails.push(mail)

  return Promise.resolve()
}

const recipients = () => mails.map((mail) => mail.to).toSorted()

describe('who gets the reminder', () => {
  it('is a supporter with the reminder on, who did not predict and is not blocked', async () => {
    const match = await addMatch(kickoff)
    const predicted = await addSupporter('Voorspeld')

    await addSupporter('Aan')
    await addSupporter('Uit', { remindByEmail: false })
    await addSupporter('Geblokkeerd', { disabledAt: new Date('2026-01-01T00:00:00Z') })
    await database.db.insert(predictions).values({
      fullTimeAway: 1,
      fullTimeHome: 2,
      halftimeAway: 0,
      halftimeHome: 1,
      matchId: match,
      supporterId: predicted,
    })

    expect(await run()).toEqual({ failed: 0, limited: false, sent: 1 })
    expect(recipients()).toEqual(['Aan@example.org'])
  })

  it('does not count a prediction for another match', async () => {
    const other = await addMatch(new Date(kickoff.getTime() - 3 * day))
    const id = await addSupporter('Aan')

    await addMatch(kickoff)
    await database.db.insert(predictions).values({
      fullTimeAway: 1,
      fullTimeHome: 2,
      halftimeAway: 0,
      halftimeHome: 1,
      matchId: other,
      supporterId: id,
    })

    expect((await run()).sent).toBe(1)
  })
})

describe('the mail', () => {
  it('has the match in the subject, the kick-off first, the link and a link to turn it off', async () => {
    await addMatch(kickoff)

    const id = await addSupporter('Tjalle99')

    await run()

    const [mail] = mails

    expect(mail?.subject).toBe('Voorspel sc Heerenveen – FC Twente')
    expect(mail?.text.startsWith('Zaterdag 16.45 uur is de aftrap van sc Heerenveen – FC Twente.')).toBe(true)
    expect(mail?.text).toContain('https://acc.sc.heerenveen.org/fans/prognose')

    const code = mail?.text.match(/uitzetten\?code=(\S+)/)?.[1] ?? ''

    expect(readReminderCode(code, secret, now)).toBe(id)
    expect(mail?.text.trimEnd().split('\n').at(-1)).toContain('/fans/herinnering/uitzetten?code=')
    expect(mail?.text).not.toContain('Tjalle99')
    expect(mail?.text).not.toMatch(/<[a-z]/)
  })

  it('puts the opponent first for an away match', async () => {
    await addMatch(kickoff, { home: false })
    await addSupporter('Aan')
    await run()

    expect(mails[0]?.subject).toBe('Voorspel FC Twente – sc Heerenveen')
  })

  it('names the kick-off in Dutch time', () => {
    expect(kickoffWords(new Date('2026-11-21T15:45:00Z'))).toBe('Zaterdag 16.45 uur')
    expect(kickoffWords(new Date('2026-07-05T17:00:00Z'))).toBe('Zondag 19.00 uur')
  })
})

describe('when the reminder goes out', () => {
  it('goes out on the day before the match, from the reminder hour on', async () => {
    await addMatch(kickoff)
    await addSupporter('Aan')

    // 08:59 Dutch time is before the hour 9; 09:00 is the hour.
    expect((await run(new Date('2026-11-20T07:59:00Z'))).sent).toBe(0)
    expect((await run(new Date('2026-11-20T08:00:00Z'))).sent).toBe(1)
  })

  it('takes the hour from the setting', async () => {
    await addMatch(kickoff)
    await addSupporter('Aan')

    expect((await run(now, { ...env, FANS_REMINDER_HOUR: '12' })).sent).toBe(0)
    expect((await run(now, { ...env, FANS_REMINDER_HOUR: '11' })).sent).toBe(1)
  })

  it('does not go out two days before, or on the day of the match', async () => {
    await addMatch(kickoff)
    await addSupporter('Aan')

    expect((await run(new Date('2026-11-19T10:00:00Z'))).sent).toBe(0)
    expect((await run(new Date('2026-11-21T08:00:00Z'))).sent).toBe(0)
  })

  it('does not go out when the kick-off is not known', async () => {
    await addMatch(null)
    await addSupporter('Aan')

    expect((await run()).sent).toBe(0)
  })

  it('does not go out for a cancelled match, and moves to the next one', async () => {
    await addMatch(kickoff, { status: 'cancelled' })
    await addSupporter('Aan')

    expect((await run()).sent).toBe(0)
  })

  it('does not go out while the form is for an earlier match', async () => {
    // The form is open for the match of this evening, so the match of tomorrow is not next.
    await addMatch(new Date('2026-11-20T19:45:00Z'))
    await addMatch(kickoff)
    await addSupporter('Aan')

    expect((await run()).sent).toBe(0)
  })

  it('does not catch up once the form is closed', async () => {
    await addMatch(kickoff)
    await addSupporter('Aan')

    expect((await run(new Date('2026-11-21T16:00:00Z'))).sent).toBe(0)
  })
})

describe('never twice, and a failed mail does not count', () => {
  it('sends nothing the second time', async () => {
    await addMatch(kickoff)
    await addSupporter('Aan')

    expect((await run()).sent).toBe(1)
    expect((await run(new Date(now.getTime() + 15 * 60 * 1000))).sent).toBe(0)
    expect(mails).toHaveLength(1)
  })

  it('sends nothing when the kick-off moves to another day after the mail', async () => {
    const id = await addMatch(kickoff)

    await addSupporter('Aan')
    await run()
    await database.db
      .update(matches)
      .set({ kickoffAt: new Date(kickoff.getTime() + day), matchDate: '2026-11-22' })
      .where(eq(matches.id, id))

    expect((await run(new Date(now.getTime() + day))).sent).toBe(0)
    expect(mails).toHaveLength(1)
  })

  it('tries a failed mail again at the next run, and then not again', async () => {
    await addMatch(kickoff)
    await addSupporter('Aan')
    failFor = ['Aan@example.org']

    expect(await run()).toMatchObject({ failed: 1, sent: 0 })
    expect(await database.db.select().from(supporterReminders)).toEqual([])

    failFor = []

    expect(await run(new Date(now.getTime() + 15 * 60 * 1000))).toMatchObject({ failed: 0, sent: 1 })
    expect((await run(new Date(now.getTime() + 30 * 60 * 1000))).sent).toBe(0)
  })
})

describe('a mail server that does not answer', () => {
  it('stops the run after three failed mails in a row, and the next run tries again', async () => {
    await addMatch(kickoff)

    const names = ['A', 'B', 'C', 'D', 'E', 'F']

    for (const name of names) {
      await addSupporter(name)
    }

    failFor = names.map((name) => `${name}@example.org`)

    expect(failuresInARow).toBe(3)
    expect(await run()).toMatchObject({ failed: 3, limited: false, sent: 0 })
    expect(await database.db.select().from(supporterReminders)).toEqual([])

    failFor = []

    expect((await run(new Date(now.getTime() + 15 * 60 * 1000))).sent).toBe(6)
  })

  it('does not mail the editors about the limit when the run stopped', async () => {
    await addMatch(kickoff)

    const names = ['A', 'B', 'C', 'D', 'E', 'F']

    for (const name of names) {
      await addSupporter(name)
    }

    failFor = names.map((name) => `${name}@example.org`)

    expect(await run(now, { ...env, FANS_REMINDER_LIMIT: '5' })).toMatchObject({ failed: 3, limited: true })
    expect(mails).toEqual([])
  })

  it('goes on after one failed mail', async () => {
    await addMatch(kickoff)

    for (const name of ['A', 'B', 'C']) {
      await addSupporter(name)
    }

    failFor = ['A@example.org']

    expect(await run()).toMatchObject({ failed: 1, sent: 2 })
  })
})

describe('the limit of a run', () => {
  it('sends at most the limit, the rest at the next runs, and tells the editors once', async () => {
    await addMatch(kickoff)

    for (const name of ['A', 'B', 'C', 'D', 'E']) {
      await addSupporter(name)
    }

    const small = { ...env, FANS_REMINDER_LIMIT: '2' }
    const first = await run(now, small)

    expect(first).toEqual({ failed: 0, limited: true, sent: 2 })
    expect(mails.filter((mail) => mail.to.endsWith('@heerenveen.org'))).toHaveLength(1)
    expect(mails.find((mail) => mail.to.endsWith('@heerenveen.org'))?.subject).toContain('limiet')

    expect((await run(new Date(now.getTime() + 15 * 60 * 1000), small)).sent).toBe(2)
    expect((await run(new Date(now.getTime() + 30 * 60 * 1000), small)).sent).toBe(1)
    expect(mails.filter((mail) => mail.to.endsWith('@heerenveen.org'))).toHaveLength(1)
    expect(mails.filter((mail) => mail.subject.startsWith('Voorspel'))).toHaveLength(5)
  })

  it('says nothing about the limit when everybody fits', async () => {
    await addMatch(kickoff)
    await addSupporter('A')

    expect((await run()).limited).toBe(false)
  })
})

describe('when the game is off', () => {
  it('sends nothing with Prognose off, or with accounts off', async () => {
    await addMatch(kickoff)
    await addSupporter('Aan')

    expect((await run(now, { ...env, FANS_PROGNOSE: 'off' })).sent).toBe(0)
    expect((await run(now, { ...env, FANS_ACCOUNTS: 'off' })).sent).toBe(0)
    expect(mails).toEqual([])
  })

  it('throws without a secret, so nothing goes out and the run says so', async () => {
    await addMatch(kickoff)
    await addSupporter('Aan')

    await expect(run(now, { ...env, FANS_REMINDER_SECRET: '' })).rejects.toThrow('FANS_REMINDER_SECRET')
    expect(mails).toEqual([])
  })
})

describe('the record of the sent reminders', () => {
  it('goes with the account', async () => {
    await addMatch(kickoff)

    const id = await addSupporter('Aan')

    await run()
    expect(await database.db.select().from(supporterReminders)).toHaveLength(1)
    await closeAccount(database.db, id)
    expect(await database.db.select().from(supporterReminders)).toEqual([])
  })

  it('is removed also while the game is off, and for a match without a known kick-off', async () => {
    const old = await addMatch(null, { matchDate: '2026-10-01' })
    const id = await addSupporter('Aan')

    await database.db.insert(supporterReminders).values({ matchId: old, supporterId: id })
    await run(now, { ...env, FANS_PROGNOSE: 'off' })

    expect(await database.db.select().from(supporterReminders)).toEqual([])
  })

  it('is removed for a match that began more than 30 days ago, and kept for a newer one', async () => {
    const old = await addMatch(new Date(now.getTime() - 31 * day))
    const recent = await addMatch(new Date(now.getTime() - 20 * day))
    const id = await addSupporter('Aan')

    await database.db.insert(supporterReminders).values([
      { matchId: old, supporterId: id },
      { matchId: recent, supporterId: id },
    ])
    await run()

    expect((await database.db.select().from(supporterReminders)).map((row) => row.matchId)).toEqual([recent])
  })

  it('holds no address and no name', async () => {
    await addMatch(kickoff)
    await addSupporter('Aan')
    await run()

    expect(Object.keys((await database.db.select().from(supporterReminders))[0] ?? {}).toSorted()).toEqual([
      'id',
      'matchId',
      'sentAt',
      'supporterId',
    ])
  })
})

describe('the line in the log', () => {
  it('has counts only, and nothing for a quiet run', () => {
    expect(describeReminders({ failed: 0, limited: false, sent: 0 })).toEqual([])
    expect(describeReminders({ failed: 1, limited: true, sent: 3 })).toEqual([
      'Reminders: 3 sent, 1 failed, limit of this run reached',
    ])
  })
})
