import type { PublicMatch, PublicStaff } from '@fansite/db/queries'

import { describe, expect, it } from 'vitest'

import {
  dutchDay,
  type NoteworthyFact,
  noteworthyFactsOf,
  orderNoteworthyFacts,
  parseNoteworthyNumber,
  pickNoteworthyFact,
} from './noteworthy'

type Goal = PublicMatch['goals'][number]

const goal = (player: string, options: Partial<Goal> = {}): Goal => ({
  minute: 10,
  ours: true,
  ownGoal: false,
  penalty: false,
  player,
  playerId: null,
  playerName: null,
  playerPage: null,
  playerSearchTerm: null,
  stoppageMinutes: null,
  ...options,
})

const theirs = (player: string, options: Partial<Goal> = {}) => goal(player, { ours: false, ...options })

/** A played match of ours with these goals, and the result they add up to. */
const played = (goals: Goal[], options: Partial<PublicMatch> = {}): PublicMatch => ({
  afterNinetyAgainst: null,
  afterNinetyFor: null,
  competition: 'Eredivisie',
  dateText: null,
  extraTime: false,
  goals,
  goalsAgainst: goals.filter((item) => !item.ours).length,
  goalsFor: goals.filter((item) => item.ours).length,
  home: true,
  kickoffAt: new Date('2026-08-01T14:30:00Z'),
  matchDate: '2026-08-01',
  note: null,
  opponent: 'Testdorp FC',
  penaltiesAgainst: null,
  penaltiesFor: null,
  round: 'Speelronde 1',
  stadium: null,
  status: 'played',
  ...options,
})

/** A match without goals, only a score, on the given round. */
const scored = (goalsFor: number, goalsAgainst: number, options: Partial<PublicMatch> = {}) =>
  played([], { goalsAgainst, goalsFor, ...options })

const coach = (options: Partial<PublicStaff> = {}): PublicStaff => ({
  endDate: null,
  endPrecision: null,
  interim: false,
  name: 'Testtrainer',
  startDate: '2026-07-01',
  startPrecision: 'day',
  wikipediaPage: null,
  ...options,
})

const texts = (matches: PublicMatch[], coaches: PublicStaff[] = [], choice: 'all' | 'league' = 'all') =>
  noteworthyFactsOf(matches, coaches, choice).map(({ text }) => text)

const times = (count: number, make: (index: number) => Goal) => Array.from({ length: count }, (_, index) => make(index))

describe('noteworthyFactsOf: goals in minutes that follow each other', () => {
  it('finds two goals in minutes that follow each other, of ours', () => {
    expect(texts([played([goal('A', { minute: 23 }), goal('B', { minute: 24 })])])).toEqual([
      'Thuis tegen Testdorp FC (2–0, 1 augustus 2026) vielen in de 23e en de 24e minuut twee doelpunten achter elkaar.',
    ])
  })

  it('finds a goal against us and a goal of ours too, and writes the score of an away match with the home club first', () => {
    const match = played([theirs('X', { minute: 60 }), goal('A', { minute: 61 })], { home: false })

    expect(texts([match])).toEqual([
      'Uit bij Testdorp FC (1–1, 1 augustus 2026) vielen in de 60e en de 61e minuut twee doelpunten achter elkaar.',
    ])
  })

  it('says nothing for two goals two minutes apart, or in the same minute', () => {
    expect(texts([played([goal('A', { minute: 23 }), goal('B', { minute: 25 })])])).toEqual([])
    expect(texts([played([goal('A', { minute: 23 }), goal('B', { minute: 23 })])])).toEqual([])
  })

  it('says nothing for goals in stoppage time, where the minutes are not a clock', () => {
    const goals = [goal('A', { minute: 45, stoppageMinutes: 1 }), goal('B', { minute: 46 })]

    expect(texts([played(goals)])).toEqual([])
  })

  it('gives one fact for a match with three goals in a row', () => {
    const goals = [10, 11, 12].map((minute) => goal(`Speler ${minute}`, { minute }))

    expect(texts([played(goals)])).toHaveLength(1)
  })
})

