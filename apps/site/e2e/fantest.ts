import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { quizEntries, quizQuestions, quizzes, supporters } from '@fansite/db/schema'
import { and, eq, inArray, like } from 'drizzle-orm'
import path from 'node:path'

/**
 * The made-up quizzes of the Fantest: one of the editors for the running month and one for
 * 2099, three closed months of 2025 with the answers of made-up supporters, for the ranking
 * (#1483) and the pages of a closed month (#1484), and two so the pages of the archive have
 * something to show (#1480): June 2003 with ten questions and the figures of 38 visitors, and
 * September 2003 with a question left out and only three visitors, so the percentages and the
 * average stay away. A month of 2003 or the running month that a development database already
 * has keeps its quiz. A quiz of the editors for 2099 or for January to March 2025 is replaced.
 * The checks put the rows in before the first test and take only these rows out after the last
 * one.
 */
const months = [
  { average: 41, missing: [], month: 6, participants: 38 },
  { average: 30, missing: [4], month: 9, participants: 3 },
] as const

/** The month of the made-up quiz of the editors, far ahead, so it is never over. */
const editorsMonth = { month: 1, year: 2099 }

/** Puts the quizzes in and returns the function that takes them out again. */
export async function addFantest() {
  const { close, db } = connectToDatabase()
  const added: number[] = []

  try {
    for (const { average, missing, month, participants } of months) {
      const [existing] = await db
        .select({ id: quizzes.id })
        .from(quizzes)
        .where(and(eq(quizzes.year, 2003), eq(quizzes.month, month)))
        .limit(1)

      if (existing !== undefined) {
        continue
      }

      const [{ insertId }] = await db.insert(quizzes).values({
        averageScoreTenths: average,
        month,
        participants,
        source: 'oude-fansite',
        status: 'published',
        year: 2003,
      })
      const enough = participants >= 5

      await db.insert(quizQuestions).values(
        Array.from({ length: 10 }, (_, index) => index + 1)
          .filter((position) => !(missing as readonly number[]).includes(position))
          .map((position) => ({
            answers: ['Testantwoord A', 'Testantwoord B', 'Testantwoord C', 'Testantwoord D'] as [
              string,
              string,
              string,
              string,
            ],
            correctAnswer: (position % 4) + 1,
            percentages: enough ? ([10, 20, 60, 10] as [number, number, number, number]) : null,
            position,
            quizId: insertId,
            text: `Testvraag ${position} over Testclub?`,
          })),
      )
      added.push(insertId)
    }

    added.push(await addEditorsQuiz(db, editorsMonth))
    added.push(...(await addRankedMonths(db)))
    // The quiz of the running month, which a supporter takes part in (#1482). A month that has
    // one keeps it.
    const running = currentMonth()
    const [taken] = await db
      .select({ id: quizzes.id })
      .from(quizzes)
      .where(and(eq(quizzes.year, running.year), eq(quizzes.month, running.month)))

    if (taken === undefined) {
      added.push(await addEditorsQuiz(db, running))
    }
  } finally {
    await close()
  }

  return async () => {
    const connection = connectToDatabase()

    try {
      for (const id of added) {
        // The questions and the entries go with the quiz.
        await connection.db.delete(quizzes).where(eq(quizzes.id, id))
      }

      await connection.db.delete(supporters).where(like(supporters.email, rankedAddresses))
    } finally {
      await connection.close()
    }
  }
}

/** The number of the made-up quiz of the editors, for its pages in the admin (#1481). */
export async function editorsQuizId() {
  const { close, db } = connectToDatabase()

  try {
    const [row] = await db
      .select({ id: quizzes.id })
      .from(quizzes)
      .where(and(eq(quizzes.year, editorsMonth.year), eq(quizzes.month, editorsMonth.month)))

    if (row === undefined) {
      throw new Error('There is no made-up quiz of the editors in the database. Did the global setup run?')
    }

    return row.id
  } finally {
    await close()
  }
}

