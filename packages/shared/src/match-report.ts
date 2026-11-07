/*
 * The rules of a match report, in one place. The admin that fills a report in, the paste of a
 * report and the page of the match all use these functions, and none of them needs a database.
 *
 * A report is a plain object (`MatchReport`): the players of both teams, the substitutions, the
 * cards, the missed penalties and the goals, with a number for each player (`id`) that the
 * events point to. `checkMatchReport` gives the errors and the warnings, each with a code, the
 * place and a Dutch sentence; `minutesPlayed` works out the minutes of a player from the same
 * events. The decisions are in docs/beslissingen/hosting-en-data.md, under the heading _De
 * regels voor een verslag staan op één plek_.
 *
 * Time is the minute on the clock and the minutes of added time after it, as `45` and `2` for
 * "45+2". Added time of a half comes before the next half, so 45+2 is earlier than 46.
 */

export type CardKind = 'geel' | 'geel-rood' | 'rood'

export type IncidentKind = 'strafschop-gemist' | 'strafschop-gestopt'

export type MatchReport = {
  appearances: ReportAppearance[]
  cards: ReportCard[]
  /** Leave it out for a report that has no formations, such as one that is read from a text. */
  formations?: ReportFormations | undefined
  goals: ReportGoal[]
  incidents: ReportIncident[]
  /** Whether the side of the opponent is complete too. */
  opponentComplete: boolean
  /** Leave it out for a report that has no shoot-out, such as one that is read from a text. */
  shootout?: ReportShootoutKick[] | undefined
  status: ReportStatus
  substitutions: ReportSubstitution[]
}

/**
 * A player in the line-up or on the bench. `id` is any number that is different for each player
 * of the report, such as the id in the database; the events point to it.
 */
export type ReportAppearance = {
  captain: boolean
  id: number
  name: string
  ours: boolean
  shirtNumber: number
  starter: boolean
}

export type ReportCard = ReportTime & {
  appearanceId: number
  kind: CardKind
}

/**
 * The formations of the two teams, such as `4-3-3`, or empty when the report has none. They are
 * checked with `formationProblem`.
 */
export type ReportFormations = { opponent: null | string; ours: null | string }

/**
 * A goal. `ours` is the team that gets the goal, so an own goal has the team that benefits,
 * and its scorer is a player of the other team. `appearanceId` and `assistId` are empty for a
 * goal without a player in the report.
 */
export type ReportGoal = ReportTime & {
  appearanceId: null | number
  assistId: null | number
  ours: boolean
  ownGoal: boolean
  penalty: boolean
}

export type ReportIncident = ReportTime & {
  appearanceId: number
  kind: IncidentKind
}

/**
 * What the rules need to know of the match: whether it was played, its score, extra time and
 * the result of the shoot-out (both empty when there was none).
 */
export type ReportMatch = {
  extraTime: boolean
  goalsAgainst: null | number
  goalsFor: null | number
  penaltiesAgainst: null | number
  penaltiesFor: null | number
  status: string
}

/**
 * A kick in the penalty shoot-out. `round` counts from 1 for each team, `ours` is the team that
 * kicks, and `appearanceId` is the kicker, or empty for an opponent whose side is not complete.
 * A kick is not a goal.
 */
export type ReportShootoutKick = {
  appearanceId: null | number
  ours: boolean
  outcome: ShootoutOutcome
  round: number
}

export type ReportStatus = 'bezig' | 'klaar'

export type ReportSubstitution = ReportTime & {
  /** The player who comes on. */
  inId: number
  /** The player who goes off. */
  outId: number
}

/** A moment in the match: the minute on the clock and the minutes of added time after it. */
export type ReportTime = {
  minute: number
  stoppageMinutes: null | number
}

/** What came of a kick in the shoot-out: it went in, it missed, or the keeper stopped it. */
export type ShootoutOutcome = 'gestopt' | 'naast' | 'raak'

/**
 * The most minutes of added time, and the last minute of a match with and without extra time.
 */
