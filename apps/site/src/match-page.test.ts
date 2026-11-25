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
  formationOursDerived: false,
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

/** A goal for the page, with the player's id; `ours` is who gains from it. */
const goal = (
  minute: null | number,
  playerId: number,
  ours: boolean,
  extra: { ownGoal?: boolean; penalty?: boolean; stoppageMinutes?: number } = {},
) => ({
  assistId: null,
  minute,
  ours,
  ownGoal: extra.ownGoal ?? false,
  penalty: extra.penalty ?? false,
  playerId,
  stoppageMinutes: extra.stoppageMinutes ?? null,
})

/** The score of each goal in the timeline, as the line writes it with its tone. */
function scoresOf(overrides: Partial<MatchPageData>) {
  const page = buildMatchPage({ ...cup(), penalties: null, ...overrides })

  return page.events.flatMap((event) =>
    event.kind === 'goal' ? [event.score === undefined ? null : `${event.score.home}–${event.score.away}`] : [],
  )
}

describe('the score after a goal', () => {
  const players = [player(1, true, 1), player(12, false, 1)]
  const result = { afterNinety: null, extraTime: false, players }

  it('writes the home club first in a home match, and counts for us', () => {
    const goals = [goal(10, 12, false), goal(30, 1, true), goal(70, 1, true)]

    expect(scoresOf({ ...result, goals, goalsAgainst: 1, goalsFor: 2, home: true })).toEqual(['0–1', '1–1', '2–1'])
  })

  it('writes the opponent first in an away match, so the home club is always first', () => {
    const goals = [goal(10, 12, false), goal(30, 1, true), goal(70, 1, true)]
    const page = buildMatchPage({
      ...cup(),
      ...result,
      goals,
      goalsAgainst: 1,
      goalsFor: 2,
      home: false,
      penalties: null,
    })
    const [first, , last] = page.events.flatMap((event) => (event.kind === 'goal' ? [event.score] : []))

    expect(first).toMatchObject({ away: 0, awayName: ourClub, home: 1, homeName: 'Cupdorp', ourSide: 'away' })
    expect(last).toMatchObject({ away: 2, home: 1 })
  })

  it('counts an own goal for the other club, from either side', () => {
    const goals = [goal(20, 1, false, { ownGoal: true }), goal(50, 12, true, { ownGoal: true })]

    expect(scoresOf({ ...result, goals, goalsAgainst: 1, goalsFor: 1, home: true })).toEqual(['0–1', '1–1'])
  })

  it('counts a penalty in the match like any goal', () => {
    const goals = [goal(33, 1, true, { penalty: true })]

    expect(scoresOf({ ...result, goals, goalsAgainst: 0, goalsFor: 1, home: true })).toEqual(['1–0'])
  })

  it('goes on over the halves and the extra time, and leaves out the shoot-out', () => {
    const goals = [goal(44, 1, true), goal(46, 12, false), goal(105, 1, true)]

    expect(scoresOf({ ...result, extraTime: true, goals, goalsAgainst: 1, goalsFor: 2, home: true })).toEqual([
      '1–0',
      '1–1',
      '2–1',
    ])
  })

  it('counts the goals in the order of the clock and keeps the order of two goals in one minute', () => {
    const goals = [goal(70, 1, true), goal(10, 12, false), goal(70, 12, false)]

    expect(scoresOf({ ...result, goals, goalsAgainst: 2, goalsFor: 1, home: true })).toEqual(['0–1', '1–1', '1–2'])
  })

  it('shows no score at all when a goal has no minute', () => {
    const goals = [goal(10, 12, false), goal(null, 1, true)]

    expect(scoresOf({ ...result, goals, goalsAgainst: 1, goalsFor: 1, home: true })).toEqual([null, null])
  })

  it('shows no score at all when the goals do not add up to the result', () => {
    const goals = [goal(10, 12, false), goal(30, 1, true)]

    expect(scoresOf({ ...result, goals, goalsAgainst: 1, goalsFor: 2, home: true })).toEqual([null, null])
  })

  it('names the clubs and the side of sc Heerenveen, for the colour and the spoken text', () => {
    const goals = [goal(10, 12, false)]
    const [event] = buildMatchPage({ ...cup(), ...result, goals, goalsAgainst: 1, goalsFor: 0, home: true }).events

    expect(event).toMatchObject({ score: { awayName: 'Cupdorp', homeName: ourClub, ourSide: 'home' } })
  })
})