describe('noteworthyFactsOf: goals in stoppage time', () => {
  it('finds two goals in the stoppage time of the first half, of both clubs together', () => {
    const goals = [goal('A', { minute: 45, stoppageMinutes: 1 }), theirs('X', { minute: 45, stoppageMinutes: 3 })]

    expect(texts([played(goals)])).toEqual([
      'Thuis tegen Testdorp FC (1–1, 1 augustus 2026) vielen in de blessuretijd van de eerste helft twee doelpunten.',
    ])
  })

  it('finds three goals in the stoppage time of the second half', () => {
    const goals = times(3, (index) => goal(`Speler ${index}`, { minute: 90, stoppageMinutes: index + 1 }))

    expect(texts([played(goals)])).toEqual([
      'Thuis tegen Testdorp FC (3–0, 1 augustus 2026) vielen in de blessuretijd van de tweede helft drie doelpunten.',
    ])
  })

  it('says nothing for one goal, or for a goal in minute 45 that is not in stoppage time', () => {
    expect(texts([played([goal('A', { minute: 45, stoppageMinutes: 2 })])])).toEqual([])
    expect(texts([played([goal('A', { minute: 45 }), goal('B', { minute: 45, stoppageMinutes: 1 })])])).toEqual([])
  })

  it('counts a goal in each half apart', () => {
    const goals = [goal('A', { minute: 45, stoppageMinutes: 1 }), goal('B', { minute: 90, stoppageMinutes: 1 })]

    expect(texts([played(goals)])).toEqual([])
  })
})

describe('noteworthyFactsOf: hattricks', () => {
  it('finds a hattrick of one of our players, by name', () => {
    const goals = [10, 30, 70].map((minute) => goal('Proefman', { minute, playerName: 'Piet Proefman' }))

    expect(texts([played(goals)])).toEqual([
      'Thuis tegen Testdorp FC (3–0, 1 augustus 2026) maakte Piet Proefman een hattrick.',
    ])
  })

  it('finds a hattrick of a player of the opponent, with his club', () => {
    const goals = [10, 30, 70].map((minute) => theirs('Tegenman', { minute }))

    expect(texts([played(goals)])).toEqual([
      'Thuis tegen Testdorp FC (0–3, 1 augustus 2026) maakte Tegenman van Testdorp FC een hattrick.',
    ])
  })

  it('counts four goals as the number of goals, and a penalty as a goal', () => {
    const goals = [10, 30, 50].map((minute) => goal('Proefman', { minute }))

    goals.push(goal('Proefman', { minute: 80, penalty: true }))

    expect(texts([played(goals)])).toEqual([
      'Thuis tegen Testdorp FC (4–0, 1 augustus 2026) maakte Proefman vier doelpunten.',
    ])
  })

  it('says nothing for two goals, for own goals, or for three goals shared between players', () => {
    expect(texts([played([goal('A', { minute: 5 }), goal('A', { minute: 50 })])])).toEqual([])
    expect(texts([played(times(3, (index) => goal('A', { minute: 5 + index * 20, ownGoal: true })))])).toEqual([])
    expect(texts([played([goal('A', { minute: 5 }), goal('B', { minute: 50 }), goal('A', { minute: 80 })])])).toEqual(
      [],
    )
  })

  it('keeps a player of ours and one of the opponent with the same name apart', () => {
    const goals = [
      goal('Jansen', { minute: 5 }),
      goal('Jansen', { minute: 50 }),
      theirs('Jansen', { minute: 70 }),
      theirs('Jansen', { minute: 80 }),
    ]

    expect(texts([played(goals)])).toEqual([])
  })

  it('knows a player by id before the name', () => {
    const goals = [10, 30, 70].map((minute, index) => goal(`Variant ${index}`, { minute, playerId: 7 }))

    expect(texts([played(goals)])).toHaveLength(1)
  })
})

describe('noteworthyFactsOf: many goals', () => {
  it('finds a match with seven goals, of both clubs together, from the score', () => {
    expect(texts([scored(4, 3)])).toEqual(['Thuis tegen Testdorp FC (4–3, 1 augustus 2026) vielen zeven doelpunten.'])
  })

  it('finds more than seven goals, and writes a number above twelve with digits', () => {
    expect(texts([scored(9, 0)])).toEqual(['Thuis tegen Testdorp FC (9–0, 1 augustus 2026) vielen negen doelpunten.'])
    expect(texts([scored(14, 0)])[0]).toContain('vielen 14 doelpunten')
  })

  it('says nothing for six goals', () => {
    expect(texts([scored(3, 3)])).toEqual([])
  })
})

