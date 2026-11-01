// Judges how reliable a change of a match on Wikipedia looks, as pure functions. Anyone can
// edit Wikipedia, so the import takes over what is plainly new, takes over a correction of a
// few hours old with a note, and lets anything else wait (see `match-changes.ts`). It knows
// only what the import saw: the page, the time of the match and the moments the import saw
// something for the first time. The boundaries are in `reliability`.
import type { Match, MatchGoal } from '@fansite/db/schema'

import type { ReadGoal } from './read-wikipedia.ts'

const hour = 60 * 60 * 1000
const day = 24 * hour

/**
 * The boundaries of the judgement. A moment inside a window is strictly shorter than the
 * window: a result that stood exactly three days is outside it.
 */
export const reliability = {
  /** A correction this soon after the result was first seen goes through with a note. */
  correctionWithin: day,
  /** More matches than this that overwrite what we have, in one run, look like a page edit. */
  mostChangesInARun: 6,
  /** A match this recent still gets corrections, and its first result is news. */
  recentMatch: 3 * day,
  /** A suspicious change that stays on the page this long is taken over. */
  suspiciousStands: 7 * day,
  /** How far back a change counts when we look for a match that flips back and forth. */
  warLookback: 7 * day,
}

export type ChangeClass = 'improvement' | 'new' | 'suspicious'

export type ChangeInput = {
  at: Date
  before: MatchState & { resultSetAt: Date | null }
  beforeGoals: GoalState[]
  /** True when the import never read this season, so nothing stored comes from Wikipedia. */
  firstRead: boolean
  history: MatchHistory
  now: MatchState
  nowGoals: GoalState[]
  /** True for a season that is over: its matches don't change. */
  pastSeason: boolean
  /** The last time the import read the pages with success, before this run. */
  previousReadAt: Date | null
}

/** A goal as the importer compares it, with the player and the page it is linked to. */
export type GoalState = Pick<ReadGoal, 'minute' | 'ours' | 'ownGoal' | 'penalty' | 'player' | 'stoppageMinutes'> & {
  page: null | string
  playerId: null | number
}

/** What the importer judged about the change of one match. */
export type Judgement = {
  /** What changed: `result`, `goals`, `date`, `opponent`, `stadium` or `removed`. */
  changed: string[]
  class: ChangeClass
  /** Whether the change replaces information we had, not only fills in what was empty. */
  overwrites: boolean
  /** Why the change is not plainly new. Empty for a new change. */
  reason: string
}

/** What the history of a match says: the values it had before, and the changes undone. */
export type MatchHistory = {
  /** The values that a person or Wikipedia rejected in the last week. */
  rejected: string[]
  /** The values the match had before the changes of the last week. */
  returnedTo: string[]
}

/** A match as the importer compares it: the stored row and the match from the page fit. */
export type MatchState = Pick<
  Match,
  | 'afterNinetyAgainst'
  | 'afterNinetyFor'
  | 'clubId'
  | 'dateText'
  | 'extraTime'
  | 'goalsAgainst'
  | 'goalsFor'
  | 'home'
  | 'kickoffAt'
  | 'matchDate'
  | 'opponent'
  | 'penaltiesAgainst'
  | 'penaltiesFor'
  | 'stadium'
  | 'status'
>

const rank: Record<ChangeClass, number> = { improvement: 1, new: 0, suspicious: 2 }

type GoalDifference = 'added' | 'changed' | 'links' | 'same'

/** A span the way a warning says it: hours below two days, days from there. */
export function describeSpan(milliseconds: number): string {
  const hours = Math.floor(milliseconds / hour)

  return hours < 48 ? `${hours} ${hours === 1 ? 'hour' : 'hours'}` : `${Math.floor(hours / 24)} days`
}

/**
 * The whole match and its goals in one line: this is `old_value` and `new_value` in
 * `match_changes`, and two matches are the same for the judgement when this line is the same.
 * It leaves out the links of the goals, which the squad can change.
 */
export function describeState(match: MatchState, goals: GoalState[]): string {
  const score =
    match.status === 'played'
      ? `${match.goalsFor}-${match.goalsAgainst}${match.extraTime ? ' a.e.t.' : ''}${match.afterNinetyFor === null ? '' : ` (90 min ${match.afterNinetyFor}-${match.afterNinetyAgainst})`}${match.penaltiesFor === null ? '' : ` pens ${match.penaltiesFor}-${match.penaltiesAgainst}`}`
      : match.status
  const when = match.kickoffAt === null ? (match.dateText ?? match.matchDate) : match.kickoffAt.toISOString()
  const head = `${match.home ? 'home' : 'away'} ${match.opponent}, ${when}${match.stadium === null ? '' : `, ${match.stadium}`}: ${score}`

  return goals.length === 0 ? head : `${head}; ${goals.map(describeGoal).join(', ')}`
}

/** The goal of a stored row as the importer compares it. */
export function goalStateOf(goal: MatchGoal): GoalState {
  return { ...goal, page: goal.wikipediaPage }
}

