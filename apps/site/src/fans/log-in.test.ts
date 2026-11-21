import type { TestDatabase } from '@fansite/db/test-database'

import { supporterLoginAttempts, supporterLoginLinks, supporters, supporterSessions } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'

import type { LogInMail } from './log-in'

import { findSession } from '../login/sessions'
import { hashOf } from '../login/tokens'
import { handleLogIn, landingOf, logInLinkState, mailsPerQuarter, noteMail, returnPathOf } from './log-in'
import { codeTriesLeft, confirmWithCode, confirmWithLink, handleSignUp } from './sign-up'
import { logInMailText } from './sign-up-mail'
import { supporterKind } from './supporter-login'

const minute = 60 * 1000
// The start of a quarter of an hour of the clock.
const start = new Date('2026-11-21T10:00:00Z')
const later = (minutes: number) => new Date(start.getTime() + minutes * minute)

let database: TestDatabase
let log: MockInstance<typeof console.info>
let supporterId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.db.delete(supporterLoginAttempts)
  await database.db.delete(supporterLoginLinks)
  await database.db.delete(supporters)
  vi.restoreAllMocks()
  log = vi.spyOn(console, 'info').mockImplementation(() => undefined)

  const [inserted] = await database.db
    .insert(supporters)
    .values({ email: 'tjalle@example.org', screenName: 'Tjalle99', screenNameKey: 'tjalle99' })

  supporterId = inserted.insertId
})

async function logIn(value: string, now = start, returnTo?: string) {
  const mails: LogInMail[] = []
  const waits: number[] = []
  let ceilingMails = 0
  const result = await handleLogIn(database.db, value, returnTo, {
    clock: () => 1000,
    defer: (task) => void task(),
    deliver: (mail) => {
      mails.push(mail)

      return Promise.resolve()
    },
    notifyCeiling: () => {
      ceilingMails += 1

      return Promise.resolve()
    },
    now: () => now,
    origin: 'https://example.org',
    wait: (milliseconds) => {
      waits.push(milliseconds)

      return Promise.resolve()
    },
  })

  return { ceilingMails, mail: mails[0], mails, result, waits }
}

const tokenOf = (mail: LogInMail | undefined) => new URL(mail?.url ?? 'https://x').searchParams.get('token') ?? ''