describe('noteworthyFactsOf: a win after a deficit of two goals', () => {
  const comeback = [
    theirs('X', { minute: 10 }),
    theirs('Y', { minute: 20 }),
    goal('A', { minute: 50 }),
    goal('B', { minute: 60 }),
    goal('C', { minute: 80 }),
  ]

  it('finds a win after being two goals behind', () => {
    expect(texts([played(comeback)])).toEqual([
      'Thuis tegen Testdorp FC (3–2, 1 augustus 2026) kwamen we twee doelpunten achter en wonnen we toch.',
    ])
  })

  it('says the biggest deficit', () => {
    const goals = [theirs('X', { minute: 5 }), theirs('Y', { minute: 10 }), theirs('Z', { minute: 15 })]

    goals.push(...times(4, (index) => goal(`Speler ${index}`, { minute: 50 + index * 5 })))

    expect(texts([played(goals)]).join(' ')).toContain('kwamen we drie doelpunten achter')
  })

  it('says nothing for a draw after the deficit, for a deficit of one goal, or for a loss', () => {
    expect(texts([played(comeback.slice(0, 4))])).toEqual([])
    expect(
      texts([played([theirs('X', { minute: 10 }), goal('A', { minute: 20 }), goal('B', { minute: 30 })])]),
    ).toEqual([])
    expect(texts([played([...comeback.slice(0, 2), theirs('Z', { minute: 70 })])])).toEqual([])
  })

  it('says nothing when the goals do not make up the score', () => {
    expect(texts([played(comeback, { goalsFor: 4 })])).toEqual([])
  })

  it('counts a win in extra time, but not a win in a shoot-out after a draw', () => {
    expect(texts([played(comeback, { competition: 'KNVB Beker', extraTime: true })])).toHaveLength(1)
    expect(
      texts([
        played(comeback.slice(0, 4), {
          competition: 'KNVB Beker',
          extraTime: true,
          penaltiesAgainst: 3,
          penaltiesFor: 4,
        }),
      ]),
    ).toEqual([])
  })
})

describe('noteworthyFactsOf: wins in a row at home or away', () => {
  const home = (round: number, goalsFor = 1, goalsAgainst = 0) =>
    scored(goalsFor, goalsAgainst, {
      matchDate: `2026-08-${String(round).padStart(2, '0')}`,
      round: `Speelronde ${round}`,
    })
  const away = (round: number, goalsFor = 1, goalsAgainst = 0) => ({
    ...home(round, goalsFor, goalsAgainst),
    home: false,
  })

  it('finds five home wins in a row, from the fifth, and does not break on the away matches in between', () => {
    const matches = [home(1), away(2, 0, 1), home(3), away(4, 0, 0), home(5), away(6), home(7), home(8)]

    expect(texts(matches)).toEqual([
      'Vijf thuiswedstrijden op rij gewonnen, de laatste tegen Testdorp FC (1–0, 8 augustus 2026).',
    ])
  })

  it('finds a longer run as one fact with its length', () => {
    const matches = Array.from({ length: 6 }, (_, index) => home(index + 1))

    expect(texts(matches)).toEqual([
      'Zes thuiswedstrijden op rij gewonnen, de laatste tegen Testdorp FC (1–0, 6 augustus 2026).',
    ])
  })

  it('finds five away wins in a row, with the score of the home club first', () => {
    const matches = Array.from({ length: 5 }, (_, index) => away(index + 1))

    expect(texts(matches)).toEqual([
      'Vijf uitwedstrijden op rij gewonnen, de laatste bij Testdorp FC (0–1, 5 augustus 2026).',
    ])
  })

  it('says nothing for four wins, or for a draw or a loss in the run', () => {
    expect(texts(Array.from({ length: 4 }, (_, index) => home(index + 1)))).toEqual([])
    expect(texts([home(1), home(2), home(3, 1, 1), home(4), home(5), home(6), home(7)])).toEqual([])
    expect(texts([home(1), home(2), home(3, 0, 1), home(4), home(5), home(6), home(7)])).toEqual([])
  })

  it('finds two runs of the same place as two facts', () => {
    const matches = [...Array.from({ length: 5 }, (_, index) => home(index + 1)), home(6, 0, 0)]

    matches.push(...Array.from({ length: 5 }, (_, index) => home(index + 7)))

    expect(texts(matches)).toHaveLength(2)
  })
})

