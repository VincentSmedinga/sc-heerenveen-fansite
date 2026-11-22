/*
 * The scoring of the game Fjouwer: the points of one player in one match, with the reason for
 * each part. The facts of a player come from a finished match report (`fantasyFacts`), and
 * `fantasyPoints` turns them into points. The numbers stand in one place, `fantasyScoring`,
 * which the card "Punten" and the rules page show, so the table and the sum cannot drift apart.
 * It needs no database. The decisions are in docs/beslissingen/site.md, under _De punten van
 * Fjouwer worden bij het lezen berekend_.
 */

import { type MatchReport, minutesPlayed, playedMatch, reportFinished, type ReportMatch } from './match-report.ts'

/** What a player did in a match, as `fantasyPoints` needs it. */
export type FantasyFacts = {
  /** Assists of goals that are not own goals. A shoot-out kick is no goal, so no assist. */
  assists: number
  /** Whether the club conceded no goal in the whole match (90 minutes, 120 with extra time). */
  cleanSheet: boolean
  /** Goals that are not own goals; a penalty counts, a shoot-out kick does not. */
  goals: number
  /** The line the player was chosen in. */
  line: FantasyLine
  /**
   * The minutes played, or `undefined` while they are not known (the report is not finished).
   * Then `fantasyPoints` gives nothing.
   */
  minutes: number | undefined
  /** Own goals of the player. */
  ownGoals: number
  /** Whether the player was sent off: a direct red card or a second yellow card. */
  red: boolean
  /** Whether the player got a yellow card. It stays out of the points after a red card. */
  yellow: boolean
}

/** The line of a player in the game: the line he was chosen in, not his position that day. */
export type FantasyLine = 'aanvaller' | 'doelman' | 'middenvelder' | 'verdediger'

/** The points of a player in a match, the total and the lines it is made of. */
export type FantasyPoints = { lines: readonly FantasyPointsLine[]; total: number }

/** One line of the points of a player: what happened, in words, and the points it gave. */
export type FantasyPointsLine = { points: number; reason: string }

/**
 * The points of each part. A goal depends on the line of the player; the clean sheet only
 * counts for a goalkeeper or a defender who played 60 minutes or more.
 */
export const fantasyScoring = {
  assist: 8,
  cleanSheet: 8,
  fullGame: 5,
  goal: { aanvaller: 10, doelman: 15, middenvelder: 12, verdediger: 15 },
  /** The minutes from which a player counts as having played a long time. */
  longMinutes: 60,
  ownGoal: -5,
  playedShort: 2,
  red: -8,
  yellow: -3,
} as const satisfies Record<string, unknown> & { goal: Record<FantasyLine, number> }

/** The words of a line in the reasons: "Doelpunt als aanvaller". */
export const fantasyLineWords: Record<FantasyLine, string> = {
  aanvaller: 'aanvaller',
  doelman: 'doelman',
  middenvelder: 'middenvelder',
  verdediger: 'verdediger',
}

const times = (count: number, one: string, many: string) => (count === 1 ? one : `${count} ${many}`)

/**
 * The facts of one player of ours in a match, from its report. `appearanceId` is the player in
 * the report and `line` the line he was chosen in. A player who is not in the report did not
 * play. The facts have `minutes: undefined` while the report is not finished.
 *
 * What counts: the goals in the report, in the regular time and in extra time. A kick in the
 * shoot-out is kept apart from the goals, so it never counts, as a goal or as an assist. A goal
 * against us is a goal of a team that is not ours or an own goal of one of ours: both have
 * `ours` false, so the clean sheet looks at the whole match, also for a player who went off.
 */
export function fantasyFacts(
  report: MatchReport,
  match: Pick<ReportMatch, 'extraTime' | 'goalsAgainst'>,
  appearanceId: number | undefined,
  line: FantasyLine,
): FantasyFacts {
  const finished = reportFinished(report)
  const conceded = Math.max(report.goals.filter((goal) => !goal.ours).length, match.goalsAgainst ?? 0)
  const base = { cleanSheet: conceded === 0, line }

  if (!finished) {
    return { ...base, assists: 0, goals: 0, minutes: undefined, ownGoals: 0, red: false, yellow: false }
  }

  if (appearanceId === undefined || !playedMatch(report, appearanceId)) {
    return { ...base, assists: 0, goals: 0, minutes: 0, ownGoals: 0, red: false, yellow: false }
  }

  const cards = report.cards.filter((card) => card.appearanceId === appearanceId)

  return {
    ...base,
    assists: report.goals.filter((goal) => goal.assistId === appearanceId && !goal.ownGoal).length,
    goals: report.goals.filter((goal) => goal.appearanceId === appearanceId && !goal.ownGoal).length,
    minutes: minutesPlayed(report, match, appearanceId),
    ownGoals: report.goals.filter((goal) => goal.appearanceId === appearanceId && goal.ownGoal).length,
    red: cards.some((card) => card.kind === 'rood' || card.kind === 'geel-rood'),
    yellow: cards.some((card) => card.kind === 'geel'),
  }
}

