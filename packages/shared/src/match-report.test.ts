import { describe, expect, it } from 'vitest'

import type { MatchReport, ReportMatch } from './match-report.ts'

import {
  blockingIssues,
  checkMatchReport,
  fieldPlayers,
  formationChoices,
  formationProblem,
  minutesPlayed,
  playedMatch,
} from './match-report.ts'

// Our players have the ids 1 to 16 (the first eleven are in the line-up, 12 to 16 on the bench)
// and the opponent has 101 to 116, with the shirt number of the id minus 100.
function team(ours: boolean, firstId: number) {
  return Array.from({ length: 16 }, (_, index) => ({
    captain: index === 0,
    id: firstId + index,
    name: `${ours ? 'Speler' : 'Tegenstander'} ${index + 1}`,
    ours,
    shirtNumber: index + 1,
    starter: index < 11,
  }))
}

const match: ReportMatch = {
  extraTime: false,
  goalsAgainst: 1,
  goalsFor: 2,
  penaltiesAgainst: null,
  penaltiesFor: null,
  status: 'played',
}

// A cup match that ended 1–1 after extra time, and was decided 4–3 on penalties.
const cupMatch: ReportMatch = { ...match, extraTime: true, goalsFor: 1, penaltiesAgainst: 3, penaltiesFor: 4 }

type Kick = NonNullable<MatchReport['shootout']>[number]

/** The report with the change that `change` makes to a copy of it. */
function changed(change: (report: MatchReport) => void) {
  const report = valid()

  change(report)

  return report
}

function codes(report: MatchReport, of: ReportMatch = match) {
  return checkMatchReport(report, of).errors.map((issue) => issue.code)
}

/**
 * A report that passes every rule: 2–1, with a substitution, two cards and a missed penalty.
 */
function valid(): MatchReport {
  return {
    appearances: [...team(true, 1), ...team(false, 101)],
    cards: [
      { appearanceId: 4, kind: 'geel', minute: 30, stoppageMinutes: null },
      { appearanceId: 4, kind: 'geel-rood', minute: 80, stoppageMinutes: null },
      { appearanceId: 105, kind: 'rood', minute: 85, stoppageMinutes: null },
    ],
    goals: [
      { appearanceId: 9, assistId: 10, minute: 12, ours: true, ownGoal: false, penalty: false, stoppageMinutes: null },
      {
        appearanceId: 109,
        assistId: null,
        minute: 40,
        ours: false,
        ownGoal: false,
        penalty: true,
        stoppageMinutes: null,
      },
      { appearanceId: 15, assistId: 9, minute: 78, ours: true, ownGoal: false, penalty: false, stoppageMinutes: null },
    ],
    incidents: [{ appearanceId: 9, kind: 'strafschop-gemist', minute: 55, stoppageMinutes: null }],
    opponentComplete: true,
    status: 'klaar',
    substitutions: [
      { inId: 15, minute: 60, outId: 11, stoppageMinutes: null },
      { inId: 114, minute: 70, outId: 110, stoppageMinutes: null },
    ],
  }
}

/** The report of the cup match: 1–1, and five rounds of kicks that end 4–3. */
function withShootout(change: (kicks: Kick[], report: MatchReport) => void = () => {}) {
  const report = valid()

  report.goals.pop()
  report.shootout = [
    { appearanceId: 1, ours: true, outcome: 'raak', round: 1 },
    { appearanceId: 101, ours: false, outcome: 'raak', round: 1 },
    { appearanceId: 2, ours: true, outcome: 'raak', round: 2 },
    { appearanceId: 102, ours: false, outcome: 'gestopt', round: 2 },
    { appearanceId: 3, ours: true, outcome: 'naast', round: 3 },
    { appearanceId: 103, ours: false, outcome: 'raak', round: 3 },
    { appearanceId: 5, ours: true, outcome: 'raak', round: 4 },
    { appearanceId: 104, ours: false, outcome: 'naast', round: 4 },
    { appearanceId: 15, ours: true, outcome: 'raak', round: 5 },
    { appearanceId: 106, ours: false, outcome: 'raak', round: 5 },
  ]
  change(report.shootout, report)

  return report
}

