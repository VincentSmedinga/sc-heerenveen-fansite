import { makeReminderCode } from '@fansite/shared/reminder-code'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { turnOffReminder } from './actions'

const { redirect, turnOffWithCode } = vi.hoisted(() => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`redirect ${url}`)
  }),
  turnOffWithCode: vi.fn((_db: unknown, code: unknown) => Promise.resolve(code !== 'rommel')),
}))

vi.mock('#src/database', () => ({ getDatabase: () => ({ db: {} }) }))
vi.mock('#src/fans/reminder', () => ({
  reminderOffPaths: { done: '/fans/herinnering/uitzetten?klaar=1', page: '/fans/herinnering/uitzetten' },
  turnOffWithCode,
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('NEXT_NOT_FOUND')
  },
  redirect,
}))

const secret = 'een-geheim-van-minstens-tweeendertig-tekens'
const form = (code: string) => {
  const data = new FormData()

  data.set('code', code)

  return data
}

beforeEach(() => {
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_PROGNOSE', 'on')
  vi.stubEnv('FANS_REMINDER_SECRET', secret)
})

afterEach(() => {
  vi.unstubAllEnvs()
  vi.clearAllMocks()
})

describe('the button Herinnering uitzetten', () => {
  it('turns the reminder off for the supporter in the code and goes to the page that says so', async () => {
    await expect(turnOffReminder(form(makeReminderCode(7, secret)))).rejects.toThrow(
      'redirect /fans/herinnering/uitzetten?klaar=1',
    )
    expect(turnOffWithCode).toHaveBeenCalledWith({}, expect.stringMatching(/^7\./))
  })

  it('changes nothing for a wrong code and goes back to the page', async () => {
    await expect(turnOffReminder(form('rommel'))).rejects.toThrow('redirect /fans/herinnering/uitzetten?code=rommel')
    expect(turnOffWithCode).toHaveReturnedWith(expect.any(Promise))
  })

  it('is "not found" while Prognose is off', async () => {
    vi.stubEnv('FANS_PROGNOSE', 'off')

    await expect(turnOffReminder(form(makeReminderCode(7, secret)))).rejects.toThrow('NEXT_NOT_FOUND')
    expect(turnOffWithCode).not.toHaveBeenCalled()
  })
})
