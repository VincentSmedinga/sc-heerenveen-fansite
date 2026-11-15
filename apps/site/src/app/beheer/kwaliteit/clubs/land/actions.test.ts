import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, auditLog, clubs } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { sessionCookieName } from '#src/beheer/require-role'
import { startSession } from '#src/beheer/sessions'

import { submitClubCountry, submitClubCountryFromList } from './actions'

const { jar } = vi.hoisted(() => ({ jar: new Map<string, string>() }))

vi.mock('next/headers', () => ({
  cookies: () =>
    Promise.resolve({ get: (name: string) => (jar.has(name) ? { name, value: jar.get(name) } : undefined) }),
}))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`)
  },
}))
vi.mock('#src/database', () => ({ getDatabase: () => database }))

let database: TestDatabase
let userId: number
let authorId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  jar.clear()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM matches')
  await database.pool.query('DELETE FROM clubs')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')
  await createAccount(database.db, 'jelle@example.org', 'author', '')
  userId = (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'sanne@example.org')))[0]?.id ?? 0
  authorId = (await database.db.select().from(adminUsers).where(eq(adminUsers.email, 'jelle@example.org')))[0]?.id ?? 0
  jar.set(sessionCookieName, await startSession(database.db, userId))
  await database.db.insert(clubs).values({ name: 'Oefenstad FC', slug: 'oefenstad-fc' })
})

const form = (land: string) => {
  const formData = new FormData()

  formData.set('land', land)

  return formData
}
const save = (land: string, slug = 'oefenstad-fc') => submitClubCountry(slug, {}, form(land))
const saveFromList = (land: string, slug = 'oefenstad-fc') => submitClubCountryFromList(slug, {}, form(land))
const club = async () => (await database.db.select().from(clubs))[0]

describe('the country of a club', () => {
  it('saves a country with the source manual and writes it in the log', async () => {
    expect(await save('DE')).toEqual({ saved: 'DE' })
    expect(await club()).toMatchObject({ country: 'DE', countrySource: 'manual' })
    expect((await database.db.select().from(auditLog))[0]).toMatchObject({
      action: 'club.edit',
      detail: 'Oefenstad FC, land van de club: geen → Duitsland',
      userId,
    })
  })

  it('takes the country away with Onbekend, which leaves no source behind', async () => {
    await database.db.update(clubs).set({ country: 'DE', countrySource: 'manual' })

    expect(await save('')).toEqual({ saved: '' })
    expect(await club()).toMatchObject({ country: null, countrySource: null })
  })

  it('refuses a code that is not in the list, with the choice kept', async () => {
    expect(await save('XX')).toEqual({ error: 'Kies een land uit de lijst.', land: 'XX' })
    expect(await club()).toMatchObject({ country: null })
  })

  it('refuses a request without a country', async () => {
    expect(await submitClubCountry('oefenstad-fc', {}, new FormData())).toEqual({
      error: 'Kies een land uit de lijst.',
    })
  })

  it('says so when the club is gone', async () => {
    expect(await save('DE', 'bestaat-niet')).toMatchObject({ error: expect.stringContaining('bestaat niet meer') })
  })

  it('is for an editor only', async () => {
    jar.set(sessionCookieName, await startSession(database.db, authorId))

    await expect(save('DE')).rejects.toThrow()
    expect(await club()).toMatchObject({ country: null })
  })
})

describe('the country of a club from the work list', () => {
  it('saves like the page of the club', async () => {
    expect(await saveFromList('NL')).toEqual({ saved: 'NL' })
    expect(await club()).toMatchObject({ country: 'NL', countrySource: 'manual' })
  })

  it('does not take "Kies een land" for an answer', async () => {
    expect(await saveFromList('')).toEqual({ error: 'Kies een land uit de lijst.', land: '' })
    expect(await database.db.select().from(auditLog)).toEqual([])
  })
})
