import type { TestDatabase } from '@fansite/db/test-database'

import { supporterLoginAttempts, supporterLoginLinks, supporters } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SignUpMail } from './sign-up'

import { handleNewCode, newCodeAfter, signUpAddress } from './new-code'
import { confirmWithCode, confirmWithLink, handleSignUp, signUpLinkState } from './sign-up'

const minute = 60 * 1000
const start = new Date('2026-11-21T10:05:00Z')
const later = (minutes: number) => new Date(start.getTime() + minutes * minute)
const tokenOf = (mail: SignUpMail | undefined) =>
  new URL(mail?.url ?? 'https://example.org').searchParams.get('token') ?? ''

let database: TestDatabase

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
  vi.spyOn(console, 'info').mockImplementation(() => undefined)
})

const deps = (mails: SignUpMail[], now: Date, ceilings: string[] = []) => ({
  clock: () => 1000,
  defer: (task: () => Promise<void>) => void task(),
  deliver: (mail: SignUpMail) => {
    mails.push(mail)

    return Promise.resolve()
  },
  notifyCeiling: () => Promise.resolve(),
  notifyMailCeiling: () => {
    ceilings.push('mail')

    return Promise.resolve()
  },
  now: () => now,
  origin: 'https://example.org',
  wait: () => Promise.resolve(),
})

async function newCode(ref: string, now: Date, ceilings: string[] = []) {
  const mails: SignUpMail[] = []
  const result = await handleNewCode(database.db, ref, deps(mails, now, ceilings))

  return { mail: mails[0], mails, result }
}

async function signUp(screenName: string, email: string, now = start) {
  const mails: SignUpMail[] = []
  const result = await handleSignUp(database.db, { email, screenName }, deps(mails, now))

  return { mail: mails[0], ref: result.answer === 'sent' ? result.ref : '' }
}

describe('the address of a sign-up', () => {
  it('comes from the request, for an address with an account and for one without', async () => {
    const fresh = await signUp('Sietske', 'sietske@example.org')

    expect(await signUpAddress(database.db, fresh.ref, later(1))).toBe('sietske@example.org')

    const known = await signUp('Tjalle99', 'tjalle@example.org')

    await confirmWithLink(database.db, tokenOf(known.mail), later(2))

    const again = await signUp('Andere Naam', 'Tjalle@example.org', later(3))

    expect(await signUpAddress(database.db, again.ref, later(3))).toBe('tjalle@example.org')
  })

  it('is not there for an unknown reference, an expired request or one that was used', async () => {
    const { mail, ref } = await signUp('Sietske', 'sietske@example.org')

    expect(await signUpAddress(database.db, 'onbekend', later(1))).toBeUndefined()
    expect(await signUpAddress(database.db, '', later(1))).toBeUndefined()
    expect(await signUpAddress(database.db, ref, later(16))).toBeUndefined()

    await confirmWithLink(database.db, tokenOf(mail), later(1))

    expect(await signUpAddress(database.db, ref, later(2))).toBeUndefined()
  })

  it('is not there for the decoy of a login, which holds the hash of an address', async () => {
    await database.db.insert(supporterLoginLinks).values({
      codeHash: 'a'.repeat(64),
      email: 'b'.repeat(64),
      expiresAt: later(15),
      refHash: (await import('../login/tokens')).hashOf('decoy'),
      screenName: '',
      screenNameKey: '',
      tokenHash: 'c'.repeat(64),
    })

    expect(await signUpAddress(database.db, 'decoy', later(1))).toBeUndefined()
  })
})

