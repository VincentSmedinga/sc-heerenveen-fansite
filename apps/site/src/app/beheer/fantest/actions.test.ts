import type { TestDatabase } from '@fansite/db/test-database'

import { adminRoles, adminUsers, quizzes } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { emptyQuestion } from '#src/beheer/quiz-fields'
import { findQuiz } from '#src/beheer/quizzes'
import { sessionCookieName } from '#src/beheer/require-role'
import { startSession } from '#src/beheer/sessions'

import { submitNewQuiz, submitQuiz } from './actions'

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

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_FANTEST', 'on')
  jar.clear()
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM quizzes')
  await database.db.delete(adminUsers)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

async function logInAs(role: (typeof adminRoles)[number]) {
  await createAccount(database.db, `${role}@example.org`, role, '')

  const [user] = await database.db.select().from(adminUsers)

  jar.set(sessionCookieName, await startSession(database.db, user!.id))
}

const form = (entries: Record<string, string>) => {
  const formData = new FormData()

  for (const [name, value] of Object.entries(entries)) {
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

const blank = { errors: {}, values: { jaar: '', maand: '' } }
// A year far ahead, so the month is never over.
const create = (entries: Record<string, string> = { jaar: '2099', maand: '3' }) =>
  resultOf(() => submitNewQuiz(blank, form(entries)))
const save = (id: number, entries: Record<string, string>) =>
  resultOf(() =>
    submitQuiz(
      id,
      { errors: {}, values: { intro: '', slottekst: '', vragen: Array.from({ length: 10 }, emptyQuestion) } },
      form(entries),
    ),
  )
const firstId = async () => (await database.db.select().from(quizzes))[0]?.id ?? 0

describe('the actions of the Fantest', () => {
  it.each(adminRoles)('let the role %s make and write a quiz', async (role) => {
    await logInAs(role)

    expect(await create()).toMatchObject({
      redirect: expect.stringMatching(/^\/beheer\/fantest\/\d+\?gedaan=gemaakt$/u),
    })

    const id = await firstId()

    expect(await save(id, { intro: 'Hallo.' })).toEqual({ redirect: `/beheer/fantest/${id}?gedaan=opgeslagen` })
    expect((await findQuiz(database.db, id))?.values.intro).toBe('Hallo.')
  })

  it('return the errors and what was typed when a quiz cannot be published', async () => {
    await logInAs('editor')
    await create()

    const result = await save(await firstId(), { intro: 'Hallo.', knop: 'publiceren' })

    expect(result).toMatchObject({
      errors: { 'vraag-1': 'Schrijf de tekst van vraag 1.' },
      values: { intro: 'Hallo.' },
    })
    expect((await database.db.select().from(quizzes))[0]?.status).toBe('draft')
  })

  it('say that the questions were not saved for a form from before the lock', async () => {
    await logInAs('editor')
    await create()

    const id = await firstId()

    await database.db.update(quizzes).set({ participants: 1 })

    expect(await save(id, { intro: 'Te laat.' })).toMatchObject({
      redirect: expect.stringContaining('?gedaan=niet-bewaard&keer='),
    })
  })

  it('give a save without changes an address of its own', async () => {
    await logInAs('editor')
    await create()

    const id = await firstId()

    expect(await save(id, {})).toMatchObject({
      redirect: expect.stringMatching(new RegExp(`^/beheer/fantest/${id}\\?gedaan=ongewijzigd&keer=\\d+$`, 'u')),
    })
  })

  it('lead to the place a question moved to', async () => {
    await logInAs('editor')
    await create()

    const id = await firstId()

    expect(await save(id, { knop: 'omlaag-2', 'vraag-2': 'Testvraag?' })).toEqual({
      redirect: `/beheer/fantest/${id}?gedaan=verplaatst&vraag=3`,
    })
  })

  it('ask for a month and a year', async () => {
    await logInAs('editor')

    expect(await create({ jaar: 'x', maand: '13' })).toEqual({
      errors: { jaar: 'Kies een jaar.', maand: 'Kies een maand.' },
      values: { jaar: 'x', maand: '13' },
    })
  })

  it('lead to the list for a quiz that is not there', async () => {
    await logInAs('editor')

    expect(await save(999_999, {})).toEqual({ redirect: '/beheer/fantest?fout=weg' })
  })

  it.each([
    ['the Fantest', 'FANS_FANTEST'],
    ['the accounts', 'FANS_ACCOUNTS'],
  ])('say "niet gevonden" and change nothing with %s off', async (_what, variable) => {
    await logInAs('owner')
    vi.stubEnv(variable, 'off')

    await expect(create()).rejects.toThrow('not found')
    await expect(save(1, {})).rejects.toThrow('not found')
    expect(await database.db.select().from(quizzes)).toHaveLength(0)
  })
})