describe('a request to log in', () => {
  it('mails a link and a code to an address with an account', async () => {
    const { mail, result } = await logIn(' Tjalle@Example.org ')

    expect(result.answer).toBe('sent')
    expect(mail?.to).toBe('tjalle@example.org')
    expect(mail?.code).toMatch(/^\d{6}$/)
    expect(new URL(mail?.url ?? '').pathname).toBe('/fans/inloggen/bevestigen')
  })

  it('answers the same, in words and in time, for an address without an account, and mails it nothing', async () => {
    const known = await logIn('tjalle@example.org')
    const unknown = await logIn('sietske@example.org')

    expect(unknown.result).toEqual({ answer: 'sent', ref: expect.any(String) })
    expect(Object.keys(unknown.result)).toEqual(Object.keys(known.result))
    expect(unknown.waits).toEqual(known.waits)
    expect(unknown.waits).toEqual([supporterKind.minimumAnswerMilliseconds])
    expect(unknown.mails).toEqual([])
  })

  it('counts down a wrong code for an address without an account the same as for one with', async () => {
    const known = await logIn('tjalle@example.org')
    const unknown = await logIn('sietske@example.org')
    const refOf = (result: typeof known.result) => (result.answer === 'sent' ? result.ref : '')

    for (const { ref, tries } of [
      { ref: refOf(known.result), tries: 4 },
      { ref: refOf(unknown.result), tries: 4 },
    ]) {
      expect(await codeTriesLeft(database.db, ref, later(1))).toBe(5)
      expect(await confirmWithCode(database.db, ref, '000000', later(1))).toEqual({ answer: 'gone' })
      expect(await codeTriesLeft(database.db, ref, later(1))).toBe(tries)
    }

    // The row of the unknown address keeps no address and never logs in, whatever the code.
    const decoy = (await database.db.select().from(supporterLoginLinks)).find((link) => link.userId === null)

    expect(decoy).toMatchObject({ email: hashOf('sietske@example.org'), screenName: '', screenNameKey: '' })

    for (let code = 0; code < 4; code++) {
      await confirmWithCode(database.db, refOf(unknown.result), String(code).padStart(6, '0'), later(2))
    }

    expect(await codeTriesLeft(database.db, refOf(unknown.result), later(2))).toBe(0)
    expect(await database.db.select().from(supporters)).toHaveLength(1)
  })

  it('stops the code of an earlier request the same for an address without an account', async () => {
    const refOf = (result: Awaited<ReturnType<typeof logIn>>['result']) => (result.answer === 'sent' ? result.ref : '')

    for (const address of ['tjalle@example.org', 'sietske@example.org']) {
      const first = await logIn(address)

      await logIn(address, later(1))

      expect(await codeTriesLeft(database.db, refOf(first.result), later(2)), address).toBe(0)
      expect(await confirmWithCode(database.db, refOf(first.result), '000000', later(2))).toEqual({ answer: 'gone' })
    }
  })

  it('stops the code of a sign-up of an unknown address when it asks to log in, and the other way round', async () => {
    const deps = {
      clock: () => 0,
      defer: () => undefined,
      deliver: () => Promise.resolve(),
      notifyCeiling: () => Promise.resolve(),
      notifyMailCeiling: () => Promise.resolve(),
      now: () => start,
      origin: 'https://example.org',
      wait: () => Promise.resolve(),
    }
    const signUp = await handleSignUp(database.db, { email: 'sietske@example.org', screenName: 'Sietske' }, deps)
    const login = await logIn('sietske@example.org', later(1))

    expect(await codeTriesLeft(database.db, signUp.answer === 'sent' ? signUp.ref : '', later(1))).toBe(0)

    await handleSignUp(
      database.db,
      { email: 'sietske@example.org', screenName: 'Sietske' },
      { ...deps, now: () => later(2) },
    )

    expect(await codeTriesLeft(database.db, login.result.answer === 'sent' ? login.result.ref : '', later(2))).toBe(0)
  })

  it('mails a blocked account too, which can log in', async () => {
    await database.db.update(supporters).set({ disabledAt: start, disabledReason: 'Test' })

    const { mail, result } = await logIn('tjalle@example.org')

    expect(result.answer).toBe('sent')
    expect(mail?.to).toBe('tjalle@example.org')
    expect(await landingOf(database.db, supporterId, '/fans/mijn-account')).toBe('/fans/geblokkeerd')
  })

  it('says what is wrong with the field, and mails nothing', async () => {
    expect((await logIn('  ')).result).toEqual({ answer: 'invalid', error: 'empty' })
    expect((await logIn('geen-adres')).result).toEqual({ answer: 'invalid', error: 'invalid' })
  })

  it('logs in with the code, and goes back to the page it came from', async () => {
    const { mail, result } = await logIn('tjalle@example.org', start, '/fans/mijn-account')
    const ref = result.answer === 'sent' ? result.ref : ''

    expect(new URL(mail?.url ?? '').searchParams.get('terug')).toBe('/fans/mijn-account')

    const session = await confirmWithCode(database.db, ref, mail?.code ?? '', later(1))

    expect(session).toMatchObject({ answer: 'session', created: false, supporterId })
    expect(await landingOf(database.db, supporterId, '/fans/mijn-account')).toBe('/fans/mijn-account')
    expect(await landingOf(database.db, supporterId, undefined)).toBe('/fans')
    expect(log).toHaveBeenCalledWith(`Supporter ${supporterId} logged in.`)
  })

  it('logs in with the link once, behind a page with the screen name', async () => {
    const { mail } = await logIn('tjalle@example.org')

    expect(await logInLinkState(database.db, tokenOf(mail), later(1))).toEqual({
      screenName: 'Tjalle99',
      state: 'log-in',
    })

    const session = await confirmWithLink(database.db, tokenOf(mail), later(1))

    expect(session.answer).toBe('session')
    expect(
      await findSession(database.db, supporterKind, session.answer === 'session' ? session.token : ''),
    ).toBeDefined()
    expect(await logInLinkState(database.db, tokenOf(mail), later(2))).toEqual({ state: 'gone' })
    expect(await database.db.select().from(supporterSessions)).toHaveLength(1)
  })

  it('stops the link after 15 minutes', async () => {
    const { mail } = await logIn('tjalle@example.org')

    expect(await logInLinkState(database.db, tokenOf(mail), later(15))).toEqual({ state: 'gone' })
    expect(await confirmWithLink(database.db, tokenOf(mail), later(15))).toEqual({ answer: 'gone' })
  })

  it('writes no address, token or code in the log', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    for (let attempt = 0; attempt < 4; attempt++) {
      await logIn('tjalle@example.org')
    }

    const { mails } = await logIn('sietske@example.org')
    const written = [...log.mock.calls, ...error.mock.calls].flat().join('\n')

    expect(written).not.toMatch(/@|Tjalle99/)
    expect(mails).toEqual([])
    expect(written).toContain(
      `A request to log in reached the limit of mails for one address (supporter ${supporterId}).`,
    )
  })
})

