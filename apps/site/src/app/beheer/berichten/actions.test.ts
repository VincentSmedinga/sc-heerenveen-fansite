import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, auditLog, items } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount, revokeAccount } from '#src/beheer/accounts'
import { sessionCookieName } from '#src/beheer/require-role'
import { startSession } from '#src/beheer/sessions'
import { addItem, addSource } from '#src/beheer/test-items'

import type { ListView } from './paths'

import { submitApprove, submitHide, submitShow, submitUnapprove } from './actions'

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
vi.mock('#src/database', () => ({ getDatabase: () => database }))

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
  await createAccount(database.db, 'jelle@example.org', 'editor', '')
  await createAccount(database.db, 'sanne@example.org', 'owner', '')
  await createAccount(database.db, 'auteur@example.org', 'author', '')
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

const onSite = (search: string, overrides: Partial<ListView> = {}): ListView => ({
  editorsOnly: false,
  group: 'on-site',
  page: 1,
  search,
  ...overrides,
})

const hide = (id: unknown, view: ListView | string, fields: Record<string, string> = { reden: 'fout' }) => {
  const formData = new FormData()

  for (const [name, value] of Object.entries(fields)) {
    formData.set(name, value)
  }

  return redirectOf(() => submitHide(id as number, typeof view === 'string' ? onSite(view) : view, formData))
}

const show = (id: unknown, view: ListView | string) =>
  redirectOf(() => submitShow(id as number, typeof view === 'string' ? onSite(view) : view))

const approve = (id: unknown, view: ListView | string) =>
  redirectOf(() => submitApprove(id as number, typeof view === 'string' ? onSite(view) : view))

