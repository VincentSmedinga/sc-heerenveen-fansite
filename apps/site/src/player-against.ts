import { readMatchReport, reportForRules } from '@fansite/db/match-reports'
import { matchAppearances, matches } from '@fansite/db/schema'
import { playedMatch, playerMinutes, reportFinished } from '@fansite/shared/match-report'
import { and, eq } from 'drizzle-orm'
import { cache } from 'react'

import { getDatabase } from './database'
import { dayText } from './player-career'

// What a player did in the matches against us (issue 1545), for the card "Tegen ons" on his
// page. It comes from our own reports: the rows of the opponent that have his person (#1544).

/** One match of the card: what he did for the other club against us. */
export type AgainstMatch = {
  /** The club he played for: the opponent of the match. */
  club: string
  competition: string
  /** The day of the match, such as `2007-11-03`. */
  day: string
  /** His goals in the match, without own goals. */
  goals: number
  goalsAgainst: number
  goalsFor: number
  /** Whether we played at home. */
  home: boolean
  id: number
  /** The minutes he played. */
  minutes: number
  round: string
  season: string
}

/** The three groups of the card, each with its matches, the newest first. */
export type PlayerAgainst = {
  after: AgainstMatch[]
  before: AgainstMatch[]
  between: AgainstMatch[]
}

/** The match from our side, with the day: `sc Heerenveen – Ajax, 3 november 2007`. */
export const againstLabel = (match: Pick<AgainstMatch, 'club' | 'day' | 'home'>) =>
  `${match.home ? `sc Heerenveen – ${match.club}` : `${match.club} – sc Heerenveen`}, ${dayText(match.day)}`

/**
 * Sorts the matches into the groups of the card by the seasons he played for us (`seasons`,
 * such as `2004/05`). A season before his first is "voor", one after his last is "na", and a
 * season from his first to his last, both included, is "tussendoor": he can have played for
 * us and against us in one season, and that match must show somewhere. Without a season of ours
 * there is nothing to compare with, so the result is `undefined`, as it is without matches.
 */
export function playerAgainstOf(found: readonly AgainstMatch[], seasons: readonly string[]): PlayerAgainst | undefined {
  if (found.length === 0 || seasons.length === 0) {
    return undefined
  }

  const first = seasons.reduce((a, b) => (a < b ? a : b))
  const last = seasons.reduce((a, b) => (a > b ? a : b))
  const newestFirst = (a: AgainstMatch, b: AgainstMatch) => b.day.localeCompare(a.day) || b.id - a.id

  return {
    after: found.filter(({ season }) => season > last).toSorted(newestFirst),
    before: found.filter(({ season }) => season < first).toSorted(newestFirst),
    between: found.filter(({ season }) => season >= first && season <= last).toSorted(newestFirst),
  }
}

/**
 * The matches of a person against us: those in which a row of the opponent has his person, the
 * report is finished (`reportFinished`) and he played (`playedMatch`: a substitute who stayed
 * on the bench does not count). It throws when the database fails, and the block that asks
 * logs it and leaves the card out.
 */
export async function readAgainstMatches(personId: number): Promise<AgainstMatch[]> {
  const { db } = getDatabase()
  const rows = await db
    .select({
      appearanceId: matchAppearances.id,
      club: matches.opponent,
      competition: matches.competition,
      day: matches.matchDate,
      extraTime: matches.extraTime,
      goalsAgainst: matches.goalsAgainst,
      goalsFor: matches.goalsFor,
      home: matches.home,
      id: matches.id,
      round: matches.round,
      season: matches.season,
    })
    .from(matchAppearances)
    .innerJoin(matches, eq(matches.id, matchAppearances.matchId))
    .where(and(eq(matchAppearances.personId, personId), eq(matchAppearances.ours, false), eq(matches.status, 'played')))
  const found: AgainstMatch[] = []

  for (const row of rows) {
    const stored = await readMatchReport(db, row.id)

    if (stored === undefined) {
      continue
    }

    const report = reportForRules(stored)

    if (!reportFinished(report) || !playedMatch(report, row.appearanceId)) {
      continue
    }

    const minutes = playerMinutes(report, row, row.appearanceId)

    if (minutes === undefined) {
      continue
    }

    found.push({
      club: row.club,
      competition: row.competition,
      day: row.day,
      goals: stored.goals.filter((goal) => goal.appearanceId === row.appearanceId && !goal.ownGoal && !goal.ours)
        .length,
      goalsAgainst: row.goalsAgainst ?? 0,
      goalsFor: row.goalsFor ?? 0,
      home: row.home,
      id: row.id,
      minutes,
      round: row.round,
      season: row.season,
    })
  }

  return found
}

/** The matches of a person against us, once per request. */
export const loadAgainstMatches = cache(readAgainstMatches)
