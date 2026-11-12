import type { TestDatabase } from '@fansite/db/test-database'

import { adminLoginLinks, adminSessions, adminUsers, auditLog } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { emptyAccountValues } from '#src/beheer/account-fields'
import { createAccount } from '#src/beheer/accounts'
import { requireRole, sessionCookieName } from '#src/beheer/require-role'
import { findSession, hashOf, startSession } from '#src/beheer/sessions'

import { submitConflictMail } from '../mijn-account/actions'
import { submitAccount, submitNewAccount } from './actions'

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
const ids = { author: 0, editor: 0, owner: 0 }

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

const idOf = async (email: string) =>
  (await database.db.select().from(adminUsers).where(eq(adminUsers.email, email)))[0]?.id ?? 0

beforeEach(async () => {
  jar.clear()
  await database.pool.query('DELETE FROM audit_log')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'eigenaar@example.test', 'owner', 'Eva')
  await createAccount(database.db, 'redacteur@example.test', 'editor', 'Ruben')
  await createAccount(database.db, 'auteur@example.test', 'author', '')
  ids.owner = await idOf('eigenaar@example.test')
  ids.editor = await idOf('redacteur@example.test')
  ids.author = await idOf('auteur@example.test')
  await logInAs('owner')
})

async function logInAs(role: keyof typeof ids) {
  jar.set(sessionCookieName, await startSession(database.db, ids[role]))
}

const fields = (values: Record<string, string>) => {
  const formData = new FormData()

  for (const [name, value] of Object.entries(values)) {
    formData.set(name, value)
  }

  return formData
}

/** What an action returned, or where it redirected to. */
async function resultOf<T>(action: () => Promise<T>): Promise<T | { redirect: string }> {
  try {
    return await action()
  } catch (error) {
    if (error instanceof Redirect) {
      return { redirect: error.url }
    }

    throw error
  }
}

const initial = { errors: {}, values: emptyAccountValues }
const add = (values: Record<string, string>) => resultOf(() => submitNewAccount(initial, fields(values)))
const save = (id: number, values: Record<string, string>) => resultOf(() => submitAccount(id, initial, fields(values)))
const account = async (id: number) => (await database.db.select().from(adminUsers).where(eq(adminUsers.id, id)))[0]
const log = () => database.db.select().from(auditLog).orderBy(auditLog.id)
const everything = async () => ({ accounts: await database.db.select().from(adminUsers), log: await log() })

describe('who may manage the accounts', () => {
  it.each(['editor', 'author'] as const)('refuses an %s every action, and changes nothing', async (role) => {
    const before = await everything()

    await logInAs(role)

    await expect(add({ adres: 'nieuw@example.test', rol: 'editor', voornaam: 'Nina' })).rejects.toThrow('not found')
    await expect(
      save(ids.author, { adres: 'auteur@example.test', rol: 'editor', status: 'aan', voornaam: 'Anna' }),
    ).rejects.toThrow('not found')
    await expect(save(ids.owner, { adres: 'eigenaar@example.test', voornaam: 'Gekraakt' })).rejects.toThrow('not found')
    await expect(
      save(ids[role], { adres: `${role}@example.test`, rol: 'editor', status: 'aan', voornaam: 'Ik' }),
    ).rejects.toThrow('not found')
    expect(await everything()).toEqual(before)
  })

  it('asks for the owner only, on every page and action', async () => {
    await logInAs('editor')
    await expect(requireRole('owner')).rejects.toThrow('not found')
    await logInAs('owner')
    await expect(requireRole('owner')).resolves.toMatchObject({ firstName: 'Eva', role: 'owner' })
  })
})

