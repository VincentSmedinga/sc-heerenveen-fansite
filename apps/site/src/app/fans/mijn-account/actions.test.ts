import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  changeName,
  closeMyAccount,
  confirmEmailCode,
  confirmEmailLink,
  logOut,
  logOutEverywhere,
  requestEmailChange,
  saveRankings,
} from './actions'

const { getDatabase, sendChangeEmailMail, sendEmailChangedMail } = vi.hoisted(() => ({
  getDatabase: vi.fn(() => {
    throw new Error('The database was used.')
  }),
  sendChangeEmailMail: vi.fn(),
  sendEmailChangedMail: vi.fn(),
}))

vi.mock('#src/env', () => ({ originOf: () => 'https://example.org' }))
vi.mock('#src/database', () => ({ getDatabase }))
vi.mock('#src/fans/sign-up-mail', () => ({
  sendChangeEmailMail,
  sendEmailChangedMail,
  sendMailCeilingMail: vi.fn(),
}))
vi.mock('next/headers', () => ({ cookies: () => Promise.resolve({ delete: vi.fn(), get: () => undefined }) }))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
  redirect: vi.fn(),
}))
vi.mock('next/server', () => ({ after: vi.fn() }))

afterEach(() => vi.unstubAllEnvs())

describe('the actions of Mijn account, with accounts off', () => {
  const form = () => {
    const data = new FormData()

    data.set('e-mail', 'nieuw@example.org')
    data.set('schermnaam', 'Tjalle')
    data.set('code', '123456')

    return data
  }

  it.each([
    ['changeName', () => changeName({ value: '' }, form())],
    ['closeMyAccount', () => closeMyAccount(form())],
    ['confirmEmailCode', () => confirmEmailCode('ref', form())],
    ['confirmEmailLink', () => confirmEmailLink('token')],
    ['logOut', () => logOut()],
    ['logOutEverywhere', () => logOutEverywhere()],
    ['requestEmailChange', () => requestEmailChange({ value: '' }, form())],
    ['saveRankings', () => saveRankings({ on: true }, form())],
  ])('answer "not found" from %s, read nothing and mail nothing', async (_name, action) => {
    vi.stubEnv('FANS_ACCOUNTS', 'off')

    await expect(action()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(getDatabase).not.toHaveBeenCalled()
    expect(sendChangeEmailMail).not.toHaveBeenCalled()
    expect(sendEmailChangedMail).not.toHaveBeenCalled()
  })
})