export const reportLimits = { lastMinute: 90, lastMinuteWithExtraTime: 120, stoppageMinutes: 15 } as const

/** The usual formations, as the form offers them. A formation of another shape is "Anders". */
export const formationChoices = [
  '4-3-3',
  '4-4-2',
  '4-2-3-1',
  '3-5-2',
  '3-4-3',
  '4-1-4-1',
  '4-3-1-2',
  '4-4-1-1',
  '4-5-1',
  '5-3-2',
  '5-4-1',
  '3-4-2-1',
] as const

/**
 * The number of field players of a team, whom a formation divides: the goalkeeper is not one.
 */
export const fieldPlayers = 10

export type IssuePart = 'appearances' | 'cards' | 'goals' | 'incidents' | 'report' | 'shootout' | 'substitutions'

/** Where an issue is: the part of the report, and the row in that part (counted from 0). */
export type IssuePlace = { index?: number | undefined; part: IssuePart }

export type ReportCheck = {
  errors: ReportIssue[]
  warnings: ReportIssue[]
}

export type ReportIssue = {
  code: string
  message: string
  place: IssuePlace
  /**
   * True for an error in how the data hangs together, such as an event that points to a player
   * who is not in the report. A report that is `bezig` may have the other errors; it may not
   * have these, since it could not be read back.
   */
  structural: boolean
}

/**
 * Why a formation is not right, in a sentence for the editor, or `undefined` when it is right
 * (an empty formation is right: a report may have none). A formation is numbers of at least 1
 * with a hyphen between them, such as `4-1-2-1-2`, without spaces and without a hyphen at the
 * start or the end, and the numbers add up to ten: the field players, without the goalkeeper.
 */
export function formationProblem(value: string): string | undefined {
  if (value === '') {
    return undefined
  }

  if (/\s/u.test(value)) {
    return 'Schrijf de formatie zonder spaties, zoals 4-3-3.'
  }

  if (!/^[\d-]+$/u.test(value)) {
    return 'Een formatie bestaat uit getallen met een koppelteken ertussen, zoals 4-3-3.'
  }

  if (value.startsWith('-') || value.endsWith('-') || value.includes('--')) {
    return 'Zet één koppelteken tussen de getallen, en geen koppelteken aan het begin of einde, zoals 4-3-3.'
  }

  const numbers = value.split('-')

  if (numbers.some((number) => !/^[1-9]\d*$/u.test(number))) {
    return 'Elk getal van een formatie is minstens 1 en begint niet met een nul.'
  }

  const total = numbers.reduce((sum, number) => sum + Number(number), 0)

  return total === fieldPlayers
    ? undefined
    : `De getallen van de formatie tellen op tot ${total}, en het moeten er ${fieldPlayers} zijn: de veldspelers zonder de keeper.`
}

/** The team of the players, in the sentences. */
const sideName = (ours: boolean) => (ours ? 'sc Heerenveen' : 'de tegenstander')

/**
 * Where each player stands on the clock: `on` is the moment he comes on (0 for the line-up,
 * `undefined` when he never does) and `off` the moment he goes off or is sent off (`undefined`
 * when he does not). `onMinute` and `offMinute` are the same moments as a minute on the clock,
 * without the added time, which is what `minutesPlayed` counts. The rules and `minutesPlayed`
 * both read it.
 */
type Presence = {
  off: number | undefined
  offMinute: number | undefined
  on: number | undefined
  onMinute: number | undefined
}

/**
 * The errors that keep a report from being stored with this status. A report that is `klaar`
 * may have none. A report that is `bezig` may have errors, so a person can fill it in over
 * several sessions; it may not have the structural ones, since the data would not hang
 * together.
 */
export function blockingIssues(report: MatchReport, match: ReportMatch): ReportIssue[] {
  const { errors } = checkMatchReport(report, match)

  return report.status === 'klaar' ? errors : errors.filter((issue) => issue.structural)
}

