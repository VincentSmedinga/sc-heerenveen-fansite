import type { TestDatabase } from '@fansite/db/test-database'

import {
  adminSessions,
  supporterLoginAttempts,
  supporterLoginLinks,
  supporters,
  supporterSessions,
} from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'

import type { SignUpMail } from './sign-up'

import { findSession } from '../login/sessions'
import { hashOf } from '../login/tokens'
import {
  codeTriesLeft,
  confirmWithCode,
  confirmWithLink,
  handleSignUp,
  noteSignUp,
  signUpLinkState,
  signUpsPerHour,
} from './sign-up'
import { signUpMailText } from './sign-up-mail'
import { supporterKind } from './supporter-login'

const minute = 60 * 1000
const start = new Date('2026-11-21T10:05:00Z')

let database: TestDatabase
let log: MockInstance<typeof console.info>

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
})

async function signUp(screenName: string, email: string, now = start) {
  const mails: SignUpMail[] = []
  let ceilingMails = 0
  const waits: number[] = []
  const result = await handleSignUp(
    database.db,
    { email, screenName },
    {
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
    },
  )

  return { ceilingMails, mail: mails[0], mails, ref: result.answer === 'sent' ? result.ref : '', result, waits }
}

const tokenOf = (mail: SignUpMail | undefined) =>
  new URL(mail?.url ?? 'https://example.org').searchParams.get('token') ?? ''
const later = (minutes: number) => new Date(start.getTime() + minutes * minute)
const wrongCode = (code: string | undefined) => (code === '000000' ? '111111' : '000000')