describe('a new code', () => {
  it('mails a new link and code to the same address with the same screen name, and the old ones stop', async () => {
    const first = await signUp('Sietske', 'sietske@example.org')
    const { mail, result } = await newCode(first.ref, later(1))

    expect(result).toEqual({ answer: 'sent' })
    expect(mail).toMatchObject({ kind: 'sign-up', to: 'sietske@example.org' })
    expect(mail?.code).not.toBe(first.mail?.code)
    expect(tokenOf(mail)).not.toBe(tokenOf(first.mail))
    expect(await signUpLinkState(database.db, tokenOf(first.mail), later(1))).toEqual({ state: 'gone' })
    expect(await confirmWithCode(database.db, first.ref, first.mail?.code ?? '', later(1))).toEqual({ answer: 'gone' })
    expect(await signUpLinkState(database.db, tokenOf(mail), later(1))).toEqual({
      screenName: 'Sietske',
      state: 'sign-up',
    })
    // The page keeps its reference, and the new code works with it.
    expect(await confirmWithCode(database.db, first.ref, mail?.code ?? '', later(2))).toMatchObject({
      answer: 'session',
      created: true,
    })
  })

  it('starts the 15 minutes again', async () => {
    const first = await signUp('Sietske', 'sietske@example.org')
    const { mail } = await newCode(first.ref, later(10))

    expect(await signUpLinkState(database.db, tokenOf(mail), later(20))).toMatchObject({ state: 'sign-up' })
    expect(await signUpLinkState(database.db, tokenOf(mail), later(26))).toEqual({ state: 'gone' })
  })

  it('sends nothing within a minute of the last mail, and counts that try nowhere', async () => {
    const first = await signUp('Sietske', 'sietske@example.org')
    const early = new Date(start.getTime() + newCodeAfter - 1)
    const { mails, result } = await newCode(first.ref, early)

    expect(result).toEqual({ answer: 'wait' })
    expect(mails).toEqual([])
    expect(await confirmWithCode(database.db, first.ref, first.mail?.code ?? '', early)).toMatchObject({
      answer: 'session',
    })
  })

  it('waits a minute after a new code too', async () => {
    const first = await signUp('Sietske', 'sietske@example.org')

    await newCode(first.ref, later(1))

    expect((await newCode(first.ref, new Date(later(1).getTime() + 30_000))).result).toEqual({ answer: 'wait' })
    expect((await newCode(first.ref, later(2))).result).toEqual({ answer: 'sent' })
  })

  it('counts for the 3 mails an address may have in 15 minutes, with the sign-up', async () => {
    const first = await signUp('Sietske', 'sietske@example.org')

    expect((await newCode(first.ref, later(1))).result).toEqual({ answer: 'sent' })
    expect((await newCode(first.ref, later(2))).result).toEqual({ answer: 'sent' })

    const over = await newCode(first.ref, later(3))

    expect(over.result).toEqual({ answer: 'limited' })
    expect(over.mails).toEqual([])
    // The mail before still works.
    expect(await signUpAddress(database.db, first.ref, later(3))).toBe('sietske@example.org')
  })

  it('mails an address with an account the link to log in, and keeps the answer the same', async () => {
    const known = await signUp('Tjalle99', 'tjalle@example.org')

    await confirmWithLink(database.db, tokenOf(known.mail), later(1))

    const again = await signUp('Andere Naam', 'tjalle@example.org', later(2))
    const { mail, result } = await newCode(again.ref, later(4))

    expect(result).toEqual({ answer: 'sent' })
    expect(mail).toMatchObject({ kind: 'log-in', to: 'tjalle@example.org' })
    expect(new URL(mail?.url ?? '').pathname).toBe('/fans/inloggen/bevestigen')
    expect(await confirmWithCode(database.db, again.ref, again.mail?.code ?? '', later(5))).toEqual({ answer: 'gone' })
    expect(await confirmWithCode(database.db, again.ref, mail?.code ?? '', later(5))).toMatchObject({
      answer: 'session',
      created: false,
    })
  })

  it('has nothing to send for a request that is gone, expired or unknown', async () => {
    const first = await signUp('Sietske', 'sietske@example.org')

    expect((await newCode('onbekend', later(2))).result).toEqual({ answer: 'gone' })
    expect((await newCode('', later(2))).result).toEqual({ answer: 'gone' })
    expect((await newCode(first.ref, later(16))).result).toEqual({ answer: 'gone' })
  })

  it('logs no address, name, token or code', async () => {
    const info = vi.mocked(console.info)
    const first = await signUp('Sietske', 'sietske@example.org')
    const { mail } = await newCode(first.ref, later(1))
    const logged = JSON.stringify(info.mock.calls)

    for (const secret of ['sietske', 'Sietske', tokenOf(mail), mail?.code ?? 'x']) {
      expect(logged).not.toContain(secret)
    }
  })
})