describe('the shoot-out', () => {
  it('passes kicks that add up to the result of the series, without a warning', () => {
    expect(checkMatchReport(withShootout(), cupMatch)).toEqual({ errors: [], warnings: [] })
  })

  it('passes a report without kicks, with or without a result of the series', () => {
    const report = withShootout()

    delete report.shootout
    expect(checkMatchReport(report, cupMatch).errors).toEqual([])
    expect(checkMatchReport({ ...report, shootout: [] }, cupMatch).errors).toEqual([])
    expect(checkMatchReport(report, { ...cupMatch, penaltiesAgainst: null, penaltiesFor: null }).errors).toEqual([])
  })

  it('passes a series with a team that kicked one more, and a kicker of the opponent without a player', () => {
    const report = withShootout((kicks) => {
      kicks.pop()
      kicks[7]!.appearanceId = null
    })
    const result = { ...cupMatch, penaltiesAgainst: 2 }

    expect(codes(report, result)).toEqual(['shootout-kick-without-player'])
    expect(codes({ ...report, opponentComplete: false }, result)).toEqual([])
  })

  it('wants the result of the series of the match', () => {
    expect(codes(withShootout(), { ...cupMatch, penaltiesAgainst: null, penaltiesFor: null })).toEqual([
      'shootout-without-score',
    ])
  })

  it('wants the kicks that went in to add up to the result, for each team', () => {
    expect(codes(withShootout(), { ...cupMatch, penaltiesFor: 5 })).toEqual(['shootout-differs-from-score'])
    expect(codes(withShootout(), { ...cupMatch, penaltiesAgainst: 2 })).toEqual(['shootout-differs-from-score'])
    expect(checkMatchReport(withShootout(), { ...cupMatch, penaltiesFor: 5 }).errors[0]?.message).toBe(
      'De schoten van sc Heerenveen geven 4 raak en de uitslag van de serie is 5–3. Pas de schoten of de uitslag aan.',
    )
  })

  it('wants the rounds of a team to run from 1 without a gap or a repeat', () => {
    const start = withShootout((kicks) => kicks.forEach((kick) => kick.ours && kick.round++))
    const gap = withShootout((kicks) => {
      kicks.find((kick) => kick.ours && kick.round === 3)!.round = 6
    })
    const repeat = withShootout((kicks) => {
      kicks.find((kick) => !kick.ours && kick.round === 4)!.round = 3
    })

    expect(codes(start, cupMatch)).toEqual(['shootout-rounds-not-in-order'])
    expect(codes(gap, cupMatch)).toEqual(['shootout-rounds-not-in-order'])
    expect(codes(repeat, cupMatch)).toEqual(['shootout-rounds-not-in-order'])
  })

  it('lets the teams differ by one kick, and not by two', () => {
    const one = withShootout((kicks) => {
      kicks.pop()
    })
    const two = withShootout((kicks) => {
      kicks.splice(-3, 3, ...kicks.slice(-2, -1))
    })

    expect(codes(one, { ...cupMatch, penaltiesAgainst: 2 })).toEqual([])
    expect(two.shootout?.filter((kick) => !kick.ours)).toHaveLength(3)
    expect(codes(two, { ...cupMatch, penaltiesAgainst: 2 })).toEqual(['shootout-teams-differ'])
  })

  it('does not let a player kick twice', () => {
    const report = withShootout((kicks) => {
      kicks.find((kick) => kick.ours && kick.round === 5)!.appearanceId = 1
    })

    expect(codes(report, cupMatch)).toEqual(['shootout-player-twice'])
  })

  it('does not take a kicker who is not in the report, or of the other team', () => {
    const unknown = withShootout((kicks) => {
      kicks[0]!.appearanceId = 999
    })
    const other = withShootout((kicks) => {
      kicks[0]!.appearanceId = 101
      kicks[1]!.appearanceId = 1
    })

    expect(codes(unknown, cupMatch)).toEqual(['unknown-player'])
    expect(checkMatchReport(unknown, cupMatch).errors[0]).toMatchObject({
      place: { index: 0, part: 'shootout' },
      structural: true,
    })
    expect(codes(other, cupMatch)).toEqual(['shootout-player-other-team', 'shootout-player-other-team'])
  })

  it('wants a player for every kick of a complete side, and for ours always', () => {
    const theirs = withShootout((kicks) => {
      kicks[1]!.appearanceId = null
    })
    const ours = withShootout((kicks) => {
      kicks[0]!.appearanceId = null
    })

    expect(codes(theirs, cupMatch)).toEqual(['shootout-kick-without-player'])
    expect(codes({ ...theirs, opponentComplete: false }, cupMatch)).toEqual([])
    expect(codes({ ...ours, opponentComplete: false }, cupMatch)).toEqual(['shootout-kick-without-player'])
  })

  it('warns about a kicker who was not on the pitch at the end, and does not block for it', () => {
    // Player 4 was sent off in minute 80, 11 went off in minute 60, and 12 never came on.
    for (const id of [4, 11, 12]) {
      const report = withShootout((kicks) => {
        kicks[0]!.appearanceId = id
      })
      const { errors, warnings } = checkMatchReport(report, cupMatch)

      expect(errors).toEqual([])
      expect(warnings).toEqual([
        expect.objectContaining({ code: 'shootout-player-not-on-pitch', place: { index: 0, part: 'shootout' } }),
      ])
    }
  })

  it('blocks a report that is klaar for the series, and a report that is bezig only for the structure', () => {
    const wrong = withShootout()

    wrong.status = 'bezig'
    expect(blockingIssues(wrong, { ...cupMatch, penaltiesFor: 5 })).toEqual([])
    expect(blockingIssues({ ...wrong, status: 'klaar' }, { ...cupMatch, penaltiesFor: 5 })).toHaveLength(1)

    const unknown = withShootout((kicks) => {
      kicks[0]!.appearanceId = 999
    })

    unknown.status = 'bezig'
    expect(blockingIssues(unknown, cupMatch).map((issue) => issue.code)).toEqual(['unknown-player'])
  })

  it('does not count a kick as a goal or as minutes', () => {
    const report = withShootout()

    expect(minutesPlayed(report, cupMatch, 15)).toBe(minutesPlayed({ ...report, shootout: [] }, cupMatch, 15))
    expect(checkMatchReport(report, cupMatch).errors.map((issue) => issue.code)).not.toContain(
      'goals-differ-from-score',
    )
  })
})