describe('signing up', () => {
  it('mails a link and a code to confirm, and makes no account yet', async () => {
    const { mail, result, waits } = await signUp(' Tjalle99 ', 'Tjalle@Example.org')

    expect(result.answer).toBe('sent')
    expect(mail).toMatchObject({ kind: 'sign-up', to: 'tjalle@example.org' })
    expect(mail?.code).toMatch(/^\d{6}$/)
    expect(new URL(mail?.url ?? '').pathname).toBe('/fans/aanmelden/bevestigen')
    expect(await database.db.select().from(supporters)).toEqual([])
    expect(await signUpLinkState(database.db, tokenOf(mail), start)).toEqual({
      screenName: 'Tjalle99',
      state: 'sign-up',
    })
    // The minimum time of the answer, so a known address can't be told by the time it takes.
    expect(waits).toEqual([supporterKind.minimumAnswerMilliseconds])
  })

  it('keeps only the SHA-256 of the token and the code, bound to the request', async () => {
    const { mail, ref } = await signUp('Tjalle99', 'tjalle@example.org')
    const [row] = await database.db.select().from(supporterLoginLinks)

    expect(row?.tokenHash).toBe(hashOf(tokenOf(mail)))
    expect(row?.codeHash).toBe(hashOf(`${ref}:${mail?.code ?? ''}`))
    expect(JSON.stringify(row)).not.toContain(tokenOf(mail))
  })

  it('makes the account with the button of the link, and logs in with a session of supporters', async () => {
    const { mail } = await signUp('Tjalle99', 'tjalle@example.org')
    const result = await confirmWithLink(database.db, tokenOf(mail), later(14))

    expect(result).toMatchObject({ answer: 'session', created: true })
    expect(await database.db.select().from(supporters)).toEqual([
      expect.objectContaining({
        disabledAt: null,
        email: 'tjalle@example.org',
        inRankings: true,
        screenName: 'Tjalle99',
        screenNameKey: 'tjalle99',
      }),
    ])
    expect(await database.db.select().from(supporterSessions)).toHaveLength(1)
    expect(await database.db.select().from(adminSessions)).toHaveLength(0)

    const token = result.answer === 'session' ? result.token : ''

    expect(await findSession(database.db, supporterKind, token, later(15))).toMatchObject({ screenName: 'Tjalle99' })
    // The link works once.
    expect(await confirmWithLink(database.db, tokenOf(mail), later(14))).toEqual({ answer: 'gone' })
  })

  it('makes the account with the code, on the page where the supporter already is', async () => {
    const { mail, ref } = await signUp('Tjalle99', 'tjalle@example.org')

    expect(
      await confirmWithCode(database.db, ref, ` ${mail?.code.slice(0, 3)} ${mail?.code.slice(3)} `, later(1)),
    ).toMatchObject({
      answer: 'session',
      created: true,
    })
    expect(await database.db.select().from(supporters)).toHaveLength(1)
  })

  it('takes a code only with the reference of its own request', async () => {
    const { mail } = await signUp('Tjalle99', 'tjalle@example.org')

    expect(await confirmWithCode(database.db, 'another', mail?.code ?? '', later(1))).toEqual({ answer: 'gone' })
  })

  it('stops the link and the code after 5 wrong codes', async () => {
    const { mail, ref } = await signUp('Tjalle99', 'tjalle@example.org')

    for (let tries = 0; tries < 5; tries += 1) {
      expect(await confirmWithCode(database.db, ref, wrongCode(mail?.code), later(1))).toEqual({ answer: 'gone' })
    }

    expect(await signUpLinkState(database.db, tokenOf(mail), later(1))).toEqual({ state: 'gone' })
    expect(await confirmWithCode(database.db, ref, mail?.code ?? '', later(1))).toEqual({ answer: 'gone' })
    expect(await confirmWithLink(database.db, tokenOf(mail), later(1))).toEqual({ answer: 'gone' })
    expect(await database.db.select().from(supporters)).toEqual([])
  })

  it('counts down the tries the code has left', async () => {
    const { mail, ref } = await signUp('Tjalle99', 'tjalle@example.org')

    expect(await codeTriesLeft(database.db, ref, later(1))).toBe(5)

    await confirmWithCode(database.db, ref, wrongCode(mail?.code), later(1))
    await confirmWithCode(database.db, ref, wrongCode(mail?.code), later(1))

    expect(await codeTriesLeft(database.db, ref, later(1))).toBe(3)
    expect(await codeTriesLeft(database.db, ref, later(15))).toBe(0)
    expect(await codeTriesLeft(database.db, 'another', later(1))).toBe(0)
  })

  it('takes a right code after 4 wrong ones', async () => {
    const { mail, ref } = await signUp('Tjalle99', 'tjalle@example.org')

    for (let tries = 0; tries < 4; tries += 1) {
      await confirmWithCode(database.db, ref, wrongCode(mail?.code), later(1))
    }

    expect(await confirmWithCode(database.db, ref, mail?.code ?? '', later(1))).toMatchObject({ answer: 'session' })
  })

  it('leaves nothing behind after 15 minutes without a confirmation, and the name is free again', async () => {
    const { mail } = await signUp('Tjalle99', 'tjalle@example.org')

    expect(await confirmWithLink(database.db, tokenOf(mail), later(15))).toEqual({ answer: 'gone' })

    // The next request removes what has ended.
    const other = await signUp('Tjalle99', 'sietske@example.org', later(16))
    const rows = await database.db.select().from(supporterLoginLinks)

    expect(other.result.answer).toBe('sent')
    expect(rows).toHaveLength(1)
    expect(rows[0]?.email).toBe('sietske@example.org')
  })

  it('says at the confirmation that another supporter took the name in the meantime', async () => {
    const first = await signUp('Tjalle99', 'tjalle@example.org')
    const second = await signUp('TJALLE 99', 'sietske@example.org')

    expect(await confirmWithLink(database.db, tokenOf(first.mail), later(1))).toMatchObject({ answer: 'session' })
    expect(await confirmWithLink(database.db, tokenOf(second.mail), later(2))).toEqual({
      answer: 'taken',
      screenName: 'TJALLE 99',
    })
    expect(await database.db.select().from(supporters)).toHaveLength(1)
  })

  it('refuses a name that an account has, without looking at accents and look-alikes', async () => {
    const { mail } = await signUp('Tjalle99', 'tjalle@example.org')

    await confirmWithLink(database.db, tokenOf(mail), later(1))

    expect((await signUp('tjálle_99', 'sietske@example.org', later(2))).result).toEqual({
      answer: 'invalid',
      errors: { screenName: { problem: 'taken' } },
    })
  })

  it('gives each field its own error', async () => {
    expect((await signUp('', '')).result).toEqual({
      answer: 'invalid',
      errors: { email: 'empty', screenName: { problem: 'empty' } },
    })
    expect((await signUp('Tjalle@', 'tjalle.example.org')).result).toEqual({
      answer: 'invalid',
      errors: { email: 'invalid', screenName: { character: '@', problem: 'character' } },
    })
    expect(await database.db.select().from(supporterLoginAttempts)).toEqual([])
  })
})

describe('signing up with an address that has an account', () => {
  async function account() {
    const { mail } = await signUp('Tjalle99', 'tjalle@example.org')

    await confirmWithLink(database.db, tokenOf(mail), later(1))
  }

  it('answers the same, and mails the link to log in instead', async () => {
    await account()

    const { mail, ref, result, waits } = await signUp('Andere Naam', 'Tjalle@example.org', later(2))

    expect(result.answer).toBe('sent')
    expect(waits).toEqual([supporterKind.minimumAnswerMilliseconds])
    expect(mail).toMatchObject({ kind: 'log-in', to: 'tjalle@example.org' })
    expect(await signUpLinkState(database.db, tokenOf(mail), later(2))).toEqual({ state: 'log-in' })
    expect(await confirmWithCode(database.db, ref, mail?.code ?? '', later(3))).toMatchObject({
      answer: 'session',
      created: false,
    })
    expect(await database.db.select().from(supporters)).toEqual([expect.objectContaining({ screenName: 'Tjalle99' })])
  })

  it('logs in when the same address confirmed a second sign-up in the meantime', async () => {
    const first = await signUp('Tjalle99', 'tjalle@example.org')
    const second = await signUp('Tjalle100', 'tjalle@example.org')

    // Only the code of the last request works, but both links do.
    await confirmWithLink(database.db, tokenOf(first.mail), later(1))

    expect(await confirmWithLink(database.db, tokenOf(second.mail), later(2))).toMatchObject({
      answer: 'session',
      created: false,
    })
    expect(await database.db.select().from(supporters)).toHaveLength(1)
  })

  it('mails nothing for a blocked account, and still answers the same', async () => {
    await account()
    await database.db.update(supporters).set({ disabledAt: start, disabledReason: 'Test' })

    const { mails, result } = await signUp('Andere Naam', 'tjalle@example.org', later(2))

    expect(result.answer).toBe('sent')
    expect(mails).toEqual([])
  })
})

