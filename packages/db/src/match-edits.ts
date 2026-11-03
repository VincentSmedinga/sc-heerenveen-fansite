import { eq, inArray } from 'drizzle-orm'

// What the editors filled in of a match (`match_edits`): the three parts of a match they can
// enter, the match and its goals as they were before the first entry, and putting that back.
// The site writes the entries; the importer reads the markers and clears them (see the
// importer's `edited-matches.ts`).
import type { Database } from './client.ts'
import type { Match, MatchEdit, MatchGoal, MatchPart, NewMatchGoal } from './schema.ts'

import { matchEdits, matches, matchGoals, matchParts, players } from './schema.ts'

export { matchParts }
export type { MatchPart }

/** The goals that are stored, as the comparison needs them. */
export type GoalFields = Pick<
  MatchGoal,
  'minute' | 'ours' | 'ownGoal' | 'penalty' | 'player' | 'playerId' | 'stoppageMinutes'
>

/** The goal as `before_goals` keeps it: a row of `match_goals` without its numbers. */
export type GoalSnapshot = Omit<NewMatchGoal, 'id' | 'matchId'>

/** The kick-off of one match, for a judgement and a line of text. */
export type KickoffFields = Pick<Match, 'dateText' | 'kickoffAt' | 'matchDate'>

/** The fields of a match that `before_match` keeps, with the moments as ISO text. */
export type MatchSnapshot = {
  afterNinetyAgainst: null | number
  afterNinetyFor: null | number
  dateText: null | string
  extraTime: boolean
  goalsAgainst: null | number
  goalsFor: null | number
  kickoffAt: null | string
  matchDate: string
  penaltiesAgainst: null | number
  penaltiesFor: null | number
  resultSetAt: null | string
  status: Match['status']
}

/** The result of one match, for a judgement and a line of text. */
export type ResultFields = Pick<
  Match,
  | 'afterNinetyAgainst'
  | 'afterNinetyFor'
  | 'extraTime'
  | 'goalsAgainst'
  | 'goalsFor'
  | 'home'
  | 'opponent'
  | 'penaltiesAgainst'
  | 'penaltiesFor'
  | 'status'
>

type Writer = Pick<Database, 'delete' | 'insert' | 'select' | 'update'>

/**
 * Clears the markers of these parts, and what the importer reported of them, and removes the
 * row when no part is left. Returns the parts that are still marked.
 */
export async function clearParts(db: Pick<Database, 'delete' | 'update'>, edit: MatchEdit, parts: MatchPart[]) {
  const left = markedParts(edit).filter((part) => !parts.includes(part))

  if (left.length === 0) {
    await db.delete(matchEdits).where(eq(matchEdits.matchId, edit.matchId))

    return left
  }

  await db
    .update(matchEdits)
    .set({
      ...(parts.includes('goals') ? { goalsEdited: false, reportedGoals: null } : {}),
      ...(parts.includes('kickoff') ? { kickoffEdited: false, reportedKickoff: null } : {}),
      ...(parts.includes('result') ? { reportedResult: null, resultEdited: false } : {}),
    })
    .where(eq(matchEdits.matchId, edit.matchId))

  return left
}

/** The goals as a line: `12' Van Bergen, 45+1' Meijer (tegenstander, eigen doelpunt)`. */
export function describeEntryGoals(goals: GoalFields[]): string {
  if (goals.length === 0) {
    return 'geen doelpunten'
  }

  return goals
    .map((goal) => {
      const notes = [
        goal.ours ? undefined : 'tegenstander',
        goal.ownGoal ? 'eigen doelpunt' : undefined,
        goal.penalty ? 'strafschop' : undefined,
      ].filter((note) => note !== undefined)

      return `${goal.minute}${goal.stoppageMinutes === null ? '' : `+${goal.stoppageMinutes}`}' ${goal.player}${notes.length === 0 ? '' : ` (${notes.join(', ')})`}`
    })
    .join(', ')
}

/** The kick-off as a line, in Dutch time: `14 november 2026 20:00`, or the date as given. */
export function describeEntryKickoff(match: KickoffFields): string {
  if (match.kickoffAt === null) {
    return match.dateText ?? match.matchDate
  }

  const day = new Intl.DateTimeFormat('nl-NL', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Amsterdam',
    year: 'numeric',
  }).format(match.kickoffAt)
  const time = new Intl.DateTimeFormat('nl-NL', {
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
  }).format(match.kickoffAt)

  return `${day} om ${time}`
}

/** The result as a line, from the side of the home club: `sc Heerenveen 2-1 N.E.C.`. */
export function describeEntryResult(match: ResultFields): string {
  if (match.status === 'scheduled') {
    return 'gepland'
  }
  if (match.status === 'postponed') {
    return 'uitgesteld'
  }
  if (match.status === 'cancelled') {
    return 'geannuleerd'
  }

  const ours = match.goalsFor ?? 0
  const theirs = match.goalsAgainst ?? 0
  const score = match.home
    ? `sc Heerenveen ${ours}–${theirs} ${match.opponent}`
    : `${match.opponent} ${theirs}–${ours} sc Heerenveen`
  const extra = [
    match.extraTime ? 'na verlenging' : undefined,
    match.afterNinetyFor === null ? undefined : `${match.afterNinetyFor}–${match.afterNinetyAgainst} na 90 minuten`,
    match.penaltiesFor === null ? undefined : `strafschoppen ${match.penaltiesFor}–${match.penaltiesAgainst}`,
  ].filter((part) => part !== undefined)

  return extra.length === 0 ? score : `${score} (${extra.join(', ')})`
}

const kickoffKeys = ['dateText', 'kickoffAt', 'matchDate'] as const

