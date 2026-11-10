import type { Database } from '@fansite/db/client'
import type { Match, MatchChange, MatchEdit, MatchGoal } from '@fansite/db/schema'

import { decideChange } from '@fansite/db/match-changes'
import { type ConflictOutcome, decideConflict, partLabels } from '@fansite/db/match-conflicts'
import {
  describeEntryFacts,
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
import { mayHaveReport, phaseOf } from '@fansite/db/match-reports'
import { listWikipediaPages } from '@fansite/db/queries'
import { adminUsers, matchChanges, matchEdits, matches, matchGoals, matchReports, players } from '@fansite/db/schema'
import { and, asc, count, eq, inArray, isNotNull, isNull, or } from 'drizzle-orm'

import type { EntryGoal, MatchEntry, SquadPlayer } from './match-form'

import { lacksResult } from '../matches'
import { recordAction } from './audit-log'
import { listReportsToCheck } from './match-reports'

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

/** A difference between Wikipedia and an entry of the editors that waits for a decision. */
export type Difference = MatchChange & { part: MatchPart }

/**
 * A change of Wikipedia that the importer holds back, because it looks suspicious: it has no
 * `part`, and the match, the goals and the log stay as they are until a person decides.
 */
export type HeldChange = MatchChange & { matchId: number; part: null }

/** What removing an entry did: it is gone, there was none, or there is no such match. */
export type RemoveOutcome = 'done' | 'missing' | 'none'

/** What an entry did. */
export type SaveOutcome = { parts: MatchPart[]; status: 'saved' } | { status: 'missing' } | { status: 'unchanged' }

/**
 * The changes of Wikipedia that the importer holds back, in all seasons: how many, and the
 * seasons they are in, the newest first. The start page tells the number and links to a season
 * in the list. A difference with an entry of the editors is not one of them
 * (`countWaitingDifferences`).
 */
export async function countHeldChanges(db: Pick<Database, 'select'>): Promise<{ seasons: string[]; total: number }> {
  const found = await db
    .select({ season: matchChanges.season, total: count() })
    .from(matchChanges)
    .where(and(eq(matchChanges.status, 'pending'), isNull(matchChanges.part), isNotNull(matchChanges.matchId)))
    .groupBy(matchChanges.season)

  return {
    seasons: found
      .map((row) => row.season)
      .sort()
      .reverse(),
    total: found.reduce((sum, row) => sum + row.total, 0),
  }
}

/**
 * How many matches of a season have no result two hours after their kick-off (`lacksResult`,
 * as the list has it). The start page tells the number and links to the list, which opens on
 * those matches.
 */
export async function countMatchesWithoutResult(
  db: Pick<Database, 'select'>,
  season: string,
  now: Date,
): Promise<number> {
  const found = await db
    .select({
      dateText: matches.dateText,
      goalsAgainst: matches.goalsAgainst,
      goalsFor: matches.goalsFor,
      kickoffAt: matches.kickoffAt,
      matchDate: matches.matchDate,
      status: matches.status,
    })
    .from(matches)
    .where(eq(matches.season, season))

  return found.filter((match) => lacksResult(match, now)).length
}

/**
 * The differences that wait for a decision, in all seasons: how many, and the seasons they are
 * in, the newest first. The start page tells the number and links to a season in the list.
 */
export async function countWaitingDifferences(
  db: Pick<Database, 'select'>,
): Promise<{ seasons: string[]; total: number }> {
  const found = await db
    .select({ season: matchChanges.season, total: count() })
    .from(matchChanges)
    .where(and(eq(matchChanges.status, 'pending'), isNotNull(matchChanges.part), isNotNull(matchChanges.matchId)))
    .groupBy(matchChanges.season)

  return {
    seasons: found
      .map((row) => row.season)
      .sort()
      .reverse(),
    total: found.reduce((sum, row) => sum + row.total, 0),
  }
}

/**
 * An editor decides a difference: Wikipedia is taken over for the part, or the entry stays.
 * This is the code the command `import:changes` uses too (`decideConflict`), in one
 * transaction with its line in the log.
 */
export async function decideDifference(
  db: Database,
  userId: number,
  id: number,
  kind: 'keep' | 'take-over',
  reason: string,
  now = new Date(),
): Promise<ConflictOutcome> {
  return db.transaction((transaction) =>
    decideConflict(transaction, id, { kind, reason, resolution: 'person', userId }, now),
  )
}

/**
 * A beheerder decides a change that Wikipedia holds back: Wikipedia is taken over (the match
 * and its goals change, or the match goes), or the match stays as it is. This is the code the
 * command `import:changes` uses too (`decideChange`), in one transaction with its line in the
 * log.
 */
export async function decideHeldChange(
  db: Database,
  userId: number,
  id: number,
  kind: 'keep' | 'take-over',
  reason: string,
  now = new Date(),
): Promise<ConflictOutcome> {
  return db.transaction((transaction) => decideChange(transaction, id, { kind, reason, userId }, now))
}

/** The difference with this number if it waits, or undefined. */
export async function findDifference(db: Pick<Database, 'select'>, id: number): Promise<Difference | undefined> {
  const [change] = await db
    .select()
    .from(matchChanges)
    .where(and(eq(matchChanges.id, id), eq(matchChanges.status, 'pending'), isNotNull(matchChanges.part)))

  return change === undefined || change.part === null ? undefined : { ...change, part: change.part }
}

/** The held change with this number if it waits, or undefined. */
export async function findHeldChange(db: Pick<Database, 'select'>, id: number): Promise<HeldChange | undefined> {
  const [change] = await db
    .select()
    .from(matchChanges)
    .where(and(eq(matchChanges.id, id), eq(matchChanges.status, 'pending'), isNull(matchChanges.part)))

  return change === undefined || change.part !== null || change.matchId === null
    ? undefined
    : { ...change, matchId: change.matchId, part: null }
}

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
    .select({
      id: players.id,
      name: players.name,
      personId: players.personId,
      wikipediaPage: players.wikipediaPage,
    })
    .from(players)
    .where(eq(players.season, match.season))
    .orderBy(asc(players.name))

  const [report] = await db
    .select({ status: matchReports.status })
    .from(matchReports)
    .where(eq(matchReports.matchId, id))

  return {
    differences: await waitingDifferences(db, id),
    edit: edit === undefined ? undefined : { ...edit.row, editedByEmail: edit.editedByEmail },
    goals,
    // A match with a report has its goals in the report: the form of the match shows them only.
    hasReport: report !== undefined,
    held: await waitingHeldChanges(db, id),
    match,
    pages: await listWikipediaPages(db, match.season),
    squad,
  }
}

