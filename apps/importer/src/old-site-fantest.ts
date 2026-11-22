import { quizQuestions, quizzes } from '@fansite/db/schema'
import { runFansJob } from '@fansite/shared/fans-env'
import { and, eq } from 'drizzle-orm'

import type { OldSiteFantestMonth } from './old-site-file.ts'
import type { OldSiteDatabase, OldSiteStepReport } from './old-site-step.ts'

/** The source of the quizzes this file writes, as `quizSources` has it. */
export const oldSiteQuizSource = 'oude-fansite'

type Settings = Record<string, string | undefined>

const monthKey = (year: number, month: number) => `${year}-${String(month).padStart(2, '0')}`

const sameList = (a: null | readonly unknown[], b: null | readonly unknown[]) =>
  a === null || b === null ? a === b : a.length === b.length && a.every((value, index) => value === b[index])

/**
 * The step `fantest` (#1480): the quizzes of the Fantest of the old fansite, in `quizzes` with
 * the source `oude-fansite` and their questions in `quiz_questions`. It writes only what
 * differs, so a second run changes nothing, and it removes what the files no longer have. When
 * the Fantest is switched off (`FANS_FANTEST`, or accounts off) it does nothing and says so.
 * The tables hold the questions and the sums of the visitors of then, and nothing of a person.
 */
export async function importOldSiteFantest(
  db: OldSiteDatabase,
  months: readonly OldSiteFantestMonth[],
  settings: Settings = process.env,
): Promise<OldSiteStepReport> {
  const report: OldSiteStepReport = { changed: 0, created: 0, lines: [], skipped: 0, unchanged: 0 }
  const ran = await runFansJob(
    'fantest',
    async () => {
      const stored = new Map(
        (await db.select().from(quizzes).where(eq(quizzes.source, oldSiteQuizSource))).map((quiz) => [
          monthKey(quiz.year, quiz.month),
          quiz,
        ]),
      )

      for (const month of months) {
        const key = monthKey(month.year, month.month)
        const wanted = {
          averageScoreTenths: month.average === null ? null : Math.round(month.average * 10),
          participants: month.participants,
          status: 'published' as const,
        }
        const quiz = stored.get(key)
        let quizId: number

        stored.delete(key)
        if (quiz === undefined) {
          const [{ insertId }] = await db
            .insert(quizzes)
            .values({ ...wanted, month: month.month, source: oldSiteQuizSource, year: month.year })
          quizId = insertId
          report.created += 1
        } else {
          quizId = quiz.id
          if (
            quiz.averageScoreTenths !== wanted.averageScoreTenths ||
            quiz.participants !== wanted.participants ||
            quiz.status !== wanted.status
          ) {
            await db.update(quizzes).set(wanted).where(eq(quizzes.id, quiz.id))
            report.changed += 1
          } else {
            report.unchanged += 1
          }
        }

        await importQuestions(db, quizId, month, report)
      }

      for (const [key, quiz] of stored) {
        await db.delete(quizzes).where(and(eq(quizzes.id, quiz.id), eq(quizzes.source, oldSiteQuizSource)))
        report.changed += 1
        report.lines.push(`removed the quiz of ${key}, which the files no longer have`)
      }
    },
    settings,
  )

  if (!ran) {
    report.lines.push('the Fantest is switched off, so nothing was done')
  }

  return report
}

/** Writes the questions of one quiz: what differs, and nothing that is the same. */
async function importQuestions(
  db: OldSiteDatabase,
  quizId: number,
  month: OldSiteFantestMonth,
  report: OldSiteStepReport,
) {
  const stored = new Map(
    (await db.select().from(quizQuestions).where(eq(quizQuestions.quizId, quizId))).map((row) => [row.position, row]),
  )

  for (const question of month.questions) {
    const wanted = {
      answers: question.answers,
      correctAnswer: question.correct + 1,
      percentages: question.percentages,
      text: question.text,
    }
    const row = stored.get(question.order)

    stored.delete(question.order)
    if (row === undefined) {
      await db.insert(quizQuestions).values({ ...wanted, position: question.order, quizId })
      report.created += 1
    } else if (
      row.text !== wanted.text ||
      row.correctAnswer !== wanted.correctAnswer ||
      !sameList(row.answers, wanted.answers) ||
      !sameList(row.percentages, wanted.percentages)
    ) {
      await db.update(quizQuestions).set(wanted).where(eq(quizQuestions.id, row.id))
      report.changed += 1
    } else {
      report.unchanged += 1
    }
  }

  for (const row of stored.values()) {
    await db.delete(quizQuestions).where(eq(quizQuestions.id, row.id))
    report.changed += 1
    report.lines.push(`removed question ${row.position} of ${monthKey(month.year, month.month)}`)
  }
}