describe('checkMatchReport', () => {
  it('passes a report that follows every rule, without a warning', () => {
    expect(checkMatchReport(valid(), match)).toEqual({ errors: [], warnings: [] })
  })

  it('gives each issue a code, a place and a Dutch sentence', () => {
    const report = changed((r) => {
      r.goals[0]!.appearanceId = 14
    })

    expect(checkMatchReport(report, match).errors).toContainEqual({
      code: 'scorer-not-on-pitch',
      message: 'Speler 14 scoort in minuut 12, maar staat dan niet op het veld.',
      place: { index: 0, part: 'goals' },
      structural: false,
    })
  })

  describe('the match', () => {
    it('only has a report when it was played', () => {
      expect(codes(valid(), { ...match, status: 'postponed' })).toContain('match-not-played')
      expect(codes(valid(), { ...match, status: 'cancelled' })).toContain('match-not-played')
      expect(codes(valid())).not.toContain('match-not-played')
    })

    it('lets a match that is still being played have a report that is bezig', () => {
      const live: ReportMatch = { ...match, goalsAgainst: null, goalsFor: null, status: 'scheduled' }

      // No result yet, so the goals have nothing to add up to.
      expect(codes({ ...valid(), status: 'bezig' }, live)).toEqual([])
      expect(blockingIssues({ ...valid(), status: 'bezig' }, live)).toEqual([])
    })

    it('keeps a report of a match that is still being played from being klaar', () => {
      const live: ReportMatch = { ...match, goalsAgainst: null, goalsFor: null, status: 'scheduled' }

      expect(codes(valid(), live)).toEqual(['match-not-finished'])
      expect(blockingIssues(valid(), live).map((issue) => issue.code)).toEqual(['match-not-finished'])
    })

    it('has goals that add up to the score, in both sides', () => {
      expect(codes(valid(), { ...match, goalsFor: 3 })).toEqual(['goals-differ-from-score'])
      expect(codes(valid(), { ...match, goalsAgainst: 0 })).toEqual(['goals-differ-from-score'])
      expect(codes(valid(), { ...match, goalsAgainst: 1, goalsFor: 2 })).toEqual([])
    })

    it('counts an own goal for the team that gets it', () => {
      const report = changed((r) => {
        // Number 3 of the opponent scores in his own goal: a goal of ours.
        r.goals[0] = { ...r.goals[0]!, appearanceId: 103, assistId: null, ownGoal: true }
      })

      expect(codes(report)).toEqual([])
    })

    it('does not compare the goals when the score is not known', () => {
      expect(codes(valid(), { ...match, goalsAgainst: null, goalsFor: null })).toEqual([])
    })
  })

  describe('the line-up', () => {
    it('has 11 players on a complete side', () => {
      const tenOurs = changed((r) => {
        r.appearances[10]!.starter = false
        r.substitutions = []
        r.goals = r.goals.filter((goal) => goal.appearanceId !== 15)
        r.cards = []
        r.incidents = []
      })

      expect(codes(tenOurs, { ...match, goalsFor: 1 })).toContain('lineup-size')

      const twelve = changed((r) => {
        r.appearances[11]!.starter = true
      })

      expect(codes(twelve)).toContain('lineup-size')
      expect(codes(valid())).not.toContain('lineup-size')
    })

    it('does not count the side of the opponent while it is not complete', () => {
      const report = changed((r) => {
        r.opponentComplete = false
        r.appearances = r.appearances.filter((player) => player.ours || [105, 109, 110].includes(player.id))
        r.substitutions = r.substitutions.filter((substitution) => substitution.outId < 100)
      })

      expect(codes(report)).toEqual([])
    })

    it('gives a side that is not complete a warning for nothing', () => {
      const report = changed((r) => {
        r.opponentComplete = false
        r.appearances = r.appearances.filter((player) => player.ours || player.id === 109)
        r.substitutions = [r.substitutions[0]!]
        r.cards = r.cards.filter((card) => card.appearanceId < 100)
      })

      expect(checkMatchReport(report, match).warnings).toEqual([])
    })

    it('has a shirt number once within a side, and may repeat it in the other side', () => {
      const twice = changed((r) => {
        r.appearances[1]!.shirtNumber = 1
      })

      expect(codes(twice)).toEqual(['shirt-number-twice'])
      expect(codes(valid())).toEqual([])
    })

    it('has a shirt number between 1 and 99', () => {
      const report = changed((r) => {
        r.appearances[15]!.shirtNumber = 100
      })

      expect(codes(report)).toEqual(['shirt-number-out-of-range'])
    })

    it('lets a player be without a shirt number, also several in a side', () => {
      const report = changed((r) => {
        r.appearances[1]!.shirtNumber = null
        r.appearances[2]!.shirtNumber = null
        r.appearances[17]!.shirtNumber = null
        r.appearances[18]!.shirtNumber = null
      })

      expect(codes(report)).toEqual([])
      expect(checkMatchReport(report, match).warnings).toEqual([])
    })

    it('still rejects a number twice or out of range next to players without one', () => {
      const report = changed((r) => {
        r.appearances[0]!.shirtNumber = null
        r.appearances[1]!.shirtNumber = null
        r.appearances[2]!.shirtNumber = 4
        r.appearances[15]!.shirtNumber = 100
      })

      expect(codes(report)).toEqual(['shirt-number-twice', 'shirt-number-out-of-range'])
    })

    it('has at most one captain in a side', () => {
      const report = changed((r) => {
        r.appearances[1]!.captain = true
      })

      expect(codes(report)).toEqual(['captain-twice'])
      expect(
        codes(
          changed((r) => {
            r.appearances[0]!.captain = false
          }),
        ),
      ).toEqual([])
    })

    it('has a player once', () => {
      const report = changed((r) => {
        r.appearances[1]!.id = 1
      })

      expect(codes(report)).toContain('player-twice')
    })
  })

  describe('the substitutions', () => {
    it('takes off a player who is on the pitch, also one who came on earlier', () => {
      const cameOn = changed((r) => {
        r.substitutions.push({ inId: 16, minute: 75, outId: 15, stoppageMinutes: null })
        r.goals[2]!.appearanceId = 9
        r.goals[2]!.assistId = null
      })

      expect(codes(cameOn)).toEqual([])
    })

    it('refuses to take off a player from the bench', () => {
      const report = changed((r) => {
        r.substitutions[0]!.outId = 13
      })

      expect(codes(report)).toContain('substitution-out-not-on-pitch')
    })

    it('refuses to take off a player who was sent off', () => {
      const report = changed((r) => {
        r.substitutions.push({ inId: 16, minute: 82, outId: 4, stoppageMinutes: null })
      })

      expect(codes(report)).toContain('substitution-out-not-on-pitch')
    })

    it('refuses to take off a player who already went off', () => {
      const report = changed((r) => {
        r.substitutions.push({ inId: 16, minute: 75, outId: 11, stoppageMinutes: null })
      })

      expect(codes(report)).toEqual(expect.arrayContaining(['substitution-out-twice']))
    })

    it('brings on a player from the bench who did not play yet', () => {
      const starter = changed((r) => {
        r.substitutions[0]!.inId = 10
      })

      expect(codes(starter)).toContain('substitution-in-not-on-bench')
    })

    it('does not let a player come on twice', () => {
      const report = changed((r) => {
        r.substitutions.push({ inId: 15, minute: 75, outId: 1, stoppageMinutes: null })
      })

      expect(codes(report)).toContain('substitution-in-twice')
    })

    it('does not bring on a player from the bench who was sent off from there', () => {
      const report = changed((r) => {
        r.cards.push({ appearanceId: 16, kind: 'rood', minute: 50, stoppageMinutes: null })
        r.substitutions.push({ inId: 16, minute: 75, outId: 1, stoppageMinutes: null })
      })

      expect(codes(report)).toContain('substitution-in-not-on-bench')
    })

    it('does not mix the teams, which is an error of the data', () => {
      const report = changed((r) => {
        r.substitutions[0]!.inId = 114
        r.substitutions[1]!.inId = 15
      })
      const found = checkMatchReport(report, match).errors.filter((issue) => issue.code === 'substitution-two-teams')

      expect(found.length).toBeGreaterThan(0)
      expect(found.every((issue) => issue.structural)).toBe(true)
    })

    it('puts a player in for another', () => {
      const report = changed((r) => {
        r.substitutions[0]!.inId = 11
      })

      expect(codes(report)).toContain('substitution-same-player')
    })

    it('plays the substitutions in the order of the clock, not of the list', () => {
      const report = changed((r) => {
        // The player who came on at 60 goes off at 75: listed before the substitution at 60.
        r.substitutions.unshift({ inId: 16, minute: 75, outId: 15, stoppageMinutes: null })
        r.goals[2]!.minute = 70
      })

      expect(codes(report)).toEqual([])
    })
  })

  describe('the cards', () => {
    it('gives a card to a player on the pitch or on the bench', () => {
      const bench = changed((r) => {
        r.cards.push({ appearanceId: 13, kind: 'geel', minute: 50, stoppageMinutes: null })
      })

      expect(codes(bench)).toEqual([])
    })

    it('refuses a card after a player went off or was sent off', () => {
      const wentOff = changed((r) => {
        r.cards.push({ appearanceId: 11, kind: 'geel', minute: 61, stoppageMinutes: null })
      })
      const sentOff = changed((r) => {
        r.cards.push({ appearanceId: 105, kind: 'geel', minute: 88, stoppageMinutes: null })
      })

      expect(codes(wentOff)).toEqual(['card-after-leaving'])
      expect(codes(sentOff)).toEqual(['card-after-leaving'])
    })

    it('allows a card in the minute that a player goes off', () => {
      const report = changed((r) => {
        r.cards.push({ appearanceId: 11, kind: 'geel', minute: 60, stoppageMinutes: null })
      })

      expect(codes(report)).toEqual([])
    })

    it('needs exactly one yellow card before a yellow-red card', () => {
      const none = changed((r) => {
        r.cards = r.cards.filter((card) => card.kind !== 'geel')
      })
      const later = changed((r) => {
        r.cards[0]!.minute = 81
      })

      expect(codes(none)).toContain('yellow-red-needs-one-yellow')
      expect(codes(later)).toContain('yellow-red-needs-one-yellow')
      expect(codes(valid())).not.toContain('yellow-red-needs-one-yellow')
    })

    it('makes a second yellow card a yellow-red card', () => {
      const report = changed((r) => {
        r.cards.splice(1, 0, { appearanceId: 4, kind: 'geel', minute: 50, stoppageMinutes: null })
      })

      expect(codes(report)).toEqual(
        expect.arrayContaining(['second-yellow-is-yellow-red', 'yellow-red-needs-one-yellow']),
      )
    })

    it('gives a player no card after a red card', () => {
      const report = changed((r) => {
        r.cards.push({ appearanceId: 105, kind: 'geel', minute: 86, stoppageMinutes: null })
      })

      expect(codes(report)).toEqual(['card-after-leaving'])
    })
  })

  describe('the goals', () => {
    it('has a scorer who is on the pitch', () => {
      const bench = changed((r) => {
        r.goals[0]!.appearanceId = 14
        r.goals[0]!.assistId = null
      })
      const early = changed((r) => {
        r.goals[2]!.minute = 50
      })
      const late = changed((r) => {
        r.goals[0]!.appearanceId = 11
        r.goals[0]!.minute = 61
        r.goals[0]!.assistId = null
      })

      expect(codes(bench)).toEqual(['scorer-not-on-pitch'])
      expect(codes(early)).toContain('scorer-not-on-pitch')
      expect(codes(late)).toEqual(['scorer-not-on-pitch'])
    })

    it('allows a goal in the minute that the scorer comes on', () => {
      const report = changed((r) => {
        r.goals[2]!.minute = 60
      })

      expect(codes(report)).toEqual([])
    })

    it('has a scorer who is of the team of the goal, or of the other team in an own goal', () => {
      const other = changed((r) => {
        r.goals[0]!.appearanceId = 109
        r.goals[0]!.assistId = null
      })
      const ownGoal = changed((r) => {
        r.goals[0]!.ownGoal = true
        r.goals[0]!.assistId = null
      })

      expect(codes(other)).toContain('goal-by-other-team')
      expect(codes(ownGoal)).toContain('own-goal-by-own-team')
    })

    it('needs a scorer for our goals always, and for the goals of the opponent when it is complete', () => {
      const ours = changed((r) => {
        r.goals[0]!.appearanceId = null
        r.goals[0]!.assistId = null
      })
      const theirs = changed((r) => {
        r.goals[1]!.appearanceId = null
      })
      const incomplete = changed((r) => {
        r.opponentComplete = false
        r.goals[1]!.appearanceId = null
        r.appearances = r.appearances.filter((player) => player.ours)
        r.substitutions.pop()
        r.cards.pop()
      })

      expect(codes(ours)).toEqual(['goal-without-player'])
      expect(codes(theirs)).toEqual(['goal-without-player'])
      expect(codes(incomplete)).toEqual([])
    })

    it('has an assist of another player of the same team who is on the pitch', () => {
      const scorer = changed((r) => {
        r.goals[0]!.assistId = 9
      })
      const other = changed((r) => {
        r.goals[0]!.assistId = 103
      })
      const bench = changed((r) => {
        r.goals[0]!.assistId = 13
      })

      expect(codes(scorer)).toEqual(['assist-by-scorer'])
      expect(codes(other)).toEqual(['assist-by-other-team'])
      expect(codes(bench)).toEqual(['assist-not-on-pitch'])
    })

    it('has no assist with a penalty or an own goal', () => {
      const penalty = changed((r) => {
        r.goals[0]!.penalty = true
      })
      const ownGoal = changed((r) => {
        r.goals[0] = { ...r.goals[0]!, appearanceId: 103, ownGoal: true }
      })

      expect(codes(penalty)).toEqual(['assist-with-penalty-or-own-goal'])
      expect(codes(ownGoal)).toContain('assist-with-penalty-or-own-goal')
    })
  })

  describe('the missed penalties', () => {
    it('are of a player who is on the pitch', () => {
      const bench = changed((r) => {
        r.incidents[0]!.appearanceId = 14
      })
      const sentOff = changed((r) => {
        r.incidents[0]!.appearanceId = 4
        r.incidents[0]!.minute = 81
      })

      expect(codes(bench)).toEqual(['incident-not-on-pitch'])
      expect(codes(sentOff)).toEqual(['incident-not-on-pitch'])
    })
  })

  describe('the minutes', () => {
    it('lie between 1 and 90 in a match without extra time', () => {
      const zero = changed((r) => {
        r.cards[0]!.minute = 0
      })
      const ninetyOne = changed((r) => {
        r.incidents[0]!.minute = 91
      })

      expect(codes(zero)).toContain('minute-out-of-range')
      expect(codes(ninetyOne)).toEqual(['minute-out-of-range'])
    })

    it('go up to 120 in a match with extra time', () => {
      const report = changed((r) => {
        r.incidents[0]!.minute = 110
      })

      expect(codes(report, { ...match, extraTime: true })).toEqual([])
      expect(
        codes(
          changed((r) => {
            r.incidents[0]!.minute = 121
          }),
          { ...match, extraTime: true },
        ),
      ).toEqual(['minute-out-of-range'])
    })

    it('has added time of 1 to 15 minutes, at the end of a half', () => {
      const ok = changed((r) => {
        r.goals[0]!.minute = 45
        r.goals[0]!.stoppageMinutes = 2
        r.goals[1]!.minute = 90
        r.goals[1]!.stoppageMinutes = 15
        r.goals[2]!.minute = 90
        r.goals[2]!.stoppageMinutes = 1
      })
      const sixteen = changed((r) => {
        r.goals[1]!.minute = 90
        r.goals[1]!.stoppageMinutes = 16
      })
      const middle = changed((r) => {
        r.goals[2]!.stoppageMinutes = 2
      })

      expect(codes(ok)).toEqual([])
      expect(codes(sixteen)).toEqual(['stoppage-out-of-range'])
      expect(codes(middle)).toEqual(['stoppage-in-the-middle-of-a-half'])
    })

    it('has added time after 105 and 120 only with extra time', () => {
      const report = changed((r) => {
        r.incidents[0]!.minute = 105
        r.incidents[0]!.stoppageMinutes = 1
      })

      expect(codes(report)).toEqual(['minute-out-of-range'])
      expect(codes(report, { ...match, extraTime: true })).toEqual([])
    })

    it('puts the added time of the first half before the second half', () => {
      const report = changed((r) => {
        // Goal at 45+3, a substitution at 46: the player is not on the pitch yet.
        r.substitutions[0]!.minute = 46
        r.goals[2]!.minute = 45
        r.goals[2]!.stoppageMinutes = 3
      })

      expect(codes(report)).toContain('scorer-not-on-pitch')
    })
  })

  describe('the warnings', () => {
    it('warns about more than five substitutions of a team in regular time', () => {
      const report = changed((r) => {
        r.substitutions = [
          { inId: 12, minute: 46, outId: 1, stoppageMinutes: null },
          { inId: 13, minute: 55, outId: 2, stoppageMinutes: null },
          { inId: 14, minute: 56, outId: 3, stoppageMinutes: null },
          { inId: 15, minute: 57, outId: 5, stoppageMinutes: null },
          { inId: 16, minute: 58, outId: 6, stoppageMinutes: null },
        ]
        r.goals[2]!.appearanceId = 9
        r.goals[2]!.assistId = null
        r.goals[0]!.assistId = null
        r.cards = r.cards.filter((card) => card.appearanceId > 100)
        r.incidents = []
      })

      expect(checkMatchReport(report, match).warnings).toEqual([])

      report.appearances.push({
        captain: false,
        id: 17,
        name: 'Speler 17',
        ours: true,
        shirtNumber: 17,
        starter: false,
      })
      report.substitutions.push({ inId: 17, minute: 89, outId: 7, stoppageMinutes: null })

      const found = checkMatchReport(report, match)

      expect(found.warnings.map((issue) => issue.code)).toEqual(['many-substitutions'])
      expect(found.errors).toEqual([])
    })

    it('does not count the substitutions in extra time', () => {
      const report = changed((r) => {
        r.appearances.push({ captain: false, id: 17, name: 'Speler 17', ours: true, shirtNumber: 17, starter: false })
        r.substitutions = [
          { inId: 12, minute: 46, outId: 1, stoppageMinutes: null },
          { inId: 13, minute: 55, outId: 2, stoppageMinutes: null },
          { inId: 14, minute: 56, outId: 3, stoppageMinutes: null },
          { inId: 15, minute: 57, outId: 5, stoppageMinutes: null },
          { inId: 16, minute: 58, outId: 6, stoppageMinutes: null },
          { inId: 17, minute: 100, outId: 7, stoppageMinutes: null },
        ]
        r.goals = [{ ...r.goals[0]!, assistId: null }, r.goals[1]!, { ...r.goals[2]!, appearanceId: 9, assistId: null }]
        r.cards = r.cards.filter((card) => card.appearanceId > 100)
        r.incidents = []
      })

      expect(checkMatchReport(report, { ...match, extraTime: true }).warnings).toEqual([])
    })

    it('warns about a complete side with fewer than five on the bench', () => {
      const report = changed((r) => {
        r.appearances = r.appearances.filter((player) => player.id !== 16)
      })
      const found = checkMatchReport(report, match)

      expect(found.warnings.map((issue) => issue.code)).toEqual(['short-bench'])
      expect(found.errors).toEqual([])
    })
  })

  describe('the data', () => {
    it('refuses an event that points to a player who is not in the report, as an error of the data', () => {
      const report = changed((r) => {
        r.cards[0]!.appearanceId = 999
      })
      const found = checkMatchReport(report, match).errors.filter((issue) => issue.code === 'unknown-player')

      expect(found).toHaveLength(1)
      expect(found[0]?.structural).toBe(true)
    })
  })
})

