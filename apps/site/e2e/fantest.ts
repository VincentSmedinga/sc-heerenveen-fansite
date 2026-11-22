import { connect } from '@fansite/db/client'
import { readDatabaseEnv } from '@fansite/db/env'
import { quizQuestions, quizzes } from '@fansite/db/schema'
import { and, eq } from 'drizzle-orm'
import path from 'node:path'

/**
 * Two made-up quizzes of the Fantest, so the pages of the archive have something to show
 * (#1480): June 2003 with ten questions and the figures of 38 visitors, and September 2003
 * with a question left out and only three visitors, so the percentages and the average stay
 * away. A month that a development database already has (it imported the archive) keeps its
 * quiz. The checks put the rows in before the first test and take only these rows out after
 * the last one.
 */
const months = [
  { average: 41, missing: [], month: 6, participants: 38 },
  { average: 30, missing: [4], month: 9, participants: 3 },
] as const

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
  } finally {
    await close()
  }

  return async () => {
    const connection = connectToDatabase()

    try {
      for (const id of added) {
        // The questions go with the quiz.
        await connection.db.delete(quizzes).where(eq(quizzes.id, id))
      }
    } finally {
      await connection.close()
    }
  }
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
