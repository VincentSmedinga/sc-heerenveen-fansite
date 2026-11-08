import { describe, expect, it } from 'vitest'

import type { OldSiteEvent, OldSiteLineupEntry, OldSiteMatch, OldSitePlayer } from './old-site-file.ts'

import { readOldSiteData } from './old-site-file.ts'
import { deriveOldSiteGoals, orderedOldSiteGoalEvents } from './old-site-goals.ts'
import { deriveOldSiteMatches } from './old-site-matches.ts'
import { countOldSiteNames, editDistance, findOldSiteNameClusters, nameClusterKey } from './old-site-name-clusters.ts'
import { cleanOldSiteName, oldSiteDistinctNames, oldSiteNameCorrections } from './old-site-names.ts'
import { deriveOldSiteReport } from './old-site-report.ts'

describe('the spellings of Wikipedia', () => {
  it.each([
    ['Arno Slot', 'Arne Slot'],
    ['Tijjani Babangida', 'Tijani Babangida'],
    ['Wilfried Bouma', 'Wilfred Bouma'],
    ['Zjelko Kalac', 'Željko Kalac'],
    ['Zeljko Kalac', 'Željko Kalac'],
    ['Tomeck Iwan', 'Tomasz Iwan'],
    ['Klaas Jan Huntelaar', 'Klaas-Jan Huntelaar'],
    ['Danny Guyt', 'Danny Guijt'],
    ['Rene Bot', 'René Bot'],
    ['Gorgi Gakhokidze', 'Giorgi Gakhokidze'],
    ['Georgi Gakhokidze', 'Giorgi Gakhokidze'],
  ])('turns %s into %s', (typed, article) => {
    expect(cleanOldSiteName(typed)).toBe(article)
  })

  it('has 124 corrections, so a removed pair fails here', () => {
    expect(oldSiteNameCorrections.size).toBe(124)
  })

  it('has no chain: no correction leads to a spelling that is corrected again', () => {
    for (const [typed, correct] of oldSiteNameCorrections) {
      expect(correct).not.toBe(typed)
      expect(oldSiteNameCorrections.has(correct)).toBe(false)
    }
  })

  it('never merges two people the owner or the research told apart', () => {
    for (const name of ['Erwin Koen', 'Danny Buijs', 'Bob Peeters', 'Rob Penders', 'Frank de Boer', 'Frank Broers']) {
      expect(cleanOldSiteName(name)).toBe(name)
    }
    for (const group of oldSiteDistinctNames) {
      for (const name of group) {
        expect(cleanOldSiteName(name)).toBe(name)
      }
    }
  })
})

describe('the corrections of the names', () => {
  it.each([
    ['Ali Elkhattabi', 'Ali El Khattabi'],
    ['Dirk Kuyt', 'Dirk Kuijt'],
    ['Ger Schaap', 'Gerrie Schaap'],
    ['Hennie Meijer', 'Henny Meijer'],
    ['Igor Kornejev', 'Igor Korneev'],
    ['Ivan Tzvekov', 'Ivan Tsvetkov'],
    ['Ivan Tzvetkov', 'Ivan Tsvetkov'],
    ['Lee-Roy Echteld', 'Leeroy Echteld'],
    ['Ronnie Venema', 'Ronny Venema'],
    ['Jürgen Dirckx', 'Jürgen Dirkx'],
    ['Jurgen Dirckx', 'Jürgen Dirkx'],
    ['Humprey Rudge', 'Humphrey Rudge'],
    ['Humphery Rudge', 'Humphrey Rudge'],
    ['Rahim Ouedraego', 'Rahim Ouédraogo'],
    ['Rahim Ouedraogo', 'Rahim Ouédraogo'],
    ['Rahim Ouedraegou', 'Rahim Ouédraogo'],
    ['Tomás Galásek', 'Tomáš Galásek'],
    ['Thomás Galásek', 'Tomáš Galásek'],
    ['Mark Luypers', 'Mark Luijpers'],
    ['Marc Luijpers', 'Mark Luijpers'],
    ['Mark Nygaard', 'Marc Nygaard'],
    ['Tom van der Leegte', 'Tommie van der Leegte'],
  ])('turns %s into %s', (typed, correct) => {
    expect(cleanOldSiteName(typed)).toBe(correct)
    expect(cleanOldSiteName(`  ${typed.replace(' ', '   ')} `)).toBe(correct)
  })

  it('leaves the spellings the owner did not decide, and the correct ones, as they are', () => {
    for (const name of ['Dirk Kuijt', 'Brian Tevreden II', 'Ruud Knol', 'Frank Broers', 'Tomáš Galásek', '']) {
      expect(cleanOldSiteName(name)).toBe(name)
    }
    expect(cleanOldSiteName(null)).toBe('')
  })

  it('has no correction that leads to another correction', () => {
    for (const correct of oldSiteNameCorrections.values()) {
      expect(oldSiteNameCorrections.has(correct)).toBe(false)
    }
  })

  it('leaves no variant spelling in the files', async () => {
    const counts = countOldSiteNames(await readOldSiteData())

    for (const typed of oldSiteNameCorrections.keys()) {
      expect(counts.has(typed)).toBe(false)
    }
    // The totals the owner was shown, added up under the correct spelling.
    expect(counts.get('Dirk Kuijt')).toBe(31)
    expect(counts.get('Jürgen Dirkx')).toBe(12)
    expect(counts.get('Rahim Ouédraogo')).toBe(12)
    expect(counts.get('Mark Luijpers')).toBe(22)
    expect(counts.get('Tommie van der Leegte')).toBe(19)
    expect(counts.get('Brian Tevreden II')).toBeGreaterThan(0)
    expect(counts.get('Ruud Knol')).toBeGreaterThan(0)
  })
})