describe('noteworthyFactsOf: the first match under a new coach', () => {
  const season = [
    scored(1, 0, { matchDate: '2026-08-01', round: 'Speelronde 1' }),
    scored(2, 2, { matchDate: '2026-08-08', round: 'Speelronde 2' }),
    scored(0, 3, { home: false, matchDate: '2026-08-15', opponent: 'FC Maquette', round: 'Speelronde 3' }),
  ]
  const first = coach({ endDate: '2026-08-10', endPrecision: 'day', name: 'Eerste Trainer', startDate: '2026-07-01' })

  it('finds the first match after the day he began, with the opponent and the score', () => {
    const second = coach({ name: 'Nieuwe Trainer', startDate: '2026-08-10' })

    expect(texts(season, [first, second])).toEqual([
      'De eerste wedstrijd onder trainer Nieuwe Trainer: uit bij FC Maquette (3–0, 15 augustus 2026).',
    ])
  })

  it('calls an interim coach so, and counts a match on the day he began', () => {
    const interim = coach({ interim: true, name: 'Tijdelijk', startDate: '2026-08-08' })

    expect(texts(season, [first, interim])).toEqual([
      'De eerste wedstrijd onder interimtrainer Tijdelijk: thuis tegen Testdorp FC (2–2, 8 augustus 2026).',
    ])
  })

  it('says nothing for the coach the season began with, or for one who began before the first match', () => {
    expect(texts(season, [first])).toEqual([])
    expect(
      texts(season, [coach({ name: 'A', startDate: '2026-06-01' }), coach({ name: 'B', startDate: '2026-07-15' })]),
    ).toEqual([])
  })

  it('says nothing for a day known to the month or the year', () => {
    const vague = coach({ name: 'Vaag', startDate: '2026-08-01', startPrecision: 'month' })

    expect(texts(season, [first, vague])).toEqual([])
  })

  it('says nothing when no match was played after he began', () => {
    expect(texts(season, [first, coach({ name: 'Laat', startDate: '2026-09-01' })])).toEqual([])
  })

  it('says nothing when the first match after he began has no score yet', () => {
    const matches = [
      ...season.slice(0, 2),
      played([], { goalsAgainst: null, goalsFor: null, matchDate: '2026-08-15', status: 'scheduled' }),
    ]

    expect(texts(matches, [first, coach({ name: 'Nieuw', startDate: '2026-08-10' })])).toEqual([])
  })

  it('says nothing when the choice of the visitor leaves out the first match under him', () => {
    const cup = scored(1, 0, { competition: 'KNVB Beker', matchDate: '2026-08-12', round: 'Tweede ronde' })
    const matches = [season[0] as PublicMatch, season[1] as PublicMatch, cup, season[2] as PublicMatch]
    const second = coach({ name: 'Nieuw', startDate: '2026-08-10' })

    expect(texts(matches, [first, second], 'all')).toHaveLength(1)
    expect(texts(matches, [first, second], 'league')).toEqual([])
  })
})

describe('noteworthyFactsOf', () => {
  it('has nothing for a season without matches, or one without a result', () => {
    expect(noteworthyFactsOf([], [], 'all')).toEqual([])
    expect(
      noteworthyFactsOf([played([], { goalsAgainst: null, goalsFor: null, status: 'scheduled' })], [], 'all'),
    ).toEqual([])
  })

  it('has nothing for a match that was postponed', () => {
    expect(noteworthyFactsOf([scored(5, 4, { status: 'postponed' })], [], 'all')).toEqual([])
  })

  it('follows the choice: a cup tie counts for all the matches and not for the league alone', () => {
    const cup = scored(5, 3, { competition: 'KNVB Beker' })

    expect(noteworthyFactsOf([cup], [], 'all')).toHaveLength(1)
    expect(noteworthyFactsOf([cup], [], 'league')).toEqual([])
  })

  it('gives a fact an id of its own, the same on every call', () => {
    const matches = [scored(5, 3), scored(4, 4, { round: 'Speelronde 2' })]
    const ids = noteworthyFactsOf(matches, [], 'all').map(({ id }) => id)

    expect(new Set(ids).size).toBe(2)
    expect(noteworthyFactsOf(matches, [], 'all').map(({ id }) => id)).toEqual(ids)
  })

  it('gives every kind that fits, for one match', () => {
    const goals = [
      theirs('X', { minute: 5 }),
      theirs('Y', { minute: 6 }),
      ...times(5, (index) => goal('Proefman', { minute: 50 + index * 10 })),
    ]

    expect(noteworthyFactsOf([played(goals)], [], 'all').map(({ id }) => id.split(':')[0])).toEqual([
      'opeenvolgende-minuten',
      'hattrick',
      'veel-doelpunten',
      'ruime-achterstand',
    ])
  })
})