describe('blockingIssues', () => {
  const broken = () =>
    changed((r) => {
      r.goals[0]!.appearanceId = 14
    })

  it('lets a report that is bezig have errors, so it can be filled in over several sessions', () => {
    expect(blockingIssues({ ...broken(), status: 'bezig' }, match)).toEqual([])
    expect(blockingIssues({ ...valid(), status: 'bezig' }, { ...match, goalsFor: 5 })).toEqual([])
  })

  it('keeps a report that is klaar from having an error', () => {
    expect(blockingIssues({ ...broken(), status: 'klaar' }, match).map((issue) => issue.code)).toEqual([
      'scorer-not-on-pitch',
    ])
    expect(blockingIssues(valid(), match)).toEqual([])
  })

  it('does not let a report that is bezig be built wrongly', () => {
    const report = changed((r) => {
      r.status = 'bezig'
      r.cards[0]!.appearanceId = 999
    })

    expect(blockingIssues(report, match).map((issue) => issue.code)).toEqual(['unknown-player'])
  })

  it('does not keep a report from being klaar for a warning', () => {
    const report = changed((r) => {
      r.appearances = r.appearances.filter((player) => player.id !== 16)
    })

    expect(checkMatchReport(report, match).warnings).not.toEqual([])
    expect(blockingIssues(report, match)).toEqual([])
  })
})

