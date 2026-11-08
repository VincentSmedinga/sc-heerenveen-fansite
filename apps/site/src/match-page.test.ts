import { describe, expect, it } from 'vitest'

import { buildMatchPage, type MatchPageData, type MatchPagePlayer, ourClub } from './match-page'
import { matchPageDataOf } from './report-view'
import { reportedMatch } from './test-reports'

// The made-up match of test-reports.ts: a home win of 2–1 over Testdorp FC with a goal, an own
// goal and a penalty, a missed penalty, a yellow and a red card and a substitution of both
// teams.
const data = () => matchPageDataOf(reportedMatch(), [], true)
const built = () => buildMatchPage(data())

const player = (id: number, ours: boolean, shirtNumber: null | number, starter = true): MatchPagePlayer => ({
  captain: false,
  id,
  name: { givenName: `Speler ${id}`, surname: '' },
  ours,
  shirtNumber,
  starter,
})

/** A match of extra time with a shoot-out, with two players for each team. */
const cup = (): MatchPageData => ({
  afterNinety: { against: 1, for: 1 },
  cards: [],
  complete: true,
  extraTime: true,
  facts: [],
  formations: { opponent: '4-4-2', ours: '4-3-3' },
  goals: [],
  goalsAgainst: 1,
  goalsFor: 1,
  home: false,
  incidents: [],
  kicks: [
    { ours: false, playerId: 12, result: 'gestopt', round: 1 },
    { ours: true, playerId: 1, result: 'raak', round: 1 },
    { ours: true, playerId: null, result: 'naast', round: 2 },
  ],
  opponent: 'Cupdorp',
  opponentComplete: true,
  penalties: { against: 3, for: 4 },
  players: [player(1, true, 1), player(2, true, 2), player(3, true, 12, false), player(12, false, 1)],
  substitutions: [{ inId: 3, minute: 100, outId: 2, stoppageMinutes: null }],
})

describe('the events', () => {
  const { events } = built()

  it('puts the goals, the substitutions, the cards and the missed penalties in the order of the clock', () => {
    expect(events.map((event) => [event.minute, event.stoppageMinutes ?? null, event.kind])).toEqual([
      [12, null, 'goal'],
      [30, null, 'yellow-card'],
      [40, null, 'goal'],
      [45, 2, 'substitution'],
      [55, null, 'penalty-missed'],
      [60, null, 'substitution'],
      [78, null, 'goal'],
      [90, 3, 'red-card'],
    ])
  })

  it('gives the assist with a goal, and the penalty', () => {
    expect(events[0]).toMatchObject({ assist: { givenName: 'Thijs', surname: 'Idzenga' }, kind: 'goal', ours: true })
    expect(events[2]).toMatchObject({ kind: 'goal', ours: false, penalty: true, team: 'Testdorp FC' })
    expect(events[2]).not.toHaveProperty('assist')
  })

  it('gives an own goal the team of the player who scored it, and not the team that gets it', () => {
    expect(events[6]).toMatchObject({ kind: 'goal', ours: false, ownGoal: true, team: 'Testdorp FC' })
  })

  it('names the team of every event, with sc Heerenveen for ours', () => {
    expect(events[0]?.team).toBe(ourClub)
    expect(events[7]).toMatchObject({ ours: false, team: 'Testdorp FC' })
  })

  it('names who comes on and who goes off in a substitution', () => {
    expect(events[5]).toMatchObject({
      kind: 'substitution',
      playerIn: { givenName: 'Gerrit Nepper', surname: '' },
      playerOut: { givenName: 'Thijs', surname: 'Idzenga' },
    })
  })

  it('puts the added time of the first half before the next minute', () => {
    const changed = data()

    changed.cards = [{ ...changed.cards[0]!, minute: 46 }]

    const order = buildMatchPage(changed).events.map(
      (event) =>
        `${event.minute}${event.stoppageMinutes === undefined || event.stoppageMinutes === null ? '' : `+${event.stoppageMinutes}`}`,
    )

    expect(order.indexOf('45+2')).toBeLessThan(order.indexOf('46'))
  })
})

