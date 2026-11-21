import type { TestDatabase } from '@fansite/db/test-database'

import { supporterEmailChanges, supporterLoginAttempts, supporterLoginLinks, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'

import type { ChangeEmailMail } from './change-email'

import { findSession, startSession } from '../login/sessions'
import { hashOf } from '../login/tokens'
import {
  changeAddress,
  changeCodeTriesLeft,
  changeLinkState,
  changesPerWindow,
  changeWithCode,
  changeWithLink,
  handleChangeEmail,
} from './change-email'
import { handleLogIn } from './log-in'
import { changeEmailMailText, emailChangedMailText } from './sign-up-mail'
import { supporterKind } from './supporter-login'

const minute = 60 * 1000
// The start of a quarter of an hour of the clock.
const start = new Date('2026-11-21T10:00:00Z')
const later = (minutes: number) => new Date(start.getTime() + minutes * minute)

let database: TestDatabase
let log: MockInstance<typeof console.info>
let supporterId: number
let otherId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.db.delete(supporterLoginAttempts)
  await database.db.delete(supporterEmailChanges)
  await database.db.delete(supporters)
  vi.restoreAllMocks()
  log = vi.spyOn(console, 'info').mockImplementation(() => undefined)

  const [inserted] = await database.db
    .insert(supporters)
    .values({ email: 'tjalle@example.org', screenName: 'Tjalle99', screenNameKey: 'tjalle99' })
  const [other] = await database.db
    .insert(supporters)
    .values({ email: 'sietske@example.org', screenName: 'Sietske', screenNameKey: 'sletske' })

  supporterId = inserted.insertId
  otherId = other.insertId
})

async function request(value: string, now = start, id = supporterId) {
  const mails: ChangeEmailMail[] = []
  const waits: number[] = []
  const result = await handleChangeEmail(database.db, id, value, {
    clock: () => 1000,
    defer: (task) => void task(),
    deliver: (mail) => {
      mails.push(mail)

      return Promise.resolve()
    },
    notifyMailCeiling: () => Promise.resolve(),
    now: () => now,
    origin: 'https://example.org',
    wait: (milliseconds) => {
      waits.push(milliseconds)

      return Promise.resolve()
    },
  })

  return { mail: mails[0], mails, result, waits }
}

const tokenOf = (mail: ChangeEmailMail | undefined) => new URL(mail?.url ?? 'https://x').searchParams.get('token') ?? ''
const refOf = (result: Awaited<ReturnType<typeof request>>['result']) => (result.answer === 'sent' ? result.ref : '')

async function emailOf(id = supporterId) {
  const [row] = await database.db.select({ email: supporters.email }).from(supporters).where(eq(supporters.id, id))

  return row?.email
}

