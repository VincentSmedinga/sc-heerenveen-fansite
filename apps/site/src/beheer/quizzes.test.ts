import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, auditLog, quizQuestions, quizzes } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import { createAccount } from './accounts'
import { emptyQuestion, type QuizValues } from './quiz-fields'
import { createQuiz, findQuiz, listQuizzes, monthPassed, saveQuiz } from './quizzes'

let database: TestDatabase
let userId: number

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  await database?.drop()
})

beforeEach(async () => {
  await database.pool.query('DELETE FROM audit_log')
  await database.pool.query('DELETE FROM quizzes')
  await database.db.delete(adminUsers)
  await createAccount(database.db, 'jelle@example.org', 'author', '')
  userId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
})

// 25 November 2026, in the Netherlands.
const now = new Date('2026-11-25T12:00:00Z')

const complete = (): QuizValues => ({
  intro: 'Een nieuwe maand.',
  slottekst: 'Tot de volgende keer.',
  vragen: Array.from({ length: 10 }, (_, index) => ({
    allesGoed: false,
    antwoorden: ['a', 'b', 'c', 'd'] as [string, string, string, string],
    goed: '2',
    tekst: `Testvraag ${index + 1}?`,
  })),
})

async function draft(month = 12, year = 2026) {
  const outcome = await createQuiz(database.db, userId, { month, year }, now)

  if (outcome.status !== 'created') {
    throw new Error('no quiz')
  }

  return outcome.id
}

const save = (id: number, values: QuizValues, kind: 'publish' | 'save' = 'save', moment = now) =>
  saveQuiz(database.db, userId, id, values, { kind }, moment)

const quiz = async (id: number) => (await findQuiz(database.db, id))!
const log = () => database.db.select().from(auditLog).orderBy(auditLog.id)
const fillIn = (id: number) => database.db.update(quizzes).set({ participants: 1 }).where(eq(quizzes.id, id))

describe('monthPassed', () => {
  it('closes a month at midnight in the Netherlands after its last day', () => {
    // 30 November 2026 at 23:59 and at 00:00 the next day, Dutch time (UTC+1).
    expect(monthPassed(2026, 11, new Date('2026-11-30T22:59:59Z'))).toBe(false)
    expect(monthPassed(2026, 11, new Date('2026-11-30T23:00:00Z'))).toBe(true)
    expect(monthPassed(2027, 1, now)).toBe(false)
    expect(monthPassed(2025, 12, now)).toBe(true)
  })
})

describe('createQuiz', () => {
  it('makes an empty draft with ten questions and writes who did it', async () => {
    const id = await draft()

    expect(await quiz(id)).toMatchObject({ locked: false, month: 12, status: 'draft', year: 2026 })
    expect(await database.db.select().from(quizQuestions)).toHaveLength(10)
    expect(await log()).toMatchObject([{ action: 'quiz.create', detail: 'Fantest december 2026', itemId: id, userId }])
  })

  it('keeps one quiz for each month and says so at the month', async () => {
    await draft()

    expect(await createQuiz(database.db, userId, { month: 12, year: 2026 }, now)).toEqual({
      errors: { maand: 'December 2026 heeft al een quiz. Kies een andere maand.' },
      status: 'invalid',
    })
    expect(await log()).toHaveLength(1)
  })

  it('refuses a month that is over, and takes the month of today', async () => {
    expect(await createQuiz(database.db, userId, { month: 10, year: 2026 }, now)).toMatchObject({ status: 'invalid' })
    expect(await createQuiz(database.db, userId, { month: 11, year: 2026 }, now)).toMatchObject({ status: 'created' })
  })
})

describe('listQuizzes and findQuiz', () => {
  it('show the quizzes of the editors only, the newest month first', async () => {
    const [{ insertId: old }] = await database.db
      .insert(quizzes)
      .values({ month: 5, source: 'oude-fansite', status: 'published', year: 2003 })
    const december = await draft(12)
    const january = await draft(1, 2027)

    expect((await listQuizzes(database.db)).map(({ id }) => id)).toEqual([january, december])
    expect(await findQuiz(database.db, old)).toBeUndefined()
    expect(await save(old, complete())).toEqual({ status: 'missing' })
  })
})

