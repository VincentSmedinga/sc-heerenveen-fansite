import { describe, expect, it, vi } from 'vitest'

import {
  fansCard,
  fansMenuItems,
  type FansPart,
  fansParts,
  isFansPartOn,
  readFans,
  requireFansPart,
  runFansJob,
  sendFansMail,
} from './fans-env.ts'

const variableOf: Record<FansPart, string> = {
  accounts: 'FANS_ACCOUNTS',
  fantest: 'FANS_FANTEST',
  prognose: 'FANS_PROGNOSE',
  uitblinker: 'FANS_UITBLINKER',
  vier: 'FANS_VIER',
}

const allOn = Object.fromEntries(Object.values(variableOf).map((name) => [name, 'on']))
const notFound = (): never => {
  throw new Error('NEXT_NOT_FOUND')
}

describe('readFans', () => {
  it('treats a missing setting as off', () => {
    expect(Object.values(readFans({}))).toEqual([false, false, false, false, false])
  })

  it('reads on and off', () => {
    expect(readFans({ FANS_ACCOUNTS: 'on', FANS_PROGNOSE: 'on', FANS_VIER: 'off' })).toEqual({
      accounts: true,
      fantest: false,
      prognose: true,
      uitblinker: false,
      vier: false,
    })
  })

  it('reports any other value, and an empty one counts as missing', () => {
    expect(() => readFans({ FANS_ACCOUNTS: 'yes' })).toThrow(/FANS_ACCOUNTS/)
    expect(readFans({ FANS_ACCOUNTS: '' }).accounts).toBe(false)
  })

  it('reads the environment on each call', () => {
    const source: Record<string, string> = {}

    expect(isFansPartOn('accounts', source)).toBe(false)
    source['FANS_ACCOUNTS'] = 'on'
    expect(isFansPartOn('accounts', source)).toBe(true)
  })

  it('keeps the four games off while accounts are off', () => {
    const withoutAccounts = { ...allOn, FANS_ACCOUNTS: undefined }

    expect(readFans(withoutAccounts)).toEqual({
      accounts: false,
      fantest: false,
      prognose: false,
      uitblinker: false,
      vier: false,
    })
    expect(readFans({ ...allOn, FANS_ACCOUNTS: 'off' }).prognose).toBe(false)
  })
})

describe.each(fansParts)('the part %s', (part) => {
  const on = allOn
  const off = { ...allOn, [variableOf[part]]: 'off' }

  it('answers a page or an action with "not found" when off, and lets it through when on', () => {
    expect(() => requireFansPart(part, notFound, off)).toThrow('NEXT_NOT_FOUND')
    expect(() => requireFansPart(part, notFound, {})).toThrow('NEXT_NOT_FOUND')
    expect(() => requireFansPart(part, notFound, on)).not.toThrow()
  })

  it('leaves its menu item and its card out when off', () => {
    const items = [{ label: 'x', part }]

    expect(fansMenuItems(items, off)).toEqual([])
    expect(fansMenuItems(items, on)).toEqual(items)
    expect(fansCard(part, 'card', off)).toBeUndefined()
    expect(fansCard(part, 'card', on)).toBe('card')
  })

  it('sends no mail and runs no job when off', async () => {
    const send = vi.fn(async () => undefined)
    const job = vi.fn(async () => undefined)

    expect(await sendFansMail(part, send, off)).toBe(false)
    expect(await runFansJob(part, job, off)).toBe(false)
    expect(send).not.toHaveBeenCalled()
    expect(job).not.toHaveBeenCalled()

    expect(await sendFansMail(part, send, on)).toBe(true)
    expect(await runFansJob(part, job, on)).toBe(true)
    expect(send).toHaveBeenCalledOnce()
    expect(job).toHaveBeenCalledOnce()
  })
})

describe('the games and accounts', () => {
  it.each(fansParts.filter((part) => part !== 'accounts'))('keeps %s off when accounts are off', async (part) => {
    const source = { ...allOn, FANS_ACCOUNTS: 'off' }
    const send = vi.fn(async () => undefined)

    expect(() => requireFansPart(part, notFound, source)).toThrow('NEXT_NOT_FOUND')
    expect(fansMenuItems([{ part }], source)).toEqual([])
    expect(await sendFansMail(part, send, source)).toBe(false)
    expect(send).not.toHaveBeenCalled()
  })
})