describe('a request to change the address', () => {
  it('mails a link and a code to the new address, and keeps the old address until then', async () => {
    const { mail, result, waits } = await request(' Nieuw@Example.org ')

    expect(result).toEqual({ answer: 'sent', ref: expect.any(String) })
    expect(mail).toEqual({
      code: expect.stringMatching(/^\d{6}$/),
      to: 'nieuw@example.org',
      url: expect.stringMatching(/^https:\/\/example\.org\/fans\/mijn-account\/e-mailadres\/bevestigen\?token=/),
    })
    expect(waits).toEqual([supporterKind.minimumAnswerMilliseconds])
    expect(await emailOf()).toBe('tjalle@example.org')
    expect(await changeAddress(database.db, supporterId, refOf(result), start)).toBe('nieuw@example.org')
    // Another supporter can't see the request.
    expect(await changeAddress(database.db, otherId, refOf(result), start)).toBeUndefined()
  })

  it('refuses an empty, a wrong and the own address', async () => {
    expect((await request('  ')).result).toEqual({ answer: 'invalid', error: 'empty' })
    expect((await request('tjalle')).result).toEqual({ answer: 'invalid', error: 'invalid' })
    expect((await request('TJALLE@example.org')).result).toEqual({ answer: 'invalid', error: 'same' })
  })

  it('answers the same for an address with an account, mails nothing and changes nothing', async () => {
    const { mails, result, waits } = await request('sietske@example.org')

    expect(result).toEqual({ answer: 'sent', ref: expect.any(String) })
    expect(mails).toEqual([])
    expect(waits).toEqual([supporterKind.minimumAnswerMilliseconds])
    expect(await changeAddress(database.db, supporterId, refOf(result), start)).toBe('sietske@example.org')

    const token = await startSession(database.db, supporterKind, supporterId, start)

    // A code counts down as for any other address, and never works.
    expect(await changeWithCode(database.db, supporterId, token, refOf(result), '123456', start)).toEqual({
      answer: 'gone',
    })
    expect(await changeCodeTriesLeft(database.db, supporterId, refOf(result), start)).toBe(4)
    expect(await emailOf()).toBe('tjalle@example.org')
    expect(await emailOf(otherId)).toBe('sietske@example.org')
  })

  it('counts in the limit of 3 mails in 15 minutes of the new address', async () => {
    await database.db
      .insert(supporterLoginAttempts)
      .values(Array.from({ length: 3 }, () => ({ addressHash: hashOf('nieuw@example.org'), attemptedAt: start })))

    expect((await request('nieuw@example.org', later(1))).result).toEqual({ answer: 'limited' })
    expect((await request('ander@example.org', later(1))).result).toEqual({ answer: 'sent', ref: expect.any(String) })
  })

  it(`lets a supporter ask ${changesPerWindow} times in 15 minutes`, async () => {
    for (let index = 0; index < changesPerWindow; index += 1) {
      expect((await request(`nieuw${index}@example.org`, later(index))).result.answer).toBe('sent')
    }

    expect((await request('nog-een@example.org', later(5))).result).toEqual({ answer: 'limited' })
    expect((await request('nog-een@example.org', later(16))).result.answer).toBe('sent')
  })

  it('keeps counting a request after five wrong codes, whose link and code stop', async () => {
    const here = await startSession(database.db, supporterKind, supporterId, start)
    const first = await request('nieuw0@example.org')

    for (let index = 0; index < supporterKind.codeAttempts; index += 1) {
      await changeWithCode(database.db, supporterId, here, refOf(first.result), '000000', later(1))
    }

    expect(await changeCodeTriesLeft(database.db, supporterId, refOf(first.result), later(1))).toBe(0)
    expect(await changeWithLink(database.db, supporterId, here, tokenOf(first.mail), later(1))).toEqual({
      answer: 'gone',
    })
    expect((await request('nieuw1@example.org', later(2))).result.answer).toBe('sent')
    expect((await request('nieuw2@example.org', later(3))).result.answer).toBe('sent')
    expect((await request('nieuw3@example.org', later(4))).result).toEqual({ answer: 'limited' })
    expect(await emailOf()).toBe('tjalle@example.org')
  })

  it('leaves nothing of an expired request once a supporter asks to log in', async () => {
    await request('nieuw@example.org')
    await handleLogIn(database.db, 'sietske@example.org', undefined, {
      clock: () => 1000,
      defer: () => undefined,
      deliver: () => Promise.resolve(),
      notifyCeiling: () => Promise.resolve(),
      now: () => later(15),
      origin: 'https://example.org',
      wait: () => Promise.resolve(),
    })

    expect(await database.db.select().from(supporterEmailChanges)).toEqual([])
  })

  it('logs the request without an address', async () => {
    await request('nieuw@example.org')

    expect(log).toHaveBeenCalledWith(`Supporter ${supporterId} asked to change the address.`)
    expect(JSON.stringify(log.mock.calls)).not.toContain('@')
  })
})