describe('dutchDay', () => {
  it('is the day in Dutch time: just after midnight there is a new day', () => {
    expect(dutchDay(new Date('2026-11-01T22:59:00Z'))).toBe('2026-11-01')
    expect(dutchDay(new Date('2026-11-01T23:01:00Z'))).toBe('2026-11-02')
  })
})

describe('orderNoteworthyFacts', () => {
  const facts: NoteworthyFact[] = Array.from({ length: 12 }, (_, index) => ({
    id: `kind:${index}`,
    text: `NoteworthyFact ${index}`,
  }))
  const ids = (list: NoteworthyFact[]) => list.map(({ id }) => id)

  it('gives the same order on the same day, whatever the order it gets', () => {
    expect(ids(orderNoteworthyFacts(facts, '2026-11-01'))).toEqual(
      ids(orderNoteworthyFacts([...facts].reverse(), '2026-11-01')),
    )
  })

  it('gives another order on another day', () => {
    expect(ids(orderNoteworthyFacts(facts, '2026-11-01'))).not.toEqual(ids(orderNoteworthyFacts(facts, '2026-11-02')))
  })

  it('shuffles: it is not the order of the list', () => {
    expect(ids(orderNoteworthyFacts(facts, '2026-11-01'))).not.toEqual(ids(facts))
  })

  it('keeps every fact, once', () => {
    expect(ids(orderNoteworthyFacts(facts, '2026-11-01')).toSorted()).toEqual(ids(facts).toSorted())
  })

  it('does not move the others when a fact is added or goes', () => {
    const order = ids(orderNoteworthyFacts(facts, '2026-11-01'))
    const without = ids(orderNoteworthyFacts(facts.slice(1), '2026-11-01'))

    expect(without).toEqual(order.filter((id) => id !== 'kind:0'))
  })

  it('gives an empty list for none', () => {
    expect(orderNoteworthyFacts([], '2026-11-01')).toEqual([])
  })
})

describe('parseNoteworthyNumber', () => {
  it('reads a whole number from 1', () => {
    expect(parseNoteworthyNumber('1')).toBe(1)
    expect(parseNoteworthyNumber('2')).toBe(2)
    expect(parseNoteworthyNumber('15')).toBe(15)
  })

  it.each([undefined, '', '0', '-1', '1.5', '02', '1e1', 'abc', '1000', ['2', '3']])(
    'gives the first for %j',
    (value) => {
      expect(parseNoteworthyNumber(value)).toBe(1)
    },
  )
})

describe('pickNoteworthyFact', () => {
  const ordered: NoteworthyFact[] = ['a', 'b', 'c'].map((id) => ({ id, text: id }))

  it('picks the nth, and the number of the next', () => {
    expect(pickNoteworthyFact(ordered, 1)).toEqual({ fact: ordered[0], next: 2, number: 1 })
    expect(pickNoteworthyFact(ordered, 2)).toEqual({ fact: ordered[1], next: 3, number: 2 })
  })

  it('goes round to the first after the last', () => {
    expect(pickNoteworthyFact(ordered, 3)).toEqual({ fact: ordered[2], next: 1, number: 3 })
    expect(pickNoteworthyFact(ordered, 4)).toEqual({ fact: ordered[0], next: 2, number: 1 })
    expect(pickNoteworthyFact(ordered, 999)).toMatchObject({ number: 3 })
  })

  it('has no next one when there is only one fact', () => {
    expect(pickNoteworthyFact([ordered[0] as NoteworthyFact], 5)).toEqual({
      fact: ordered[0],
      next: undefined,
      number: 1,
    })
  })

  it('gives nothing when there is no fact', () => {
    expect(pickNoteworthyFact([], 1)).toBeUndefined()
  })
})