describe('the limits', () => {
  it('allow 3 mails an address in 15 minutes, and send nothing above it', async () => {
    for (let number = 0; number < 3; number += 1) {
      expect((await signUp(`Tjalle${number}`, 'tjalle@example.org')).result.answer).toBe('sent')
    }

    const over = await signUp('Tjalle9', 'tjalle@example.org')

    expect(over.result).toEqual({ answer: 'limited' })
    expect(over.mails).toEqual([])
    expect((await signUp('Tjalle9', 'tjalle@example.org', later(16))).result.answer).toBe('sent')
  })

  it('keep the SHA-256 of the address and the time, for 15 minutes', async () => {
    await signUp('Tjalle99', 'tjalle@example.org')

    const rows = await database.db.select().from(supporterLoginAttempts)

    expect(rows.map(({ addressHash }) => addressHash).toSorted()).toEqual(
      [hashOf('tjalle@example.org'), null].toSorted(),
    )
    expect(JSON.stringify(rows)).not.toContain('tjalle')

    await signUp('Sietske', 'sietske@example.org', later(16))

    expect(
      (await database.db.select().from(supporterLoginAttempts)).filter(({ addressHash }) => addressHash !== null),
    ).toEqual([expect.objectContaining({ addressHash: hashOf('sietske@example.org') })])
  })

  it(`allow ${signUpsPerHour} sign-ups an hour for the whole site, and then none until the hour is over`, async () => {
    for (let number = 0; number < signUpsPerHour; number += 1) {
      expect((await signUp(`Supporter${number}`, `s${number}@example.org`, later(number))).result.answer).toBe('sent')
    }

    const over = await signUp('Supporter99', 's99@example.org', later(40))

    expect(over.result).toEqual({ answer: 'ceiling' })
    expect(over.mails).toEqual([])
    expect(over.ceilingMails).toBe(1)

    // Only one mail to the editors in that hour.
    const again = await signUp('Supporter98', 's98@example.org', later(50))

    expect(again.result).toEqual({ answer: 'ceiling' })
    expect(again.ceilingMails).toBe(0)

    // The next hour of the clock starts at 11.00.
    expect((await signUp('Supporter97', 's97@example.org', later(56))).result.answer).toBe('sent')
  })

  it('count the sign-ups of a known address too, so the ceiling tells nothing', async () => {
    const { mail } = await signUp('Tjalle99', 'tjalle@example.org')

    await confirmWithLink(database.db, tokenOf(mail), later(1))
    await signUp('Andere Naam', 'tjalle@example.org', later(2))

    const rows = await database.db.select().from(supporterLoginAttempts)

    expect(rows.filter(({ addressHash }) => addressHash === null)).toHaveLength(2)
    expect(await noteSignUp(database.db, later(3))).toEqual({ first: false, within: true })
  })
})

describe('the log', () => {
  it('has a line for a sign-up, a confirmation and a limit, and never an address, a name, a token or a code', async () => {
    const { mail } = await signUp('Tjalle99', 'tjalle@example.org')

    await confirmWithLink(database.db, tokenOf(mail), later(1))
    await signUp('Tjalle98', 'tjalle@example.org', later(2))
    await signUp('Tjalle97', 'tjalle@example.org', later(3))
    await signUp('Tjalle96', 'tjalle@example.org', later(4))

    const lines = log.mock.calls.map(([line]) => String(line))
    const [supporter] = await database.db.select().from(supporters)

    expect(lines).toEqual([
      'A supporter signed up; the account is made when the address is confirmed.',
      `Supporter ${supporter?.id} confirmed the sign-up and is logged in.`,
      `A sign-up came for the address of supporter ${supporter?.id}; it gets the mail to log in.`,
      `A sign-up came for the address of supporter ${supporter?.id}; it gets the mail to log in.`,
      'A sign-up reached the limit of mails for one address.',
    ])

    for (const secret of ['tjalle', 'Tjalle', tokenOf(mail), mail?.code ?? '']) {
      expect(lines.join('\n')).not.toContain(secret)
    }
  })
})

describe('the mail', () => {
  it('has the link, the code, how long they work and that you need not do anything', () => {
    const text = signUpMailText({
      code: '012345',
      kind: 'sign-up',
      url: 'https://example.org/fans/aanmelden/bevestigen?token=t',
    })

    expect(text).toContain('https://example.org/fans/aanmelden/bevestigen?token=t')
    expect(text).toContain('012345')
    expect(text).toContain('15 minuten')
    expect(text).toContain('Dan hoef je niets te doen.')
  })
})
