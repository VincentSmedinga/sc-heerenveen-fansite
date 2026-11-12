import type { Database } from '@fansite/db/client'

import { matchAppearances, matchChanges, matches, matchGoals, matchReports } from '@fansite/db/schema'
import { and, asc, count, eq, isNotNull, sql } from 'drizzle-orm'

import { lacksResult } from '../matches'
import { qualityPath } from './quality'

// The work table of the page Kwaliteit (issue 1163): for each match, what it still misses, in
// one column for each part of a match. A cell holds a short sign: a number for how many are
// missing, `?` for a part that is missing as a whole, and `…` for a report that is not
// finished. A complete part has no sign. Only a match that was played counts, apart from Wacht:
// a change of Wikipedia can wait for any match.

/** The columns, in order, with the letter of the header on a phone. */
export const gapColumns = [
  { key: 'uitslag', letter: 'U', name: 'Uitslag' },
  { key: 'aftrap', letter: 'A', name: 'Aftrap' },
  { key: 'doelpunten', letter: 'D', name: 'Doelpunten' },
  { key: 'opstelling', letter: 'O', name: 'Opstelling' },
  { key: 'verslag', letter: 'V', name: 'Verslag' },
  { key: 'gegevens', letter: 'G', name: 'Gegevens' },
  { key: 'wacht', letter: 'W', name: 'Wacht' },
] as const

export type GapColumn = (typeof gapColumns)[number]['key']

/** The columns that lead to a part of the form, where "Opslaan en volgende" can go on. */
export const formColumns = ['uitslag', 'aftrap', 'doelpunten', 'gegevens'] as const satisfies readonly GapColumn[]

export type FormColumn = (typeof formColumns)[number]

/** The part of the form of a match that each of those columns leads to. */
export const columnParts = {
  aftrap: 'uitslag',
  doelpunten: 'doelpunten',
  gegevens: 'gegevens',
  uitslag: 'uitslag',
} as const satisfies Record<FormColumn, string>

/** What a cell shows, and how many things are missing (1 for `?` and `…`). */
export type Gap = { sign: string; total: number }

/** A match with what it misses, by column. A column without a gap is not in `gaps`. */
export type MatchGaps = {
  competition: string
  gaps: Partial<Record<GapColumn, Gap>>
  home: boolean
  id: number
  kickoffAt: Date | null
  matchDate: string
  opponent: string
  season: string
}

/**
 * For each season, how many matches it has and how many of them have a gap in each column.
 */
export function countGapsBySeason(rows: readonly MatchGaps[]) {
  const seasons = new Map<string, { columns: Record<GapColumn, number>; matches: number }>()

  for (const row of rows) {
    const season = seasons.get(row.season) ?? {
      columns: Object.fromEntries(gapColumns.map(({ key }) => [key, 0])) as Record<GapColumn, number>,
      matches: 0,
    }

    season.matches += 1

    for (const { key } of gapColumns) {
      if (row.gaps[key] !== undefined) {
        season.columns[key] += 1
      }
    }

    seasons.set(row.season, season)
  }

  return seasons
}

/** Whether a column leads to a part of the form, so "Opslaan en volgende" can go on in it. */
export function isFormColumn(value: unknown): value is FormColumn {
  return (formColumns as readonly unknown[]).includes(value)
}

/** Whether a word from the address is a column of the table. */
export function isGapColumn(value: unknown): value is GapColumn {
  return gapColumns.some((column) => column.key === value)
}

/**
 * The next match after `current` in the order of the season with a gap in the column, or the
 * first one before it when none comes after, so "Opslaan en volgende" goes round the season.
 * `undefined` when no other match has a gap there. The persons of a letter go round the same
 * way (issue 1165).
 */
export function nextWithGap<Column extends string, Row extends { gaps: Partial<Record<Column, unknown>>; id: number }>(
  rows: readonly Row[],
  current: number,
  column: Column,
): Row | undefined {
  const index = rows.findIndex((row) => row.id === current)
  const ordered = index === -1 ? rows : [...rows.slice(index + 1), ...rows.slice(0, index)]

  return ordered.find((row) => row.id !== current && row.gaps[column] !== undefined)
}

/**
 * The matches of a season, or of every season, with what each misses, in the order of the
 * season: the oldest first. A match that misses nothing is in the list too, with no gaps, so
 * the caller can count the matches of a season.
 */