/**
 * The errors and the warnings of a report, given the match it belongs to. It reads the report
 * only: the caller decides what to do with the result (see `blockingIssues`).
 *
 * Errors: a side that is complete has eleven players in the line-up, shirt numbers that differ
 * within a side and at most one captain; a substitution takes off a player who is on the pitch
 * and brings on one from the bench who did not play yet, and nobody comes on or goes off twice;
 * a card goes to a player on the pitch or on the bench, a player who was sent off gets no more,
 * and a yellow-red card follows exactly one yellow card; whoever scores, gives an assist or
 * misses a penalty is on the pitch; an own goal is of a player of the other team; an assist is
 * of another player of the team of the scorer, and not with a penalty or an own goal; every
 * minute is in the match; the goals of a side add up to the score; and only a played match has
 * a report. Our own side is always complete; the side of the opponent is when
 * `opponentComplete` is true, and then every goal has its scorer too.
 *
 * The shoot-out is optional, and checked against the result of the series of the match: it
 * needs that result, the kicks that went in add up to it for each team, the rounds of a team
 * run from 1 without a gap, the teams differ by at most one kick, a player kicks once and is of
 * the team he kicks for, and a complete side names every kicker.
 *
 * Warnings (they do not keep a report from being `klaar`): more than five substitutions of one
 * team in regular time, a complete side with fewer than five players on the bench, and a kicker
 * who was not on the pitch at the end of the match.
 */
