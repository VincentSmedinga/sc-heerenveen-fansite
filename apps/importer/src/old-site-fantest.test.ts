import { quizQuestions, quizzes } from '@fansite/db/schema'
import { createTestDatabase, type TestDatabase } from '@fansite/db/test-database'
import { eq } from 'drizzle-orm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import type { OldSiteFantestMonth } from './old-site-file.ts'

import { importOldSiteFantest } from './old-site-fantest.ts'

let database: TestDatabase

beforeEach(async () => {
  database = await createTestDatabase()
})

afterEach(async () => {
  // Undefined when the server wasn't there, which beforeEach has already reported.
  await database?.drop()
})

const on = { FANS_ACCOUNTS: 'on', FANS_FANTEST: 'on' }

const month = (extra: Partial<OldSiteFantestMonth> = {}): OldSiteFantestMonth => ({
  average: 4.1,
  month: 5,
  omitted: 1,
  participants: 38,
  questions: [1, 3].map((order) => ({
    answers: ['a', 'b', 'c', 'd'] as [string, string, string, string],
    correct: 1,
    order,
    percentages: [10, 60, 20, 10] as [number, number, number, number],
    text: `Vraag ${order}?`,
  })),
  year: 2003,
  ...extra,
})

describe('importOldSiteFantest', () => {
  it('makes the quiz with its questions, in tenths, with the places of the old quiz and the right answer from 1', async () => {
    const report = await importOldSiteFantest(database.db, [month()], on)

    expect(report).toMatchObject({ changed: 0, created: 3, skipped: 0 })

    const [quiz] = await database.db.select().from(quizzes)

    expect(quiz).toMatchObject({
      averageScoreTenths: 41,
      month: 5,
      participants: 38,
      source: 'oude-fansite',
      status: 'published',
      year: 2003,
    })

    const questions = await database.db.select().from(quizQuestions).orderBy(quizQuestions.position)

    expect(questions.map((row) => [row.position, row.correctAnswer])).toEqual([
      [1, 2],
      [3, 2],
    ])
    expect(questions[0]).toMatchObject({ answers: ['a', 'b', 'c', 'd'], percentages: [10, 60, 20, 10] })
  })

  it('changes nothing the second time', async () => {
    await importOldSiteFantest(database.db, [month()], on)

    expect(await importOldSiteFantest(database.db, [month()], on)).toMatchObject({
      changed: 0,
      created: 0,
      unchanged: 3,
    })
  })

  it('writes only what differs, and removes a question and a month the files no longer have', async () => {
    await importOldSiteFantest(database.db, [month(), month({ month: 6 })], on)

    const changed = month({ average: 4.4 })

    changed.questions = [{ ...changed.questions[0]!, text: 'Anders?' }]

    const report = await importOldSiteFantest(database.db, [changed], on)

    // The quiz of May changed, one question changed, one went; the quiz of June went.
    expect(report.changed).toBe(4)
    expect(await database.db.select().from(quizzes)).toHaveLength(1)
    expect(await database.db.select().from(quizQuestions)).toHaveLength(1)
    expect((await database.db.select().from(quizQuestions))[0]?.text).toBe('Anders?')
  })

  it('keeps a month without participants without an average and without percentages', async () => {
    const empty = month({ average: null, participants: 0 })

    empty.questions = empty.questions.map((question) => ({ ...question, percentages: null }))
    await importOldSiteFantest(database.db, [empty], on)

    expect((await database.db.select().from(quizzes))[0]).toMatchObject({
      averageScoreTenths: null,
      participants: 0,
    })
    expect((await database.db.select().from(quizQuestions))[0]?.percentages).toBeNull()
  })

  it('leaves the quizzes of the editors alone', async () => {
    await database.db.insert(quizzes).values({ month: 1, source: 'redactie', status: 'draft', year: 2027 })
    await importOldSiteFantest(database.db, [month()], on)

    expect(await database.db.select().from(quizzes).where(eq(quizzes.source, 'redactie'))).toHaveLength(1)
  })

  it('does nothing and says so with the Fantest off, and with accounts off', async () => {
    for (const settings of [{ ...on, FANS_FANTEST: 'off' }, { ...on, FANS_ACCOUNTS: 'off' }, {}]) {
      const report = await importOldSiteFantest(database.db, [month()], settings)

      expect(report).toMatchObject({ changed: 0, created: 0, unchanged: 0 })
      expect(report.lines).toEqual(['the Fantest is switched off, so nothing was done'])
    }
    expect(await database.db.select().from(quizzes)).toHaveLength(0)
  })
})
