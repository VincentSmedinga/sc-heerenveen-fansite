import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, quizzes } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { renderToStaticMarkup } from 'react-dom/server'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import { createAccount } from '#src/beheer/accounts'
import { createQuiz, saveQuiz } from '#src/beheer/quizzes'
import { loadArchive, loadQuiz } from '#src/fans/fantest'

import QuizPage from './[id]/page'
import PreviewPage from './[id]/voorbeeld/page'
import NewQuizPage from './nieuw/page'
import QuizzesPage from './page'

const { requireRole } = vi.hoisted(() => ({ requireRole: vi.fn() }))

vi.mock('#src/database', () => ({ getDatabase: () => database }))
vi.mock('#src/beheer/require-role', () => ({ requireRole }))
vi.mock('next/navigation', () => ({
  notFound: () => {
    throw new Error('not found')
  },
  redirect: (url: string) => {
    throw new Error(`redirect to ${url}`)
  },
}))

let database: TestDatabase
let id: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  vi.stubEnv('FANS_ACCOUNTS', 'on')
  vi.stubEnv('FANS_FANTEST', 'on')
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM quizzes')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'sanne@example.org', 'editor', '')

  const userId = (await database.db.select().from(adminUsers))[0]!.id

  requireRole.mockResolvedValue({ email: 'sanne@example.org', role: 'editor', userId })

  const made = await createQuiz(database.db, userId, { month: 3, year: 2099 })

  id = made.status === 'created' ? made.id : 0
  await saveQuiz(
    database.db,
    userId,
    id,
    {
      intro: 'Eerste regel.\nTweede regel.',
      slottekst: 'Het slot.',
      vragen: Array.from({ length: 10 }, (_, index) => ({
        allesGoed: false,
        antwoorden: ['Appel', 'Peer', 'Pruim', 'Kers'] as [string, string, string, string],
        goed: '2',
        tekst: `Testvraag ${index + 1}?`,
      })),
    },
    { kind: 'publish' },
  )
})

afterEach(() => {
  vi.unstubAllEnvs()
})

const params = (value = String(id)) => Promise.resolve({ id: value })
const none = Promise.resolve({})

describe('the pages of the Fantest in the admin', () => {
  it('list the quizzes of the editors with the month and the status, and not the archive', async () => {
    await database.db.insert(quizzes).values({ month: 5, source: 'oude-fansite', status: 'published', year: 2003 })

    const html = renderToStaticMarkup(await QuizzesPage({ searchParams: none }))

    expect(html).toContain('Maart 2099')
    expect(html).toContain('Gepubliceerd')
    expect(html).not.toContain('2003')
  })

  it('give every field of the ten questions a label of its own', async () => {
    const html = renderToStaticMarkup(await QuizPage({ params: params(), searchParams: none }))

    for (const label of ['Tekst van vraag 10', 'Antwoord 4 van vraag 10', 'Goed antwoord van vraag 10']) {
      expect(html).toContain(`>${label}</label>`)
    }
    expect(html).toContain('Nakijken van vraag 10')
    expect(html).toContain('Vraag 2 omhoog')
    expect(html).not.toContain('Vraag 1 omhoog')
  })

  it('show a locked quiz with only the closing text and "alles goed" to change', async () => {
    await database.db.update(quizzes).set({ participants: 2 }).where(eq(quizzes.id, id))

    const html = renderToStaticMarkup(await QuizPage({ params: params(), searchParams: none }))

    expect(html).toContain('name="slottekst"')
    expect(html).toContain('name="vraag-1-alles-goed"')
    expect(html).not.toContain('name="vraag-1"')
    expect(html).not.toContain('name="intro"')
    expect(html).not.toContain('omlaag')
    expect(html).toContain('Peer (goed antwoord)')
  })

  it('preview the quiz as a supporter sees it, without a form and without the right answers', async () => {
    const html = renderToStaticMarkup(await PreviewPage({ params: params() }))

    expect(html).toContain('Fantest maart 2099')
    expect(html).toContain('Tweede regel.')
    expect(html).toContain('Vraag 10 van 10')
    expect(html).not.toContain('<form')
    expect(html).not.toContain('goed antwoord')
    expect(html).not.toContain('checked')
  })

  it('keeps a quiz of the editors out of the public archive, so no right answer leaves the server', async () => {
    expect(await loadArchive(database.db)).toEqual([])
    expect(await loadQuiz(database.db, 2099, 3)).toBeUndefined()
  })

  it('say "niet gevonden" for a number that is no quiz of the editors', async () => {
    await expect(QuizPage({ params: params('999999'), searchParams: none })).rejects.toThrow('not found')
    await expect(PreviewPage({ params: params('abc') })).rejects.toThrow('not found')
  })

  it('say "niet gevonden" while the Fantest is off', async () => {
    vi.stubEnv('FANS_FANTEST', 'off')

    await expect(QuizzesPage({ searchParams: none })).rejects.toThrow('not found')
    await expect(NewQuizPage()).rejects.toThrow('not found')
    await expect(QuizPage({ params: params(), searchParams: none })).rejects.toThrow('not found')
    await expect(PreviewPage({ params: params() })).rejects.toThrow('not found')
  })
})
