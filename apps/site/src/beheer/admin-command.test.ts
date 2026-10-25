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
  it('makes an account and says so', async () => {
    expect(await run('create', 'Jelle@Example.org', 'beheerder')).toEqual({
      code: 0,
      said: 'Made the account for jelle@example.org, as beheerder.',
    })
    expect(await database.db.select({ email: adminUsers.email, role: adminUsers.role }).from(adminUsers)).toEqual([
      { email: 'jelle@example.org', role: 'beheerder' },
    ])
  })

  it('stops with 1 for an address that has an account, and changes nothing', async () => {
    await run('create', 'jelle@example.org', 'moderator')

    expect(await run('create', 'jelle@example.org', 'beheerder')).toEqual({
      code: 1,
      said: 'jelle@example.org has an account already. Nothing changed.',
    })
    expect((await database.db.select().from(adminUsers))[0]?.role).toBe('moderator')
  })

  it('turns an account that was revoked on again', async () => {
    await run('create', 'jelle@example.org', 'moderator')
    await run('revoke', 'jelle@example.org')

    expect((await run('create', 'jelle@example.org', 'beheerder')).code).toBe(0)
    expect(await database.db.select().from(adminUsers)).toMatchObject([{ disabledAt: null, role: 'beheerder' }])
  })

  it.each([
    [[]],
    [['create']],
    [['create', 'jelle@example.org']],
    [['create', 'jelle@example.org', 'admin']],
    [['create', 'geen-adres', 'beheerder']],
    [['create', 'jelle@example.org', 'beheerder', 'extra']],
    [['maak', 'jelle@example.org', 'beheerder']],
  ])('stops with 2 and the usage for %j, and makes nothing', async (args) => {
    const { code, said } = await run(...args)

    expect(code).toBe(2)
    expect(said).toContain('Usage:')
    expect(await database.db.select().from(adminUsers)).toEqual([])
  })
})

describe('admin revoke', () => {
  it('turns the account off and ends its sessions at once', async () => {
    await run('create', 'jelle@example.org', 'beheerder')

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

  it.each([[['revoke']], [['revoke', 'geen-adres']], [['revoke', 'jelle@example.org', 'beheerder']]])(
    'stops with 2 and the usage for %j',
    async (args) => {
      const { code, said } = await run(...args)

      expect(code).toBe(2)
      expect(said).toContain('Usage:')
    },
  )
})