export async function readMatchGaps(db: Pick<Database, 'select'>, season?: string, now = new Date()) {
  const inSeason = season === undefined ? undefined : eq(matches.season, season)
  const found = await db
    .select({
      attendance: matches.attendance,
      competition: matches.competition,
      dateText: matches.dateText,
      goalsAgainst: matches.goalsAgainst,
      goalsFor: matches.goalsFor,
      home: matches.home,
      id: matches.id,
      kickoffAt: matches.kickoffAt,
      matchDate: matches.matchDate,
      opponent: matches.opponent,
      referee: matches.referee,
      season: matches.season,
      stadium: matches.stadium,
      status: matches.status,
    })
    .from(matches)
    .where(inSeason)
    .orderBy(asc(matches.matchDate), asc(matches.kickoffAt), asc(matches.id))
  const goals = await db
    .select({
      id: matchGoals.matchId,
      total: count(),
      // A goal of ours without a player: ours and not an own goal, or an own goal listed under
      // the opponent, as the old work list counted it.
      withoutPlayer: sql<number>`sum(${matchGoals.playerId} is null and ${matchGoals.ours} <> ${matchGoals.ownGoal})`,
    })
    .from(matchGoals)
    .innerJoin(matches, eq(matches.id, matchGoals.matchId))
    .where(inSeason)
    .groupBy(matchGoals.matchId)
  const reports = await db
    .select({ id: matchReports.matchId, status: matchReports.status })
    .from(matchReports)
    .innerJoin(matches, eq(matches.id, matchReports.matchId))
    .where(inSeason)
  const lineUps = await db
    .select({ id: matchAppearances.matchId })
    .from(matchAppearances)
    .innerJoin(matches, eq(matches.id, matchAppearances.matchId))
    .where(inSeason)
    .groupBy(matchAppearances.matchId)
  const waiting = await db
    .select({ id: matchChanges.matchId, total: count() })
    .from(matchChanges)
    .innerJoin(matches, eq(matches.id, matchChanges.matchId))
    .where(and(inSeason, eq(matchChanges.status, 'pending'), isNotNull(matchChanges.matchId)))
    .groupBy(matchChanges.matchId)

  const goalsOf = new Map(goals.map((row) => [row.id, row]))
  const reportOf = new Map(reports.map((row) => [row.id, row.status]))
  const withLineUp = new Set(lineUps.map((row) => row.id))
  const waitingOf = new Map(waiting.flatMap((row) => (row.id === null ? [] : [[row.id, row.total] as const])))

  return found.map((match): MatchGaps => {
    const gaps: Partial<Record<GapColumn, Gap>> = {}
    const played = match.status === 'played'
    const goal = goalsOf.get(match.id)
    const report = reportOf.get(match.id)
    const scored = (match.goalsFor ?? 0) + (match.goalsAgainst ?? 0)
    const missingFacts = [match.attendance, match.referee, match.stadium].filter((value) => value === null).length
    const wait = waitingOf.get(match.id) ?? 0

    if (lacksResult(match, now)) {
      gaps.uitslag = { sign: '?', total: 1 }
    }
    if (played && match.kickoffAt === null) {
      gaps.aftrap = { sign: '?', total: 1 }
    }
    if (played && scored > 0 && goal === undefined) {
      gaps.doelpunten = { sign: '?', total: 1 }
    } else if (played && Number(goal?.withoutPlayer ?? 0) > 0) {
      const total = Number(goal?.withoutPlayer)

      gaps.doelpunten = { sign: String(total), total }
    }
    if (played && !withLineUp.has(match.id)) {
      gaps.opstelling = { sign: '?', total: 1 }
    }
    if (played && report === undefined) {
      gaps.verslag = { sign: '?', total: 1 }
    } else if (report === 'bezig') {
      gaps.verslag = { sign: '…', total: 1 }
    }
    if (played && missingFacts > 0) {
      gaps.gegevens = { sign: String(missingFacts), total: missingFacts }
    }
    if (wait > 0) {
      gaps.wacht = { sign: String(wait), total: wait }
    }

    return {
      competition: match.competition,
      gaps,
      home: match.home,
      id: match.id,
      kickoffAt: match.kickoffAt,
      matchDate: match.matchDate,
      opponent: match.opponent,
      season: match.season,
    }
  })
}

/**
 * The address of the table of a season, with one column chosen:
 * `/beheer/kwaliteit/2005-06?kolom=doelpunten`.
 */
export function seasonTablePath(season: string, column?: GapColumn, done?: string) {
  const query = new URLSearchParams()

  if (column !== undefined) {
    query.set('kolom', column)
  }
  if (done !== undefined) {
    query.set('gedaan', done)
  }

  const path = `${qualityPath}/${season.replace('/', '-')}`

  return query.size === 0 ? path : `${path}?${query}`
}
