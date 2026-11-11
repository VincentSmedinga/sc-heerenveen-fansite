import type {
  MatchHeaderFact,
  MatchHeaderScorer,
  MatchPenaltyRound,
  MatchPitchTeam,
  MatchPlayerName,
  MatchScoreBarGoal,
  MatchSubstitute,
  MatchTimelineEvent,
} from '@fansite/design-system'

// What the page of a match shows, worked out from plain data: the data of the report with the
// names of the players, and nothing of the database. The page of a match builds it from a
// stored report (`matchPageDataOf` in report-view.ts), and the preview in the admin (#851)
// builds it from the form. `buildMatchPage` makes the properties of the components from it, so
// the two show the same page.

/** The name of our own club. */
export const ourClub = 'sc Heerenveen'

/** The page of a match as the properties of its components. */
export type BuiltMatchPage = {
  events: MatchTimelineEvent[]
  /** The pitch: our team, and the opponent's when his side of the report is complete. */
  pitch: { opponent: MatchPitchTeam | undefined; ours: MatchPitchTeam }
  /** The goals of the score bar. */
  scoreBar: MatchScoreBarGoal[]
  /**
   * Whether the bar may be shown: the report is complete, or its goals add up to the result of
   * the match. A report that is not complete may have fewer goals than the result, and a bar
   * that says 0–0 over a match that ended 2–0 would say something false: the page leaves it out
   * then.
   */
  scoreBarAgrees: boolean
  scorersAgainst: MatchHeaderScorer[]
  scorersFor: MatchHeaderScorer[]
  /** The rounds of the shoot-out, from the first. Empty for a match without kicks. */
  series: MatchPenaltyRound[]
  substitutes: { opponent: MatchSubstitute[] | undefined; ours: MatchSubstitute[] }
}

export type MatchPageCard = {
  /** Draws a frame around the line of this event in the course of the match. */
  highlighted?: boolean
  kind: 'geel' | 'geel-rood' | 'rood'
  /** Empty for a yellow card whose minute nobody knows. */
  minute: null | number
  playerId: number
  stoppageMinutes: null | number
}

/** All that the page of a match shows. */
export type MatchPageData = {
  /** The score after 90 minutes of a match with extra time. */
  afterNinety: null | { against: number; for: number }
  cards: readonly MatchPageCard[]
  /**
   * Whether the report is complete: `klaar` and without an error of the rules. A report that is
   * not shows a notice that it is still being filled in, and what is missing is left out.
   */
  complete: boolean
  extraTime: boolean
  /** The facts under the result, in the order they are shown. */
  facts: MatchHeaderFact[]
  /**
   * True when the formation of our team was derived from the lines of the players (an import of
   * the old fansite that the editors did not save), so it can differ from what was played. The
   * page says so under the pitch.
   */
  formationOursDerived: boolean
  formations: { opponent: null | string; ours: null | string }
  goals: readonly MatchPageGoal[]
  goalsAgainst: number
  goalsFor: number
  home: boolean
  incidents: readonly MatchPageIncident[]
  kicks: readonly MatchPageKick[]
  opponent: string
  /** Whether the side of the opponent is complete: otherwise only our team is on the pitch. */
  opponentComplete: boolean
  /** The score of the shoot-out. */
  penalties: null | { against: number; for: number }
  /**
   * Where the match stands when it has no result: `live` while it is being played, and
   * `upcoming` before its kick-off. Leave it out for a match that was played. The goals of
   * `goalsFor` and `goalsAgainst` are then the stand so far, counted from the report.
   */
  phase?: 'live' | 'upcoming'
  /** The players of both teams, in the order of the form. */
  players: readonly MatchPagePlayer[]
  substitutions: readonly MatchPageSubstitution[]
}

export type MatchPageGoal = {
  /** The player who gave the assist. */
  assistId: null | number
  /** Draws a frame around the line of this event in the course of the match. */
  highlighted?: boolean
  /** Empty for a goal whose minute nobody knows. */
  minute: null | number
  /** Whether sc Heerenveen gains from the goal. An own goal gains for the other team. */
  ours: boolean
  ownGoal: boolean
  penalty: boolean
  /** The player who scored. */
  playerId: number
  stoppageMinutes: null | number
}

