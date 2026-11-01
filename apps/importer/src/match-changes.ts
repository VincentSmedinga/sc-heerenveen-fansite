// The changes of a match that wait (`match_changes`): writing a match and its goals, keeping a
// change that is judged suspicious, and deciding one, by the importer after seven days or by a
// person. `classify-change.ts` judges; this file holds what the database needs for it.
import type { Database } from '@fansite/db/client'
import type { Match, MatchChange, NewMatchChange, NewMatchGoal } from '@fansite/db/schema'

import { matchChanges, matches, matchGoals } from '@fansite/db/schema'
import { and, asc, eq, inArray } from 'drizzle-orm'

import type { Judgement, MatchHistory } from './classify-change.ts'
import type { ReadGoal, ReadMatch } from './read-wikipedia.ts'

import { reliability } from './classify-change.ts'

/** What a person's decision came to. */
export type Decision = { change: MatchChange; message: string; ok: boolean }

/** A goal as it is kept: what the page says, and the player of ours it is linked to or null. */
export type LinkedGoal = ReadGoal & { playerId: null | number }

/** The new state of a match: what the page says, its club and its goals. */
export type Proposal = { clubId: number; goals: LinkedGoal[]; match: ReadMatch }

/**
 * What the changes of the season say that the judgement needs: for each match the values it had
 * before the changes of the last week, and the values that were rejected, and the change a
 * person rejected last, which the import leaves alone while the page still shows it.
 */
export type SeasonChanges = {
  history: (key: string) => MatchHistory
  /** The changes that wait, by the key of the match. */
  pending: Map<string, MatchChange>
  /** The value a person rejected last for the match, or undefined. `null` is a removal. */
  rejectedByPerson: (key: string) => null | string | undefined
}

type Writer = Pick<Database, 'delete' | 'insert' | 'select' | 'update'>

/**
 * Accepts the waiting changes with these numbers, or all of them: the match and its goals
 * become what the change proposes, and a removal deletes the match. A change that is not
 * waiting any more, or whose match is gone, is left alone and says so.
 */
export async function acceptChanges(db: Database, ids: 'all' | number[], now: Date): Promise<Decision[]> {
  const decisions: Decision[] = []

  for (const change of await changesToDecide(db, ids)) {
    // A change is taken over whole or not at all: the match, its goals and the decision.
    decisions.push(await db.transaction((transaction) => acceptChange(transaction, change, now)))
  }

  return decisions
}

/** The change of a match, as the key of its round: unique in a season. */
export function changeKey(change: Pick<MatchChange, 'competition' | 'round'>): string {
  return `${change.competition}|${change.round}`
}

/** Decides a waiting change. */
export async function decide(
  db: Pick<Database, 'update'>,
  change: Pick<MatchChange, 'id'>,
  status: 'accepted' | 'rejected',
  resolution: 'person' | 'replaced' | 'reverted' | 'stood',
  now: Date,
) {
  await db.update(matchChanges).set({ decidedAt: now, resolution, status }).where(eq(matchChanges.id, change.id))
}

/** The proposal in JSON text, or undefined when the text is not one we wrote. */
export function decodeProposal(text: null | string): Proposal | undefined {
  if (text === null) {
    return undefined
  }

  try {
    const parsed = JSON.parse(text, (name, value: unknown) =>
      name === 'kickoffAt' && typeof value === 'string' ? new Date(value) : value,
    ) as Proposal

    return Array.isArray(parsed.goals) && typeof parsed.clubId === 'number' && typeof parsed.match.round === 'string'
      ? parsed
      : undefined
  } catch {
    return undefined
  }
}

/** The proposal as JSON text, for `match_changes.proposal`. */
export function encodeProposal(proposal: Proposal): string {
  return JSON.stringify(proposal)
}

/** Whether a waiting change has stood long enough to be taken over. */
export function hasStood(change: MatchChange, now: Date): boolean {
  return now.getTime() - change.firstSeenAt.getTime() >= reliability.suspiciousStands
}

/** Notes that the import saw the waiting change again, with the same value. */
export async function noteSeen(db: Pick<Database, 'update'>, change: MatchChange, now: Date) {
  await db
    .update(matchChanges)
    .set({ lastSeenAt: now, timesSeen: change.timesSeen + 1 })
    .where(eq(matchChanges.id, change.id))
}

/** Reads the changes of a season, with what the judgement needs of the last week. */
export async function readSeasonChanges(db: Writer, season: string, now: Date): Promise<SeasonChanges> {
  const rows = await db.select().from(matchChanges).where(eq(matchChanges.season, season)).orderBy(asc(matchChanges.id))
  const since = now.getTime() - reliability.warLookback
  const pending = new Map<string, MatchChange>()
  const recent = new Map<string, MatchChange[]>()
  const last = new Map<string, MatchChange>()

  for (const row of rows) {
    const key = changeKey(row)

    if (row.status === 'pending') {
      pending.set(key, row)
    } else {
      last.set(key, row)
    }
    if (row.firstSeenAt.getTime() >= since) {
      recent.set(key, [...(recent.get(key) ?? []), row])
    }
  }

  return {
    history: (key) => ({
      rejected: (recent.get(key) ?? [])
        .filter((row) => row.status === 'rejected' && row.newValue !== null)
        .map((row) => row.newValue ?? ''),
      returnedTo: (recent.get(key) ?? []).map((row) => row.oldValue),
    }),
    pending,
    rejectedByPerson: (key) => {
      const row = last.get(key)

      return row?.status === 'rejected' && row.resolution === 'person' ? row.newValue : undefined
    },
  }
}