/**
 * The matches of a season for the list: the matches without a result two hours after their
 * kick-off first (`lacksResult`, as the pages of visitors have it), then the rest in the order
 * of the season. `edited` says which parts the editors hold, `differs` how many of them
 * Wikipedia says something else about, which waits for a decision, and `held` how many changes
 * of Wikipedia the importer holds back for the match. `reportStatus` is the status of its
 * match report (none for a match without one), `reportable` that the match can have a report,
 * `live` that the match is being played, and `reportToCheck` that a report
 * that is `klaar` is not right any more.
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
      reportStatus: matchReports.status,
      round: matches.round,
      status: matches.status,
    })
    .from(matches)
    .leftJoin(matchReports, eq(matchReports.matchId, matches.id))
    .where(eq(matches.season, season))
    .orderBy(asc(matches.matchDate), asc(matches.kickoffAt), asc(matches.id))
  const edits = new Map((await db.select().from(matchEdits)).map((edit) => [edit.matchId, edit]))
  const differing = await db
    .select({ matchId: matchChanges.matchId, part: matchChanges.part })
    .from(matchChanges)
    .where(and(eq(matchChanges.season, season), eq(matchChanges.status, 'pending'), isNotNull(matchChanges.part)))
  const holding = await db
    .select({ matchId: matchChanges.matchId })
    .from(matchChanges)
    .where(and(eq(matchChanges.season, season), eq(matchChanges.status, 'pending'), isNull(matchChanges.part)))
  const checking = await listReportsToCheck(db, found)
  const rows = found.map((match) => ({
    ...match,
    // A report that was `klaar` and is not right any more, such as after a new result.
    differs: differing.filter((change) => change.matchId === match.id).length,
    edited: edits.has(match.id) ? markedParts(edits.get(match.id) as MatchEdit) : [],
    held: holding.filter((change) => change.matchId === match.id).length,
    lacksResult: lacksResult(match, now),
    // From the kick-off until the match lacks its result (two hours on), so an old match that
    // was never filled in is not "live" for ever.
    live: phaseOf(match, now) === 'live' && !lacksResult(match, now),
    // A match that is being played can have a report, and says "Live" from its kick-off.
    reportable: mayHaveReport(match, now),
    reportToCheck: checking.has(match.id),
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

    const { facts, kickoff, result } = entry
    const [edit] = await transaction.select().from(matchEdits).where(eq(matchEdits.matchId, id)).for('update')

    if (parts.includes('kickoff') || parts.includes('result') || parts.includes('facts')) {
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
          // The facts come last: the form has checked that only a played match has spectators.
          ...(parts.includes('facts') ? facts : {}),
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
      factsEdited: parts.includes('facts') || edit?.factsEdited === true,
      goalsEdited: parts.includes('goals') || edit?.goalsEdited === true,
      kickoffEdited: parts.includes('kickoff') || edit?.kickoffEdited === true,
      resultEdited: parts.includes('result') || edit?.resultEdited === true,
    }
    // A part that is entered again is judged again: what Wikipedia was last reported to say
    // about it no longer counts.
    const forgotten = {
      ...(parts.includes('facts') ? { reportedFacts: null } : {}),
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
    // A difference with the entry is stale for the parts that are entered again only.
    await transaction
      .update(matchChanges)
      .set({ decidedAt: now, resolution: 'replaced', status: 'rejected' })
      .where(
        and(
          eq(matchChanges.matchId, id),
          eq(matchChanges.status, 'pending'),
          or(isNull(matchChanges.part), inArray(matchChanges.part, parts)),
        ),
      )

    await recordAction(
      transaction,
      { action: 'match.edit', detail: describeChanges(match, goals, entry, parts), itemId: id, reason, userId },
      now,
    )

    return { parts, status: 'saved' } as const
  })
}

/**
 * The stored goals as the entry of a match holds them. The form of a match with a report has no
 * goals of its own, so its entry keeps these (see `submitMatch`).
 */