describe('saveQuiz', () => {
  it('saves an unfinished draft and logs which parts changed', async () => {
    const id = await draft()
    const values = complete()

    values.vragen = values.vragen.map((question, index) => (index === 0 ? question : emptyQuestion()))

    expect(await save(id, values)).toEqual({ status: 'saved' })
    expect((await quiz(id)).values).toEqual(values)
    expect((await log()).at(-1)).toMatchObject({
      action: 'quiz.edit',
      detail: 'Fantest december 2026; inleiding; slottekst; vraag 1',
    })
  })

  it('writes nothing when nothing changed', async () => {
    const id = await draft()

    await save(id, complete())

    expect(await save(id, complete())).toEqual({ status: 'unchanged' })
    expect(await log()).toHaveLength(2)
  })

  it('publishes ten complete questions', async () => {
    const id = await draft()

    expect(await save(id, complete(), 'publish')).toEqual({ status: 'published' })
    expect((await quiz(id)).status).toBe('published')
    expect((await log()).at(-1)).toMatchObject({ action: 'quiz.publish', itemId: id, userId })
  })

  it.each([
    ['a question without text', { tekst: '' }, 'vraag-10'],
    ['a question with three answers', { antwoorden: ['a', 'b', 'c', ''] }, 'vraag-10-antwoord-4'],
    ['a question without the right answer', { goed: '' }, 'vraag-10-goed'],
  ])('does not publish %s, and stores nothing', async (_what, change, field) => {
    const id = await draft()
    const values = complete()

    values.vragen[9] = { ...values.vragen[9]!, ...(change as object) }

    expect(await save(id, values, 'publish')).toMatchObject({
      errors: { [field]: expect.any(String) },
      status: 'invalid',
    })
    expect(await quiz(id)).toMatchObject({ status: 'draft', values: { intro: '' } })
  })

  it('does not publish after the month is over', async () => {
    const id = await draft()
    const after = new Date('2026-12-31T23:00:00Z')

    expect(await save(id, complete(), 'publish', after)).toMatchObject({
      errors: { maand: 'December 2026 is al voorbij, dus deze quiz kun je niet meer publiceren.' },
      status: 'invalid',
    })
    expect((await quiz(id)).status).toBe('draft')
  })

  it('still changes a published quiz that nobody filled in, but keeps it complete', async () => {
    const id = await draft()

    await save(id, complete(), 'publish')

    const changed = complete()

    changed.vragen[0] = { ...changed.vragen[0]!, tekst: 'Anders?' }

    expect(await save(id, changed)).toEqual({ status: 'saved' })

    changed.vragen[0] = { ...changed.vragen[0]!, tekst: '' }

    expect(await save(id, changed)).toMatchObject({ status: 'invalid' })
    expect((await quiz(id)).values.vragen[0]?.tekst).toBe('Anders?')
  })

  it('locks everything but the closing text and "alles goed" once somebody filled it in', async () => {
    const id = await draft()

    await save(id, complete(), 'publish')
    await fillIn(id)

    const sent = complete()

    sent.intro = 'Anders'
    sent.slottekst = 'Een nieuw slot.'
    sent.vragen = sent.vragen.map((question) => ({
      ...question,
      antwoorden: ['w', 'x', 'y', 'z'],
      goed: '4',
      tekst: 'Anders?',
    }))
    sent.vragen[3] = { ...sent.vragen[3]!, allesGoed: true }

    // The sent form also changes locked parts, so the editor hears that those are not taken.
    expect(await saveQuiz(database.db, userId, id, sent, { kind: 'save' }, now, true)).toEqual({ status: 'refused' })

    const stored = await quiz(id)
    const expected = complete()

    expected.slottekst = 'Een nieuw slot.'
    expected.vragen[3] = { ...expected.vragen[3]!, allesGoed: true }

    expect(stored.locked).toBe(true)
    expect(stored.values).toEqual(expected)
    expect((await log()).at(-1)).toMatchObject({
      detail: 'Fantest december 2026; slottekst; alles goed aan bij vraag 4',
    })
  })

  it('says locked for the form of a locked quiz, and refused for an old form without other changes', async () => {
    const id = await draft()

    await save(id, complete(), 'publish')
    await fillIn(id)

    const empty = { intro: '', vragen: Array.from({ length: 10 }, emptyQuestion) }

    expect(await save(id, { ...empty, slottekst: 'Nieuw.' })).toEqual({ status: 'locked' })
    expect(await save(id, { ...empty, slottekst: 'Nieuw.' })).toEqual({ status: 'unchanged' })

    const send = (values: QuizValues) => saveQuiz(database.db, userId, id, values, { kind: 'save' }, now, true)
    const old = { ...complete(), slottekst: 'Nieuw.' }
    const emptied = { ...old, intro: '' }
    const unchosen = { ...old, vragen: old.vragen.map((question) => ({ ...question, goed: '' })) }

    // An old form with the stored questions changes nothing that is locked.
    expect(await send({ ...old, intro: 'Een nieuwe maand.' })).toEqual({ status: 'unchanged' })
    expect(await send(emptied)).toEqual({ status: 'refused' })
    expect(await send({ ...unchosen, intro: 'Een nieuwe maand.' })).toEqual({ status: 'refused' })
    expect((await quiz(id)).values.intro).toBe('Een nieuwe maand.')
  })

  it('puts the error about the month first, in the order of the page', async () => {
    const id = await draft()
    const values = complete()

    values.slottekst = 'x'.repeat(2001)
    values.vragen[0] = { ...values.vragen[0]!, tekst: '' }

    const outcome = await save(id, values, 'publish', new Date('2027-01-01T12:00:00Z'))

    expect(Object.keys(outcome.status === 'invalid' ? outcome.errors : {})).toEqual(['maand', 'vraag-1', 'slottekst'])
  })

  it('gives back the stored questions with an error on a locked quiz', async () => {
    const id = await draft()

    await save(id, complete(), 'publish')
    await fillIn(id)

    const sent = { intro: '', slottekst: 'x'.repeat(2001), vragen: Array.from({ length: 10 }, emptyQuestion) }

    expect(await save(id, sent)).toMatchObject({
      status: 'invalid',
      values: { intro: 'Een nieuwe maand.', slottekst: sent.slottekst, vragen: complete().vragen },
    })
  })

  it('does not move a question of a locked quiz', async () => {
    const id = await draft()

    await save(id, complete(), 'publish')
    await fillIn(id)

    expect(await saveQuiz(database.db, userId, id, complete(), { from: 1, kind: 'move', to: 2 }, now)).toEqual({
      status: 'refused',
    })
    expect((await quiz(id)).values.vragen[0]?.tekst).toBe('Testvraag 1?')
  })

  it('moves a question one place and saves the rest of the form with it', async () => {
    const id = await draft()

    expect(await saveQuiz(database.db, userId, id, complete(), { from: 2, kind: 'move', to: 1 }, now)).toEqual({
      status: 'moved',
    })
    expect((await quiz(id)).values.vragen.slice(0, 2).map(({ tekst }) => tekst)).toEqual([
      'Testvraag 2?',
      'Testvraag 1?',
    ])
  })
})