describe('the limits of the mails', () => {
  it('are 3 an address in 15 minutes, signing up and logging in together', async () => {
    const signUp = () =>
      handleSignUp(
        database.db,
        { email: 'tjalle@example.org', screenName: 'Iemand' },
        {
          clock: () => 0,
          defer: () => undefined,
          deliver: () => Promise.resolve(),
          notifyCeiling: () => Promise.resolve(),
          notifyMailCeiling: () => Promise.resolve(),
          now: () => start,
          origin: 'https://example.org',
          wait: () => Promise.resolve(),
        },
      )

    expect((await signUp()).answer).toBe('sent')
    expect((await logIn('tjalle@example.org')).result.answer).toBe('sent')
    expect((await logIn('tjalle@example.org')).result.answer).toBe('sent')
    expect((await logIn('tjalle@example.org')).result).toEqual({ answer: 'limited' })
    expect((await signUp()).answer).toBe('limited')
    expect((await logIn('tjalle@example.org', later(16))).result.answer).toBe('sent')
  })

  it(`stop all mails of the site after ${mailsPerQuarter} in a quarter of an hour, until it ends`, async () => {
    for (let index = 0; index < mailsPerQuarter; index++) {
      expect((await noteMail(database.db, `fan-${index}@example.org`, later(index / 10))).answer).toBe('within')
    }

    const first = await logIn('tjalle@example.org', later(10))

    expect(first.result).toEqual({ answer: 'ceiling' })
    expect(first.mails).toEqual([])
    expect(first.ceilingMails).toBe(1)

    const again = await logIn('sietske@example.org', later(14))

    expect(again.result).toEqual({ answer: 'ceiling' })
    expect(again.ceilingMails).toBe(0)

    // The next quarter of the clock begins after 15 minutes.
    expect((await logIn('tjalle@example.org', later(15))).result.answer).toBe('sent')
  })

  it('give the editors one mail a quarter of an hour', async () => {
    for (let index = 0; index < mailsPerQuarter; index++) {
      await noteMail(database.db, `fan-${index}@example.org`, later(1))
    }

    const answers = []

    for (let index = 0; index < 5; index++) {
      answers.push(await noteMail(database.db, `over-${index}@example.org`, later(2)))
    }

    expect(answers.filter((answer) => answer.answer === 'ceiling' && answer.first)).toHaveLength(1)
  })
})

describe('the page to go back to', () => {
  it.each([
    ['/fans', '/fans'],
    ['/fans/mijn-account', '/fans/mijn-account'],
    ['/fans/prognose?wedstrijd=3', '/fans/prognose?wedstrijd=3'],
  ])('follows %s', (value, path) => {
    expect(returnPathOf(value)).toBe(path)
  })

  it.each([
    'https://example.com/fans',
    '//example.com/fans',
    '/\\example.com/fans',
    '/fans/../beheer',
    '/fansite',
    '/beheer',
    '/',
    'fans',
    '/fans/inloggen',
    '/fans/aanmelden/verstuurd',
    undefined,
    ['/fans'],
  ])('does not follow %s', (value) => {
    expect(returnPathOf(value)).toBeUndefined()
  })
})

describe('the mail to log in', () => {
  it('has the link, the code and how long they work', () => {
    const text = logInMailText({ code: '012345', url: 'https://example.org/fans/inloggen/bevestigen?token=t' })

    expect(text).toContain('https://example.org/fans/inloggen/bevestigen?token=t')
    expect(text).toContain('012345')
    expect(text).toContain('15 minuten en één keer')
  })
})