describe('the header', () => {
  it('lists the goals under the club that gets them, in the order of the clock, with an own goal under the other club', () => {
    const { scorersAgainst, scorersFor } = built()

    // The own goal of the opponent's player Dirk Proefland counts for us: it is under
    // sc Heerenveen.
    expect(scorersFor.map((scorer) => [scorer.player, scorer.minute, scorer.ownGoal, scorer.penalty])).toEqual([
      ['Demo', 12, false, false],
      ['Proefland', 78, true, false],
    ])
    expect(scorersAgainst.map((scorer) => [scorer.player, scorer.minute, scorer.penalty])).toEqual([
      ['Dummydijk', 40, true],
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

describe('a goal and a yellow card without a minute', () => {
  /** The match with the first goal (12', ours) and the yellow card (30') without a minute. */
  const unknown = () => {
    const changed = data()

    changed.goals = changed.goals.map((goal, index) => (index === 0 ? { ...goal, minute: null } : goal))
    changed.cards = changed.cards.map((card) =>
      card.kind === 'geel' ? { ...card, minute: null, stoppageMinutes: null } : card,
    )

    return buildMatchPage(changed)
  }

  it('stand in the course of the match after the events with a minute, in the order they were given', () => {
    const { events } = unknown()

    expect(events.map((event) => [event.minute, event.kind])).toEqual([
      [40, 'goal'],
      [45, 'substitution'],
      [55, 'penalty-missed'],
      [60, 'substitution'],
      [78, 'goal'],
      [90, 'red-card'],
      [null, 'goal'],
      [null, 'yellow-card'],
    ])
  })

  it('stay in the list of scorers, after the goals with a minute', () => {
    const { scorersFor } = unknown()

    expect(scorersFor.map((scorer) => [scorer.player, scorer.minute])).toEqual([
      ['Proefland', 78],
      ['Demo', null],
    ])
  })

  it('are not on the score bar, which then does not agree with the result and is not shown', () => {
    const page = unknown()

    expect(page.scoreBar.map((goal) => goal.minute)).toEqual([40, 78])
    expect(page.scoreBarAgrees).toBe(false)
  })

  it('are marks on the player with no minute, and the minutes he played stay as they were', () => {
    const before = built().pitch.ours.players
    const after = unknown().pitch.ours.players
    const demo = after.find((one) => one.name.surname === 'Demo' || one.name.givenName === 'Rick Demo')

    expect(after.map((one) => one.minutesPlayed)).toEqual(before.map((one) => one.minutesPlayed))
    expect(demo?.goals).toEqual([{ minute: null, ownGoal: false }])
  })

  it('keep the red card of a player with its minute, and the minutes he played', () => {
    const page = unknown()
    const theirs = page.pitch.opponent?.players ?? []

    expect(theirs.find((one) => one.card?.kind === 'red-card')?.card?.minute).toBe(90)
  })
})

describe('the minutes of a player', () => {
  // The way the page worked out the minutes before it used the rules of the report form.
  const oldMinutes = (page: MatchPageData, id: number) => {
    const length = page.extraTime ? 120 : 90
    const starter = page.players.find((one) => one.id === id)?.starter === true
    const entered = page.substitutions.find((substitution) => substitution.inId === id)
    const off = page.substitutions.find((substitution) => substitution.outId === id)
    const sentOff = page.cards.find((card) => card.playerId === id && card.kind !== 'geel')

    return Math.max(
      1,
      Math.min(off?.minute ?? length, sentOff?.minute ?? length) - (starter ? 0 : (entered?.minute ?? length)),
    )
  }
  const lineUp = (page: MatchPageData) => {
    const result = buildMatchPage(page)
    const shown = [...result.pitch.ours.players, ...(result.pitch.opponent?.players ?? [])]

    return [...shown.map((one) => one.minutesPlayed), ...result.substitutes.ours.map((one) => one.minutesPlayed)]
  }
  const expected = (page: MatchPageData) =>
    [
      ...page.players.filter((one) => one.starter),
      ...page.substitutions.flatMap((one) => page.players.filter((other) => other.id === one.inId && other.ours)),
    ].map((one) => oldMinutes(page, one.id))

  it('stays the same as before for a handful of matches', () => {
    const base = cup()
    const matches: MatchPageData[] = [
      data(),
      base,
      { ...base, extraTime: false, substitutions: [{ inId: 3, minute: 80, outId: 2, stoppageMinutes: null }] },
      {
        ...base,
        cards: [{ kind: 'rood', minute: 70, playerId: 1, stoppageMinutes: null }],
        substitutions: [{ inId: 3, minute: 45, outId: 2, stoppageMinutes: 2 }],
      },
      { ...base, substitutions: [{ inId: 3, minute: 90, outId: 2, stoppageMinutes: 3 }] },
    ]

    for (const page of matches) {
      expect(lineUp(page).toSorted()).toEqual(expected(page).toSorted())
    }
  })
})

describe('a player with a namesake', () => {
  const shared = () => {
    const reported = reportedMatch()
    const hove = reported.names.get(4)!

    reported.names.set(4, { ...hove, namesakes: [{ givenName: 'Dirk', seasons: ['2027/28'] }], seasons: ['2026/27'] })

    return buildMatchPage(matchPageDataOf(reported, [], true))
  }

  it('gets the initial before his surname on the pitch, and the rest of the players nothing', () => {
    const { pitch } = shared()

    expect(pitch.ours.players.map((one) => one.lead)).toEqual([
      undefined,
      undefined,
      undefined,
      'R.',
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    ])
    expect(pitch.ours.players[3]?.name).toEqual({
      givenName: 'Ruben',
      href: '/spelers/ruben-ten-hove',
      surname: 'ten Hove',
    })
  })
})

describe('a player of the opponent', () => {
  const page = () => {
    const reported = reportedMatch()

    reported.opponentPersons.set(103, { familyName: 'Proefland', familyNamePrefix: 'van', givenName: 'Dirk' })

    return buildMatchPage(matchPageDataOf(reported, [], true))
  }

  it('has no given name on the pitch, from the person or from the text, and ours stay as they are', () => {
    const { pitch } = page()
    const theirs = pitch.opponent?.players ?? []

    expect(theirs[2]).toMatchObject({ name: { givenName: 'Dirk Proefland', surname: '' }, shortName: 'van Proefland' })
    expect(theirs[8]?.shortName).toBe('Dummydijk')
    expect(pitch.ours.players.every((one) => !('shortName' in one))).toBe(true)
  })

  it('has no given name among the scorers, and the whole name in the course of the match', () => {
    const { events, scorersAgainst } = page()

    expect(scorersAgainst.map((scorer) => scorer.player)).toEqual(['Dummydijk'])
    expect(events).toContainEqual(
      expect.objectContaining({ kind: 'goal', player: { givenName: 'Frank Dummydijk', surname: '' } }),
    )
  })

  it('gets the initial on the pitch and among the scorers when he shares his name', () => {
    const reported = reportedMatch()
    const other = reported.stored.appearances.find((player) => player.id === 110)!

    other.name = 'Ronald Dummydijk'

    const built = buildMatchPage(matchPageDataOf(reported, [], true))

    expect(built.pitch.opponent?.players[8]?.lead).toBe('F.')
    expect(built.scorersAgainst[0]?.player).toBe('F. Dummydijk')
    expect(built.substitutes.opponent?.[0]?.name.surname).toBe('')
  })
})
