import type { PartProposal } from '@fansite/db/match-conflicts'
import type { GoalFields, GoalSnapshot } from '@fansite/db/match-edits'
import type { Match, MatchChange, NewMatchGoal } from '@fansite/db/schema'

import { oldSiteGoalsReason } from '@fansite/db/match-conflicts'
import { describeEntryGoals } from '@fansite/db/match-edits'
import {
  matchChanges,
  matchEdits,
  matches,
  matchGoalPlayerMaxLength,
  matchGoals,
  matchReports,
} from '@fansite/db/schema'
import { and, asc, eq, inArray } from 'drizzle-orm'

import type { OldSiteEvent, OldSiteMatch, OldSitePlayer } from './old-site-file.ts'
import type { OldSiteDatabase, OldSiteStepReport } from './old-site-step.ts'

import { decide } from './match-changes.ts'
import { deriveOldSiteMatches, matchKey, oldSiteSeason, oldSiteSource } from './old-site-matches.ts'
import { cleanOldSiteName } from './old-site-names.ts'
import { isOurCode, oldSitePlayerIds, oldSitePlayerKey, resolveOldSiteCode } from './old-site-players.ts'

/** The kinds of goal that are a penalty, with the spellings of the old editors. */
const penaltyKinds: ReadonlySet<string> = new Set(['penalty', 'srafschop', 'strafschop'])

/** The kind of goal that counts for the club that benefits. */
const ownGoalKind = 'eigen doelpunt'

/** A goal of a match as `match_goals` has it, apart from the match and the player's id. */
export type DerivedOldSiteGoal = {
  minute: null | number
  ours: boolean
  ownGoal: boolean
  penalty: boolean
  /** The full name of the scorer. */
  player: string
  /** The key of the scorer in `players` (`oldSitePlayerKey`), only for a player of ours. */
  playerKey: null | string
}

export type DerivedOldSiteGoals = {
  /** The goals of the files that name a scorer, by minute, whether they add up or not. */
  found: DerivedOldSiteGoal[]
  /** The goals the match gets: `found` when they add up to the score, and none otherwise. */
  goals: DerivedOldSiteGoal[]
  /** The goals for and against sc Heerenveen in the list, an own goal for the beneficiary. */
  listed: { against: number; for: number }
  state: OldSiteGoalState
}

/**
 * What the goals of a match are worth. `adds-up`: they add up to the score (also none, for a
 * match without goals), so they are stored. `none`: the match has goals in its score and no
 * list. `partial`: the list does not add up to the score. In the last two the match gets no
 * goals, because a list that contradicts the result would contradict the visitor too.
 */
export type OldSiteGoalState = 'adds-up' | 'none' | 'partial'

type StoredGoal = typeof matchGoals.$inferSelect

/** The goals of a match of the files, and whether they add up to its score. Pure. */
export function deriveOldSiteGoals(
  match: OldSiteMatch,
  score: { against: number; for: number },
  oldPlayers: ReadonlyMap<string, OldSitePlayer>,
): DerivedOldSiteGoals {
  const season = oldSiteSeason(match.season)
  const goals: DerivedOldSiteGoal[] = []
  let usable = true

  for (const event of match.events) {
    if (event.event !== 1) {
      continue
    }

    const goal = goalOf(event, season, oldPlayers)

    if (goal === undefined) {
      usable = false
    } else {
      goals.push(goal)
    }
  }

  // The list is in the order of the minute. A goal without a minute goes last, since the file
  // does not say where it belongs; the sort is stable, so the order of the file breaks ties.
  goals.sort((a, b) => (a.minute ?? Number.POSITIVE_INFINITY) - (b.minute ?? Number.POSITIVE_INFINITY))

  const listed = { against: goals.filter((goal) => !goal.ours).length, for: goals.filter((goal) => goal.ours).length }
  const addsUp = usable && listed.for === score.for && listed.against === score.against

  if (addsUp) {
    return { found: goals, goals, listed, state: 'adds-up' }
  }

  return { found: goals, goals: [], listed, state: goals.length === 0 && usable ? 'none' : 'partial' }
}

/** The goal of an event, or undefined when it has no scorer to name. */
function goalOf(
  event: OldSiteEvent,
  season: string,
  oldPlayers: ReadonlyMap<string, OldSitePlayer>,
): DerivedOldSiteGoal | undefined {
  const ownGoal = (event.kind ?? '').trim().toLowerCase() === ownGoalKind
  const kind = (event.kind ?? '').trim().toLowerCase()
  const minute = event.minute === 0 ? null : event.minute

  if (isOurCode(event.playerCode)) {
    const player = resolveOldSiteCode(event.playerCode, oldPlayers, season)

    if (player === undefined || player.name.length > matchGoalPlayerMaxLength) {
      return undefined
    }

    // An own goal of a player of ours counts for the opponent, who benefits.
    return {
      minute,
      ours: !ownGoal,
      ownGoal,
      penalty: !ownGoal && penaltyKinds.has(kind),
      player: player.name,
      playerKey: oldSitePlayerKey(season, player.name),
    }
  }

  // A player of the opponent: the name is in the field for the name, or in the field for the
  // code when the old editors typed it there (`X. Alberts`).
  const name = cleanOldSiteName(event.playerName ?? event.playerCode)

  if (name === '' || name.length > matchGoalPlayerMaxLength) {
    return undefined
  }

  return { minute, ours: ownGoal, ownGoal, penalty: !ownGoal && penaltyKinds.has(kind), player: name, playerKey: null }
}

