import type { Database } from '@fansite/db/client'

import { quizEntries, quizQuestions, quizzes, supporters } from '@fansite/db/schema'
import { and, asc, count, desc, eq, or, sql } from 'drizzle-orm'

import { cacheForKey } from '#src/cache'
import { getDatabase } from '#src/database'

import { monthSlug, quizMinimum, type QuizView } from './fantest'
import { currentMonth } from './fantest-entry'
import { mayTakePartCondition } from './take-part'

// The months of the Fantest that a visitor can read and play: the archive of the old fansite
// (issue 1480) and the quizzes of the editors of a month that is over (issue 1484). A quiz of
// the editors of the running month or of a later one is never read here, so its right answers
// can't reach a visitor. The figures of a month are sums and never name a person.

const fiveMinutes = 5 * 60 * 1000

/** One month in the list, newest first. */
export type ArchiveMonth = {
  /**
   * The average score in tenths of a month of the old fansite, or nothing when too few took
   * part for it to show. The figures of a month of the editors come from `closedFigures`.
   */
  averageTenths: number | undefined
  id: number
  month: number
  questions: number
  source: 'oude-fansite' | 'redactie'
  year: number
}

/** How everybody did on the quiz of the editors of one month. */
export type MonthFigures = {
  /** How many had every question right. */
  allRight: number
  /** For each question, by its position, how often each of the four answers was chosen. */
  chosen: Record<number, [number, number, number, number]>
  participants: number
  /** The scores added up. */
  total: number
}

/** A published quiz of the editors of a month before the running one, in Dutch time. */
export function closedEditorsQuiz(now: Date) {
  const running = currentMonth(now)

  return and(
    eq(quizzes.source, 'redactie'),
    eq(quizzes.status, 'published'),
    sql`${quizzes.year} * 100 + ${quizzes.month} < ${running.year * 100 + running.month}`,
  )
}

/**
 * The score of an entry, counted from its answers with the key as it is now, in a query that
 * joins the questions and groups by entry. Of a question with "alles goed" every answer counts.
 * The answers are in the order of the questions, and the places in the JSON start at zero.
 */
export const countedScore = sql<number>`sum(case when ${quizQuestions.allCorrect}
  or json_value(${quizEntries.answers}, concat('$[', ${quizQuestions.position} - 1, ']')) = ${quizQuestions.correctAnswer}
  then 1 else 0 end)`.mapWith(Number)

/** What a month that is over shows: the old fansite and the editors. */
const readable = (now: Date) =>
  or(and(eq(quizzes.source, 'oude-fansite'), eq(quizzes.status, 'published')), closedEditorsQuiz(now))

/**
 * The months that can be read, the newest first. A month has a quiz only when it is published,
 * so a month without one (such as July and August 2003) is not in the list. The average of a
 * month of the old fansite shows only with at least `quizMinimum` participants.
 */
export async function loadArchive(db: Database, now = new Date()): Promise<ArchiveMonth[]> {
  const rows = await db
    .select({
      average: quizzes.averageScoreTenths,
      id: quizzes.id,
      month: quizzes.month,
      participants: quizzes.participants,
      questions: count(quizQuestions.id),
      source: quizzes.source,
      year: quizzes.year,
    })
    .from(quizzes)
    .leftJoin(quizQuestions, eq(quizQuestions.quizId, quizzes.id))
    .where(readable(now))
    .groupBy(quizzes.id)
    .orderBy(desc(quizzes.year), desc(quizzes.month))

  return rows.map(({ average, participants, source, ...row }) => ({
    ...row,
    averageTenths: source === 'oude-fansite' && enough(participants) ? (average ?? undefined) : undefined,
    source,
  }))
}

/** Whether enough took part for their figures to show. */
const enough = (participants: null | number) => participants !== null && participants >= quizMinimum

/**
 * The figures of every quiz of the editors that is over, by the number of the quiz, in one
 * query and without the cache. An entry counts also when its account was closed since, but not
 * when the editors blocked the account, closed or not. A quiz without entries is not in it.
 */