describe('using the link or the code', () => {
  it('changes the address, ends the other sessions and keeps this one', async () => {
    const here = await startSession(database.db, supporterKind, supporterId, start)
    const elsewhere = await startSession(database.db, supporterKind, supporterId, start)
    const ofOther = await startSession(database.db, supporterKind, otherId, start)
    const { mail } = await request('nieuw@example.org')

    expect(await changeLinkState(database.db, supporterId, tokenOf(mail), later(1))).toMatchObject({
      email: 'nieuw@example.org',
    })
    expect(await changeWithLink(database.db, supporterId, here, tokenOf(mail), later(1))).toEqual({
      answer: 'changed',
      oldEmail: 'tjalle@example.org',
    })
    expect(await emailOf()).toBe('nieuw@example.org')
    expect(await findSession(database.db, supporterKind, here, later(1))).toMatchObject({ id: supporterId })
    expect(await findSession(database.db, supporterKind, elsewhere, later(1))).toBeUndefined()
    expect(await findSession(database.db, supporterKind, ofOther, later(1))).toMatchObject({ id: otherId })
    expect(log).toHaveBeenCalledWith(`Supporter ${supporterId} changed the address; the other sessions ended.`)
    // The link works once.
    expect(await changeWithLink(database.db, supporterId, here, tokenOf(mail), later(2))).toEqual({ answer: 'gone' })
  })

  it('changes the address with the code, and stops the login links to the old address', async () => {
    const here = await startSession(database.db, supporterKind, supporterId, start)

    await database.db
      .insert(supporterLoginLinks)
      .values({ expiresAt: later(15), tokenHash: 'oud', userId: supporterId })

    const { mail, result } = await request('nieuw@example.org')

    expect(await changeWithCode(database.db, supporterId, here, refOf(result), '000000', later(1))).toEqual({
      answer: 'gone',
    })
    expect(await changeCodeTriesLeft(database.db, supporterId, refOf(result), later(1))).toBe(4)
    expect(await changeWithCode(database.db, supporterId, here, refOf(result), mail?.code ?? '', later(1))).toEqual({
      answer: 'changed',
      oldEmail: 'tjalle@example.org',
    })
    expect(await emailOf()).toBe('nieuw@example.org')
    expect(await database.db.select().from(supporterLoginLinks)).toEqual([])
    expect(await database.db.select().from(supporterEmailChanges)).toEqual([])
  })

  it('does nothing with a link of another supporter', async () => {
    const theirs = await startSession(database.db, supporterKind, otherId, start)
    const { mail } = await request('nieuw@example.org')

    expect(await changeLinkState(database.db, otherId, tokenOf(mail), later(1))).toBeUndefined()
    expect(await changeWithLink(database.db, otherId, theirs, tokenOf(mail), later(1))).toEqual({ answer: 'gone' })
    expect(await emailOf(otherId)).toBe('sietske@example.org')
    expect(await emailOf()).toBe('tjalle@example.org')
  })

  it('does nothing with a link that expired, which leaves nothing behind', async () => {
    const here = await startSession(database.db, supporterKind, supporterId, start)
    const { mail } = await request('nieuw@example.org')

    expect(await changeLinkState(database.db, supporterId, tokenOf(mail), later(15))).toBeUndefined()
    expect(await changeWithLink(database.db, supporterId, here, tokenOf(mail), later(15))).toEqual({ answer: 'gone' })
    expect(await emailOf()).toBe('tjalle@example.org')
    expect(await database.db.select().from(supporterEmailChanges)).toEqual([])
  })

  it('does nothing when the new address got an account in the meantime', async () => {
    const here = await startSession(database.db, supporterKind, supporterId, start)
    const { mail } = await request('nieuw@example.org')

    await database.db.update(supporters).set({ email: 'nieuw@example.org' }).where(eq(supporters.id, otherId))

    expect(await changeWithLink(database.db, supporterId, here, tokenOf(mail), later(1))).toEqual({ answer: 'gone' })
    expect(await emailOf()).toBe('tjalle@example.org')
  })
})

describe('the mails', () => {
  it('give the link and the code to the new address', () => {
    const text = changeEmailMailText({ code: '482190', url: 'https://example.org/x?token=t' })

    expect(text).toContain('https://example.org/x?token=t')
    expect(text).toContain('482190')
  })

  it('tell the old address without naming the new one, and say what to do', () => {
    const text = emailChangedMailText()

    expect(text).toContain('is gewijzigd')
    expect(text).toContain('Deed je dit niet zelf?')
    expect(text.match(/@/g)).toHaveLength(1)
  })
})