/** The goal of a read match as the importer compares it. */
export function goalStateOfRead(goal: ReadGoal & { playerId: null | number }): GoalState {
  return { ...goal, page: goal.playerPage }
}

/** The moment a match starts, or the start of its day while the time is unknown. UTC. */
export function startOf(match: Pick<MatchState, 'kickoffAt' | 'matchDate'>): Date {
  return match.kickoffAt ?? new Date(`${match.matchDate}T00:00:00Z`)
}

/**
 * How the goals we have differ from the goals on the page: `added` when every goal we have is
 * still there and others come with it, `links` when the goals are the same and only their
 * player or page differs, and `changed` when a goal we have is replaced, altered or gone.
 */
function compareGoals(before: GoalState[], now: GoalState[]): GoalDifference {
  const left = before.map(describeGoal)
  const right = now.map(describeGoal)

  if (left.length === right.length && left.every((goal, index) => goal === right[index])) {
    return before.every((goal, index) => goal.playerId === now[index]?.playerId && goal.page === now[index]?.page)
      ? 'same'
      : 'links'
  }

  const remaining = [...right]

  for (const goal of left) {
    const index = remaining.indexOf(goal)

    if (index === -1) {
      return 'changed'
    }

    remaining.splice(index, 1)
  }

  return 'added'
}

/** The goal as one piece of text, without its links: what a person and the comparison read. */
function describeGoal(goal: GoalState): string {
  const minute = goal.stoppageMinutes === null ? `${goal.minute}` : `${goal.minute}+${goal.stoppageMinutes}`
  const kind = goal.ownGoal ? ' own goal' : goal.penalty ? ' penalty' : ''

  return `${minute}' ${goal.player} (${goal.ours ? 'ours' : 'theirs'}${kind})`
}

/** The part of the change that is about the score and what decides it. */
function resultChange(before: MatchState, now: MatchState): 'appears' | 'changes' | 'same' {
  const sameScore = before.goalsFor === now.goalsFor && before.goalsAgainst === now.goalsAgainst
  const extraTimeComes = !before.extraTime && now.extraTime
  const penaltiesCome = before.penaltiesFor === null && now.penaltiesFor !== null
  const samePenalties = before.penaltiesFor === now.penaltiesFor && before.penaltiesAgainst === now.penaltiesAgainst
  const sameExtraTime = before.extraTime === now.extraTime
  const sameNinety =
    before.afterNinetyFor === now.afterNinetyFor && before.afterNinetyAgainst === now.afterNinetyAgainst
  const ninetyComes = before.afterNinetyFor === null && now.afterNinetyFor !== null

  if (sameScore && sameExtraTime && samePenalties && sameNinety) {
    return 'same'
  }

  // A shoot-out, extra time or the score after 90 minutes that arrives with the same score is
  // news, not a change.
  return sameScore &&
    (extraTimeComes || sameExtraTime) &&
    (penaltiesCome || samePenalties) &&
    (ninetyComes || sameNinety)
    ? 'appears'
    : 'changes'
}

/** The more doubtful of two judgements, with the first reason of the worse one. */
function worse(left: Judgement, right: Judgement): Judgement {
  const winner = rank[right.class] > rank[left.class] ? right : left

  return {
    changed: [...new Set([...left.changed, ...right.changed])],
    class: winner.class,
    overwrites: left.overwrites || right.overwrites,
    reason: winner.reason,
  }
}

const nothing: Judgement = { changed: [], class: 'new', overwrites: false, reason: '' }

/**
 * Judges the change of a match we have, from what is stored to what the page says now. Anything
 * the rules don't name is suspicious. Call it only for a match that differs: the result of two
 * equal matches is a new change that changes nothing.
 */
export function classifyChange(input: ChangeInput): Judgement {
  const { firstRead, history, now, nowGoals, pastSeason } = input

  if (firstRead) {
    return { ...nothing, changed: ['everything'] }
  }

  const base = judge(input)

  if (base.class === 'new' && base.changed.length === 0) {
    return base
  }
  // A match of a season that is over may get what it lacked, but nothing else changes.
  if (pastSeason && (base.class !== 'new' || base.overwrites)) {
    return {
      ...base,
      class: 'suspicious',
      overwrites: true,
      reason: 'the season is over, and its matches do not change',
    }
  }

  const value = describeState(now, nowGoals)

  if (base.class !== 'suspicious' && history.returnedTo.includes(value)) {
    return { ...base, class: 'suspicious', reason: 'the match is back at a value it had before: it may be an edit war' }
  }
  if (base.class !== 'suspicious' && history.rejected.includes(value)) {
    return { ...base, class: 'suspicious', reason: 'a change that was rejected has come back' }
  }

  return base
}

/**
 * Judges a match we have that is no longer on the page. It is suspicious, unless the import has
 * never read this season: then the match was not from Wikipedia (the made-up matches of the
 * seed), and the page replaces it.
 */
