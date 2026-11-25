import type { Database } from '@fansite/db/client'

import { quizQuestions, type QuizStatus, quizzes } from '@fansite/db/schema'
import { and, asc, desc, eq } from 'drizzle-orm'

import { capital, monthSlug, monthTitle } from '#src/fans/fantest'
import { dayOf } from '#src/news'

import { recordAction } from './audit-log'
import { emptyQuestion, type QuizErrors, quizLength, type QuizValues } from './quiz-fields'
import { type QuizIntent, swapQuestions, validateQuiz } from './quiz-form'

// The quizzes of the editors (issue 1481): the list, the one quiz an editor writes, and its
// changes. Every query asks for the source `redactie`, so a quiz of the archive is never shown
// or changed here. A change and its row in the log of the admin are one transaction. A quiz
// that somebody filled in (`participants`, which issue 1482 counts) is locked: only the closing
// text and "alles goed" per question still change. The clock is the `now` argument.

const source = 'redactie'

/** One quiz with the values of its form. */
export type AdminQuiz = AdminQuizRow & { locked: boolean; values: QuizValues }

/** One quiz as the list shows it. */
export type AdminQuizRow = { id: number; month: number; status: QuizStatus; year: number }

export type CreateOutcome =
  { errors: { jaar?: string; maand?: string }; status: 'invalid' } | { id: number; status: 'created' }

export type SaveOutcome =
  | { errors: QuizErrors; status: 'invalid'; values: QuizValues }
  | { status: 'locked' | 'missing' | 'moved' | 'published' | 'refused' | 'saved' | 'unchanged' }

/** Whether somebody filled the quiz in, so its questions may no longer change. */
export const isLocked = ({ participants }: { participants: null | number }) => (participants ?? 0) > 0

/**
 * Whether the month is over: the quiz closes at midnight, Dutch time, at the end of its last
 * day.
 */
export const monthPassed = (year: number, month: number, now: Date) => monthSlug(year, month) < dayOf(now).slice(0, 7)

/** "Fantest november 2026", in the log of the admin. */
const logName = (year: number, month: number) => `Fantest ${monthTitle(year, month)}`

/** Makes an empty draft with ten questions for a month that is not over and has no quiz. */
export async function createQuiz(
  db: Database,
  userId: number,
  { month, year }: { month: number; year: number },
  now = new Date(),
): Promise<CreateOutcome> {
  if (monthPassed(year, month, now)) {
    return { errors: { maand: 'Deze maand is al voorbij. Kies deze maand of een latere.' }, status: 'invalid' }
  }

  try {
    return await db.transaction(async (tx) => {
      const [{ insertId: id }] = await tx.insert(quizzes).values({ month, source, status: 'draft', year })

      await tx.insert(quizQuestions).values(
        Array.from({ length: quizLength }, (_, index) => ({
          answers: emptyQuestion().antwoorden,
          position: index + 1,
          quizId: id,
          text: '',
        })),
      )
      await recordAction(tx, { action: 'quiz.create', detail: logName(year, month), itemId: id, userId }, now)

      return { id, status: 'created' as const }
    })
  } catch (error) {
    if (!isDuplicate(error)) {
      throw error
    }

    return {
      errors: { maand: `${capital(monthTitle(year, month))} heeft al een quiz. Kies een andere maand.` },
      status: 'invalid',
    }
  }
}

/** The quiz of the editors with this number, or `undefined` when there is none. */
export async function findQuiz(db: Pick<Database, 'select'>, id: number): Promise<AdminQuiz | undefined> {
  const [quiz] = await db
    .select()
    .from(quizzes)
    .where(and(eq(quizzes.id, id), eq(quizzes.source, source)))

  if (quiz === undefined) {
    return undefined
  }

  const rows = await db
    .select()
    .from(quizQuestions)
    .where(eq(quizQuestions.quizId, id))
    .orderBy(asc(quizQuestions.position))

  return {
    id: quiz.id,
    locked: isLocked(quiz),
    month: quiz.month,
    status: quiz.status,
    values: {
      intro: quiz.intro ?? '',
      slottekst: quiz.closingText ?? '',
      vragen: Array.from({ length: quizLength }, (_, index) => {
        const row = rows.find(({ position }) => position === index + 1)

        return row === undefined
          ? emptyQuestion()
          : {
              allesGoed: row.allCorrect,
              antwoorden: row.answers,
              goed: row.correctAnswer === null ? '' : String(row.correctAnswer),
              tekst: row.text,
            }
      }),
    },
    year: quiz.year,
  }
}

/** The quizzes of the editors, the newest month first. */
export function listQuizzes(db: Pick<Database, 'select'>): Promise<AdminQuizRow[]> {
  return db
    .select({ id: quizzes.id, month: quizzes.month, status: quizzes.status, year: quizzes.year })
    .from(quizzes)
    .where(eq(quizzes.source, source))
    .orderBy(desc(quizzes.year), desc(quizzes.month))
}