describe('the header', () => {
  it('lists the goals under the club that gets them, in the order of the clock, with an own goal under the other club', () => {
    const { scorersAgainst, scorersFor } = built()

    // The own goal of the opponent's player Dirk Proefland counts for us: it is under
    // sc Heerenveen.
    expect(scorersFor.map((scorer) => [scorer.player, scorer.minute, scorer.ownGoal, scorer.penalty])).toEqual([
      ['Demo', 12, false, false],
      ['Dirk Proefland', 78, true, false],
    ])
    expect(scorersAgainst.map((scorer) => [scorer.player, scorer.minute, scorer.penalty])).toEqual([
      ['Frank Dummydijk', 40, true],
    ])
  })

  it('gives the score bar the goals with the team that gets them', () => {
    expect(built().scoreBar).toEqual([
      { minute: 12, ours: true, stoppageMinutes: null },
      { minute: 40, ours: false, stoppageMinutes: null },
      { minute: 78, ours: true, stoppageMinutes: null },
    ])
  })
})

describe('the pitch', () => {
  const { pitch } = built()

  it('has the eleven starters of each team in the order of the report, and not the bench', () => {
    expect(pitch.ours.players.map((one) => one.shirtNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(pitch.opponent?.players.map((one) => one.shirtNumber)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11])
    expect(pitch.ours).toMatchObject({ formation: '4-3-3', name: ourClub })
    expect(pitch.opponent).toMatchObject({ formation: '4-4-2', name: 'Testdorp FC' })
  })

  it('keeps the order of the players it was given, also when it is not the order of the shirt numbers', () => {
    const reversed = data()

    reversed.players = [...reversed.players].toReversed()

    expect(buildMatchPage(reversed).pitch.ours.players.map((one) => one.shirtNumber)).toEqual([
      11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
    ])
  })

  it('puts every player without a shirt number on the pitch, and a number twice only once', () => {
    const changed = data()

    changed.players = changed.players.map((one, index) =>
      one.ours && index < 3
        ? { ...one, shirtNumber: null }
        : one.ours && index === 3
          ? { ...one, shirtNumber: 11 }
          : one,
    )

    const { pitch: other } = buildMatchPage(changed)

    expect(other.ours.players.map((one) => one.shirtNumber)).toEqual([null, null, null, 11, 5, 6, 7, 8, 9, 10])
  })

  it('marks the captain, the goals, the card and the minute of a player who went off, with the minutes he played', () => {
    const [keeper, , , four, , , , , nine, ten] = pitch.ours.players

    expect(keeper).toMatchObject({ captain: false, minutesPlayed: 90 })
    expect(pitch.ours.players.filter((one) => one.captain === true).map((one) => one.shirtNumber)).toEqual([10])
    expect(four?.card).toEqual({ kind: 'yellow-card', minute: 30, stoppageMinutes: undefined })
    expect(nine?.goals).toEqual([{ minute: 12, ownGoal: false, stoppageMinutes: undefined }])
    // Number 10 went off in the 60th minute and played 60.
    expect(ten).toMatchObject({ minutesPlayed: 60, substitutedOffAt: 60 })
  })

  it('gives a player who was sent off the minutes up to his card, and no minute of a substitution', () => {
    const five = pitch.opponent?.players.find((one) => one.shirtNumber === 5)

    expect(five).toMatchObject({ card: { kind: 'red-card', minute: 90 }, minutesPlayed: 90 })
    expect(five?.substitutedOffAt).toBeUndefined()
  })

  it('gives the goal of an own goal to the player who scored it, in the line-up of his own team', () => {
    const three = pitch.opponent?.players.find((one) => one.shirtNumber === 3)

    expect(three?.goals).toEqual([{ minute: 78, ownGoal: true, stoppageMinutes: undefined }])
  })

  it('has no opponent on the pitch when his side of the report is not complete', () => {
    const open = { ...data(), opponentComplete: false }
    const result = buildMatchPage(open)

    expect(result.pitch.opponent).toBeUndefined()
    expect(result.substitutes.opponent).toBeUndefined()
    // The events of the opponent stay in the course of the match.
    expect(result.events.some((event) => !event.ours)).toBe(true)
  })

  it('runs the minutes to 120 in extra time', () => {
    const result = buildMatchPage(cup())

    expect(result.pitch.ours.players[0]?.minutesPlayed).toBe(120)
    // Number 2 went off in the 100th minute.
    expect(result.pitch.ours.players[1]).toMatchObject({ minutesPlayed: 100, substitutedOffAt: 100 })
  })
})

describe('the substitutes', () => {
  it('lists those who came on, with the minute, who they replaced and the minutes they played', () => {
    const { substitutes } = built()

    expect(substitutes.ours).toEqual([
      {
        goals: [],
        minute: 60,
        minutesPlayed: 30,
        name: { givenName: 'Gerrit Nepper', surname: '' },
        playerOut: { givenName: 'Thijs', surname: 'Idzenga' },
        shirtNumber: 12,
        stoppageMinutes: undefined,
      },
    ])
    expect(substitutes.opponent).toEqual([
      expect.objectContaining({ minute: 45, minutesPlayed: 45, shirtNumber: 12, stoppageMinutes: 2 }),
    ])
  })

  it('does not list a player of the bench who did not play', () => {
    expect(built().substitutes.ours.map((one) => one.shirtNumber)).not.toContain(13)
  })

  it('gives a substitute the goals he scored after he came on, and the minutes to 120 in extra time', () => {
    const changed = cup()

    changed.goals = [
      { assistId: null, minute: 105, ours: true, ownGoal: false, penalty: false, playerId: 3, stoppageMinutes: null },
    ]

    const [substitute] = buildMatchPage(changed).substitutes.ours

    expect(substitute).toMatchObject({ minute: 100, minutesPlayed: 20 })
    expect(substitute?.goals).toEqual([{ minute: 105, ownGoal: false, stoppageMinutes: undefined }])
  })

  it('counts at least a minute for a substitute who came on at the end', () => {
    const changed = data()

    changed.substitutions = [{ inId: 12, minute: 90, outId: 11, stoppageMinutes: 2 }]

    expect(buildMatchPage(changed).substitutes.ours[0]?.minutesPlayed).toBe(1)
  })
})

describe('the shoot-out', () => {
  it('has no rounds for a match without kicks', () => {
    expect(built().series).toEqual([])
  })

  it('groups the kicks into the rounds from the first, with the kick of each team and its player', () => {
    const { series } = buildMatchPage(cup())

    expect(series).toEqual([
      {
        ours: { player: { givenName: 'Speler 1', surname: '' }, result: 'scored' },
        theirs: { player: { givenName: 'Speler 12', surname: '' }, result: 'saved' },
      },
      { ours: { result: 'missed' } },
    ])
  })
})

describe('a highlighted event', () => {
  it('marks the line of the event, whatever its kind, and no other', () => {
    const changed = data()

    changed.goals = [{ ...changed.goals[0]!, highlighted: true }, ...changed.goals.slice(1)]
    changed.cards = [{ ...changed.cards[0]!, highlighted: true }]
    changed.incidents = [{ ...changed.incidents[0]!, highlighted: true }]
    changed.substitutions = [{ ...changed.substitutions[0]!, highlighted: true }, ...changed.substitutions.slice(1)]

    const { events } = buildMatchPage(changed)

    expect(events.filter((event) => event.highlighted === true).map((event) => event.kind)).toEqual([
      'goal',
      'yellow-card',
      'penalty-missed',
      'substitution',
    ])
    expect(events.filter((event) => event.highlighted !== true)).toHaveLength(3)
  })
})

describe('the score bar and the result', () => {
  it('agree when the goals of the report add up to the result', () => {
    expect(built().scoreBarAgrees).toBe(true)
  })

  it('have a bar for a report that is complete, also with a goal of the opponent without a player', () => {
    const changed = data()

    // The rules let a complete report have a goal of an opponent whose line-up is not known:
    // it has no player, so it is not in the goals of the page.
    changed.goals = changed.goals.filter((goal) => goal.ours)

    expect(changed.complete).toBe(true)
    expect(buildMatchPage(changed).scoreBarAgrees).toBe(true)
  })

  it('do not agree when the report has fewer goals than the result, such as a report still being filled in', () => {
    const changed = data()

    changed.complete = false
    changed.goals = changed.goals.slice(0, 1)

    expect(buildMatchPage(changed).scoreBarAgrees).toBe(false)
  })
})