export type MatchPageIncident = {
  /** Draws a frame around the line of this event in the course of the match. */
  highlighted?: boolean
  kind: 'strafschop-gemist' | 'strafschop-gestopt'
  minute: number
  playerId: number
  stoppageMinutes: null | number
}

export type MatchPageKick = {
  ours: boolean
  /** The player who took the kick. `null` when the player is not known. */
  playerId: null | number
  result: 'gestopt' | 'naast' | 'raak'
  /** The round of the shoot-out, from 1. */
  round: number
}

/** A player of the report. The list of players is in the order of the form. */
export type MatchPagePlayer = {
  captain: boolean
  /** Any number that is unique in the data: the other lists point to a player by it. */
  id: number
  name: MatchPlayerName
  /** Whether he is ours. Otherwise he plays for the opponent. */
  ours: boolean
  /** Empty for a player without a shirt number, such as in the old line-ups. */
  shirtNumber: null | number
  /** Whether he is in the line-up. Otherwise he is on the bench. */
  starter: boolean
}

export type MatchPageSubstitution = {
  /** Draws a frame around the line of this event in the course of the match. */
  highlighted?: boolean
  /** The player who comes on. */
  inId: number
  minute: number
  /** The player who goes off. */
  outId: number
  stoppageMinutes: null | number
}

/** The surname of a name, or the whole name when it has no surname: for a list of scorers. */
const shortName = (name: MatchPlayerName) => (name.surname === '' ? (name.givenName ?? '') : name.surname)

/** A moment as a number to sort on: 45+2 comes after 45 and before 46. */
const clock = (moment: { minute: number; stoppageMinutes?: null | number | undefined }) =>
  moment.minute + (moment.stoppageMinutes ?? 0) / 100

/** The order of the clock. An event without a minute comes last, in the order it was given. */
const byClock = (
  a: { minute: null | number; stoppageMinutes?: null | number | undefined },
  b: { minute: null | number; stoppageMinutes?: null | number | undefined },
) => {
  if (a.minute === null || b.minute === null) {
    return Number(a.minute === null) - Number(b.minute === null)
  }

  return clock({ ...a, minute: a.minute }) - clock({ ...b, minute: b.minute })
}

const cardKinds = {
  geel: 'yellow-card',
  'geel-rood': 'yellow-red-card',
  rood: 'red-card',
} as const

/** The heaviest card first. */
const cardWeight = { geel: 0, 'geel-rood': 1, rood: 2 } as const

/**
 * The events as the timeline shows them, in the order of the clock: goals, missed and stopped
 * penalties, cards and substitutions, and for two at the same moment in that order. A goal is
 * of the team that gets it, except an own goal: that has the team of the player who scored it,
 * so the line says whose player made it.
 */