describe('minutesPlayed', () => {
  const empty = (): MatchReport => ({
    appearances: team(true, 1),
    cards: [],
    goals: [],
    incidents: [],
    opponentComplete: false,
    status: 'klaar',
    substitutions: [],
  })

  it('gives 90 minutes to a player in the line-up who stays on, and 120 with extra time', () => {
    expect(minutesPlayed(empty(), match, 1)).toBe(90)
    expect(minutesPlayed(empty(), { extraTime: true }, 1)).toBe(120)
  })

  it('counts a substitution from or to the minute on the clock', () => {
    const report = empty()

    report.substitutions.push({ inId: 12, minute: 60, outId: 1, stoppageMinutes: null })
    report.substitutions.push({ inId: 13, minute: 75, outId: 12, stoppageMinutes: null })

    expect(minutesPlayed(report, match, 1)).toBe(60)
    expect(minutesPlayed(report, match, 12)).toBe(15)
    expect(minutesPlayed(report, match, 13)).toBe(15)
    expect(minutesPlayed(report, match, 2)).toBe(90)
  })

  it('stops at a red card and at a yellow-red card', () => {
    const report = empty()

    report.cards.push({ appearanceId: 2, kind: 'rood', minute: 33, stoppageMinutes: null })
    report.cards.push({ appearanceId: 3, kind: 'geel', minute: 10, stoppageMinutes: null })
    report.cards.push({ appearanceId: 3, kind: 'geel-rood', minute: 70, stoppageMinutes: null })
    report.cards.push({ appearanceId: 4, kind: 'geel', minute: 70, stoppageMinutes: null })

    expect(minutesPlayed(report, match, 2)).toBe(33)
    expect(minutesPlayed(report, match, 3)).toBe(70)
    expect(minutesPlayed(report, match, 4)).toBe(90)
  })

  it('counts added time as the last minute of the half', () => {
    const report = empty()

    report.substitutions.push({ inId: 12, minute: 45, outId: 1, stoppageMinutes: 2 })
    report.cards.push({ appearanceId: 2, kind: 'rood', minute: 90, stoppageMinutes: 3 })

    expect(minutesPlayed(report, match, 1)).toBe(45)
    expect(minutesPlayed(report, match, 12)).toBe(45)
    expect(minutesPlayed(report, match, 2)).toBe(90)
  })

  it('gives at least one minute to a player who comes on in the added time of the second half', () => {
    const report = empty()

    report.substitutions.push({ inId: 12, minute: 90, outId: 1, stoppageMinutes: 3 })
    report.substitutions.push({ inId: 13, minute: 90, outId: 2, stoppageMinutes: null })

    expect(minutesPlayed(report, match, 12)).toBe(1)
    expect(minutesPlayed(report, match, 13)).toBe(1)
    expect(minutesPlayed(report, match, 1)).toBe(90)
    expect(playedMatch(report, 12)).toBe(true)
  })

  it('counts from the minute in extra time, until 120', () => {
    const report = empty()

    report.substitutions.push({ inId: 12, minute: 100, outId: 1, stoppageMinutes: null })
    report.substitutions.push({ inId: 13, minute: 120, outId: 2, stoppageMinutes: 1 })

    expect(minutesPlayed(report, { extraTime: true }, 12)).toBe(20)
    expect(minutesPlayed(report, { extraTime: true }, 13)).toBe(1)
    expect(minutesPlayed(report, { extraTime: true }, 1)).toBe(100)
    expect(minutesPlayed(report, { extraTime: true }, 3)).toBe(120)
  })

  it('gives nothing to a player on the bench who did not come on, or who is not in the report', () => {
    const report = empty()

    expect(minutesPlayed(report, match, 14)).toBe(0)
    expect(playedMatch(report, 14)).toBe(false)
    expect(minutesPlayed(report, match, 999)).toBe(0)
    expect(playedMatch(report, 1)).toBe(true)
  })

  it('gives nothing to a player who was sent off from the bench', () => {
    const report = empty()

    report.cards.push({ appearanceId: 14, kind: 'rood', minute: 40, stoppageMinutes: null })

    expect(minutesPlayed(report, match, 14)).toBe(0)
  })
})

