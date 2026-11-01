import type { Database } from '@fansite/db/client'
import type { Match, MatchEdit, MatchGoal } from '@fansite/db/schema'

import {
  describeEntryGoals,
  describeEntryKickoff,
  describeEntryResult,
  encodeGoals,
  encodeMatch,
  markedParts,
  type MatchPart,
  refreshSnapshot,
  removeEntry,
} from '@fansite/db/match-edits'
import { adminUsers, matchChanges, matchEdits, matches, matchGoals, players } from '@fansite/db/schema'
import { and, asc, eq } from 'drizzle-orm'

import type { EntryGoal, MatchEntry, SquadPlayer } from './match-form'

import { lacksResult } from '../matches'
import { recordAction } from './audit-log'

// Writing the matches in the admin: the list, the one match an editor fills in, and the two
// changes, the entry and removing it. The entry is written into `matches` and `match_goals`,
// where every page reads it, and `match_edits` marks the parts that are the editors' and keeps
// the match as it was before the first entry (see `match-edits.ts` in the database package).
// An entry and its row in the log of the admin are one transaction, so there is no entry
// without a row and no row without an entry.

/** The match an editor opens, with its goals, its marker and the players to choose from. */
export type AdminMatch = NonNullable<Awaited<ReturnType<typeof findMatch>>>

/** One match as the list shows it, with the parts the editors hold. */
export type AdminMatchRow = Awaited<ReturnType<typeof listAdminMatches>>['rows'][number]

/** What removing an entry did: it is gone, there was none, or there is no such match. */
export type RemoveOutcome = 'done' | 'missing' | 'none'

/** What an entry did. */
export type SaveOutcome = { parts: MatchPart[]; status: 'saved' } | { status: 'missing' } | { status: 'unchanged' }

/** The match with this number, for the form, or `undefined` for none. */
export async function findMatch(db: Pick<Database, 'select'>, id: number) {
  const [match] = await db.select().from(matches).where(eq(matches.id, id))

  if (match === undefined) {
    return undefined
  }

  const goals = await db.select().from(matchGoals).where(eq(matchGoals.matchId, id)).orderBy(asc(matchGoals.id))
  const [edit] = await db
    .select({ editedByEmail: adminUsers.email, row: matchEdits })
    .from(matchEdits)
    .innerJoin(adminUsers, eq(matchEdits.editedBy, adminUsers.id))
    .where(eq(matchEdits.matchId, id))
  const squad: SquadPlayer[] = await db
    .select({ id: players.id, name: players.name, wikipediaPage: players.wikipediaPage })
    .from(players)
    .where(eq(players.season, match.season))
    .orderBy(asc(players.name))

  return {
    edit: edit === undefined ? undefined : { ...edit.row, editedByEmail: edit.editedByEmail },
    goals,
    match,
    squad,
  }
}

/**
 * The matches of a season for the list: the matches without a result two hours after their
 * kick-off first (`lacksResult`, as the pages of visitors have it), then the rest in the order
 * of the season. `edited` says which parts the editors hold.
 */
export async function listAdminMatches(db: Database, season: string, now: Date) {
  const found = await db
    .select({
      afterNinetyAgainst: matches.afterNinetyAgainst,
      afterNinetyFor: matches.afterNinetyFor,
      competition: matches.competition,
      dateText: matches.dateText,
      extraTime: matches.extraTime,
      goalsAgainst: matches.goalsAgainst,
      goalsFor: matches.goalsFor,
      home: matches.home,
      id: matches.id,
      kickoffAt: matches.kickoffAt,
      matchDate: matches.matchDate,
      opponent: matches.opponent,
      penaltiesAgainst: matches.penaltiesAgainst,
      penaltiesFor: matches.penaltiesFor,
      round: matches.round,
      status: matches.status,
    })
    .from(matches)
    .where(eq(matches.season, season))
    .orderBy(asc(matches.matchDate), asc(matches.kickoffAt), asc(matches.id))
  const edits = new Map((await db.select().from(matchEdits)).map((edit) => [edit.matchId, edit]))
  const rows = found.map((match) => ({
    ...match,
    edited: edits.has(match.id) ? markedParts(edits.get(match.id) as MatchEdit) : [],
    lacksResult: lacksResult(match, now),
  }))

  return { rows: [...rows.filter((row) => row.lacksResult), ...rows.filter((row) => !row.lacksResult)] }
}

