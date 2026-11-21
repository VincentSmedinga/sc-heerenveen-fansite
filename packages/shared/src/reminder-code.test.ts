import { describe, expect, it } from 'vitest'

import { makeReminderCode, readReminderCode, reminderCodeLifetime } from './reminder-code.ts'

const secret = 'een-geheim-van-minstens-tweeendertig-tekens'
const now = new Date('2026-11-20T10:00:00Z')

describe('the code to turn the reminder off', () => {
  it('gives back the number of the supporter', () => {
    expect(readReminderCode(makeReminderCode(42, secret, now), secret, now)).toBe(42)
  })

  it('stops working after 60 days, and works the moment before', () => {
    const code = makeReminderCode(42, secret, now)

    expect(reminderCodeLifetime).toBe(60 * 24 * 60 * 60 * 1000)
    expect(readReminderCode(code, secret, new Date(now.getTime() + reminderCodeLifetime - 1))).toBe(42)
    expect(readReminderCode(code, secret, new Date(now.getTime() + reminderCodeLifetime))).toBeUndefined()
  })

  it('refuses another secret, another number, another expiry and rubbish', () => {
    const code = makeReminderCode(42, secret, now)
    const [, expiry, signature] = code.split('.')

    expect(readReminderCode(code, `${secret}x`, now)).toBeUndefined()
    expect(readReminderCode(`43.${expiry}.${signature}`, secret, now)).toBeUndefined()
    expect(readReminderCode(`42.${Number(expiry) + 1}.${signature}`, secret, now)).toBeUndefined()
    expect(readReminderCode(`42.${expiry}`, secret, now)).toBeUndefined()
    expect(readReminderCode(`${code}.extra`, secret, now)).toBeUndefined()
    expect(readReminderCode('', secret, now)).toBeUndefined()
    expect(readReminderCode('0.1.2', secret, now)).toBeUndefined()
    expect(readReminderCode('a.b.c', secret, now)).toBeUndefined()
  })
})