export function classifyRemoval(firstRead: boolean, pastSeason: boolean): Judgement {
  if (firstRead) {
    return { changed: ['removed'], class: 'new', overwrites: false, reason: '' }
  }

  return {
    changed: ['removed'],
    class: 'suspicious',
    overwrites: true,
    reason: pastSeason ? 'the season is over, and its matches do not change' : 'the match is no longer on the page',
  }
}

/** Whether the changes of one run look like an edit of the whole page. */
export function isMassChange(overwrites: number): boolean {
  return overwrites > reliability.mostChangesInARun
}

function judge({ at, before, beforeGoals, now, nowGoals, previousReadAt }: ChangeInput): Judgement {
  const age = at.getTime() - startOf(before).getTime()
  const recent = age < reliability.recentMatch
  // The same name under another article is the same opponent: the link was corrected.
  const sameIdentity = (before.clubId === now.clubId || before.opponent === now.opponent) && before.home === now.home
  const sameDate = before.matchDate === now.matchDate && before.kickoffAt?.getTime() === now.kickoffAt?.getTime()
  let judgement = nothing

  // Something we showed that changes: free for a match that is not played, a correction when
  // the match is recent, and suspicious after that.
  const shown = (changed: string, what: string) =>
    before.status !== 'played'
      ? part(changed, 'new', '', true)
      : part(
          changed,
          recent ? 'improvement' : 'suspicious',
          `${what} of a match played ${describeSpan(age)} ago changed`,
          true,
        )

  if (!sameIdentity) {
    judgement = worse(judgement, shown('opponent', 'the opponent or the venue'))
  } else if (before.opponent !== now.opponent) {
    judgement = worse(judgement, shown('opponent', 'the name of the opponent'))
  } else if (before.clubId !== now.clubId) {
    // The same name under another article: only the link was corrected.
    judgement = worse(judgement, part('opponent', 'new'))
  }
  if (before.stadium !== now.stadium) {
    judgement = worse(judgement, before.stadium === null ? part('stadium', 'new') : shown('stadium', 'the stadium'))
  }
  if (before.dateText !== now.dateText) {
    // The weekend that becomes a day, or a time, is news; a played match keeps its date.
    judgement = worse(
      judgement,
      before.dateText !== null && now.dateText !== null && before.status === 'played'
        ? shown('date', 'the date')
        : part('date', 'new'),
    )
  }
  if (!sameDate) {
    judgement = worse(
      judgement,
      before.status !== 'played'
        ? part('date', 'new', '', before.kickoffAt !== null)
        : part(
            'date',
            recent ? 'improvement' : 'suspicious',
            `the date of a match played ${describeSpan(age)} ago changed`,
            true,
          ),
    )
  }

  if (before.status !== 'played') {
    // A planned or postponed match that gets a result, a new time or a new date.
    if (now.status === 'played') {
      const startedAt = startOf(now).getTime()
      const late = at.getTime() - startedAt >= reliability.recentMatch
      // We did look after the first days and saw no result: a result that comes now is late.
      const looked = previousReadAt !== null && previousReadAt.getTime() - startedAt >= reliability.recentMatch

      judgement = worse(
        judgement,
        late && looked
          ? part('result', 'suspicious', `the result came ${describeSpan(at.getTime() - startedAt)} after the match`)
          : part('result', 'new'),
      )
    } else if (before.status !== now.status) {
      judgement = worse(judgement, part('date', 'new'))
    }

    return judgement
  }

  if (now.status !== 'played') {
    return worse(judgement, part('result', 'suspicious', 'a played match is no longer played', true))
  }

  const result = resultChange(before, now)

  if (result === 'appears') {
    judgement = worse(judgement, part('result', 'new'))
  } else if (result === 'changes') {
    const stood = before.resultSetAt
    const since = stood === null ? null : at.getTime() - stood.getTime()

    judgement = worse(
      judgement,
      since !== null && since < reliability.correctionWithin && recent
        ? part('result', 'improvement', `the result changed after ${describeSpan(since)}`, true)
        : part(
            'result',
            'suspicious',
            since === null
              ? 'the result changed and we do not know how long it stood'
              : `the result changed after ${describeSpan(since)}`,
            true,
          ),
    )
  }

  const goals = compareGoals(beforeGoals, nowGoals)

  if (goals === 'added' || goals === 'links') {
    judgement = worse(judgement, part('goals', 'new'))
  } else if (goals === 'changed') {
    judgement = worse(
      judgement,
      recent
        ? part('goals', 'improvement', `the goals changed in a match played ${describeSpan(age)} ago`, true)
        : part('goals', 'suspicious', `the goals changed in a match played ${describeSpan(age)} ago`, true),
    )
  }

  return judgement
}

function part(changed: string, kind: ChangeClass, reason = '', overwrites = false): Judgement {
  return { changed: [changed], class: kind, overwrites, reason }
}