export function checkMatchReport(report: MatchReport, match: ReportMatch): ReportCheck {
  const issues: ReportIssue[] = []
  const warnings: ReportIssue[] = []
  const byId = new Map<number, ReportAppearance>()

  if (match.status !== 'played') {
    issues.push({
      code: 'match-not-played',
      message: 'Alleen een gespeelde wedstrijd heeft een verslag.',
      place: { part: 'report' },
      structural: false,
    })
  }

  for (const [side, value] of [
    ['sc Heerenveen', report.formations?.ours],
    ['de tegenstander', report.formations?.opponent],
  ] as const) {
    const problem = value === null || value === undefined ? undefined : formationProblem(value)

    if (problem !== undefined) {
      issues.push({
        code: 'formation-invalid',
        message: `De formatie van ${side}: ${problem}`,
        place: { part: 'report' },
        structural: false,
      })
    }
  }

  // The players: the pointers of the events need them first.
  report.appearances.forEach((player, index) => {
    if (byId.has(player.id)) {
      issues.push({
        code: 'player-twice',
        message: `${player.name} staat twee keer in het verslag.`,
        place: { index, part: 'appearances' },
        structural: true,
      })
    }

    byId.set(player.id, player)
  })

  const point = (id: null | number, place: IssuePlace, what: string) => {
    if (id === null) {
      return undefined
    }

    const found = byId.get(id)

    if (found === undefined) {
      issues.push({
        code: 'unknown-player',
        message: `${what} verwijst naar een speler die niet in het verslag staat.`,
        place,
        structural: true,
      })
    }

    return found
  }

  const sides = [true, false] as const

  for (const ours of sides) {
    const team = report.appearances.filter((player) => player.ours === ours)
    const complete = ours || report.opponentComplete

    // A shirt number is of one player in a team.
    const seen = new Map<number, ReportAppearance>()

    for (const player of team) {
      const index = report.appearances.indexOf(player)

      if (!between(player.shirtNumber, 1, 99)) {
        issues.push({
          code: 'shirt-number-out-of-range',
          message: `Rugnummer ${player.shirtNumber} van ${player.name} bestaat niet. Het ligt tussen 1 en 99.`,
          place: { index, part: 'appearances' },
          structural: false,
        })
      }

      const other = seen.get(player.shirtNumber)

      if (other !== undefined) {
        issues.push({
          code: 'shirt-number-twice',
          message: `Rugnummer ${player.shirtNumber} staat twee keer bij ${sideName(ours)}: ${other.name} en ${player.name}.`,
          place: { index, part: 'appearances' },
          structural: false,
        })
      }

      seen.set(player.shirtNumber, player)
    }

    const captains = team.filter((player) => player.captain)
    const extraCaptain = captains[1]

    if (captains.length > 1) {
      issues.push({
        code: 'captain-twice',
        message: `${sideName(ours)} heeft ${captains.length} aanvoerders: ${captains.map((player) => player.name).join(' en ')}. Het mag er één zijn.`,
        place: {
          index: extraCaptain === undefined ? undefined : report.appearances.indexOf(extraCaptain),
          part: 'appearances',
        },
        structural: false,
      })
    }

    if (complete) {
      const starters = team.filter((player) => player.starter).length
      const bench = team.length - starters

      if (starters !== 11) {
        issues.push({
          code: 'lineup-size',
          message: `De opstelling van ${sideName(ours)} heeft ${starters} spelers en moet er precies 11 hebben.`,
          place: { part: 'appearances' },
          structural: false,
        })
      }

      if (bench < 5) {
        warnings.push({
          code: 'short-bench',
          message: `De bank van ${sideName(ours)} heeft ${bench} ${bench === 1 ? 'speler' : 'spelers'}. Meestal zijn het er minstens 5.`,
          place: { part: 'appearances' },
          structural: false,
        })
      }
    }

    const regular = report.substitutions.filter(
      (substitution) => byId.get(substitution.outId)?.ours === ours && substitution.minute <= reportLimits.lastMinute,
    ).length

    if (regular > 5) {
      warnings.push({
        code: 'many-substitutions',
        message: `${sideName(ours)} wisselt ${regular} keer in de reguliere tijd. Meestal zijn het er hoogstens 5.`,
        place: { part: 'substitutions' },
        structural: false,
      })
    }
  }

  // The substitutions, with the order of the clock.
  report.substitutions.forEach((substitution, index) => {
    const place = { index, part: 'substitutions' } as const

    point(substitution.outId, place, 'De wissel')
    point(substitution.inId, place, 'De wissel')

    if (substitution.outId === substitution.inId) {
      issues.push({
        code: 'substitution-same-player',
        message: 'Een speler kan niet voor zichzelf komen.',
        place,
        structural: true,
      })
    }

    checkTime(substitution, match.extraTime, place, issues)
  })

  const presence = play(report, issues)

  // The cards.
  report.cards.forEach((card, index) => {
    const place = { index, part: 'cards' } as const
    const player = point(card.appearanceId, place, 'De kaart')

    checkTime(card, match.extraTime, place, issues)

    if (player === undefined) {
      return
    }

    if (!canBeCarded(presence.get(player.id), card)) {
      issues.push({
        code: 'card-after-leaving',
        message: `${player.name} krijgt een kaart in minuut ${formatReportTime(card)}, maar is dan al van het veld.`,
        place,
        structural: false,
      })
    }

    const yellows = report.cards.filter((other) => other.appearanceId === player.id && other.kind === 'geel')

    if (card.kind === 'geel' && yellows.indexOf(card) > 0) {
      issues.push({
        code: 'second-yellow-is-yellow-red',
        message: `${player.name} krijgt een tweede gele kaart. Dat is een geel-rode kaart.`,
        place,
        structural: false,
      })
    }

    if (card.kind === 'geel-rood') {
      const earlier = yellows.filter((yellow) => clock(yellow) <= clock(card))

      if (yellows.length !== 1 || earlier.length !== 1) {
        issues.push({
          code: 'yellow-red-needs-one-yellow',
          message: `${player.name} krijgt geel-rood zonder precies één gele kaart eerder.`,
          place,
          structural: false,
        })
      }
    }
  })

  // The missed penalties.
  report.incidents.forEach((incident, index) => {
    const place = { index, part: 'incidents' } as const
    const player = point(incident.appearanceId, place, 'De strafschop')

    checkTime(incident, match.extraTime, place, issues)

    if (player !== undefined && !onPitchAt(presence.get(player.id), incident)) {
      issues.push({
        code: 'incident-not-on-pitch',
        message: `${player.name} neemt een strafschop in minuut ${formatReportTime(incident)}, maar staat dan niet op het veld.`,
        place,
        structural: false,
      })
    }
  })

  // The goals.
  report.goals.forEach((goal, index) => {
    const place = { index, part: 'goals' } as const
    const scorer = point(goal.appearanceId, place, 'Het doelpunt')
    const assist = point(goal.assistId, place, 'De assist')

    checkTime(goal, match.extraTime, place, issues)

    const scorerSide = goal.ownGoal ? !goal.ours : goal.ours

    if (goal.appearanceId === null && (scorerSide || report.opponentComplete)) {
      issues.push({
        code: 'goal-without-player',
        message: `Het doelpunt in minuut ${formatReportTime(goal)} heeft geen speler die scoorde.`,
        place,
        structural: false,
      })
    }

    if (scorer !== undefined) {
      if (scorer.ours !== scorerSide) {
        issues.push({
          code: goal.ownGoal ? 'own-goal-by-own-team' : 'goal-by-other-team',
          message: goal.ownGoal
            ? `${scorer.name} maakt een eigen doelpunt, maar is van ${sideName(goal.ours)}, het team dat het doelpunt krijgt.`
            : `${scorer.name} is van ${sideName(scorer.ours)}, maar het doelpunt is van ${sideName(goal.ours)}.`,
          place,
          structural: false,
        })
      } else if (!onPitchAt(presence.get(scorer.id), goal)) {
        issues.push({
          code: 'scorer-not-on-pitch',
          message: `${scorer.name} scoort in minuut ${formatReportTime(goal)}, maar staat dan niet op het veld.`,
          place,
          structural: false,
        })
      }
    }

    if (goal.assistId !== null && (goal.penalty || goal.ownGoal)) {
      issues.push({
        code: 'assist-with-penalty-or-own-goal',
        message: `Een ${goal.penalty ? 'strafschop' : 'eigen doelpunt'} heeft geen assist.`,
        place,
        structural: false,
      })
    }

    if (assist !== undefined) {
      if (goal.assistId === goal.appearanceId) {
        issues.push({
          code: 'assist-by-scorer',
          message: `${assist.name} geeft de assist op zijn eigen doelpunt.`,
          place,
          structural: false,
        })
      } else if (scorer !== undefined && assist.ours !== scorer.ours) {
        issues.push({
          code: 'assist-by-other-team',
          message: `${assist.name} geeft een assist aan ${scorer.name}, maar is van het andere team.`,
          place,
          structural: false,
        })
      } else if (!onPitchAt(presence.get(assist.id), goal)) {
        issues.push({
          code: 'assist-not-on-pitch',
          message: `${assist.name} geeft een assist in minuut ${formatReportTime(goal)}, maar staat dan niet op het veld.`,
          place,
          structural: false,
        })
      }
    }
  })

  checkShootout(report, match, byId, presence, issues, warnings)

  // The goals add up to the score, as the form of the match checks too.
  if (match.status === 'played' && match.goalsFor !== null && match.goalsAgainst !== null) {
    const ours = report.goals.filter((goal) => goal.ours).length
    const theirs = report.goals.length - ours

    if (ours !== match.goalsFor || theirs !== match.goalsAgainst) {
      issues.push({
        code: 'goals-differ-from-score',
        message: `De doelpunten geven ${ours}–${theirs} en de uitslag is ${match.goalsFor}–${match.goalsAgainst}. Pas de doelpunten of de uitslag aan.`,
        place: { part: 'goals' },
        structural: false,
      })
    }
  }

  return { errors: issues, warnings }
}