/**
 * The points of one player in one match, with the reason per part. A player who did not play
 * gets 0 and no lines. It returns `undefined` when the minutes are not known: the report is not
 * finished, and the points come when it is. The rules:
 *
 * - played up to and including 59 minutes: 2; 60 minutes or more: 5;
 * - a goal: 10 for an attacker, 12 for a midfielder, 15 for a defender or a goalkeeper;
 * - an assist: 8; an own goal: -5;
 * - no goal against for a goalkeeper or defender who played 60 minutes or more: 8;
 * - a yellow card: -3; a red card, direct or after two yellow cards: -8, instead of the yellow.
 *
 * A player's total can be negative: there is no floor.
 */
export function fantasyPoints(facts: FantasyFacts): FantasyPoints | undefined {
  const { minutes } = facts

  if (minutes === undefined) {
    return undefined
  }

  if (minutes <= 0) {
    return { lines: [], total: 0 }
  }

  const lines: FantasyPointsLine[] = []
  const long = minutes >= fantasyScoring.longMinutes

  lines.push(
    long
      ? { points: fantasyScoring.fullGame, reason: 'Gespeeld, vanaf 60 minuten' }
      : { points: fantasyScoring.playedShort, reason: 'Gespeeld, tot 60 minuten' },
  )

  if (facts.goals > 0) {
    const each = fantasyScoring.goal[facts.line]

    lines.push({
      points: facts.goals * each,
      reason: `${times(facts.goals, 'Doelpunt', 'doelpunten')} als ${fantasyLineWords[facts.line]}`,
    })
  }

  if (facts.assists > 0) {
    lines.push({
      points: facts.assists * fantasyScoring.assist,
      reason: times(facts.assists, 'Assist', 'assists'),
    })
  }

  if (facts.cleanSheet && long && (facts.line === 'doelman' || facts.line === 'verdediger')) {
    lines.push({ points: fantasyScoring.cleanSheet, reason: 'Geen tegendoelpunt' })
  }

  if (facts.ownGoals > 0) {
    lines.push({
      points: facts.ownGoals * fantasyScoring.ownGoal,
      reason: times(facts.ownGoals, 'Eigen doelpunt', 'eigen doelpunten'),
    })
  }

  if (facts.red) {
    lines.push({ points: fantasyScoring.red, reason: 'Rode kaart' })
  } else if (facts.yellow) {
    lines.push({ points: fantasyScoring.yellow, reason: 'Gele kaart' })
  }

  return { lines, total: lines.reduce((sum, line) => sum + line.points, 0) }
}

/**
 * What happened to a player, in a few plain words for the table "Jouw vier": "90 min, 2 goals,
 * geel", "72 min, assist" or "Niet gespeeld". The words match the lines of `fantasyPoints`.
 */
export function fantasySummary(facts: FantasyFacts): string {
  if (facts.minutes === undefined) {
    return ''
  }

  if (facts.minutes <= 0) {
    return 'Niet gespeeld'
  }

  const parts = [`${facts.minutes} min`]

  if (facts.goals > 0) {
    parts.push(times(facts.goals, 'goal', 'goals'))
  }

  if (facts.assists > 0) {
    parts.push(times(facts.assists, 'assist', 'assists'))
  }

  if (facts.ownGoals > 0) {
    parts.push(times(facts.ownGoals, 'eigen goal', 'eigen goals'))
  }

  if (
    facts.cleanSheet &&
    facts.minutes >= fantasyScoring.longMinutes &&
    (facts.line === 'doelman' || facts.line === 'verdediger')
  ) {
    parts.push('geen tegengoal')
  } else if (!facts.cleanSheet && (facts.line === 'doelman' || facts.line === 'verdediger')) {
    parts.push('tegengoal')
  }

  if (facts.red) {
    parts.push('rood')
  } else if (facts.yellow) {
    parts.push('geel')
  }

  return parts.join(', ')
}
