import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type * as CloseAccount from '#src/fans/close-account'

import { newConfirmation } from '#src/fans/close-account'

import { closeMyAccount } from './actions'

// The red button of "Weet je het zeker?" closes the account only with a fresh proof of that
// page from this session; the session alone is not enough.

const { closeAccount, cookieDelete, redirect } = vi.hoisted(() => ({
  closeAccount: vi.fn(() => Promise.resolve(true)),
  cookieDelete: vi.fn(),
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect ${url}`)
  }),
}))

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/fans/require-supporter', () => ({
  requireSupporter: () => Promise.resolve({ blocked: true, email: 'x', screenName: 'Tjalle99', supporterId: 7 }),
  supporterCookieName: 'fans-sessie',
  supporterToken: () => Promise.resolve('sessie'),
}))
vi.mock('#src/fans/close-account', async (importOriginal) => ({
  ...(await importOriginal<typeof CloseAccount>()),
  closeAccount,
}))
vi.mock('next/headers', () => ({ cookies: () => Promise.resolve({ delete: cookieDelete }) }))
vi.mock('next/navigation', () => ({ notFound: vi.fn(), redirect }))
vi.mock('next/server', () => ({ after: vi.fn() }))

const formOf = (fields: Record<string, string>) => {
  const data = new FormData()

  for (const [name, value] of Object.entries(fields)) {
    data.set(name, value)
  }

  return data
}

beforeEach(() => {
  vi.useFakeTimers({ now: new Date('2026-11-21T10:00:00Z'), toFake: ['Date'] })
})

afterEach(() => {
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('closeMyAccount', () => {
  it('closes the own account, also a blocked one, removes the cookie and goes to the page after', async () => {
    const { issuedAt, proof } = newConfirmation('sessie')

    await expect(closeMyAccount(formOf({ bewijs: proof, gemaakt: issuedAt }))).rejects.toThrow(
      'redirect /fans/mijn-account/opgeheven',
    )
    expect(closeAccount).toHaveBeenCalledWith({}, 7)
    expect(cookieDelete).toHaveBeenCalledWith({ name: 'fans-sessie', path: '/fans' })
  })

  it.each([
    ['without a proof', () => ({})],
    ['with the proof of another session', () => toFields(newConfirmation('andere'))],
    ['with a page older than 10 minutes', () => toFields(newConfirmation('sessie', Date.now() - 10 * 60 * 1000))],
  ])('closes nothing %s, and goes back to the first page', async (_name, fields) => {
    await expect(closeMyAccount(formOf(fields()))).rejects.toThrow(
      'redirect /fans/mijn-account/opheffen?melding=verlopen',
    )
    expect(closeAccount).not.toHaveBeenCalled()
    expect(cookieDelete).not.toHaveBeenCalled()
  })
})

function toFields({ issuedAt, proof }: { issuedAt: string; proof: string }): Record<string, string> {
  return { bewijs: proof, gemaakt: issuedAt }
}