describe('submitNewAccount', () => {
  it('adds an account that is on, in lowercase, writes account.create without the address, and sends no mail', async () => {
    expect(await add({ adres: ' Nina@Example.TEST ', rol: 'author', voornaam: ' Nina ' })).toEqual({
      redirect: expect.stringMatching(/^\/beheer\/accounts\/\d+\?gedaan=gemaakt$/u),
    })

    const id = await idOf('nina@example.test')

    expect(await account(id)).toMatchObject({ disabledAt: null, firstName: 'Nina', role: 'author' })
    expect(await log()).toMatchObject([
      { action: 'account.create', detail: 'rol: auteur', itemId: id, userId: ids.owner },
    ])
    expect(JSON.stringify(await log())).not.toContain('@')
  })

  it('gives each field its own error and stores nothing', async () => {
    const before = await everything()

    expect(await add({ adres: 'geen adres', rol: '', voornaam: '' })).toEqual({
      errors: {
        adres: 'Vul één e-mailadres in, zoals naam@voorbeeld.nl.',
        rol: 'Kies redacteur of auteur.',
        voornaam: 'Vul een voornaam in, hoogstens 50 tekens.',
      },
      values: { adres: 'geen adres', rol: '', status: '', voornaam: '' },
    })
    expect(await everything()).toEqual(before)
  })

  it('refuses an address that another account has, at the field', async () => {
    expect(await add({ adres: 'Redacteur@example.test', rol: 'author', voornaam: 'Twee' })).toMatchObject({
      errors: { adres: 'Dit adres hoort al bij een ander account. Kies een ander adres.' },
    })
  })

  it('never makes an owner, whatever the form sends', async () => {
    expect(await add({ adres: 'baas@example.test', rol: 'owner', voornaam: 'Baas' })).toMatchObject({
      errors: { rol: 'Kies redacteur of auteur.' },
    })
    expect(await idOf('baas@example.test')).toBe(0)
  })
})