/** The made-up supporters of the ranking and the closed months they took part in (#1483). */
const rankedFans = ['Testfan Aukje', 'Testfan Bouke', 'Testfan Douwe', 'Testfan Froukje', 'Testfan Gerben']
const rankedAddresses = 'ranglijst-%@example.test'
const rankedMonths = [
  { month: 1, scores: [8, 6, 6], year: 2025 },
  { month: 2, scores: [7, 9], year: 2025 },
  // Five took part, so this month shows its average and percentages (#1484).
  { month: 3, scores: [10, 8, 7, 5, 4], year: 2025 },
]

/** A published quiz of the editors with ten made-up questions, which nobody filled in. */
async function addEditorsQuiz(db: ReturnType<typeof connectToDatabase>['db'], when: { month: number; year: number }) {
  // One that a check that stopped halfway left behind goes first.
  await db
    .delete(quizzes)
    .where(and(eq(quizzes.year, when.year), eq(quizzes.month, when.month), eq(quizzes.source, 'redactie')))

  const [{ insertId }] = await db.insert(quizzes).values({
    ...when,
    closingText: 'Een verzonnen slottekst.',
    intro: 'Een verzonnen inleiding over Testclub.',
    source: 'redactie',
    status: 'published',
  })

  await db.insert(quizQuestions).values(
    Array.from({ length: 10 }, (_, index) => ({
      answers: ['Testantwoord A', 'Testantwoord B', 'Testantwoord C', 'Testantwoord D'] as [
        string,
        string,
        string,
        string,
      ],
      correctAnswer: (index % 4) + 1,
      position: index + 1,
      quizId: insertId,
      text: `Redactievraag ${index + 1} over Testclub?`,
    })),
  )

  return insertId
}

/**
 * Closed months of the editors with the answers of made-up supporters, so the ranking has
 * tables to show.
 */
async function addRankedMonths(db: ReturnType<typeof connectToDatabase>['db']) {
  // What a check that stopped halfway left behind goes first.
  await db.delete(supporters).where(like(supporters.email, rankedAddresses))
  await db.insert(supporters).values(
    rankedFans.map((screenName, index) => ({
      email: `ranglijst-${index}@example.test`,
      screenName,
      screenNameKey: screenName.toLowerCase(),
    })),
  )

  const fans = await db
    .select({ id: supporters.id })
    .from(supporters)
    .where(inArray(supporters.screenName, rankedFans))
    .orderBy(supporters.id)
  const added: number[] = []

  for (const { month, scores, year } of rankedMonths) {
    const quizId = await addEditorsQuiz(db, { month, year })

    for (const [index, score] of scores.entries()) {
      await db.insert(quizEntries).values({
        // The first `score` answers are the right ones of `addEditorsQuiz`, the rest are not.
        answers: Array.from({ length: 10 }, (_, place) => ((place + (place < score ? 0 : 1)) % 4) + 1),
        quizId,
        score,
        submittedAt: new Date(Date.UTC(year, month - 1, 15)),
        supporterId: fans[index]?.id,
      })
    }

    await db.update(quizzes).set({ participants: scores.length }).where(eq(quizzes.id, quizId))
    added.push(quizId)
  }

  return added
}

/**
 * Connects with the DATABASE_URL of the environment or the .env in the root, like the server of
 * the check does.
 */
function connectToDatabase() {
  try {
    process.loadEnvFile(path.resolve(import.meta.dirname, '../../../.env'))
  } catch {
    // No .env: CI sets DATABASE_URL itself.
  }

  return connect(readDatabaseEnv().DATABASE_URL)
}

/** The year and month in Dutch time, as the site counts them. */
function currentMonth() {
  const [year = 0, month = 0] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Amsterdam' })
    .format(new Date())
    .split('-')
    .map(Number)

  return { month, year }
}