/**
 * Writes an entry: the parts that differ from what is stored become what the editor entered,
 * marked in `match_edits`, with the match as it was before the first entry. It writes
 * `match.edit` with the reason and what changed in the log, and lets a change of Wikipedia that
 * waited for this match go, since the entry is a newer word than that change. A save that
 * changes nothing stores and logs nothing. `result_set_at` gets the moment of the entry when
 * the result changed.
 */
export async function saveEntry(
  db: Database,
  userId: number,
  id: number,
  entry: MatchEntry,
  reason: string,
  now = new Date(),
): Promise<SaveOutcome> {
  return db.transaction(async (transaction) => {
    const [match] = await transaction.select().from(matches).where(eq(matches.id, id)).for('update')

    if (match === undefined) {
      return { status: 'missing' } as const
    }

    const goals = await transaction
      .select()
      .from(matchGoals)
      .where(eq(matchGoals.matchId, id))
      .orderBy(asc(matchGoals.id))
    const parts = changedParts(match, goals, entry)

    if (parts.length === 0) {
      return { status: 'unchanged' } as const
    }

    const { kickoff, result } = entry
    const [edit] = await transaction.select().from(matchEdits).where(eq(matchEdits.matchId, id)).for('update')

    if (parts.includes('kickoff') || parts.includes('result')) {
      await transaction
        .update(matches)
        .set({
          ...(parts.includes('kickoff') ? kickoff : {}),
          ...(parts.includes('result')
            ? {
                ...result,
                // Only a played match has spectators.
                ...(result.status === 'played' ? {} : { attendance: null }),
                resultSetAt: result.status === 'played' ? now : null,
              }
            : {}),
        })
        .where(eq(matches.id, id))
    }

    if (parts.includes('goals')) {
      await transaction.delete(matchGoals).where(eq(matchGoals.matchId, id))

      if (entry.goals.length > 0) {
        await transaction
          .insert(matchGoals)
          .values(keepStoredLinks(goals, entry.goals).map((goal) => ({ ...goal, matchId: id })))
      }
    }

    const marks = {
      goalsEdited: parts.includes('goals') || edit?.goalsEdited === true,
      kickoffEdited: parts.includes('kickoff') || edit?.kickoffEdited === true,
      resultEdited: parts.includes('result') || edit?.resultEdited === true,
    }
    // A part that is entered again is judged again: what Wikipedia was last reported to say
    // about it no longer counts.
    const forgotten = {
      ...(parts.includes('goals') ? { reportedGoals: null } : {}),
      ...(parts.includes('kickoff') ? { reportedKickoff: null } : {}),
      ...(parts.includes('result') ? { reportedResult: null } : {}),
    }

    if (edit === undefined) {
      await transaction.insert(matchEdits).values({
        ...marks,
        beforeGoals: encodeGoals(goals),
        beforeMatch: encodeMatch(match),
        editedAt: now,
        editedBy: userId,
        matchId: id,
        reason,
      })
    } else {
      // A part that comes back after Wikipedia took it over is kept as Wikipedia has it now.
      const newly = parts.filter((part) => !markedParts(edit).includes(part))

      await transaction
        .update(matchEdits)
        .set({
          ...marks,
          ...forgotten,
          ...(newly.length === 0 ? {} : refreshSnapshot(edit, match, goals, newly)),
          editedAt: now,
          editedBy: userId,
          reason,
        })
        .where(eq(matchEdits.matchId, id))
    }

    // A change that waited for Wikipedia's word on this match is stale: the entry replaces it.
    await transaction
      .update(matchChanges)
      .set({ decidedAt: now, resolution: 'replaced', status: 'rejected' })
      .where(and(eq(matchChanges.matchId, id), eq(matchChanges.status, 'pending')))

    await recordAction(
      transaction,
      { action: 'match.edit', detail: describeChanges(match, goals, entry, parts), itemId: id, reason, userId },
      now,
    )

    return { parts, status: 'saved' } as const
  })
}

/**
 * Takes the entry away: the parts the editors hold go back to what they were before the first
 * entry, the row of `match_edits` goes, and `match.undo` with the reason goes in the log. A
 * part that Wikipedia took over has no marker, and stays. The import reads Wikipedia for the
 * match again at its next run.
 */