/**
 * The goal events of a match in the order the goals are stored, so the goal at a place in
 * `DerivedOldSiteGoals.goals` of a match whose goals add up is the event at that place here.
 * The report (#879) needs the event for the assist.
 */
export const orderedOldSiteGoalEvents = (match: OldSiteMatch): OldSiteEvent[] =>
  match.events
    .filter((event) => event.event === 1)
    .toSorted(
      (a, b) =>
        (a.minute === 0 ? Number.POSITIVE_INFINITY : a.minute) - (b.minute === 0 ? Number.POSITIVE_INFINITY : b.minute),
    )

const goalFields = ['minute', 'ours', 'ownGoal', 'penalty', 'player', 'playerId', 'stoppageMinutes'] as const

/**
 * The step `doelpunten`: makes the rows in `match_goals` for every match with the source
 * `oude-fansite` whose goals add up to its score in the database, which is the score of the
 * editors when they corrected it. Needs the matches and the players of the steps before it. A
 * match whose goals do not add up gets none, and any it had from an earlier run are removed,
 * since a list that contradicts the result would contradict the visitor. They are not thrown
 * away: the list of the files and the goals the match had wait for the editors as a change
 * with the part `goals` (`oldSiteGoalsReason`), once for the same list (issue 973). The step
 * leaves the goals alone once the editors took that list over.
 * A match whose goals the editors filled in (`match_edits.goals_edited`), or whose report they
 * saved (`match_reports.saved_by`), is left as it is, and so is a match from another source.
 * A goal that exists is updated in place, so the links to a report (#879) stay.
 */
