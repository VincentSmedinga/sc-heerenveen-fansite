import { afterEach, describe, expect, it, vi } from 'vitest'

import { confirm, confirmCode, newCode, signUp } from './actions'

const { getDatabase, sendSignUpMail } = vi.hoisted(() => ({
  getDatabase: vi.fn(() => {
    throw new Error('The database was used.')
  }),
  sendSignUpMail: vi.fn(),
}))

vi.mock('#src/database', () => ({ getDatabase }))
vi.mock('#src/fans/sign-up-mail', () => ({
  sendCeilingMail: vi.fn(),
  sendMailCeilingMail: vi.fn(),
  sendSignUpMail,
}))
vi.mock('next/navigation', () => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND')
  }),
  redirect: vi.fn(),
}))
vi.mock('next/server', () => ({ after: vi.fn() }))

afterEach(() => vi.unstubAllEnvs())

describe('the actions of signing up, with accounts off', () => {
  it.each([
    ['confirm', () => confirm('token')],
    ['confirmCode', () => confirmCode('ref', new FormData())],
    ['newCode', () => newCode('ref')],
    ['signUp', () => signUp({ errors: {}, values: { email: '', screenName: '' } }, new FormData())],
  ])('answer "not found" from %s, read nothing and mail nothing', async (_name, action) => {
    vi.stubEnv('FANS_ACCOUNTS', 'off')

    await expect(action()).rejects.toThrow('NEXT_NOT_FOUND')
    expect(getDatabase).not.toHaveBeenCalled()
    expect(sendSignUpMail).not.toHaveBeenCalled()
  })
})