describe('formationProblem', () => {
  it.each(['4-3-3', '4-4-2', '4-2-3-1', '3-4-2-1', '4-1-2-1-2', '10', '1-1-1-1-1-1-1-1-1-1', '5-4-1'])(
    'is fine with %s',
    (formation) => {
      expect(formationProblem(formation)).toBeUndefined()
    },
  )

  it('is fine with no formation, since a report may have none', () => {
    expect(formationProblem('')).toBeUndefined()
  })

  it('has every usual formation right, and they are ten field players', () => {
    expect(fieldPlayers).toBe(10)

    for (const formation of formationChoices) {
      expect(formationProblem(formation), formation).toBeUndefined()
    }

    expect(new Set(formationChoices).size).toBe(formationChoices.length)
    expect(formationChoices).toEqual(expect.arrayContaining(['4-3-3', '4-4-2', '4-2-3-1', '3-5-2', '3-4-3', '4-1-4-1']))
  })

  it('refuses numbers that add up to eleven, or to less than ten', () => {
    expect(formationProblem('4-3-4')).toBe(
      'De getallen van de formatie tellen op tot 11, en het moeten er 10 zijn: de veldspelers zonder de keeper.',
    )
    expect(formationProblem('4-4-1')).toContain('tellen op tot 9')
    expect(formationProblem('9')).toContain('tellen op tot 9')
    expect(formationProblem('11')).toContain('tellen op tot 11')
  })

  it('refuses a double hyphen, a hyphen at the start or at the end', () => {
    const message = 'Zet één koppelteken tussen de getallen, en geen koppelteken aan het begin of einde, zoals 4-3-3.'

    expect(formationProblem('4--3-3')).toBe(message)
    expect(formationProblem('4-3-3-')).toBe(message)
    expect(formationProblem('-4-3-3')).toBe(message)
    expect(formationProblem('-')).toBe(message)
  })

  it('refuses spaces, with a sentence about the spaces', () => {
    expect(formationProblem('4 3 3')).toBe('Schrijf de formatie zonder spaties, zoals 4-3-3.')
    expect(formationProblem('4-3-3 ')).toBe('Schrijf de formatie zonder spaties, zoals 4-3-3.')
  })

  it('refuses letters and other signs', () => {
    for (const value of ['vier-drie-drie', '4x3x3', '4,3,3', '4.3.3', '4-3-3a']) {
      expect(formationProblem(value), value).toBe(
        'Een formatie bestaat uit getallen met een koppelteken ertussen, zoals 4-3-3.',
      )
    }
  })

  it('refuses a number of 0 and a number that starts with a zero', () => {
    expect(formationProblem('0-4-6')).toBe('Elk getal van een formatie is minstens 1 en begint niet met een nul.')
    expect(formationProblem('4-03-3')).toBe('Elk getal van een formatie is minstens 1 en begint niet met een nul.')
  })
})

