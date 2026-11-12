import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { runAdminCommand } from './admin-command'
import { findSession, startSession } from './sessions'

const start = new Date('2026-10-26T10:00:00Z')

let database: TestDatabase
const log = vi.spyOn(console, 'log').mockImplementation(() => undefined)
const error = vi.spyOn(console, 'error').mockImplementation(() => undefined)

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.db.delete(adminUsers)
  log.mockClear()
  error.mockClear()
})

/** Runs a command and returns the exit code and what it said. */
async function run(...args: string[]) {
  log.mockClear()
  error.mockClear()

  const code = await runAdminCommand(database.db, args, start)

  return { code, said: [...log.mock.calls, ...error.mock.calls].map(([line]) => String(line)).join('\n') }
}

describe('admin create', () => {
  it('makes an account with a first name and says so', async () => {
    expect(await run('create', 'Jelle@Example.org', 'editor', 'Jelle')).toEqual({
      code: 0,
      said: 'Made the account for jelle@example.org, as editor, with the first name Jelle.',
    })
    expect(
      await database.db
        .select({ email: adminUsers.email, firstName: adminUsers.firstName, role: adminUsers.role })
        .from(adminUsers),
    ).toEqual([{ email: 'jelle@example.org', firstName: 'Jelle', role: 'editor' }])
  })

  it('takes a first name of more words, with or without quotes', async () => {
    expect((await run('create', 'jelle@example.org', 'author', 'Jan', 'Willem')).code).toBe(0)
    expect((await database.db.select().from(adminUsers))[0]?.firstName).toBe('Jan Willem')
  })

  it('stops with 2 for a new account without a first name, and makes nothing', async () => {
    const { code, said } = await run('create', 'jelle@example.org', 'owner')

    expect(code).toBe(2)
    expect(said).toContain('needs a first name')
    expect(await database.db.select().from(adminUsers)).toEqual([])
  })

  it('makes an account that exists the owner, which is how the owner gets the role', async () => {
    await run('create', 'jelle@example.org', 'editor', 'Jelle')

    expect(await run('create', 'jelle@example.org', 'owner')).toEqual({
      code: 0,
      said: 'The account for jelle@example.org is owner now.',
    })
    expect(await database.db.select().from(adminUsers)).toMatchObject([{ firstName: 'Jelle', role: 'owner' }])
  })

  it('stops with 1 for an account that has the role already, and changes nothing', async () => {
    await run('create', 'jelle@example.org', 'author', 'Jelle')

    expect(await run('create', 'jelle@example.org', 'author')).toEqual({
      code: 1,
      said: 'jelle@example.org has an account as author already. Nothing changed.',
    })
  })

  it('turns an account that was revoked on again', async () => {
    await run('create', 'jelle@example.org', 'author', 'Jelle')
    await run('revoke', 'jelle@example.org')

    expect((await run('create', 'jelle@example.org', 'editor')).code).toBe(0)
    expect(await database.db.select().from(adminUsers)).toMatchObject([{ disabledAt: null, role: 'editor' }])
  })

  it.each([
    [[]],
    [['create']],
    [['create', 'jelle@example.org']],
    [['create', 'jelle@example.org', 'admin', 'Jelle']],
    [['create', 'jelle@example.org', 'beheerder', 'Jelle']],
    [['create', 'geen-adres', 'editor', 'Jelle']],
    [['create', 'jelle@example.org', 'editor', 'x'.repeat(51)]],
    [['maak', 'jelle@example.org', 'editor', 'Jelle']],
  ])('stops with 2 and the usage for %j, and makes nothing', async (args) => {
    const { code, said } = await run(...args)

    expect(code).toBe(2)
    expect(said).toContain('Usage:')
    expect(await database.db.select().from(adminUsers)).toEqual([])
  })
})

describe('admin revoke', () => {
  it('turns the account off and ends its sessions at once', async () => {
    await run('create', 'jelle@example.org', 'editor', 'Jelle')

    const [account] = await database.db.select().from(adminUsers)
    const session = await startSession(database.db, account?.id ?? 0, start)

    expect(await findSession(database.db, session, start)).toBeDefined()
    expect(await run('revoke', 'JELLE@example.org')).toEqual({
      code: 0,
      said: 'Turned off the account for jelle@example.org and ended 1 session.',
    })
    expect(await findSession(database.db, session, start)).toBeUndefined()
  })

  it('stops with 1 for an address without an account', async () => {
    expect(await run('revoke', 'niemand@example.org')).toEqual({
      code: 1,
      said: 'There is no account for niemand@example.org.',
    })
  })

  it.each([[['revoke']], [['revoke', 'geen-adres']], [['revoke', 'jelle@example.org', 'editor']]])(
    'stops with 2 and the usage for %j',
    async (args) => {
      const { code, said } = await run(...args)

      expect(code).toBe(2)
      expect(said).toContain('Usage:')
    },
  )
})