export function storedEntryGoals(goals: MatchGoal[]): EntryGoal[] {
  return goals.map((goal) => ({
    appearanceId: goal.appearanceId,
    assistAppearanceId: goal.assistAppearanceId,
    minute: goal.minute,
    ours: goal.ours,
    ownGoal: goal.ownGoal,
    penalty: goal.penalty,
    personId: goal.personId,
    player: goal.player,
    playerId: goal.playerId,
    stoppageMinutes: goal.stoppageMinutes,
    wikipediaPage: goal.wikipediaPage,
  }))
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

    // The goals of a match with a report are the report's: taking the entry away puts the
    // kick-off and the result back, and leaves the goals and their marker, which only taking
    // the report away undoes (see `removeReport`).
    const [report] = await transaction
      .select({ matchId: matchReports.matchId })
      .from(matchReports)
      .where(eq(matchReports.matchId, id))
    const parts = markedParts(edit).filter((part) => report === undefined || part !== 'goals')

    if (parts.length === 0) {
      return 'none'
    }

    await removeEntry(transaction, report === undefined ? edit : { ...edit, goalsEdited: false })

    if (report !== undefined && edit.goalsEdited) {
      await transaction.insert(matchEdits).values({
        ...edit,
        factsEdited: false,
        kickoffEdited: false,
        reportedFacts: null,
        reportedKickoff: null,
        reportedResult: null,
        resultEdited: false,
      })
    }

    // The differences with the entry have nothing left to decide.
    await transaction
      .update(matchChanges)
      .set({ decidedAt: now, resolution: 'replaced', status: 'rejected' })
      .where(and(eq(matchChanges.matchId, id), eq(matchChanges.status, 'pending'), isNotNull(matchChanges.part)))
    await recordAction(
      transaction,
      {
        action: 'match.undo',
        detail: `Teruggezet: ${parts.map((part) => partLabels[part]).join(', ')}`,
        itemId: id,
        reason,
        userId,
      },
      now,
    )

    return 'done'
  })
}