/** The clock of a moment as a sentence part: `45+2` or `67`. */
export function formatReportTime(time: ReportTime) {
  return time.stoppageMinutes === null ? String(time.minute) : `${time.minute}+${time.stoppageMinutes}`
}

/**
 * The minutes a player played, in whole minutes on the clock. A player in the line-up who is
 * not substituted or sent off plays 90 minutes (120 with extra time). Whoever comes on or goes
 * off counts from or to the minute on the clock, and added time counts as the last minute of
 * the half: 45+2 is 45, and 90+3 is 90. Whoever comes on in the added time of the second half
 * gets at least 1 minute. Whoever stayed on the bench played 0 minutes and does not count as an
 * appearance (`playedMatch`).
 *
 * The minutes follow from the substitutions and the red and yellow-red cards, so they never
 * differ from what happened. A player who is not in the report has none.
 */
export function minutesPlayed(report: MatchReport, match: Pick<ReportMatch, 'extraTime'>, appearanceId: number) {
  const presence = play(report, [])
  const found = presence.get(appearanceId)

  if (found === undefined || found.onMinute === undefined) {
    return 0
  }

  const minutes = (found.offMinute ?? lastMinuteOf(match)) - found.onMinute

  // Somebody who came on at the end is in the report as an appearance, so he has played a
  // minute.
  return found.on === 0 ? minutes : Math.max(1, minutes)
}

