// What the import does with a match the editors filled in (`match_edits`, see issue 272). The
// entry is in `matches` and `match_goals`, and the import judges each part of it on its own,
// the kick-off, the result, the goals and the facts (the spectators, the referee, the stadium
// and the note), because Wikipedia usually has the result long
// before the goals:
//
// - Wikipedia has nothing for the part yet: the entry stays, and nothing is said.
// - Wikipedia has the same: the marker of the part is cleared and the log says that Wikipedia
//   caught up. The part follows Wikipedia from then on.
// - Wikipedia has something else: the entry stays, and the difference goes in the log and in
//   the warning of the import, once, with both values. The difference is also kept as a change
//   that waits in `match_changes` (once, per part), and the beheerders are mailed about it
//   (`mailConflicts`). A person decides in the admin or with `pnpm run import:changes`; when
//   nobody does and Wikipedia says the same for seven days, the importer takes Wikipedia over
//   and mails again. When Wikipedia puts the value of the editors back, the change lapses.
//
// The parts without a marker follow Wikipedia as for any match, without the judgement of
// `classify-change.ts`.
import type { Database } from '@fansite/db/client'
import type { Match, MatchEdit, MatchGoal } from '@fansite/db/schema'

import { recordAction } from '@fansite/db/audit-log'
import { decideConflict, encodePartProposal, quietReasons } from '@fansite/db/match-conflicts'
import {
  clearParts,
  describeEntryFacts,
  describeEntryGoals,
  describeEntryKickoff,
  describeEntryResult,
  type FactsFields,
  type GoalFields,
  type GoalSnapshot,
  type KickoffFields,
  markedParts,
  type MatchPart,
  type ResultFields,
} from '@fansite/db/match-edits'
import { matchChanges, matchEdits, matches } from '@fansite/db/schema'
import { and, eq, inArray, isNotNull, notInArray } from 'drizzle-orm'

import type { LinkedGoal } from './match-changes.ts'
import type { ReadMatch } from './read-wikipedia.ts'

import { decide, hasStood, noteSeen } from './match-changes.ts'

/** What Wikipedia says about a part, compared with the entry of the editors. */
export type Verdict = 'different' | 'nothing' | 'same'

/** Why a difference is kept as a change that waits. */
export const conflictReason = 'wijkt af van de invoer van de redactie'

const partNames: Record<MatchPart, { dutch: string; english: string }> = {
  facts: { dutch: 'gegevens', english: 'facts' },
  goals: { dutch: 'doelpunten', english: 'goals' },
  kickoff: { dutch: 'aftrap', english: 'kick-off' },
  result: { dutch: 'uitslag', english: 'result' },
}

/**
 * Handles one match with an entry: judges its four parts, writes what the log and the warning
 * need and clears the markers of the parts Wikipedia caught up with. The caller makes the match
 * the entry where a marker stays and Wikipedia where there is none (`mergeEntry`). It returns
 * the parts that stay the entry's, and the warnings for the import.
 */