const resultKeys = [
  'afterNinetyAgainst',
  'afterNinetyFor',
  'extraTime',
  'goalsAgainst',
  'goalsFor',
  'penaltiesAgainst',
  'penaltiesFor',
  'resultSetAt',
  'status',
] as const

/** The goals as `before_goals` keeps them, in the order they are shown. */
export function encodeGoals(goals: MatchGoal[]): string {
  return JSON.stringify(
    goals.map((goal): GoalSnapshot => ({
      minute: goal.minute,
      ours: goal.ours,
      ownGoal: goal.ownGoal,
      penalty: goal.penalty,
      player: goal.player,
      playerId: goal.playerId,
      stoppageMinutes: goal.stoppageMinutes,
      wikipediaPage: goal.wikipediaPage,
    })),
  )
}

/** The fields of the match that an entry can change, as `before_match` keeps them. */
export function encodeMatch(match: Match): string {
  const snapshot: MatchSnapshot = {
    afterNinetyAgainst: match.afterNinetyAgainst,
    afterNinetyFor: match.afterNinetyFor,
    dateText: match.dateText,
    extraTime: match.extraTime,
    goalsAgainst: match.goalsAgainst,
    goalsFor: match.goalsFor,
    kickoffAt: match.kickoffAt?.toISOString() ?? null,
    matchDate: match.matchDate,
    penaltiesAgainst: match.penaltiesAgainst,
    penaltiesFor: match.penaltiesFor,
    resultSetAt: match.resultSetAt?.toISOString() ?? null,
    status: match.status,
  }

  return JSON.stringify(snapshot)
}

/**
 * Writes these goals for the match, in this order. A player that was deleted since is no link
 * any more, as `on delete set null` has it.
 */
export async function insertGoals(db: Pick<Database, 'insert' | 'select'>, matchId: number, goals: GoalSnapshot[]) {
  if (goals.length === 0) {
    return
  }

  const ids = goals.flatMap((goal) => (goal.playerId === null || goal.playerId === undefined ? [] : [goal.playerId]))
  const known = new Set(
    ids.length === 0
      ? []
      : (await db.select({ id: players.id }).from(players).where(inArray(players.id, ids))).map((row) => row.id),
  )

  await db.insert(matchGoals).values(
    goals.map((goal) => ({
      ...goal,
      matchId,
      playerId:
        goal.playerId !== null && goal.playerId !== undefined && known.has(goal.playerId) ? goal.playerId : null,
    })),
  )
}

/** Whether the editors hold this part of the match. */
export function isMarked(
  edit: Pick<MatchEdit, 'goalsEdited' | 'kickoffEdited' | 'resultEdited'>,
  part: MatchPart,
): boolean {
  return part === 'kickoff' ? edit.kickoffEdited : part === 'result' ? edit.resultEdited : edit.goalsEdited
}

/** The parts of the match the editors still hold, in the order of `matchParts`. */
export function markedParts(edit: Pick<MatchEdit, 'goalsEdited' | 'kickoffEdited' | 'resultEdited'>): MatchPart[] {
  return matchParts.filter((part) => isMarked(edit, part))
}

/**
 * The snapshot of `before_match` and `before_goals` with the parts that get a marker again
 * taken from the match as it is now. A part that Wikipedia took over and the editors enter
 * again must go back to what Wikipedia has then, not to what it had before the first entry.
 */
export function refreshSnapshot(edit: MatchEdit, match: Match, goals: MatchGoal[], parts: MatchPart[]) {
  const next = JSON.parse(edit.beforeMatch) as Record<string, unknown>
  const now = JSON.parse(encodeMatch(match)) as Record<string, unknown>

  for (const key of [
    ...(parts.includes('kickoff') ? kickoffKeys : []),
    ...(parts.includes('result') ? resultKeys : []),
  ]) {
    next[key] = now[key]
  }

  return {
    beforeGoals: parts.includes('goals') ? encodeGoals(goals) : edit.beforeGoals,
    beforeMatch: JSON.stringify(next),
  }
}

/**
 * Puts the parts of the match that the editors hold back to what they were before the first
 * entry, and removes the row of `match_edits`. A part without a marker stays as it is: the
 * importer took that over from Wikipedia. The importer reads Wikipedia again at the next run.
 */
export async function removeEntry(db: Writer, edit: MatchEdit) {
  const before = JSON.parse(edit.beforeMatch) as MatchSnapshot
  const parts = markedParts(edit)
  const kickoff = {
    dateText: before.dateText,
    kickoffAt: before.kickoffAt === null ? null : new Date(before.kickoffAt),
    matchDate: before.matchDate,
  }
  const result = {
    afterNinetyAgainst: before.afterNinetyAgainst,
    afterNinetyFor: before.afterNinetyFor,
    extraTime: before.extraTime,
    goalsAgainst: before.goalsAgainst,
    goalsFor: before.goalsFor,
    penaltiesAgainst: before.penaltiesAgainst,
    penaltiesFor: before.penaltiesFor,
    resultSetAt: before.resultSetAt === null ? null : new Date(before.resultSetAt),
    status: before.status,
  }

  if (parts.includes('kickoff') || parts.includes('result')) {
    await db
      .update(matches)
      .set({
        ...(parts.includes('kickoff') ? kickoff : {}),
        ...(parts.includes('result') ? result : {}),
        // Only a played match has spectators (`matches_attendance_in_range_when_played`).
        ...(parts.includes('result') && before.status !== 'played' ? { attendance: null } : {}),
      })
      .where(eq(matches.id, edit.matchId))
  }
  if (parts.includes('goals')) {
    await db.delete(matchGoals).where(eq(matchGoals.matchId, edit.matchId))
    await insertGoals(db, edit.matchId, JSON.parse(edit.beforeGoals) as GoalSnapshot[])
  }

  await clearParts(db, edit, parts)
}