describe('submitAccount', () => {
  it('changes the first name and the role, and writes what changed without an address', async () => {
    expect(
      await save(ids.author, { adres: 'auteur@example.test', rol: 'editor', status: 'aan', voornaam: 'Anna' }),
    ).toEqual({ redirect: `/beheer/accounts/${ids.author}?gedaan=opgeslagen` })
    expect(await account(ids.author)).toMatchObject({ firstName: 'Anna', role: 'editor' })
    expect(await log()).toMatchObject([
      {
        action: 'account.edit',
        detail: 'voornaam gewijzigd; rol: auteur → redacteur',
        itemId: ids.author,
        userId: ids.owner,
      },
    ])
  })

  it('saves nothing and writes nothing when nothing changed', async () => {
    expect(
      await save(ids.editor, { adres: 'redacteur@example.test', rol: 'editor', status: 'aan', voornaam: 'Ruben' }),
    ).toEqual({ redirect: `/beheer/accounts/${ids.editor}?gedaan=ongewijzigd` })
    expect(await log()).toEqual([])
  })

  it('ends every session and login link of an account that gets a new address, and the old session may do nothing', async () => {
    const session = await startSession(database.db, ids.editor)

    await database.db.insert(adminLoginLinks).values({
      expiresAt: new Date(Date.now() + 60_000),
      tokenHash: hashOf('link'),
      userId: ids.editor,
    })

    expect(
      await save(ids.editor, { adres: 'ruben@example.test', rol: 'editor', status: 'aan', voornaam: 'Ruben' }),
    ).toEqual({ redirect: `/beheer/accounts/${ids.editor}?gedaan=opgeslagen` })
    expect(await account(ids.editor)).toMatchObject({ email: 'ruben@example.test' })
    expect(await findSession(database.db, session)).toBeUndefined()
    expect(await database.db.select().from(adminLoginLinks).where(eq(adminLoginLinks.userId, ids.editor))).toEqual([])
    expect(await log()).toMatchObject([{ action: 'account.edit', detail: 'adres gewijzigd' }])
    expect(JSON.stringify(await log())).not.toContain('@')

    jar.set(sessionCookieName, session)
    await expect(requireRole('owner', 'editor')).rejects.toMatchObject({ url: '/beheer/inloggen' })
  })

  it('turns an account off, ends its sessions at once and writes account.disable, and on again with account.enable', async () => {
    const session = await startSession(database.db, ids.editor)

    await save(ids.editor, { adres: 'redacteur@example.test', rol: 'editor', status: 'uit', voornaam: 'Ruben' })

    expect((await account(ids.editor))?.disabledAt).not.toBeNull()
    expect(await database.db.select().from(adminSessions).where(eq(adminSessions.userId, ids.editor))).toEqual([])

    jar.set(sessionCookieName, session)
    await expect(requireRole('owner', 'editor')).rejects.toMatchObject({ url: '/beheer/inloggen' })

    await logInAs('owner')
    await save(ids.editor, { adres: 'redacteur@example.test', rol: 'editor', status: 'aan', voornaam: 'Ruben' })

    expect((await account(ids.editor))?.disabledAt).toBeNull()
    expect((await log()).map((row) => row.action)).toEqual(['account.disable', 'account.enable'])
  })

  it('refuses an address that another account has, at the field, and changes nothing', async () => {
    const before = await everything()

    expect(
      await save(ids.editor, { adres: 'AUTEUR@example.test', rol: 'editor', status: 'aan', voornaam: 'Ruben' }),
    ).toMatchObject({ errors: { adres: 'Dit adres hoort al bij een ander account. Kies een ander adres.' } })
    expect(await everything()).toEqual(before)
  })

  it('changes the first name and the address of the owner, but never his role or status', async () => {
    expect(await save(ids.owner, { adres: 'eigenaar@example.test', voornaam: 'Eva Marie' })).toEqual({
      redirect: `/beheer/accounts/${ids.owner}?gedaan=opgeslagen`,
    })
    expect(await account(ids.owner)).toMatchObject({ disabledAt: null, firstName: 'Eva Marie', role: 'owner' })

    const before = await everything()

    for (const values of [{ rol: 'editor' }, { status: 'uit' }, { rol: 'author', status: 'uit' }]) {
      expect(await save(ids.owner, { adres: 'eigenaar@example.test', voornaam: 'Eva', ...values })).toMatchObject({
        errors: { algemeen: 'Het account van de eigenaar houdt zijn rol en blijft aan. Er is niets veranderd.' },
      })
    }

    expect(await everything()).toEqual(before)
  })

  it('never makes another account owner', async () => {
    expect(
      await save(ids.editor, { adres: 'redacteur@example.test', rol: 'owner', status: 'aan', voornaam: 'Ruben' }),
    ).toMatchObject({ errors: { rol: 'Kies redacteur of auteur.' } })
    expect((await account(ids.editor))?.role).toBe('editor')
  })

  it('leads to the list with a notice for an account that is not there', async () => {
    expect(await save(999_999, { adres: 'x@example.test', rol: 'editor', status: 'aan', voornaam: 'X' })).toEqual({
      redirect: '/beheer/accounts?fout=weg',
    })
  })
})

describe('submitConflictMail', () => {
  const choose = (mail: string) => resultOf(() => submitConflictMail(fields({ mail })))

  it('turns the mail off and on again for the account that is logged in, and writes account.edit', async () => {
    await logInAs('editor')

    expect(await choose('uit')).toEqual({ redirect: '/beheer/mijn-account?gedaan=opgeslagen' })
    expect((await account(ids.editor))?.conflictMail).toBe(false)
    expect(await choose('uit')).toEqual({ redirect: '/beheer/mijn-account?gedaan=ongewijzigd' })
    expect(await choose('aan')).toEqual({ redirect: '/beheer/mijn-account?gedaan=opgeslagen' })
    expect((await log()).map((row) => [row.action, row.detail, row.itemId])).toEqual([
      ['account.edit', 'mail over afwijkingen van Wikipedia uit', ids.editor],
      ['account.edit', 'mail over afwijkingen van Wikipedia aan', ids.editor],
    ])
  })

  it('refuses an author, who never gets the mail', async () => {
    await logInAs('author')

    await expect(choose('uit')).rejects.toThrow('not found')
    expect((await account(ids.author))?.conflictMail).toBe(true)
  })

  it('changes nothing for a value that is neither aan nor uit', async () => {
    expect(await choose('misschien')).toEqual({ redirect: '/beheer/mijn-account?gedaan=ongewijzigd' })
    expect(await log()).toEqual([])
  })
})