export async function importEditedMatch(
  db: Pick<Database, 'delete' | 'insert' | 'select' | 'update'>,
  {
    before,
    edit,
    storedGoals,
    wikipedia,
    wikipediaGoals,
  }: {
    before: Match
    edit: MatchEdit
    storedGoals: MatchGoal[]
    wikipedia: ReadMatch
    wikipediaGoals: LinkedGoal[]
  },
  now: Date,
): Promise<{ keep: MatchPart[]; warnings: string[] }> {
  const warnings: string[] = []
  const goalsOfWikipedia: GoalFields[] = wikipediaGoals.map((goal) => ({ ...goal }))
  const judged: Partial<Record<MatchPart, { entry: string; verdict: Verdict; wikipedia: string }>> = {}

  if (edit.kickoffEdited) {
    judged.kickoff = {
      entry: describeEntryKickoff(before),
      verdict: judgeKickoff(before, wikipedia),
      wikipedia: describeEntryKickoff(wikipedia),
    }
  }
  if (edit.resultEdited) {
    judged.result = {
      entry: describeEntryResult(before),
      verdict: judgeResult(before, wikipedia),
      wikipedia: describeEntryResult({ ...wikipedia, opponent: before.opponent }),
    }
  }
  if (edit.factsEdited) {
    judged.facts = {
      entry: describeEntryFacts(before),
      verdict: judgeFacts(before, wikipedia),
      wikipedia: describeEntryFacts(wikipedia),
    }
  }
  if (edit.goalsEdited) {
    judged.goals = {
      entry: describeEntryGoals(storedGoals),
      verdict: judgeGoals(storedGoals, goalsOfWikipedia),
      wikipedia: describeEntryGoals(goalsOfWikipedia),
    }
  }

  const caughtUp: MatchPart[] = []
  const takenOver: MatchPart[] = []
  const reported: Partial<Record<MatchPart, null | string>> = {}
  const waiting = new Map(
    (
      await db
        .select()
        .from(matchChanges)
        .where(
          and(
            eq(matchChanges.matchId, before.id),
            eq(matchChanges.status, 'pending'),
            isNotNull(matchChanges.part),
            // A difference between two sources has its own rules: only a person decides it.
            notInArray(matchChanges.reason, [...quietReasons]),
          ),
        )
    ).map((change) => [change.part as MatchPart, change]),
  )

  for (const part of ['kickoff', 'result', 'goals', 'facts'] as const) {
    const found = judged[part]

    if (found === undefined) {
      continue
    }

    const previous = {
      facts: edit.reportedFacts,
      goals: edit.reportedGoals,
      kickoff: edit.reportedKickoff,
      result: edit.reportedResult,
    }[part]
    const pending = waiting.get(part)

    if (found.verdict === 'same') {
      caughtUp.push(part)
      await recordAction(
        db,
        {
          action: 'match.caught-up',
          detail: clean(
            `${capital(partNames[part].dutch)}: Wikipedia heeft nu hetzelfde als de invoer: ${found.wikipedia}${pending === undefined ? '' : '. De afwijking is vervallen.'}`,
          ),
          itemId: before.id,
          reason: `Wikipedia heeft de ${partNames[part].dutch} van de wedstrijd overgenomen`,
          userId: null,
        },
        now,
      )
      if (pending !== undefined) {
        await decide(db, pending, 'rejected', 'reverted', now)
      }
    } else if (found.verdict === 'different') {
      const proposal = encodePartProposal(part, { goals: snapshotsOf(wikipediaGoals), match: wikipedia })

      if (pending?.newValue === found.wikipedia) {
        // The difference that waits is still on the page: see it again, and take Wikipedia over
        // when it has stood for seven days and nobody decided.
        await db.update(matchChanges).set({ proposal }).where(eq(matchChanges.id, pending.id))
        await noteSeen(db, pending, now)

        if (
          hasStood(pending, now) &&
          (await decideConflict(
            db,
            pending.id,
            {
              kind: 'take-over',
              reason: 'Niemand besliste in zeven dagen, dus de import nam Wikipedia over',
              resolution: 'stood',
              userId: null,
            },
            now,
          )) === 'done'
        ) {
          takenOver.push(part)
        }

        continue
      }
      if (pending !== undefined) {
        await decide(db, pending, 'rejected', 'replaced', now)
      }
      if (previous !== found.wikipedia) {
        reported[part] = found.wikipedia
        await recordAction(
          db,
          {
            action: 'match.differs',
            detail: clean(
              `${capital(partNames[part].dutch)}: onze invoer: ${found.entry}; Wikipedia: ${found.wikipedia}`,
            ),
            itemId: before.id,
            reason: `Wikipedia wijkt af van de invoer van de redactie (${partNames[part].dutch})`,
            userId: null,
          },
          now,
        )
        warnings.push(
          `held, ${before.round} (${before.competition}): Wikipedia differs from the entry of the editors in the ${partNames[part].english}: ours ${found.entry}, Wikipedia ${found.wikipedia}`,
        )
        await keepDifference(db, before, part, found, proposal, now)
      } else if (!(await hasDecided(db, before.id, part, found.wikipedia))) {
        // Reported before there were changes for it: keep it now, without saying it again.
        await keepDifference(db, before, part, found, proposal, now)
      }
    } else {
      if (previous !== null) {
        // Wikipedia took its different value back, so the next difference is news again.
        reported[part] = null
      }
      if (pending !== undefined) {
        await decide(db, pending, 'rejected', 'reverted', now)
      }
    }
  }

  // The reported values are written before the markers go, because clearing the last marker
  // removes the row.
  if (Object.keys(reported).length > 0) {
    await db
      .update(matchEdits)
      .set({
        ...('facts' in reported ? { reportedFacts: reported.facts } : {}),
        ...('goals' in reported ? { reportedGoals: reported.goals } : {}),
        ...('kickoff' in reported ? { reportedKickoff: reported.kickoff } : {}),
        ...('result' in reported ? { reportedResult: reported.result } : {}),
      })
      .where(eq(matchEdits.matchId, edit.matchId))
  }
  if (caughtUp.length > 0) {
    // Taking a part over cleared its marker already, so read the row as it is now.
    const [current] = await db.select().from(matchEdits).where(eq(matchEdits.matchId, edit.matchId))

    if (current !== undefined) {
      await clearParts(db, current, caughtUp)
    }
  }

  return { keep: markedParts(edit).filter((part) => !caughtUp.includes(part) && !takenOver.includes(part)), warnings }
}