describe('checkMatchReport with formations', () => {
  it('has no error for a report without formations, with empty ones and with good ones', () => {
    expect(codes(valid())).toEqual([])
    expect(codes({ ...valid(), formations: { opponent: null, ours: null } })).toEqual([])
    expect(codes({ ...valid(), formations: { opponent: '4-4-2', ours: '4-3-3' } })).toEqual([])
  })

  it('names the team and the problem of a formation that is wrong', () => {
    const result = checkMatchReport({ ...valid(), formations: { opponent: '4-4-4', ours: '4-3-3' } }, match)

    expect(result.errors).toEqual([
      {
        code: 'formation-invalid',
        message:
          'De formatie van de tegenstander: De getallen van de formatie tellen op tot 12, en het moeten er 10 zijn: de veldspelers zonder de keeper.',
        place: { part: 'report' },
        structural: false,
      },
    ])
  })

  it('keeps a report from being klaar with a wrong formation, and lets a report that is bezig have it', () => {
    const wrong = { ...valid(), formations: { opponent: null, ours: '4-3' } }

    expect(blockingIssues({ ...wrong, status: 'klaar' }, match).map((issue) => issue.code)).toEqual([
      'formation-invalid',
    ])
    expect(blockingIssues({ ...wrong, status: 'bezig' }, match)).toEqual([])
  })
})