/** Whether a player played in the match: he was in the line-up or came on. */
export function playedMatch(report: MatchReport, appearanceId: number) {
  const presence = play(report, [])

  return presence.get(appearanceId)?.on !== undefined
}

/** Whether a number is a whole number between two numbers, both included. */
function between(value: number, low: number, high: number) {
  return Number.isInteger(value) && value >= low && value <= high
}

/**
 * Whether a player can still be given a card: he is on the pitch or on the bench, so he has not
 * gone off or been sent off before the card.
 */
function canBeCarded(presence: Presence | undefined, time: ReportTime) {
  return presence !== undefined && (presence.off === undefined || clock(time) <= presence.off)
}

/**
 * Checks the kicks of the shoot-out. A report without kicks has nothing to check: the result of
 * the series of the match may stand alone.
 */
function checkShootout(
  report: MatchReport,
  match: ReportMatch,
  byId: Map<number, ReportAppearance>,
  presence: Map<number, Presence>,
  issues: ReportIssue[],
  warnings: ReportIssue[],
) {
  const kicks = report.shootout ?? []

  if (kicks.length === 0) {
    return
  }

  const place = { part: 'shootout' } as const
  const taken = new Set<number>()

  kicks.forEach((kick, index) => {
    const kickPlace = { index, part: 'shootout' } as const
    const kicker = kick.appearanceId === null ? undefined : byId.get(kick.appearanceId)

    if (kick.appearanceId !== null && kicker === undefined) {
      issues.push({
        code: 'unknown-player',
        message: `Het schot in ronde ${kick.round} van ${sideName(kick.ours)} verwijst naar een speler die niet in het verslag staat.`,
        place: kickPlace,
        structural: true,
      })

      return
    }

    if (kicker === undefined) {
      if (kick.ours || report.opponentComplete) {
        issues.push({
          code: 'shootout-kick-without-player',
          message: `Het schot in ronde ${kick.round} van ${sideName(kick.ours)} heeft geen speler die schoot.`,
          place: kickPlace,
          structural: false,
        })
      }

      return
    }

    if (kicker.ours !== kick.ours) {
      issues.push({
        code: 'shootout-player-other-team',
        message: `${kicker.name} is van ${sideName(kicker.ours)}, maar het schot in ronde ${kick.round} is van ${sideName(kick.ours)}.`,
        place: kickPlace,
        structural: false,
      })
    }

    if (taken.has(kicker.id)) {
      issues.push({
        code: 'shootout-player-twice',
        message: `${kicker.name} schiet twee keer in de strafschoppenserie.`,
        place: kickPlace,
        structural: false,
      })
    }

    taken.add(kicker.id)

    const found = presence.get(kicker.id)

    if (found === undefined || found.on === undefined || found.off !== undefined) {
      warnings.push({
        code: 'shootout-player-not-on-pitch',
        message: `${kicker.name} schiet in de strafschoppenserie, maar stond aan het einde van de wedstrijd niet op het veld.`,
        place: kickPlace,
        structural: false,
      })
    }
  })

  if (match.penaltiesFor === null || match.penaltiesAgainst === null) {
    issues.push({
      code: 'shootout-without-score',
      message:
        'Het verslag heeft een strafschoppenserie, maar de wedstrijd heeft geen uitslag van de serie. Vul die uitslag in bij de wedstrijd.',
      place,
      structural: false,
    })
  }

  const counts = { ours: 0, theirs: 0 }

  for (const ours of [true, false]) {
    const own = kicks.filter((kick) => kick.ours === ours)
    const rounds = own.map((kick) => kick.round).toSorted((a, b) => a - b)

    if (rounds.some((round, index) => round !== index + 1)) {
      issues.push({
        code: 'shootout-rounds-not-in-order',
        message: `De rondes van ${sideName(ours)} in de strafschoppenserie beginnen niet bij 1, hebben een gat of een dubbele ronde. Het moeten er ${rounds.length} zijn, genummerd van 1 tot en met ${rounds.length}.`,
        place,
        structural: false,
      })
    }

    counts[ours ? 'ours' : 'theirs'] = own.length

    const hits = own.filter((kick) => kick.outcome === 'raak').length
    const result = ours ? match.penaltiesFor : match.penaltiesAgainst

    if (result !== null && hits !== result) {
      issues.push({
        code: 'shootout-differs-from-score',
        message: `De schoten van ${sideName(ours)} geven ${hits} raak en de uitslag van de serie is ${match.penaltiesFor}–${match.penaltiesAgainst}. Pas de schoten of de uitslag aan.`,
        place,
        structural: false,
      })
    }
  }

  if (Math.abs(counts.ours - counts.theirs) > 1) {
    issues.push({
      code: 'shootout-teams-differ',
      message: `sc Heerenveen heeft ${counts.ours} ${counts.ours === 1 ? 'schot' : 'schoten'} en de tegenstander ${counts.theirs}. Het verschil is hoogstens één schot.`,
      place,
      structural: false,
    })
  }
}