export async function loadClosedFigures(
  db: Pick<Database, 'select'>,
  now = new Date(),
): Promise<Map<number, MonthFigures>> {
  const entries = await db
    .select({
      answers: quizEntries.answers,
      questions: count(quizQuestions.id),
      quizId: quizEntries.quizId,
      score: countedScore,
    })
    .from(quizEntries)
    .innerJoin(quizzes, eq(quizzes.id, quizEntries.quizId))
    .innerJoin(quizQuestions, eq(quizQuestions.quizId, quizzes.id))
    .leftJoin(supporters, eq(supporters.id, quizEntries.supporterId))
    // An entry without an account has no supporter row, so the condition holds for it.
    .where(and(closedEditorsQuiz(now), eq(quizEntries.blocked, false), mayTakePartCondition))
    .groupBy(quizEntries.id)

  const figures = new Map<number, MonthFigures>()

  for (const { answers, questions, quizId, score } of entries) {
    const sum = figures.get(quizId) ?? { allRight: 0, chosen: {}, participants: 0, total: 0 }

    answers.forEach((answer, index) => {
      const chosen = (sum.chosen[index + 1] ??= [0, 0, 0, 0])

      if (chosen[answer - 1] !== undefined) {
        chosen[answer - 1]! += 1
      }
    })
    sum.participants += 1
    sum.total += score
    sum.allRight += score === questions ? 1 : 0
    figures.set(quizId, sum)
  }

  return figures
}

/**
 * One month that can be read with its questions in their order, or nothing when the month has
 * none. For a quiz of the old fansite the percentages, the average and the number of
 * participants are there only when at least `quizMinimum` visitors took part, so a page can't
 * show a figure of a handful of people. A quiz of the editors comes without figures;
 * `withFigures` adds them.
 */
export async function loadQuiz(
  db: Database,
  year: number,
  month: number,
  now = new Date(),
): Promise<(QuizView & { id: number }) | undefined> {
  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.year, year), eq(quizzes.month, month), readable(now)))
    .limit(1)

  if (quiz === undefined) {
    return undefined
  }

  const old = quiz.source === 'oude-fansite'
  const shown = old && enough(quiz.participants)
  const rows = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, quiz.id))
    .orderBy(asc(quizQuestions.position))

  return {
    averageTenths: shown ? (quiz.averageScoreTenths ?? undefined) : undefined,
    id: quiz.id,
    month,
    participants: shown ? (quiz.participants ?? undefined) : undefined,
    questions: rows.map((row) => ({
      ...(row.allCorrect ? { allCorrect: true } : {}),
      answers: row.answers,
      // Only a question with "alles goed" can be without a right answer.
      correct: row.correctAnswer ?? 0,
      percentages: shown ? (row.percentages ?? undefined) : undefined,
      position: row.position,
      text: row.text,
    })),
    recent: old
      ? undefined
      : { allRight: undefined, closingText: quiz.closingText ?? '', count: 0, intro: quiz.intro ?? '' },
    year,
  }
}

// The key is the running month in Dutch time, which the server counts itself: so a month that
// just closed never gets the figures from before it did.
const figuresOfMonth = cacheForKey(fiveMinutes, () => loadClosedFigures(getDatabase().db))

/** The figures of the months that are over, kept five minutes. */
export function closedFigures() {
  const { month, year } = currentMonth()

  return figuresOfMonth(monthSlug(year, month))
}

/** The average score in tenths, or nothing when too few took part for it to show. */
export const averageOf = (figures: MonthFigures | undefined) =>
  figures === undefined || !enough(figures.participants)
    ? undefined
    : Math.round((figures.total * 10) / figures.participants)

/** The answers a supporter sent in for a quiz, by the position of the question. */
export async function findAnswers(
  db: Pick<Database, 'select'>,
  supporterId: number,
  quizId: number,
): Promise<Record<number, number> | undefined> {
  const [entry] = await db
    .select({ answers: quizEntries.answers })
    .from(quizEntries)
    .where(and(eq(quizEntries.supporterId, supporterId), eq(quizEntries.quizId, quizId)))

  return entry === undefined ? undefined : Object.fromEntries(entry.answers.map((answer, index) => [index + 1, answer]))
}

/**
 * A quiz of the editors with the figures of its month. With fewer than `quizMinimum`
 * participants it gets only their number: no average, no percentages and no "alles goed".
 */
export function withFigures(quiz: QuizView, figures: MonthFigures | undefined): QuizView {
  if (quiz.recent === undefined) {
    return quiz
  }

  const participants = figures?.participants ?? 0
  const shown = figures !== undefined && enough(participants)

  return {
    ...quiz,
    averageTenths: averageOf(figures),
    participants: shown ? participants : undefined,
    questions: quiz.questions.map((question) => ({
      ...question,
      percentages: shown
        ? ((figures.chosen[question.position] ?? [0, 0, 0, 0]).map((chosen) =>
            Math.round((chosen * 100) / participants),
          ) as [number, number, number, number])
        : undefined,
    })),
    recent: { ...quiz.recent, allRight: shown ? figures.allRight : undefined, count: participants },
  }
}