export async function undoEntry(
  db: Database,
  userId: number,
  id: number,
  reason: string,
  now = new Date(),
): Promise<RemoveOutcome> {
  return db.transaction(async (transaction) => {
    const [match] = await transaction.select({ id: matches.id }).from(matches).where(eq(matches.id, id)).for('update')

    if (match === undefined) {
      return 'missing'
    }

    const [edit] = await transaction.select().from(matchEdits).where(eq(matchEdits.matchId, id)).for('update')

    if (edit === undefined) {
      return 'none'
    }

    const parts = markedParts(edit)

    await removeEntry(transaction, edit)
    await recordAction(
      transaction,
      {
        action: 'match.undo',
        detail: `Teruggezet: ${parts.map((part) => ({ goals: 'doelpunten', kickoff: 'aftrap', result: 'uitslag' })[part]).join(', ')}`,
        itemId: id,
        reason,
        userId,
      },
      now,
    )

    return 'done'
  })
}

/** The parts of the entry that differ from what is stored. */
function changedParts(match: Match, goals: MatchGoal[], entry: MatchEntry): MatchPart[] {
  const parts: MatchPart[] = []
  const { kickoff, result } = entry

  if (
    match.kickoffAt?.getTime() !== kickoff.kickoffAt?.getTime() ||
    match.dateText !== kickoff.dateText ||
    match.matchDate !== kickoff.matchDate
  ) {
    parts.push('kickoff')
  }
  if (
    match.status !== result.status ||
    match.goalsFor !== result.goalsFor ||
    match.goalsAgainst !== result.goalsAgainst ||
    match.extraTime !== result.extraTime ||
    match.penaltiesFor !== result.penaltiesFor ||
    match.penaltiesAgainst !== result.penaltiesAgainst ||
    match.afterNinetyFor !== result.afterNinetyFor ||
    match.afterNinetyAgainst !== result.afterNinetyAgainst
  ) {
    parts.push('result')
  }

  if (!sameGoals(goals, entry.goals)) {
    parts.push('goals')
  }

  return parts
}

/** What changed, for the log: each part with the value before and after. */
function describeChanges(match: Match, goals: MatchGoal[], entry: MatchEntry, parts: MatchPart[]): string {
  const lines: string[] = []

  if (parts.includes('kickoff')) {
    lines.push(`Aftrap: ${describeEntryKickoff(match)} → ${describeEntryKickoff(entry.kickoff)}`)
  }
  if (parts.includes('result')) {
    const withClub = { home: match.home, opponent: match.opponent }

    lines.push(`Uitslag: ${describeEntryResult(match)} → ${describeEntryResult({ ...entry.result, ...withClub })}`)
  }
  if (parts.includes('goals')) {
    lines.push(`Doelpunten: ${describeEntryGoals(goals)} → ${describeEntryGoals(entry.goals)}`)
  }

  return lines.join('; ')
}

/**
 * Whether a stored goal is the goal of the entry. The form can not give back what the import
 * keeps of a goal: the link of the scorer to his page on Wikipedia, and his name as Wikipedia
 * writes it. So a scorer of ours is the same by his player, and any other scorer by his name in
 * any case.
 */
function isSameGoal(
  stored: Pick<MatchGoal, 'minute' | 'ours' | 'ownGoal' | 'penalty' | 'player' | 'playerId' | 'stoppageMinutes'>,
  entry: EntryGoal,
) {
  return (
    stored.ours === entry.ours &&
    stored.minute === entry.minute &&
    (stored.stoppageMinutes ?? null) === (entry.stoppageMinutes ?? null) &&
    stored.ownGoal === entry.ownGoal &&
    stored.penalty === entry.penalty &&
    (stored.playerId === null || entry.playerId === null
      ? stored.playerId === entry.playerId &&
        stored.player.toLocaleLowerCase('nl') === entry.player.toLocaleLowerCase('nl')
      : stored.playerId === entry.playerId)
  )
}

/**
 * The goals of the entry, where a goal that did not change keeps what the import stored of it:
 * the link to the page of its scorer and his name as Wikipedia writes it.
 */
function keepStoredLinks(stored: MatchGoal[], entry: EntryGoal[]): EntryGoal[] {
  const left = [...stored]

  return entry.map((goal) => {
    const at = left.findIndex((candidate) => isSameGoal(candidate, goal))
    const [found] = at === -1 ? [] : left.splice(at, 1)

    return found === undefined ? goal : { ...goal, player: found.player, wikipediaPage: found.wikipediaPage }
  })
}

/** Whether the goals of the entry are the stored goals, in the same order. */
function sameGoals(stored: MatchGoal[], entry: EntryGoal[]) {
  return stored.length === entry.length && stored.every((goal, index) => isSameGoal(goal, entry[index]!))
}
