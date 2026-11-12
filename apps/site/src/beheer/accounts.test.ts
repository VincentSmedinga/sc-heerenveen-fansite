import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createAccount, isAdminRole, normaliseEmail, normaliseFirstName, revokeAccount } from './accounts'
import { findSession, startSession } from './sessions'

const start = new Date('2026-10-26T10:00:00Z')

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.db.delete(adminUsers)
})

describe('normaliseEmail', () => {
  it.each([
    ['jelle@example.org', 'jelle@example.org'],
    ['  Jelle.de.Vries@Example.ORG\n', 'jelle.de.vries@example.org'],
    ['jelle+fansite@example.org', 'jelle+fansite@example.org'],
  ])('takes %j as %j', (value, email) => {
    expect(normaliseEmail(value)).toBe(email)
  })

  it.each([
    '',
    'jelle',
    'jelle@example',
    '@example.org',
    'a@b.nl, c@d.nl',
    'a@b.nl;c@d.nl',
    'a@b.nl\nc@d.nl',
    'Jelle <a@b.nl>',
    'a b@c.nl',
  ])('refuses %j', (value) => {
    expect(normaliseEmail(value)).toBeUndefined()
  })
})

describe('isAdminRole', () => {
  it('knows owner, editor and author, and nothing else', () => {
    expect(['owner', 'editor', 'author', 'beheerder', 'moderator', 'Owner', ''].map(isAdminRole)).toEqual([
      true,
      true,
      true,
      false,
      false,
      false,
      false,
    ])
  })
})

describe('createAccount', () => {
  it('makes an account with the role and the first name, with the mail on', async () => {
    expect(await createAccount(database.db, 'jelle@example.org', 'author', 'Jelle', start)).toBe('created')
    expect(await database.db.select().from(adminUsers)).toEqual([
      {
        conflictMail: true,
        createdAt: start,
        disabledAt: null,
        email: 'jelle@example.org',
        firstName: 'Jelle',
        id: expect.any(Number),
        role: 'author',
      },
    ])
  })

  it('makes no account without a first name', async () => {
    expect(await createAccount(database.db, 'jelle@example.org', 'owner', undefined, start)).toBe('needs-name')
    expect(await database.db.select().from(adminUsers)).toEqual([])
  })

  it('gives an account that is on the role, and keeps its first name when none is given', async () => {
    await createAccount(database.db, 'jelle@example.org', 'editor', 'Jelle', start)

    expect(await createAccount(database.db, 'jelle@example.org', 'owner', undefined, start)).toBe('changed')
    expect(await database.db.select().from(adminUsers)).toMatchObject([{ firstName: 'Jelle', role: 'owner' }])
  })

  it('leaves an account as it is when it has the role and the first name already', async () => {
    await createAccount(database.db, 'jelle@example.org', 'author', 'Jelle', start)

    expect(await createAccount(database.db, 'jelle@example.org', 'author', undefined, start)).toBe('exists')
    expect(await createAccount(database.db, 'jelle@example.org', 'author', 'Jelle', start)).toBe('exists')
  })

  it('turns an account that was revoked on again, with the new role', async () => {
    await createAccount(database.db, 'jelle@example.org', 'author', '', start)
    await revokeAccount(database.db, 'jelle@example.org', start)

    expect(await createAccount(database.db, 'jelle@example.org', 'editor', undefined, start)).toBe('enabled')
    expect(await database.db.select().from(adminUsers)).toMatchObject([{ disabledAt: null, role: 'editor' }])
  })
})

describe('normaliseFirstName', () => {
  it.each([
    ['Jelle', 'Jelle'],
    ['  Jan   Willem ', 'Jan Willem'],
    ['Sjoukje-Fenna', 'Sjoukje-Fenna'],
  ])('takes %j as %j', (value, name) => {
    expect(normaliseFirstName(value)).toBe(name)
  })

  it.each(['', '   ', 'a'.repeat(51), 'Jelle\u0000', 'Je\u200Blle'])('refuses %j', (value) => {
    expect(normaliseFirstName(value)).toBeUndefined()
  })
})

describe('revokeAccount', () => {
  it('knows no account for an address that has none', async () => {
    expect(await revokeAccount(database.db, 'niemand@example.org', start)).toEqual({ result: 'unknown' })
  })

  it('turns the account off, keeps the row and ends the sessions of that account only', async () => {
    await createAccount(database.db, 'jelle@example.org', 'editor', '', start)
    await createAccount(database.db, 'marijke@example.org', 'author', '', start)

    const [jelle, marijke] = await database.db.select().from(adminUsers).orderBy(adminUsers.id)
    const jellesSession = await startSession(database.db, jelle?.id ?? 0, start)
    const marijkesSession = await startSession(database.db, marijke?.id ?? 0, start)

    expect(await revokeAccount(database.db, 'jelle@example.org', start)).toEqual({ result: 'revoked', sessions: 1 })
    expect(await findSession(database.db, jellesSession, start)).toBeUndefined()
    expect(await findSession(database.db, marijkesSession, start)).toBeDefined()
    expect(
      await database.db.select({ disabledAt: adminUsers.disabledAt }).from(adminUsers).orderBy(adminUsers.id),
    ).toEqual([{ disabledAt: start }, { disabledAt: null }])
  })

  it('says so when the account was off already, and keeps the first time', async () => {
    await createAccount(database.db, 'jelle@example.org', 'editor', '', start)
    await revokeAccount(database.db, 'jelle@example.org', start)

    expect(await revokeAccount(database.db, 'jelle@example.org', new Date(start.getTime() + 1000))).toEqual({
      result: 'already-off',
      sessions: 0,
    })
    expect((await database.db.select().from(adminUsers))[0]?.disabledAt).toEqual(start)
  })
})