/**
 * Checks the minute and the added time of an event, and adds an issue for each that is wrong.
 */
function checkTime(time: ReportTime, extraTime: boolean, place: IssuePlace, issues: ReportIssue[]) {
  const last = extraTime ? reportLimits.lastMinuteWithExtraTime : reportLimits.lastMinute

  if (!between(time.minute, 1, last)) {
    issues.push({
      code: 'minute-out-of-range',
      message: `Minuut ${time.minute} bestaat niet in deze wedstrijd. Een minuut ligt ${extraTime ? 'tussen 1 en 120' : 'tussen 1 en 90, of tussen 91 en 120 als de wedstrijd een verlenging had'}.`,
      place,
      structural: false,
    })

    return
  }

  if (time.stoppageMinutes === null) {
    return
  }

  const endsAHalf =
    time.minute === 45 || time.minute === 90 || (extraTime && (time.minute === 105 || time.minute === 120))

  if (!between(time.stoppageMinutes, 1, reportLimits.stoppageMinutes)) {
    issues.push({
      code: 'stoppage-out-of-range',
      message: `Blessuretijd van ${time.stoppageMinutes} minuten bestaat niet. Het zijn 1 tot en met ${reportLimits.stoppageMinutes} minuten.`,
      place,
      structural: false,
    })
  } else if (!endsAHalf) {
    issues.push({
      code: 'stoppage-in-the-middle-of-a-half',
      message: `Blessuretijd hoort bij het einde van een helft, na minuut 45 of 90${extraTime ? ' (of 105 of 120)' : ''}, niet na minuut ${time.minute}.`,
      place,
      structural: false,
    })
  }
}

/**
 * A position on the clock that can be compared: added time of a half comes before the next
 * half.
 */
function clock(time: ReportTime) {
  return time.minute + (time.stoppageMinutes ?? 0) / 100
}

/** How long a match lasts: 90 minutes, or 120 with extra time. */
function lastMinuteOf(match: Pick<ReportMatch, 'extraTime'>) {
  return match.extraTime ? reportLimits.lastMinuteWithExtraTime : reportLimits.lastMinute
}

/**
 * Whether the player is on the pitch at a moment: he has come on by then (the line-up has) and
 * has not gone off before. A tie in the clock is allowed, since the report does not say what
 * came first within a minute.
 */