/**
 * Saves the form of a quiz and does what the button asked: publish it, or move a question one
 * place. A draft may be unfinished. Publishing, and every change of a published quiz, asks for
 * ten complete questions, and publishing also for a month that is not over. A locked quiz takes
 * only the closing text and "alles goed", whatever else the form sends.
 */
export function saveQuiz(
  db: Database,
  userId: number,
  id: number,
  submitted: QuizValues,
  intent: QuizIntent,
  now = new Date(),
): Promise<SaveOutcome> {
  return db.transaction(async (tx): Promise<SaveOutcome> => {
    // The lock on the row keeps an entry of a supporter and a change apart.
    await tx.select({ id: quizzes.id }).from(quizzes).where(eq(quizzes.id, id)).for('update')

    const quiz = await findQuiz(tx, id)

    if (quiz === undefined) {
      return { status: 'missing' }
    }

    const { locked, month, status, values: stored, year } = quiz
    const publish = !locked && intent.kind === 'publish' && status === 'draft'
    let values = submitted

    if (locked) {
      values = {
        intro: stored.intro,
        slottekst: submitted.slottekst,
        vragen: stored.vragen.map((question, index) => ({
          ...question,
          allesGoed: submitted.vragen[index]?.allesGoed ?? false,
        })),
      }
    }

    let errors = validateQuiz(values, !locked && (publish || status === 'published'))

    if (publish && monthPassed(year, month, now)) {
      // The month stands at the top of the page, so its error comes first.
      errors = {
        maand: `${capital(monthTitle(year, month))} is al voorbij, dus deze quiz kun je niet meer publiceren.`,
        ...errors,
      }
    }

    if (Object.keys(errors).length > 0) {
      // A locked quiz shows its questions again as they are stored.
      return { errors, status: 'invalid', values }
    }

    if (!locked && intent.kind === 'move') {
      values = swapQuestions(values, intent.from, intent.to)
    }

    const changes = describeChanges(stored, values)
    // A form from before the quiz was locked may send changes that are not taken.
    const refused = locked && (intent.kind !== 'save' || changesLocked(stored, submitted))

    if (changes.length === 0 && !publish) {
      return { status: refused ? 'refused' : 'unchanged' }
    }

    await tx
      .update(quizzes)
      .set({
        closingText: values.slottekst === '' ? null : values.slottekst,
        intro: values.intro === '' ? null : values.intro,
        ...(publish ? { status: 'published' as const } : {}),
      })
      .where(eq(quizzes.id, id))

    for (const [index, question] of values.vragen.entries()) {
      const row = {
        allCorrect: question.allesGoed,
        answers: question.antwoorden,
        correctAnswer: question.goed === '' ? null : Number(question.goed),
        text: question.tekst,
      }

      await tx
        .insert(quizQuestions)
        .values({ ...row, position: index + 1, quizId: id })
        .onDuplicateKeyUpdate({ set: row })
    }

    await recordAction(
      tx,
      {
        action: publish ? 'quiz.publish' : 'quiz.edit',
        detail: [logName(year, month), ...changes].join('; '),
        itemId: id,
        userId,
      },
      now,
    )

    if (publish) {
      return { status: 'published' }
    }

    if (locked) {
      return { status: refused ? 'refused' : 'locked' }
    }

    return { status: intent.kind === 'move' ? 'moved' : 'saved' }
  })
}

/**
 * Whether a form sends something else for a part that is locked. The form of a locked quiz
 * sends none of these parts, so an empty one says nothing.
 */
function changesLocked(stored: QuizValues, sent: QuizValues) {
  const differs = (now: string, wanted: string) => wanted !== '' && wanted !== now

  return (
    differs(stored.intro, sent.intro) ||
    sent.vragen.some((question, index) => {
      const old = stored.vragen[index] ?? emptyQuestion()

      return (
        differs(old.tekst, question.tekst) ||
        differs(old.goed, question.goed) ||
        question.antwoorden.some((answer, place) => differs(old.antwoorden[place] ?? '', answer))
      )
    })
  )
}

/** What changed, in words for the log: the parts and the numbers of the questions. */
function describeChanges(before: QuizValues, after: QuizValues): string[] {
  const changes: string[] = []

  if (before.intro !== after.intro) {
    changes.push('inleiding')
  }

  if (before.slottekst !== after.slottekst) {
    changes.push('slottekst')
  }

  after.vragen.forEach((question, index) => {
    const old = before.vragen[index] ?? emptyQuestion()

    if (
      old.tekst !== question.tekst ||
      old.goed !== question.goed ||
      old.antwoorden.some((answer, place) => answer !== question.antwoorden[place])
    ) {
      changes.push(`vraag ${index + 1}`)
    }

    if (old.allesGoed !== question.allesGoed) {
      changes.push(`alles goed ${question.allesGoed ? 'aan' : 'uit'} bij vraag ${index + 1}`)
    }
  })

  return changes
}

/** Whether the error is the database refusing a second quiz for the same month. */
function isDuplicate(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false
  }

  const { cause, code, errno } = error as { cause?: unknown; code?: unknown; errno?: unknown }

  return code === 'ER_DUP_ENTRY' || errno === 1062 || isDuplicate(cause)
}
