import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc } from 'drizzle-orm'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { accountName } from './account-name'
import { createAccount } from './accounts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

describe('accountName', () => {
  it('is the first name of an account, or its address while it has none', async () => {
    await createAccount(database.db, 'sanne@example.test', 'editor', 'Sanne')
    await createAccount(database.db, 'jelle@example.test', 'author', '')

    expect(
      await database.db
        .select({ name: accountName(adminUsers) })
        .from(adminUsers)
        .orderBy(asc(adminUsers.id)),
    ).toEqual([{ name: 'Sanne' }, { name: 'jelle@example.test' }])
  })
})
