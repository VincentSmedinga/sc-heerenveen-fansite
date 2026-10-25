import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, auditLog, items } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount, revokeAccount } from '../../../beheer/accounts'
import { sessionCookieName } from '../../../beheer/require-role'
import { startSession } from '../../../beheer/sessions'
import { addItem, addSource } from '../../../beheer/test-items'
import { submitHide, submitShow } from './actions'

const { jar } = vi.hoisted(() => ({ jar: new Map<string, string>() }))

class Redirect extends Error {
  readonly url: string

  constructor(url: string) {
    super(`redirect to ${url}`)
    this.url = url
  }
}

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({ get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined) }),
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
  redirect: (url: string) => {
    throw new Redirect(url)
  },
}))
vi.mock('../../../database', () => ({ getDatabase: () => database }))

let database: TestDatabase
let userId: number
let itemId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  jar.clear()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM sources')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'jelle@example.org', 'moderator')
  await createAccount(database.db, 'sanne@example.org', 'beheerder')
  userId = (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'jelle@example.org')))[0]?.id ?? 0
  jar.set(sessionCookieName, await startSession(database.db, userId))
  itemId = await addItem(database, await addSource(database), 'een')
})

/** Calls an action and returns where it redirected to. */
async function redirectOf(action: () => Promise<void>) {
  try {
    await action()
  } catch (error) {
    if (error instanceof Redirect) {
      return error.url
    }

    throw error
  }

  throw new Error('The action did not redirect')
}

const hide = (id: unknown, search: string, fields: Record<string, string> = { reden: 'Fout in het bericht' }) => {
  const formData = new FormData()

  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value)
  }

  return redirectOf(() => submitHide(id as number, search, formData))
}

const show = (id: unknown, search: string) => redirectOf(() => submitShow(id as number, search))

const stored = async () => (await database.db.select().from(items).where(eq(items.id, itemId)))[0]

describe('submitHide', () => {
  it('hides the item with the reason, writes the log with the account of the session, and leads back to the list', async () => {
    expect(await hide(itemId, '')).toBe(`/beheer/berichten?verborgen=${itemId}`)
    expect(await stored()).toMatchObject({ hiddenBy: userId, hiddenReason: 'Fout in het bericht' })
    expect(await stored()).toMatchObject({ hiddenAt: expect.any(Date) })
    expect(await database.db.select().from(auditLog)).toMatchObject([
      { action: 'item.hide', itemId, reason: 'Fout in het bericht', userId },
    ])
  })

  it('works for a moderator and for a beheerder', async () => {
    const [sanne] = await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'sanne@example.org'))

    jar.set(sessionCookieName, await startSession(database.db, sanne?.id ?? 0))

    expect(await hide(itemId, '')).toBe(`/beheer/berichten?verborgen=${itemId}`)
    expect((await database.db.select().from(auditLog))[0]?.userId).toBe(sanne?.id)
  })

  it('takes the account from the session and never from the form', async () => {
    await hide(itemId, '', { email: 'ander@example.org', hiddenBy: '999', reden: 'Fout in het bericht', userId: '999' })

    expect((await stored())?.hiddenBy).toBe(userId)
    expect((await database.db.select().from(auditLog))[0]?.userId).toBe(userId)
  })

  it('keeps the search on the way back', async () => {
    expect(await hide(itemId, 'wint van')).toBe(`/beheer/berichten?q=wint+van&verborgen=${itemId}`)
  })

  it.each([
    ['no reason', {}, 'reden-leeg'],
    ['an empty reason', { reden: '' }, 'reden-leeg'],
    ['a reason of spaces', { reden: '   ' }, 'reden-leeg'],
    ['a reason of 301 characters', { reden: 'x'.repeat(301) }, 'reden-lang'],
  ])('refuses %s, hides nothing, writes nothing and shows the error at the item', async (_name, fields, error) => {
    expect(await hide(itemId, '', fields)).toBe(`/beheer/berichten?bericht=${itemId}&fout=${error}`)
    expect((await stored())?.hiddenAt).toBeNull()
    expect(await database.db.select().from(auditLog)).toEqual([])
  })

  it('keeps the search when it refuses', async () => {
    expect(await hide(itemId, 'wint', { reden: '' })).toBe(`/beheer/berichten?q=wint&bericht=${itemId}&fout=reden-leeg`)
  })

  it.each([0, -1, 1.5, '1e3', 'abc', undefined, null, {}])('refuses %j as an item', async (id) => {
    expect(await hide(id, '')).toBe('/beheer/berichten?fout=weg')
    expect(await database.db.select().from(auditLog)).toEqual([])
  })

  it('says so for an item that does not exist', async () => {
    expect(await hide(99_999, '')).toBe('/beheer/berichten?fout=weg')
    expect(await database.db.select().from(auditLog)).toEqual([])
  })

  it('is done once for an item that is hidden already: the first reason stays and the log has one row', async () => {
    await hide(itemId, '', { reden: 'Eerste reden' })

    expect(await hide(itemId, '', { reden: 'Tweede reden' })).toBe(`/beheer/berichten?verborgen=${itemId}`)
    expect((await stored())?.hiddenReason).toBe('Eerste reden')
    expect(await database.db.select().from(auditLog)).toHaveLength(1)
  })

  it('cleans the search it is given, which comes from outside', async () => {
    expect(await hide(itemId, `  a\n${'b'.repeat(200)}`)).toBe(
      `/beheer/berichten?q=a+${'b'.repeat(98)}&verborgen=${itemId}`,
    )
  })

  it('refuses a session that ended, and one of an account that was turned off, before it reads the form', async () => {
    jar.set(sessionCookieName, 'x'.repeat(43))
    expect(await hide(itemId, '')).toBe('/beheer/inloggen')

    jar.set(sessionCookieName, await startSession(database.db, userId))
    await revokeAccount(database.db, 'jelle@example.org')
    expect(await hide(itemId, '')).toBe('/beheer/inloggen')

    expect((await stored())?.hiddenAt).toBeNull()
    expect(await database.db.select().from(auditLog)).toEqual([])
  })
})

describe('submitShow', () => {
  it('shows the item again, writes the log, and leads back to the list', async () => {
    await hide(itemId, '')

    expect(await show(itemId, '')).toBe(`/beheer/berichten?getoond=${itemId}`)
    expect(await stored()).toMatchObject({ hiddenAt: null, hiddenBy: null, hiddenReason: null })
    expect(await database.db.select().from(auditLog).orderBy(auditLog.id)).toMatchObject([
      { action: 'item.hide' },
      { action: 'item.show', itemId, reason: null, userId },
    ])
  })

  it('keeps the search on the way back', async () => {
    await hide(itemId, '')

    expect(await show(itemId, 'wint')).toBe(`/beheer/berichten?q=wint&getoond=${itemId}`)
  })

  it.each([0, 'abc', undefined])('refuses %j as an item', async (id) => {
    expect(await show(id, '')).toBe('/beheer/berichten?fout=weg')
  })

  it('says so for an item that does not exist, and writes nothing for one that is shown already', async () => {
    expect(await show(99_999, '')).toBe('/beheer/berichten?fout=weg')
    expect(await show(itemId, '')).toBe(`/beheer/berichten?getoond=${itemId}`)
    expect(await database.db.select().from(auditLog)).toEqual([])
  })

  it('refuses a call without a session', async () => {
    jar.clear()

    expect(await show(itemId, '')).toBe('/beheer/inloggen')
  })
})