/**
 * Whether the facts of the entry are what Wikipedia says. Wikipedia says nothing about a fact
 * it lacks, so only a fact it has can differ from the entry.
 */
export function judgeFacts(entry: FactsFields, wikipedia: FactsFields): Verdict {
  const keys = ['attendance', 'note', 'referee', 'stadium'] as const

  if (keys.every((key) => entry[key] === wikipedia[key])) {
    return 'same'
  }

  return keys.some((key) => wikipedia[key] !== null && wikipedia[key] !== entry[key]) ? 'different' : 'nothing'
}

/**
 * Whether the goals of the entry are the goals Wikipedia names, or Wikipedia names none yet.
 * The order of two goals in the same minute does not matter. A goal of one of our players is
 * the same when it has the same player, every other goal when it has the same name in any case.
 */
export function judgeGoals(entry: GoalFields[], wikipedia: GoalFields[]): Verdict {
  const keyOf = (goal: GoalFields) =>
    [
      goal.ours ? 1 : 0,
      goal.minute,
      goal.stoppageMinutes ?? '',
      goal.ownGoal ? 1 : 0,
      goal.penalty ? 1 : 0,
      goal.playerId === null ? `n:${goal.player.toLocaleLowerCase('nl')}` : `p:${goal.playerId}`,
    ].join('|')
  const sorted = (goals: GoalFields[]) => goals.map(keyOf).toSorted()

  if (JSON.stringify(sorted(entry)) === JSON.stringify(sorted(wikipedia))) {
    return 'same'
  }

  return wikipedia.length === 0 ? 'nothing' : 'different'
}

/** Whether the kick-off of the entry is what Wikipedia says, or Wikipedia has no time yet. */
export function judgeKickoff(entry: KickoffFields, wikipedia: KickoffFields): Verdict {
  if (
    entry.kickoffAt?.getTime() === wikipedia.kickoffAt?.getTime() &&
    entry.dateText === wikipedia.dateText &&
    entry.matchDate === wikipedia.matchDate
  ) {
    return 'same'
  }

  return wikipedia.kickoffAt === null && entry.kickoffAt !== null ? 'nothing' : 'different'
}

