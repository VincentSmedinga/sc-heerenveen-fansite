import type { Database } from '@fansite/db/client'

import { quizEntries, quizQuestions, quizzes } from '@fansite/db/schema'
import { asc, desc, eq } from 'drizzle-orm'

import type { GameData } from './my-data'

import { capital, monthTitle } from './fantest'

/**
 * What the Fantest keeps of a supporter, for the pages of the data (issue 1482): for each month
 * the score, and under it each question with the answer that was chosen. It never says which
 * answer was right. Gives `undefined` for a supporter who never took part.
 */
export async function fantestData(db: Database, supporterId: number): Promise<GameData | undefined> {
  const found = await db
    .select({
      answers: quizEntries.answers,
      month: quizzes.month,
      quizId: quizEntries.quizId,
      score: quizEntries.score,
      year: quizzes.year,
    })
    .from(quizEntries)
    .innerJoin(quizzes, eq(quizzes.id, quizEntries.quizId))
    .where(eq(quizEntries.supporterId, supporterId))
    .orderBy(desc(quizzes.year), desc(quizzes.month))

  if (found.length === 0) {
    return undefined
  }

  const rows: GameData['rows'][number][] = []

  for (const entry of found) {
    const questions = await db
      .select({ answers: quizQuestions.answers, text: quizQuestions.text })
      .from(quizQuestions)
      .where(eq(quizQuestions.quizId, entry.quizId))
      .orderBy(asc(quizQuestions.position))
    const when = capital(monthTitle(entry.year, entry.month))

    rows.push({ cells: [`${entry.score} van ${entry.answers.length}`], header: `${when}: score` })
    rows.push(
      ...questions.map(({ answers, text }, index) => ({
        cells: [answers[(entry.answers[index] ?? 0) - 1] ?? '–'],
        header: `${when}, ${index + 1}. ${text}`,
      })),
    )
  }

  const [latest] = found

  return {
    columns: ['Vraag', 'Jouw antwoord'],
    rows,
    summary:
      found.length === 1 && latest !== undefined
        ? `1 Fantest, ${latest.score} van ${latest.answers.length}`
        : `${found.length} Fantests`,
  }
}