describe('a goal or a yellow card without a minute', () => {
  const noMinute = { minute: null, stoppageMinutes: null } as const

  it('passes, since the rules that need the clock have nothing to judge', () => {
    const report = changed((r) => {
      // A scorer and an assist who never came on, and a yellow card for a player who went off.
      r.goals[0] = { ...r.goals[0]!, ...noMinute, appearanceId: 14, assistId: 16 }
      r.cards.push({ appearanceId: 11, kind: 'geel', ...noMinute })
    })

    expect(checkMatchReport(report, match)).toEqual({ errors: [], warnings: [] })
  })

  it('is judged by the clock again as soon as it has a minute', () => {
    const report = changed((r) => {
      r.goals[0] = { ...r.goals[0]!, appearanceId: 14, assistId: 16, minute: 12 }
      r.cards.push({ appearanceId: 11, kind: 'geel', minute: 61, stoppageMinutes: null })
    })

    expect(codes(report)).toEqual(
      expect.arrayContaining(['scorer-not-on-pitch', 'assist-not-on-pitch', 'card-after-leaving']),
    )
  })

  it('counts a yellow card without a minute as the one before a yellow-red card', () => {
    const report = changed((r) => {
      r.cards[0] = { ...r.cards[0]!, ...noMinute }
    })

    expect(codes(report)).not.toContain('yellow-red-needs-one-yellow')
    expect(codes(report)).toEqual([])
  })

  it('still wants one yellow card before a yellow-red card', () => {
    const report = changed((r) => {
      r.cards = r.cards.filter((card) => card.kind !== 'geel')
    })

    expect(codes(report)).toContain('yellow-red-needs-one-yellow')
  })

  it('names a goal without a player without a minute', () => {
    const report = changed((r) => {
      r.goals[0] = { ...r.goals[0]!, ...noMinute, appearanceId: null, assistId: null }
    })
    const [issue] = checkMatchReport(report, match).errors

    expect(issue).toMatchObject({
      code: 'goal-without-player',
      message: 'Het doelpunt heeft geen speler die scoorde.',
      place: { index: 0, part: 'goals' },
    })
  })

  it('gives no minutes away: a player who scored it plays as before', () => {
    const report = changed((r) => {
      r.goals[0] = { ...r.goals[0]!, ...noMinute }
      r.cards[0] = { ...r.cards[0]!, ...noMinute }
    })

    expect(minutesPlayed(report, match, 9)).toBe(90)
    expect(minutesPlayed(report, match, 4)).toBe(80)
  })

  it('keeps the goals that add up to the score', () => {
    const report = changed((r) => {
      r.goals[0] = { ...r.goals[0]!, ...noMinute }
    })

    expect(codes(report)).not.toContain('goals-differ-from-score')
  })

  it('needs a minute for the added time', () => {
    const report = changed((r) => {
      r.goals[0] = { ...r.goals[0]!, minute: null, stoppageMinutes: 2 }
    })
    const [issue] = checkMatchReport(report, match).errors

    expect(issue).toMatchObject({
      code: 'stoppage-without-minute',
      message: 'Blessuretijd hoort bij een minuut. Vul de minuut in of laat de blessuretijd leeg.',
      place: { index: 0, part: 'goals' },
      structural: false,
    })
  })
})

describe('a red card or a yellow-red card without a minute', () => {
  it('is an error with a code, a place and a Dutch sentence', () => {
    const red = changed((r) => {
      r.cards[2] = { ...r.cards[2]!, minute: null }
    })
    const yellowRed = changed((r) => {
      r.cards[1] = { ...r.cards[1]!, minute: null }
    })

    expect(checkMatchReport(red, match).errors).toEqual([
      {
        code: 'red-card-without-minute',
        message: 'Een rode kaart heeft een minuut nodig, want daaruit volgt hoe lang de speler speelde.',
        place: { index: 2, part: 'cards' },
        structural: false,
      },
    ])
    expect(checkMatchReport(yellowRed, match).errors[0]).toMatchObject({
      code: 'red-card-without-minute',
      message: 'Een geel-rode kaart heeft een minuut nodig, want daaruit volgt hoe lang de speler speelde.',
      place: { index: 1, part: 'cards' },
    })
  })

  it('does not decide the minutes of the player: he is not sent off at an unknown moment', () => {
    const report = changed((r) => {
      r.cards[2] = { ...r.cards[2]!, minute: null }
    })

    expect(minutesPlayed(report, match, 105)).toBe(90)
  })
})