const oldPlayers: OldSitePlayer[] = [
  { code: 'rene.hake', firstName: 'René', infix: null, lastName: 'Hake' },
  { code: 'lars.nilsson', firstName: 'Lasse', infix: null, lastName: 'Nilsson' },
]
const byCode = new Map(oldPlayers.map((player) => [player.code, player]))

const entry = (who: { code?: string; name?: string }, order: number): OldSiteLineupEntry => ({
  minuteIn: 0,
  minuteOut: 90,
  order,
  playerCode: who.code ?? null,
  playerName: who.name ?? null,
})
const goal = (minute: number, who: { code?: string; name?: string }, assist: null | string = null): OldSiteEvent => ({
  assist,
  event: 1,
  kind: null,
  minute,
  playerCode: who.code ?? null,
  playerName: who.name ?? null,
})

/** A league match at home that sc Heerenveen won 2-1. */
const oldMatch = (events: OldSiteEvent[], lineup: OldSiteLineupEntry[]): OldSiteMatch => ({
  attendance: null,
  code: 'nec.thuis',
  competition: 1,
  dateTime: '2001-09-01 20:00:00',
  events,
  lineup,
  note: null,
  referee: null,
  result: { awayFullTime: 1, awayHalfTime: 0, homeFullTime: 2, homeHalfTime: 1, note: null },
  round: 1,
  season: '0102',
  statistics: { awayCorners: 0, awayFouls: 0, awayOffside: 0, homeCorners: 0, homeFouls: 0, homeOffside: 0 },
})

function reportOf(match: OldSiteMatch) {
  const [one] = deriveOldSiteMatches([match])
  const derived = deriveOldSiteGoals(
    match,
    { against: one!.values!.goalsAgainst!, for: one!.values!.goalsFor! },
    byCode,
  )
  const events = orderedOldSiteGoalEvents(match)

  return {
    derived,
    report: deriveOldSiteReport(match, {
      extraTime: false,
      goals: derived.goals.map((one, index) => ({ event: events[index]!, goal: one })),
      hasPlayerRow: () => true,
      oldPlayers: byCode,
      season: '2001/02',
    }),
  }
}