function eventsOf(data: MatchPageData, byId: ReadonlyMap<number, MatchPagePlayer>): MatchTimelineEvent[] {
  const nameOf = (id: number): MatchPlayerName => byId.get(id)?.name ?? { surname: '' }
  const teamOf = (ours: boolean) => (ours ? ourClub : data.opponent)
  const events: MatchTimelineEvent[] = []

  for (const goal of data.goals) {
    const scorer = byId.get(goal.playerId)

    if (scorer === undefined) {
      continue
    }

    const ours = goal.ownGoal ? scorer.ours : goal.ours

    events.push({
      ...(goal.assistId === null ? {} : { assist: nameOf(goal.assistId) }),
      ...(goal.highlighted === true ? { highlighted: true } : {}),
      kind: 'goal',
      minute: goal.minute,
      ours,
      ownGoal: goal.ownGoal,
      penalty: goal.penalty,
      player: scorer.name,
      stoppageMinutes: goal.stoppageMinutes,
      team: teamOf(ours),
    })
  }

  for (const incident of data.incidents) {
    const player = byId.get(incident.playerId)

    if (player !== undefined) {
      events.push({
        ...(incident.highlighted === true ? { highlighted: true } : {}),
        kind: incident.kind === 'strafschop-gemist' ? 'penalty-missed' : 'penalty-saved',
        minute: incident.minute,
        ours: player.ours,
        player: player.name,
        stoppageMinutes: incident.stoppageMinutes,
        team: teamOf(player.ours),
      })
    }
  }

  for (const card of data.cards) {
    const player = byId.get(card.playerId)

    if (player !== undefined) {
      events.push({
        ...(card.highlighted === true ? { highlighted: true } : {}),
        kind: cardKinds[card.kind],
        minute: card.minute,
        ours: player.ours,
        player: player.name,
        stoppageMinutes: card.stoppageMinutes,
        team: teamOf(player.ours),
      })
    }
  }

  for (const substitution of data.substitutions) {
    const player = byId.get(substitution.inId)

    if (player !== undefined) {
      events.push({
        ...(substitution.highlighted === true ? { highlighted: true } : {}),
        kind: 'substitution',
        minute: substitution.minute,
        ours: player.ours,
        playerIn: player.name,
        playerOut: nameOf(substitution.outId),
        stoppageMinutes: substitution.stoppageMinutes,
        team: teamOf(player.ours),
      })
    }
  }

  // A stable sort keeps the order above for two events at the same moment. Added time of a half
  // comes before the next half, so 45+2 is earlier than 46.
  return events.toSorted(byClock)
}

/** The goals under a club in the header, in the order of the clock. */
const scorersOf = (data: MatchPageData, byId: ReadonlyMap<number, MatchPagePlayer>, ours: boolean) =>
  data.goals
    .filter((goal) => goal.ours === ours && byId.has(goal.playerId))
    .toSorted(byClock)
    .map((goal): MatchHeaderScorer => {
      const name = byId.get(goal.playerId)?.name ?? { surname: '' }

      return {
        ...(name.href === undefined ? {} : { href: name.href }),
        minute: goal.minute,
        ownGoal: goal.ownGoal,
        penalty: goal.penalty,
        player: shortName(name),
        stoppageMinutes: goal.stoppageMinutes,
      }
    })

/** Without added time `undefined`, as the components have it. */
const added = (stoppageMinutes: null | number) => (stoppageMinutes === null ? undefined : stoppageMinutes)

/**
 * What the page makes of the data, for each team: the line-up with the minutes each player
 * played, his goals and his heaviest card, and the substitutes who came on.
 */
function teamOf(data: MatchPageData, byId: ReadonlyMap<number, MatchPagePlayer>, ours: boolean) {
  const length = data.extraTime ? 120 : 90
  const players = data.players.filter((player) => player.ours === ours)
  const minutesOf = (player: MatchPagePlayer) => {
    const entered = data.substitutions.find((substitution) => substitution.inId === player.id)
    const off = data.substitutions.find((substitution) => substitution.outId === player.id)
    const sentOff = data.cards.find((card) => card.playerId === player.id && card.kind !== 'geel')
    const from = player.starter ? 0 : (entered?.minute ?? length)
    const to = Math.min(off?.minute ?? length, sentOff?.minute ?? length)

    // Somebody who came on in added time of the last minute still played a minute.
    return { from, off: off?.minute, played: Math.max(1, to - from) }
  }
  const goalsOf = (player: MatchPagePlayer) =>
    data.goals
      .filter((goal) => goal.playerId === player.id)
      .toSorted(byClock)
      .map((goal) => ({ minute: goal.minute, ownGoal: goal.ownGoal, stoppageMinutes: added(goal.stoppageMinutes) }))
  const cardOf = (player: MatchPagePlayer) => {
    const [heaviest] = data.cards
      .filter((card) => card.playerId === player.id)
      .toSorted((a, b) => cardWeight[b.kind] - cardWeight[a.kind])

    return heaviest === undefined
      ? undefined
      : { kind: cardKinds[heaviest.kind], minute: heaviest.minute, stoppageMinutes: added(heaviest.stoppageMinutes) }
  }
  // The pitch needs the shirt number of a player to be his alone in his team: a report that is
  // not finished may have a number twice, and then the first is on the pitch. Players without a
  // number are all on the pitch.
  const shirts = new Set<number>()
  const firstOfNumber = (player: MatchPagePlayer) => {
    if (player.shirtNumber === null) {
      return true
    }

    const known = shirts.has(player.shirtNumber)

    shirts.add(player.shirtNumber)

    return !known
  }
  const starters = players
    .filter((player) => player.starter && firstOfNumber(player))
    .map((player) => {
      const minutes = minutesOf(player)

      return {
        captain: player.captain,
        card: cardOf(player),
        goals: goalsOf(player),
        minutesPlayed: minutes.played,
        name: player.name,
        shirtNumber: player.shirtNumber,
        substitutedOffAt: minutes.off,
      }
    })
  const substitutes = data.substitutions.flatMap((substitution) => {
    const player = byId.get(substitution.inId)

    if (player === undefined || player.ours !== ours) {
      return []
    }

    return [
      {
        goals: goalsOf(player).filter((goal) => goal.minute === null || goal.minute >= substitution.minute),
        minute: substitution.minute,
        minutesPlayed: minutesOf(player).played,
        name: player.name,
        playerOut: byId.get(substitution.outId)?.name ?? { surname: '' },
        shirtNumber: player.shirtNumber,
        stoppageMinutes: added(substitution.stoppageMinutes),
      } satisfies MatchSubstitute,
    ]
  })

  return { starters, substitutes }
}

