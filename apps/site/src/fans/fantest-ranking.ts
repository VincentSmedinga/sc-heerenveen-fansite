import type { Database } from '@fansite/db/client'

import { quizEntries, quizQuestions, quizzes, supporters } from '@fansite/db/schema'
import { and, eq } from 'drizzle-orm'

import { cacheFor } from '#src/cache'
import { getDatabase } from '#src/database'

import { closedEditorsQuiz, countedScore } from './fantest-months'
import { inRankings } from './rankings'

// The ranking of the monthly Fantest per calendar year (issue 1483). Nothing of it is stored:
// it is counted from the answers of the closed months each time it is read, so a question that
// the editors annul ("alles goed") counts for everybody, also for who sent in before that.

/** The score of one supporter for the quiz of a closed month. */
export type MonthScore = {
  month: number
  score: number
  screenName: string
  supporterId: number
  year: number
}

/** One row of a ranking. */
export type RankedQuiz = {
  /** The total divided by the number of quizzes. */
  average: number
  /** The place: equal totals share one, and the next place is skipped. */
  place: number
  /** The number of quizzes the supporter took part in. */
  quizzes: number
  screenName: string
  supporterId: number
  total: number
}

/** How many rows a table shows before the row of the supporter. */
export const shownRows = 50

const fiveMinutes = 5 * 60 * 1000

/**
 * The scores of the closed months, in one query and without the cache: only published quizzes
 * of the editors of a month before the running one, in Dutch time, and only of supporters who
 * have a row in a ranking (`inRankings`). So a blocked account, an account that was closed and
 * a supporter who left their name out are not in it.
 */
export async function loadMonthScores(db: Pick<Database, 'select'>, now = new Date()): Promise<MonthScore[]> {
  return db
    .select({
      month: quizzes.month,
      score: countedScore,
      screenName: supporters.screenName,
      supporterId: supporters.id,
      year: quizzes.year,
    })
    .from(quizEntries)
    .innerJoin(quizzes, eq(quizzes.id, quizEntries.quizId))
    .innerJoin(quizQuestions, eq(quizQuestions.quizId, quizzes.id))
    .innerJoin(supporters, eq(supporters.id, quizEntries.supporterId))
    .where(and(closedEditorsQuiz(now), inRankings()))
    .groupBy(quizEntries.id, quizzes.year, quizzes.month, supporters.id, supporters.screenName)
}

/**
 * The rows of a ranking of some scores: the points of every supporter added up, the most points
 * first. Equal totals share a place, and within a place the names are in alphabetical order. A
 * month somebody missed is not a zero: it only doesn't count.
 */
export function rankingOf(scores: readonly MonthScore[]): RankedQuiz[] {
  const sums = new Map<number, { quizzes: number; screenName: string; total: number }>()

  for (const { score, screenName, supporterId } of scores) {
    const sum = sums.get(supporterId) ?? { quizzes: 0, screenName, total: 0 }

    sums.set(supporterId, { quizzes: sum.quizzes + 1, screenName, total: sum.total + score })
  }

  const totals = [...sums.values()].map((sum) => sum.total)

  return [...sums]
    .map(([supporterId, sum]) => ({
      ...sum,
      average: sum.total / sum.quizzes,
      place: totals.filter((other) => other > sum.total).length + 1,
      supporterId,
    }))
    .sort(
      (a, b) => b.total - a.total || a.screenName.localeCompare(b.screenName, 'nl') || a.supporterId - b.supporterId,
    )
}

/** The scores of the closed months, kept five minutes. */
export const monthScores = cacheFor(fiveMinutes, () => loadMonthScores(getDatabase().db))