describe('the names in a report', () => {
  const lineup = [
    entry({ code: 'rene.hake' }, 1),
    entry({ code: 'lars.nilsson' }, 2),
    entry({ name: 'Mark Luypers' }, 1),
    entry({ name: 'Dirk Kuijt' }, 2),
  ]

  it('links a goal and an assist of the opponent to the player in the line-up, whatever the spelling', () => {
    const { derived, report } = reportOf(
      oldMatch(
        [
          goal(10, { code: 'rene.hake' }),
          goal(30, { name: 'Marc Luijpers' }, 'Dirk Kuyt'),
          goal(80, { code: 'lars.nilsson' }, 'rene.hake'),
        ],
        lineup,
      ),
    )

    expect(derived.goals.map((one) => one.player)).toEqual(['René Hake', 'Mark Luijpers', 'Lasse Nilsson'])
    expect(report.notes).toEqual([])
    expect(report.goalLinks.map((link) => link.appearance)).toEqual([0, 2, 1])
    // The assist 'Dirk Kuyt' of the opponent's goal is the player 'Dirk Kuijt' of the line-up.
    expect(report.appearances[report.goalLinks[1]!.assist!]?.name).toBe('Dirk Kuijt')
  })

  it('names the assist code lars.nilsson Lasse Nilsson, as the player record does', () => {
    const { report } = reportOf(
      oldMatch(
        [
          goal(10, { code: 'rene.hake' }, 'lars.nilsson'),
          goal(30, { name: 'Dirk Kuyt' }),
          goal(80, { code: 'rene.hake' }),
        ],
        lineup,
      ),
    )

    expect(report.notes).toEqual([])
    expect(report.appearances[report.goalLinks[0]!.assist!]?.name).toBe('Lasse Nilsson')
  })
})

describe('the names to decide', () => {
  it('turns a name into a key without capitals, accents, punctuation and infixes', () => {
    expect(nameClusterKey('Tomáš van der Galásek')).toBe('tomas galasek')
    expect(nameClusterKey('Jean-Paul  De Jong')).toBe('jean paul jong')
  })

  it('counts the letters to change', () => {
    expect(editDistance('tijani', 'tijjani')).toBe(1)
    expect(editDistance('kool', 'knol')).toBe(1)
    expect(editDistance('', 'abc')).toBe(3)
  })

  it('groups the spellings of one key, a small difference and a first name that starts the other', () => {
    const clusters = findOldSiteNameClusters(
      new Map([
        ['Bart van den Eede', 8],
        ['Bart Van Den Eede', 2],
        ['Piet Pietersen', 3],
        ['Tijani Babangida', 11],
        ['Tijjani Babangida', 5],
        ['Tommie van Mol', 1],
        ['Tom van Mol', 4],
      ]),
    )

    expect(clusters).toEqual([
      [
        { count: 8, name: 'Bart van den Eede' },
        { count: 2, name: 'Bart Van Den Eede' },
      ],
      [
        { count: 11, name: 'Tijani Babangida' },
        { count: 5, name: 'Tijjani Babangida' },
      ],
      [
        { count: 4, name: 'Tom van Mol' },
        { count: 1, name: 'Tommie van Mol' },
      ],
    ])
  })

  it('does not group short keys that differ by two letters, and leaves out two people the owner told apart', () => {
    const clusters = findOldSiteNameClusters(
      new Map([
        ['Brian Tevreden', 2],
        ['Brian Tevreden II', 1],
        ['Jan Dijk', 3],
        ['Jan Dik', 1],
        ['Piet Bos', 2],
        ['Pim Bas', 1],
        ['Ruud Knol', 8],
        ['Ruud Kool', 12],
      ]),
    )

    expect(clusters.map((group) => group.map((one) => one.name))).toEqual([['Jan Dijk', 'Jan Dik']])
    expect(oldSiteDistinctNames).toContainEqual(['Ruud Kool', 'Ruud Knol'])
  })

  it('lists the clusters of the files, without the ones that are decided', async () => {
    const clusters = findOldSiteNameClusters(countOldSiteNames(await readOldSiteData()))
    const names = clusters.flatMap((group) => group.map((one) => one.name))

    expect(clusters.length).toBeGreaterThan(50)
    expect(names).toContain('Aleksandar Ilic')
    expect(names).toContain('Erwin Koen')
    expect(names).not.toContain('Tijani Babangida')
    expect(names).toContain('Frank de Boer')
    expect(names).not.toContain('Ruud Knol')
    expect(names).not.toContain('Brian Tevreden II')
    expect(names).not.toContain('Dirk Kuijt')
    expect(names).not.toContain('Tommie van der Leegte')
  })
})
