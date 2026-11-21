import type { Database } from '@fansite/db/client'

import { matches, predictions, supporters } from '@fansite/db/schema'
import { and, eq, isNull, or } from 'drizzle-orm'

import { cacheForKey } from '#src/cache'
import { getDatabase } from '#src/database'

import { crowdMinimum } from './prediction-results'

// What supporters predicted for one match, as figures for a group and never for a person
// (issue 1453): the card Prognose on the page of a match. The distribution comes only from the
// kick-off, so before it the reading holds the count and nothing else, and what was predicted
// is not in the memory of the server either.

/** Under this number of predictions of a score the card puts it under "anders". */
export const scoreMinimum = 3

/** The score of a prediction, home first, as it is shown: `2–1`. */
export type CrowdScore = { count: number; label: string }

/** The figures of one match for the card, from what the supporters predicted. */
export type MatchCrowd = {
  /** After the match: what the card says about the result. */
  after?: {
    /** The average full-time score, home first, such as `1,9–0,8`. */
    average: string
    /** How many had the full-time score exactly right. */
    exact: number
    /** How many had the outcome right. */
    outcome: number
  }
  /** How many supporters predicted. Blocked accounts are not counted. */
  count: number
  /** From the kick-off, and only with `crowdMinimum` predictions or more. */
  spread?: {
    /** The outcome and the score that were played, once the match is over. */
    actual?: { outcome: 'draw' | 'loss' | 'win'; score: string }
    draws: number
    losses: number
    /** The scores that were predicted less often, together. */
    other: number
    /** The scores predicted `scoreMinimum` times or more, the most predicted first. */
    scores: CrowdScore[]
    wins: number
  }
}

const oneMinute = 60 * 1000

const scoreText = (home: number, away: number) => `${home}–${away}`

/**
 * The predictions that count for the figures of a match: those of accounts that are not
 * blocked. A closed account has no supporter any more, so its row has no `disabledAt` and
 * counts as an anonymous number, because the prediction was made. The one place that knows who
 * counts; the ranking of issue 1451 decides the same rule, and then this is the place to swap.
 */
export async function countedPredictions(db: Database, matchId: number) {
  return db
    .select({
      fullTimeAway: predictions.fullTimeAway,
      fullTimeHome: predictions.fullTimeHome,
    })
    .from(predictions)
    .leftJoin(supporters, eq(supporters.id, predictions.supporterId))
    .where(and(eq(predictions.matchId, matchId), or(isNull(supporters.id), isNull(supporters.disabledAt))))
}

const sign = (home: number, away: number) => Math.sign(home - away)

/**
 * The figures of one match. `reveal` is whether the kick-off has been: without it the reading
 * has the count alone. A match without a prediction has no figures (`undefined`).
 */
export async function loadMatchCrowd(db: Database, matchId: number, reveal: boolean): Promise<MatchCrowd | undefined> {
  const [rows, [match]] = await Promise.all([
    countedPredictions(db, matchId),
    db
      .select({
        afterNinetyAgainst: matches.afterNinetyAgainst,
        afterNinetyFor: matches.afterNinetyFor,
        goalsAgainst: matches.goalsAgainst,
        goalsFor: matches.goalsFor,
        home: matches.home,
        status: matches.status,
      })
      .from(matches)
      .where(eq(matches.id, matchId)),
  ])
  const count = rows.length

  if (count === 0 || match === undefined) {
    return undefined
  }

  if (!reveal || count < crowdMinimum) {
    return { count }
  }

  const { home } = match
  // Win and loss are always about sc Heerenveen, whichever side it plays.
  const ours = (row: { fullTimeAway: number; fullTimeHome: number }) =>
    home ? sign(row.fullTimeHome, row.fullTimeAway) : sign(row.fullTimeAway, row.fullTimeHome)
  const tally = new Map<string, number>()

  for (const row of rows) {
    const label = scoreText(row.fullTimeHome, row.fullTimeAway)

    tally.set(label, (tally.get(label) ?? 0) + 1)
  }

  const listed = [...tally]
    .filter(([, times]) => times >= scoreMinimum)
    .map(([label, times]) => ({ count: times, label }))
    .toSorted((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'nl'))
  // The full-time score is the one after 90 minutes plus added time, and counts once the match
  // is played (see `resultOf` in prediction-results.ts).
  const goalsFor = match.afterNinetyFor ?? match.goalsFor
  const goalsAgainst = match.afterNinetyAgainst ?? match.goalsAgainst
  const result =
    match.status === 'played' && goalsFor !== null && goalsAgainst !== null
      ? home
        ? { away: goalsAgainst, home: goalsFor }
        : { away: goalsFor, home: goalsAgainst }
      : undefined
  const outcomes = ['loss', 'draw', 'win'] as const
  const actual =
    result === undefined
      ? undefined
      : {
          outcome: outcomes[(home ? sign(result.home, result.away) : sign(result.away, result.home)) + 1] ?? 'draw',
          score: scoreText(result.home, result.away),
        }
  const figures: MatchCrowd = {
    count,
    spread: {
      ...(actual === undefined ? {} : { actual }),
      draws: rows.filter((row) => ours(row) === 0).length,
      losses: rows.filter((row) => ours(row) < 0).length,
      other: [...tally].filter(([, times]) => times < scoreMinimum).reduce((sum, [, times]) => sum + times, 0),
      scores: listed,
      wins: rows.filter((row) => ours(row) > 0).length,
    },
  }

  if (result !== undefined) {
    const average = (key: 'fullTimeAway' | 'fullTimeHome') =>
      (rows.reduce((sum, row) => sum + row[key], 0) / count).toFixed(1).replace('.', ',')

    figures.after = {
      average: `${average('fullTimeHome')}–${average('fullTimeAway')}`,
      exact: rows.filter((row) => row.fullTimeHome === result.home && row.fullTimeAway === result.away).length,
      outcome: rows.filter((row) => sign(row.fullTimeHome, row.fullTimeAway) === sign(result.home, result.away)).length,
    }
  }

  return figures
}

/** How the card shows a share of the supporters: `26 procent`. */
export const shareText = (count: number, total: number) => `${Math.round((count / total) * 100)} procent`

const getMatchCrowd = cacheForKey(oneMinute, (key) => {
  const [id, reveal] = key.split(':')

  return loadMatchCrowd(getDatabase().db, Number(id), reveal === 'ja')
})

/**
 * The figures of one match, read once a minute for each match and for each state (before and
 * from the kick-off), so the page of a match is the same for every visitor and asks the
 * database little. The caller asks only for matches that have a page, so the keys are matches
 * that exist.
 */
export const matchCrowd = (matchId: number, reveal: boolean) => getMatchCrowd(`${matchId}:${reveal ? 'ja' : 'nee'}`)