export async function importOldSiteGoals(
  db: Pick<OldSiteDatabase, 'delete' | 'insert' | 'select' | 'update'>,
  oldMatches: readonly OldSiteMatch[],
  oldPlayers: readonly OldSitePlayer[],
  now = new Date(),
): Promise<OldSiteStepReport> {
  const report: OldSiteStepReport = { changed: 0, created: 0, lines: [], skipped: 0, unchanged: 0 }
  const byCode = new Map(oldPlayers.map((player) => [player.code, player]))
  const derived = deriveOldSiteMatches(oldMatches)
  const seasons = [...new Set(derived.flatMap((one) => (one.values === null ? [] : [one.values.season])))]
  const playerIds = await oldSitePlayerIds(db, seasons)
  const stored = new Map<string, Match>()
  const editors = new Set<number>()
  const goalsOf = new Map<number, StoredGoal[]>()
  const keptOf = new Map<number, MatchChange[]>()

  for (const row of await db.select().from(matches).where(eq(matches.dataSource, oldSiteSource))) {
    stored.set(matchKey(row), row)
  }

  const ids = [...stored.values()].map((row) => row.id)

  if (ids.length > 0) {
    for (const row of await db.select().from(matchEdits).where(eq(matchEdits.goalsEdited, true))) {
      editors.add(row.matchId)
    }
    for (const row of await db.select().from(matchReports).where(inArray(matchReports.matchId, ids))) {
      if (row.savedBy !== null) {
        editors.add(row.matchId)
      }
    }
    for (const row of await db.select().from(matchGoals).orderBy(asc(matchGoals.id))) {
      goalsOf.set(row.matchId, [...(goalsOf.get(row.matchId) ?? []), row])
    }
    for (const row of await db
      .select()
      .from(matchChanges)
      .where(and(eq(matchChanges.part, 'goals'), eq(matchChanges.reason, oldSiteGoalsReason)))
      .orderBy(asc(matchChanges.id))) {
      if (row.matchId !== null) {
        keptOf.set(row.matchId, [...(keptOf.get(row.matchId) ?? []), row])
      }
    }
  }

  const counts = { 'adds-up': 0, none: 0, partial: 0, withGoals: 0 }

  for (const one of derived) {
    const { match, values } = one

    if (values === null || values.goalsFor === null || values.goalsAgainst === null) {
      continue
    }

    const label = `${values.season} ${match.code}`
    const before = stored.get(matchKey(values))

    if (before === undefined) {
      report.skipped += 1
      report.lines.push(`skipped the goals of ${label}: it is not in the database as a match of the old fansite`)
      continue
    }
    if (editors.has(before.id)) {
      report.skipped += 1
      report.lines.push(`skipped the goals of ${label}: the editors filled them in or saved a report, so they stay`)
      continue
    }

    // The score in the database counts, not the one of the files: the editors may have
    // corrected the result (`match_edits.result_edited`), and the step `matches` leaves it.
    const score = { against: before.goalsAgainst ?? values.goalsAgainst, for: before.goalsFor ?? values.goalsFor }
    const { found, goals, listed, state } = deriveOldSiteGoals(match, score, byCode)
    const rowOf = (goal: DerivedOldSiteGoal): NewMatchGoal => ({
      matchId: before.id,
      minute: goal.minute,
      ours: goal.ours,
      ownGoal: goal.ownGoal,
      penalty: goal.penalty,
      player: goal.player,
      playerId: goal.playerKey === null ? null : (playerIds.get(goal.playerKey) ?? null),
      stoppageMinutes: null,
    })
    const existing = goalsOf.get(before.id) ?? []
    const kept = keptOf.get(before.id) ?? []

    counts[state] += 1
    if (goals.length > 0) {
      counts.withGoals += 1
    }
    if (state === 'adds-up') {
      // The list is back in `match_goals`, so a change that waits for it has nothing to ask.
      for (const change of kept.filter((one) => one.status === 'pending')) {
        await decide(db, change, 'rejected', 'reverted', now)
      }
    } else {
      const inFiles = found.map((goal) => snapshotOf(rowOf(goal)))
      const list = describeEntryGoals(inFiles)

      if (kept.some((change) => change.status === 'accepted' && change.newValue === list)) {
        report.skipped += 1
        report.lines.push(`skipped the goals of ${label}: the editors took the list of the files over, so it stays`)
        continue
      }

      report.skipped += 1
      report.lines.push(
        `${label}: ${state === 'none' ? 'no goals' : `${listed.for + listed.against} of the goals`} for the score ${score.for}-${score.against}, so the match gets none`,
      )

      const waiting = kept.filter((change) => change.status === 'pending')

      for (const change of waiting.filter((one) => one.newValue !== list)) {
        await decide(db, change, 'rejected', 'replaced', now)
      }

      // Something to keep: goals in the files, or goals that are about to leave the match. The
      // same list is kept once: not again while it waits, and not again after a person decided
      // about it unless the match has goals to lose. A change that lapsed by itself does not
      // count, or a list that comes back in the files would wait nowhere.
      const known = waiting.some((change) => change.newValue === list)
      const decided =
        existing.length === 0 && kept.some((change) => change.newValue === list && change.resolution === 'person')

      if ((inFiles.length > 0 || existing.length > 0) && !known && !decided) {
        const proposal: PartProposal = { goals: inFiles, part: 'goals', stored: existing.map(snapshotOf) }

        await db.insert(matchChanges).values({
          changed: 'doelpunten',
          class: 'suspicious',
          competition: before.competition,
          firstSeenAt: now,
          lastSeenAt: now,
          matchId: before.id,
          newValue: list,
          oldValue: describeEntryGoals(existing),
          part: 'goals',
          proposal: JSON.stringify(proposal),
          reason: oldSiteGoalsReason,
          round: before.round,
          season: before.season,
          status: 'pending',
        })
        // Not in `created`: that counts the goals, and the line says a change was made.
        report.lines.push(`${label}: the goals are kept as a change that waits for the editors`)
      }
    }

    const wanted = goals.map(rowOf)

    for (const [index, goal] of wanted.entries()) {
      const row = existing[index]

      if (row === undefined) {
        await db.insert(matchGoals).values(goal)
        report.created += 1
        continue
      }

      const change: Record<string, unknown> = {}

      for (const field of goalFields) {
        if (row[field] !== (goal[field] ?? null)) {
          change[field] = goal[field] ?? null
        }
      }
      if (Object.keys(change).length === 0) {
        report.unchanged += 1
        continue
      }
      await db.update(matchGoals).set(change).where(eq(matchGoals.id, row.id))
      report.changed += 1
    }

    const surplus = existing.slice(wanted.length).map((row) => row.id)

    if (surplus.length > 0) {
      await db.delete(matchGoals).where(inArray(matchGoals.id, surplus))
      report.changed += surplus.length
      report.lines.push(
        `${label}: ${surplus.length} goals removed, ${state === 'adds-up' ? 'the files no longer have them' : 'they do not add up to the score'}`,
      )
    }
  }

  report.lines.unshift(
    `${counts.withGoals} matches get goals, ${counts['adds-up'] - counts.withGoals} add up without goals, ${counts.none} have a score and no goals, ${counts.partial} have part of the goals`,
  )

  return report
}

/** A goal as a proposal keeps it: the row of `match_goals` without the links to a report. */
function snapshotOf(goal: NewMatchGoal): GoalFields & GoalSnapshot {
  return {
    minute: goal.minute ?? null,
    ours: goal.ours,
    ownGoal: goal.ownGoal ?? false,
    penalty: goal.penalty ?? false,
    personId: goal.personId ?? null,
    player: goal.player,
    playerId: goal.playerId ?? null,
    stoppageMinutes: goal.stoppageMinutes ?? null,
    wikipediaPage: goal.wikipediaPage ?? null,
  }
}