/** Keeps a change that waits, or a correction that was taken over, in `match_changes`. */
export async function recordChange(
  db: Pick<Database, 'insert'>,
  change: {
    competition: Match['competition']
    judgement: Judgement
    matchId: number
    newValue: null | string
    oldValue: string
    proposal: null | Proposal
    round: string
    season: string
  },
  now: Date,
  waits: boolean,
) {
  const values: NewMatchChange = {
    changed: change.judgement.changed.join(', '),
    class: waits ? 'suspicious' : 'improvement',
    competition: change.competition,
    decidedAt: waits ? null : now,
    firstSeenAt: now,
    lastSeenAt: now,
    matchId: change.matchId,
    newValue: change.newValue,
    oldValue: change.oldValue,
    proposal: change.proposal === null ? null : encodeProposal(change.proposal),
    reason: change.judgement.reason,
    resolution: waits ? null : 'applied',
    round: change.round,
    season: change.season,
    status: waits ? 'pending' : 'accepted',
  }

  await db.insert(matchChanges).values(values)
}

/** Rejects the waiting changes with these numbers, or all of them: the match stays as it is. */
export async function rejectChanges(
  db: Pick<Database, 'select' | 'update'>,
  ids: 'all' | number[],
  now: Date,
): Promise<Decision[]> {
  const decisions: Decision[] = []

  for (const change of await changesToDecide(db, ids)) {
    await decide(db, change, 'rejected', 'person', now)
    decisions.push({ change, message: 'rejected', ok: true })
  }

  return decisions
}

/** Writes the goals of a match in the order they are shown, so `id` keeps that order. */
export async function storeGoals(db: Pick<Database, 'insert'>, matchId: number, goals: LinkedGoal[]) {
  if (goals.length > 0) {
    await db.insert(matchGoals).values(
      goals.map(({ playerPage, ...goal }): NewMatchGoal => ({
        ...goal,
        matchId,
        wikipediaPage: playerPage,
      })),
    )
  }
}

/**
 * Makes a stored match what the page says. `result_set_at` moves only when the result does: it
 * is the moment the import first saw the result as it stands. The goals are written again when
 * `goalsChanged` says they differ.
 */
export async function updateMatch(
  db: Pick<Database, 'delete' | 'insert' | 'update'>,
  before: Pick<Match, 'goalsAgainst' | 'goalsFor' | 'id' | 'resultSetAt' | 'status'>,
  proposal: Proposal,
  goalsChanged: boolean,
  now: Date,
) {
  const { clubId, goals, match } = proposal
  const sameResult =
    before.status === match.status && before.goalsFor === match.goalsFor && before.goalsAgainst === match.goalsAgainst

  await db
    .update(matches)
    .set({
      ...match,
      clubId,
      resultSetAt: sameResult ? before.resultSetAt : match.status === 'played' ? now : null,
    })
    .where(eq(matches.id, before.id))

  if (goalsChanged) {
    await db.delete(matchGoals).where(eq(matchGoals.matchId, before.id))
    await storeGoals(db, before.id, goals)
  }
}

/** The changes that wait, oldest first, for any season. */
export async function waitingChanges(db: Pick<Database, 'select'>): Promise<MatchChange[]> {
  return db.select().from(matchChanges).where(eq(matchChanges.status, 'pending')).orderBy(asc(matchChanges.id))
}

/** Takes one waiting change over. */
async function acceptChange(db: Writer, change: MatchChange, now: Date): Promise<Decision> {
  const [row] = await db
    .select()
    .from(matches)
    .where(
      and(
        eq(matches.season, change.season),
        eq(matches.competition, change.competition),
        eq(matches.round, change.round),
      ),
    )

  if (row === undefined) {
    return { change, message: 'the match is not in the database any more', ok: false }
  }

  if (change.newValue === null) {
    await db.delete(matches).where(eq(matches.id, row.id))
  } else {
    const proposal = decodeProposal(change.proposal)

    if (proposal === undefined) {
      return { change, message: 'the change has no proposal to apply', ok: false }
    }

    await updateMatch(db, row, proposal, true, now)
  }

  await decide(db, change, 'accepted', 'person', now)

  return { change, message: 'accepted', ok: true }
}

/** The changes with these numbers that wait. A number that waits no more is left out. */
async function changesToDecide(db: Pick<Database, 'select'>, ids: 'all' | number[]): Promise<MatchChange[]> {
  if (ids !== 'all' && ids.length === 0) {
    return []
  }

  return db
    .select()
    .from(matchChanges)
    .where(
      ids === 'all'
        ? eq(matchChanges.status, 'pending')
        : and(eq(matchChanges.status, 'pending'), inArray(matchChanges.id, ids)),
    )
    .orderBy(asc(matchChanges.id))
}
