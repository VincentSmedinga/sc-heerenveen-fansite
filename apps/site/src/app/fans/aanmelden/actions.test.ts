import { redirect } from 'next/navigation'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { confirm, confirmCode, newCode, signUp } from './actions'

const { getDatabase, handleNewCode, sendSignUpMail } = vi.hoisted(() => ({
  getDatabase: vi.fn(() => {
    throw new Error('The database was used.')
  }),
  handleNewCode: vi.fn(),
  sendSignUpMail: vi.fn(),
}))

vi.mock('#src/env', () => ({ originOf: () => 'https://example.org' }))
vi.mock('#src/fans/new-code', () => ({ handleNewCode }))

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

describe('newCode', () => {
  it.each([
    ['sent', 'nieuw'],
    ['wait', 'wacht'],
    ['limited', 'limiet'],
  ])('leads to the page with the words for %s', async (answer, melding) => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    getDatabase.mockReturnValueOnce({ db: {} } as never)
    handleNewCode.mockResolvedValueOnce({ answer })
    await newCode('ref')

    expect(redirect).toHaveBeenLastCalledWith(`/fans/aanmelden/verstuurd?melding=${melding}&ref=ref`)
  })

  it('leads to the page of a link that does not work for a request that is gone', async () => {
    vi.stubEnv('FANS_ACCOUNTS', 'on')
    getDatabase.mockReturnValueOnce({ db: {} } as never)
    handleNewCode.mockResolvedValueOnce({ answer: 'gone' })
    await newCode('ref')

    expect(redirect).toHaveBeenLastCalledWith('/fans/aanmelden/bevestigen?fout=link')
  })
})