const kickResults = { gestopt: 'saved', naast: 'missed', raak: 'scored' } as const

/** Makes the properties of the components of the page of a match from its data. */
export function buildMatchPage(data: MatchPageData): BuiltMatchPage {
  const byId = new Map(data.players.map((player) => [player.id, player]))
  const ours = teamOf(data, byId, true)
  const theirs = teamOf(data, byId, false)
  const known = data.goals.filter((goal) => byId.has(goal.playerId))
  // A goal without a minute has no place on the bar, so the bar would not reach the score.
  const scoreBar = known.flatMap((goal) =>
    goal.minute === null ? [] : [{ minute: goal.minute, ours: goal.ours, stoppageMinutes: goal.stoppageMinutes }],
  )

  return {
    events: eventsOf(data, byId),
    pitch: {
      opponent: data.opponentComplete
        ? { formation: data.formations.opponent, name: data.opponent, players: theirs.starters }
        : undefined,
      ours: { formation: data.formations.ours, name: ourClub, players: ours.starters },
    },
    scoreBar,
    // A report that is complete passed the rules, which let a goal of an opponent without a
    // line-up have no player: its bar is the bar of the goals it has.
    scoreBarAgrees:
      scoreBar.length === known.length &&
      (data.complete ||
        (scoreBar.filter((goal) => goal.ours).length === data.goalsFor &&
          scoreBar.filter((goal) => !goal.ours).length === data.goalsAgainst)),
    scorersAgainst: scorersOf(data, byId, false),
    scorersFor: scorersOf(data, byId, true),
    series: roundsOf(data, byId),
    substitutes: {
      opponent: data.opponentComplete ? theirs.substitutes : undefined,
      ours: ours.substitutes,
    },
  }
}

/** The rounds of the shoot-out from the first, each with the kick of the teams that kicked. */
function roundsOf(data: MatchPageData, byId: ReadonlyMap<number, MatchPagePlayer>): MatchPenaltyRound[] {
  const rounds = new Map<number, MatchPenaltyRound>()

  for (const kick of data.kicks.toSorted((a, b) => a.round - b.round)) {
    const player = kick.playerId === null ? undefined : byId.get(kick.playerId)
    const taken = { ...(player === undefined ? {} : { player: player.name }), result: kickResults[kick.result] }
    const round = rounds.get(kick.round) ?? {}

    rounds.set(kick.round, { ...round, [kick.ours ? 'ours' : 'theirs']: taken })
  }

  return [...rounds.entries()].toSorted(([a], [b]) => a - b).map(([, round]) => round)
}