function onPitchAt(presence: Presence | undefined, time: ReportTime) {
  if (presence === undefined || presence.on === undefined) {
    return false
  }

  const at = clock(time)

  return presence.on <= at && (presence.off === undefined || at <= presence.off)
}

/**
 * Plays the substitutions and the red cards in the order of the clock, and returns where each
 * player stands, and the issues of the play itself (a substitution of a player who is not on
 * the pitch, a player who comes on or goes off twice). A tie in the clock goes in the order of
 * the lists, the substitutions first.
 */
function play(report: MatchReport, issues: ReportIssue[]) {
  const presence = new Map<number, Presence>(
    report.appearances.map((player) => [
      player.id,
      {
        off: undefined,
        offMinute: undefined,
        on: player.starter ? 0 : undefined,
        onMinute: player.starter ? 0 : undefined,
      },
    ]),
  )
  const byId = new Map(report.appearances.map((player) => [player.id, player]))
  const onPitch = new Set(report.appearances.filter((player) => player.starter).map((player) => player.id))
  const wentOn = new Set<number>()
  const wentOff = new Set<number>()
  const sentOff = new Set<number>()

  const steps = [
    ...report.substitutions.map((substitution, index) => ({ index, substitution, time: substitution })),
    ...report.cards
      .filter((card) => card.kind !== 'geel')
      .map((card) => ({ card, index: report.cards.indexOf(card), time: card })),
  ].toSorted((a, b) => {
    // A tie in the clock: the substitutions first.
    const kind = (step: object) => ('substitution' in step ? 0 : 1)

    return clock(a.time) - clock(b.time) || kind(a) - kind(b)
  })

  for (const step of steps) {
    if ('card' in step) {
      const found = presence.get(step.card.appearanceId)

      if (found !== undefined && found.off === undefined) {
        found.off = clock(step.time)
        found.offMinute = step.time.minute
        onPitch.delete(step.card.appearanceId)
        sentOff.add(step.card.appearanceId)
      }

      continue
    }

    const { inId, outId } = step.substitution
    const place = { index: step.index, part: 'substitutions' } as const
    const outPlayer = byId.get(outId)
    const inPlayer = byId.get(inId)

    if (outPlayer === undefined || inPlayer === undefined) {
      continue
    }

    if (wentOff.has(outId)) {
      issues.push({
        code: 'substitution-out-twice',
        message: `${outPlayer.name} gaat twee keer eruit.`,
        place,
        structural: false,
      })
    } else if (!onPitch.has(outId)) {
      issues.push({
        code: 'substitution-out-not-on-pitch',
        message: `${outPlayer.name} gaat eruit in minuut ${formatReportTime(step.time)}, maar staat dan niet op het veld.`,
        place,
        structural: false,
      })
    }

    if (wentOn.has(inId)) {
      issues.push({
        code: 'substitution-in-twice',
        message: `${inPlayer.name} komt twee keer binnen.`,
        place,
        structural: false,
      })
    } else if (inPlayer.starter || sentOff.has(inId)) {
      issues.push({
        code: 'substitution-in-not-on-bench',
        message: `${inPlayer.name} komt binnen in minuut ${formatReportTime(step.time)}, maar zat niet op de bank.`,
        place,
        structural: false,
      })
    } else if (inPlayer.ours !== outPlayer.ours) {
      issues.push({
        code: 'substitution-two-teams',
        message: `${outPlayer.name} en ${inPlayer.name} zijn van verschillende teams.`,
        place,
        structural: true,
      })
    }

    wentOn.add(inId)
    wentOff.add(outId)

    const out = presence.get(outId)
    const entering = presence.get(inId)

    if (out !== undefined && out.off === undefined) {
      out.off = clock(step.time)
      out.offMinute = step.time.minute
    }

    if (entering !== undefined && entering.on === undefined) {
      entering.on = clock(step.time)
      entering.onMinute = step.time.minute
    }

    onPitch.delete(outId)
    onPitch.add(inId)
  }

  return presence
}