/** Whether the result of the entry is what Wikipedia says, or Wikipedia has no result yet. */
export function judgeResult(entry: ResultFields, wikipedia: ResultFields): Verdict {
  if (
    entry.status === wikipedia.status &&
    entry.goalsFor === wikipedia.goalsFor &&
    entry.goalsAgainst === wikipedia.goalsAgainst &&
    entry.extraTime === wikipedia.extraTime &&
    entry.penaltiesFor === wikipedia.penaltiesFor &&
    entry.penaltiesAgainst === wikipedia.penaltiesAgainst &&
    entry.afterNinetyFor === wikipedia.afterNinetyFor &&
    entry.afterNinetyAgainst === wikipedia.afterNinetyAgainst
  ) {
    return 'same'
  }

  return wikipedia.status === 'scheduled' ? 'nothing' : 'different'
}

/** Keeps a part of the match as the entry has it, on top of what Wikipedia says. */
export function mergeEntry(before: Match, wikipedia: ReadMatch, keep: MatchPart[]): ReadMatch {
  const merged: ReadMatch = {
    ...wikipedia,
    ...(keep.includes('kickoff')
      ? { dateText: before.dateText, kickoffAt: before.kickoffAt, matchDate: before.matchDate }
      : {}),
    ...(keep.includes('result')
      ? {
          afterNinetyAgainst: before.afterNinetyAgainst,
          afterNinetyFor: before.afterNinetyFor,
          extraTime: before.extraTime,
          goalsAgainst: before.goalsAgainst,
          goalsFor: before.goalsFor,
          penaltiesAgainst: before.penaltiesAgainst,
          penaltiesFor: before.penaltiesFor,
          status: before.status,
        }
      : {}),
    ...(keep.includes('facts')
      ? { attendance: before.attendance, note: before.note, referee: before.referee, stadium: before.stadium }
      : {}),
  }

  // Only a played match has a number of spectators, whatever the entry says about the status.
  return merged.status === 'played' ? merged : { ...merged, attendance: null }
}

/** The rows of `match_edits` of the matches of this season, by the number of the match. */
export async function readEdits(db: Pick<Database, 'select'>, season: string): Promise<Map<number, MatchEdit>> {
  const ids = (await db.select({ id: matches.id }).from(matches).where(eq(matches.season, season))).map((row) => row.id)

  if (ids.length === 0) {
    return new Map()
  }

  return new Map(
    (await db.select().from(matchEdits).where(inArray(matchEdits.matchId, ids))).map((edit) => [edit.matchId, edit]),
  )
}

function capital(text: string): string {
  return `${text.slice(0, 1).toLocaleUpperCase('nl')}${text.slice(1)}`
}

/** A text for the log: no control characters, one line. */
function clean(text: string): string {
  return text.replace(/[\p{Cc}\p{Zl}\p{Zp}]+/gu, ' ').trim()
}

/** Whether a change for this part and this value of Wikipedia exists, decided or not. */
async function hasDecided(db: Pick<Database, 'select'>, matchId: number, part: MatchPart, wikipedia: string) {
  const found = await db
    .select({ id: matchChanges.id })
    .from(matchChanges)
    .where(and(eq(matchChanges.matchId, matchId), eq(matchChanges.part, part), eq(matchChanges.newValue, wikipedia)))
    .limit(1)

  return found.length > 0
}

/** Keeps a difference as a change that waits, for the beheerders to decide. */
async function keepDifference(
  db: Pick<Database, 'insert'>,
  match: Match,
  part: MatchPart,
  found: { entry: string; wikipedia: string },
  proposal: string,
  now: Date,
) {
  await db.insert(matchChanges).values({
    changed: partNames[part].dutch,
    class: 'suspicious',
    competition: match.competition,
    firstSeenAt: now,
    lastSeenAt: now,
    matchId: match.id,
    newValue: found.wikipedia,
    oldValue: found.entry,
    part,
    proposal,
    reason: conflictReason,
    round: match.round,
    season: match.season,
    status: 'pending',
  })
}

/** The goals of Wikipedia as `match_goals` keeps them. */
function snapshotsOf(goals: LinkedGoal[]): GoalSnapshot[] {
  return goals.map(({ playerPage, ...goal }) => ({ ...goal, wikipediaPage: playerPage }))
}