const unapprove = (id: unknown, view: ListView | string) =>
  redirectOf(() => submitUnapprove(id as number, typeof view === 'string' ? onSite(view) : view))

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

  it('works for an editor and for the owner', async () => {
    const [sanne] = await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'sanne@example.org'))

    jar.set(sessionCookieName, await startSession(database.db, sanne?.id ?? 0))

    expect(await hide(itemId, '')).toBe(`/beheer/berichten?verborgen=${itemId}`)
    expect((await database.db.select().from(auditLog))[0]?.userId).toBe(sanne?.id)
  })

  it('refuses an author, and changes nothing', async () => {
    const [author] = await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'auteur@example.org'))

    jar.set(sessionCookieName, await startSession(database.db, author?.id ?? 0))

    await expect(hide(itemId, '')).rejects.toThrow('not found')
    expect((await stored())?.hiddenBy).toBeNull()
    expect(await database.db.select().from(auditLog)).toEqual([])
  })

  it('takes the account from the session and never from the form', async () => {
    await hide(itemId, '', { email: 'ander@example.org', hiddenBy: '999', reden: 'fout', userId: '999' })

    expect((await stored())?.hiddenBy).toBe(userId)
    expect((await database.db.select().from(auditLog))[0]?.userId).toBe(userId)
  })

  it('keeps the search on the way back', async () => {
    expect(await hide(itemId, 'wint van')).toBe(`/beheer/berichten?q=wint+van&verborgen=${itemId}`)
  })

  it.each([
    ['past-niet', 'Past niet bij de site'],
    ['bron', 'Op verzoek van de bron'],
    ['dubbel', 'Dubbel bericht'],
  ])('keeps the text of the fixed reason %s, and ignores the text field', async (key, text) => {
    await hide(itemId, '', { reden: key, toelichting: 'Dit telt niet mee' })

    expect(await stored()).toMatchObject({ hiddenReason: text })
    expect(await database.db.select().from(auditLog)).toMatchObject([{ action: 'item.hide', reason: text }])
  })

  it('keeps the text of the editor for Anders, as one line', async () => {
    await hide(itemId, '', { reden: 'anders', toelichting: '  Staat\n  twee keer  ' })

    expect(await stored()).toMatchObject({ hiddenReason: 'Staat twee keer' })
  })

  it.each([
    ['no choice', {}, 'reden-kies', ''],
    ['an empty choice', { reden: '' }, 'reden-kies', ''],
    ['a choice that is not in the list', { reden: 'iets-anders' }, 'reden-kies', ''],
    ['the text of a reason in place of its key', { reden: 'Fout in het bericht' }, 'reden-kies', ''],
    ['Anders without a text', { reden: 'anders' }, 'reden-anders', '&keuze=anders'],
    ['Anders with spaces', { reden: 'anders', toelichting: '   ' }, 'reden-anders', '&keuze=anders'],
    [
      'Anders with a text of 301 characters',
      { reden: 'anders', toelichting: 'x'.repeat(301) },
      'reden-lang',
      '&keuze=anders',
    ],
  ])(
    'refuses %s, hides nothing, writes nothing and shows the error at the item',
    async (_name, fields, error, keep) => {
      expect(await hide(itemId, '', fields)).toBe(`/beheer/berichten?bericht=${itemId}&fout=${error}${keep}`)
      expect((await stored())?.hiddenAt).toBeNull()
      expect(await database.db.select().from(auditLog)).toEqual([])
    },
  )

  it('keeps the group, the box and the search on the way back', async () => {
    const view: ListView = { editorsOnly: true, group: 'not-on-site', page: 1, search: 'wint van' }

    expect(await hide(itemId, view)).toBe(
      `/beheer/berichten?q=wint+van&toon=niet-op-de-site&redactie=1&verborgen=${itemId}`,
    )
    expect(await hide(itemId, { ...view, editorsOnly: false }, { reden: '' })).toBe(
      `/beheer/berichten?q=wint+van&toon=niet-op-de-site&bericht=${itemId}&fout=reden-kies`,
    )
  })

  it('keeps the page on the way back, and checks it', async () => {
    expect(await hide(itemId, { ...onSite(''), page: 3 })).toBe(`/beheer/berichten?pagina=3&verborgen=${itemId}`)
    expect(await hide(itemId, { ...onSite(''), page: 'x' } as unknown as ListView, { reden: '' })).toBe(
      `/beheer/berichten?bericht=${itemId}&fout=reden-kies`,
    )
  })

  it('checks the group and the box it is given, which come from outside', async () => {
    const view = { editorsOnly: true, group: 'alles', search: 'x' } as unknown as ListView

    expect(await hide(itemId, view, { reden: '' })).toBe(`/beheer/berichten?q=x&bericht=${itemId}&fout=reden-kies`)
    expect(await hide(itemId, { editorsOnly: 'ja', group: 'not-on-site', search: 'x' } as unknown as ListView)).toBe(
      `/beheer/berichten?q=x&toon=niet-op-de-site&verborgen=${itemId}`,
    )
  })

  it('keeps the search when it refuses', async () => {
    expect(await hide(itemId, 'wint', { reden: '' })).toBe(`/beheer/berichten?q=wint&bericht=${itemId}&fout=reden-kies`)
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
    await hide(itemId, '', { reden: 'fout' })

    expect(await hide(itemId, '', { reden: 'dubbel' })).toBe(`/beheer/berichten?verborgen=${itemId}`)
    expect((await stored())?.hiddenReason).toBe('Fout in het bericht')
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

  it('keeps the group, the box and the search on the way back', async () => {
    await hide(itemId, '')

    expect(await show(itemId, { editorsOnly: true, group: 'not-on-site', page: 1, search: 'wint' })).toBe(
      `/beheer/berichten?q=wint&toon=niet-op-de-site&redactie=1&getoond=${itemId}`,
    )
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

describe('submitApprove and submitUnapprove', () => {
  beforeEach(async () => {
    await database.db.update(items).set({ relevance: 'doubtful' }).where(eq(items.id, itemId))
  })

  it('puts the item on the site, writes the log with the account, and leads back with the search', async () => {
    expect(await approve(itemId, 'wint')).toBe(`/beheer/berichten?q=wint&opgenomen=${itemId}`)
    expect(await stored()).toMatchObject({ approvedAt: expect.any(Date), approvedBy: userId })
    expect(await database.db.select().from(auditLog)).toMatchObject([{ action: 'item.approve', itemId, userId }])
  })

  it('takes the approval back, and writes the log', async () => {
    await approve(itemId, '')

    expect(await unapprove(itemId, '')).toBe(`/beheer/berichten?teruggezet=${itemId}`)
    expect(await stored()).toMatchObject({ approvedAt: null, approvedBy: null })
    expect(await database.db.select().from(auditLog).orderBy(auditLog.id)).toMatchObject([
      { action: 'item.approve' },
      { action: 'item.unapprove', itemId, userId },
    ])
  })

  it('says the item is gone for a number that is no item, and for one that is no number', async () => {
    expect(await approve(99_999, '')).toBe('/beheer/berichten?fout=weg')
    expect(await unapprove(99_999, '')).toBe('/beheer/berichten?fout=weg')
    expect(await approve('abc', '')).toBe('/beheer/berichten?fout=weg')
    expect(await unapprove(0, '')).toBe('/beheer/berichten?fout=weg')
    expect(await database.db.select().from(auditLog)).toEqual([])
  })

  it('refuses without a session, before it changes anything', async () => {
    jar.clear()

    expect(await approve(itemId, '')).toBe('/beheer/inloggen')
    expect((await stored())?.approvedAt).toBeNull()
  })
})