/** The differences of one match that wait, in the order of the parts of a match. */
export async function waitingDifferences(db: Pick<Database, 'select'>, matchId: number): Promise<Difference[]> {
  const found = await db
    .select()
    .from(matchChanges)
    .where(and(eq(matchChanges.matchId, matchId), eq(matchChanges.status, 'pending'), isNotNull(matchChanges.part)))
    .orderBy(asc(matchChanges.id))

  return found.filter((change): change is Difference => change.part !== null)
}

/** The changes of Wikipedia that are held back for one match, oldest first. */
export async function waitingHeldChanges(db: Pick<Database, 'select'>, matchId: number): Promise<HeldChange[]> {
  const found = await db
    .select()
    .from(matchChanges)
    .where(and(eq(matchChanges.matchId, matchId), eq(matchChanges.status, 'pending'), isNull(matchChanges.part)))
    .orderBy(asc(matchChanges.id))

  return found.map((change) => ({ ...change, matchId, part: null }))
}

/** A kick-off to the minute: the form has no seconds, so a stored second is no difference. */
const minuteOf = (moment: Date | null) => (moment === null ? null : Math.floor(moment.getTime() / 60_000))

/** The parts of the entry that differ from what is stored. */
function changedParts(match: Match, goals: MatchGoal[], entry: MatchEntry): MatchPart[] {
  const parts: MatchPart[] = []
  const { kickoff, result } = entry

  if (
    minuteOf(match.kickoffAt) !== minuteOf(kickoff.kickoffAt) ||
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
  if (
    match.attendance !== entry.facts.attendance ||
    match.referee !== entry.facts.referee ||
    match.stadium !== entry.facts.stadium ||
    match.note !== entry.facts.note
  ) {
    parts.push('facts')
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

  if (parts.includes('facts')) {
    lines.push(`Gegevens: ${describeEntryFacts(match)} → ${describeEntryFacts(entry.facts)}`)
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
 * the link to the page of its scorer, his person and his name as Wikipedia writes it, and the
 * players of its match report (`appearance_id` and `assist_appearance_id`).
 */
function keepStoredLinks(stored: MatchGoal[], entry: EntryGoal[]): EntryGoal[] {
  const left = [...stored]

  return entry.map((goal) => {
    const at = left.findIndex((candidate) => isSameGoal(candidate, goal))
    const [found] = at === -1 ? [] : left.splice(at, 1)

    return found === undefined
      ? goal
      : {
          ...goal,
          appearanceId: found.appearanceId,
          assistAppearanceId: found.assistAppearanceId,
          // The person the import stored, or else the person of the player the editor chose.
          personId: found.personId ?? goal.personId ?? null,
          player: found.player,
          wikipediaPage: found.wikipediaPage,
        }
  })
}

/** Whether the goals of the entry are the stored goals, in the same order. */
function sameGoals(stored: MatchGoal[], entry: EntryGoal[]) {
  return stored.length === entry.length && stored.every((goal, index) => isSameGoal(goal, entry[index]!))
}
