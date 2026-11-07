import { describe, expect, it } from 'vitest'

import { buildMatchPage } from '#src/match-page'

import { emptyRow, emptySide, noFormation, type ReportSquadPlayer, type ReportValues, type Row } from './report-fields'
import { changedRowOf, previewDataOf, type ReportPreviewMatch } from './report-preview'

const squad: ReportSquadPlayer[] = Array.from({ length: 14 }, (_, index) => ({
  id: index + 1,
  name: `Speler ${index + 1}`,
  searchTerm: `Speler ${index + 1}`,
  shirtNumber: index + 1,
}))
const match: ReportPreviewMatch = {
  afterNinety: null,
  extraTime: false,
  facts: [{ label: 'Competitie', value: 'Eredivisie' }],
  home: true,
  opponent: 'Testdorp FC',
  penalties: null,
}
const player = (fields: Row): Row => ({ ...emptyRow('speler'), ...fields })
const event = (kind: 'doelpunt' | 'kaart' | 'strafschop' | 'wissel', fields: Row): Row => ({
  ...emptyRow(kind),
  ...fields,
})

/** Eleven of ours in the line-up and two on the bench, and three of the opponent. */
const values = (
  overrides: Partial<ReportValues['wij']> = {},
  zij: Partial<ReportValues['zij']> = {},
): ReportValues => ({
  bron: '',
  formatie: { wij: { eigen: '', keuze: '4-3-3' }, zij: noFormation() },
  status: 'bezig',
  tegenstander: 'ja',
  wij: {
    ...emptySide(),
    speler: squad
      .slice(0, 13)
      .map((one, index) => player({ keuze: String(one.id), rol: index > 10 ? 'bank' : 'basis' })),
    ...overrides,
  },
  zij: {
    ...emptySide(),
    speler: [
      player({ naam: 'Dirk Proefland', rol: 'basis', rugnummer: '1' }),
      player({ naam: 'Frank Dummydijk', rol: 'basis', rugnummer: '9' }),
      player({ naam: 'Ronald Proefveld', rol: 'bank', rugnummer: '12' }),
    ],
    ...zij,
  },
})
const dataOf = (...args: [ReportValues, Parameters<typeof previewDataOf>[3]?]) =>
  previewDataOf(args[0], match, squad, args[1])

describe('the players in the preview', () => {
  it('are the rows that are finished, in the order of the form, ours by the squad and theirs by their name', () => {
    const data = dataOf(values())

    expect(data.players.filter((one) => one.ours).map((one) => one.shirtNumber)).toEqual([
      1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
    ])
    expect(data.players.find((one) => !one.ours)?.name).toEqual({ givenName: 'Dirk Proefland', surname: '' })
    expect(data.players.find((one) => one.shirtNumber === 12 && !one.ours)?.starter).toBe(false)
  })

  it('leave out a row that is not finished: no name, no shirt number or no role', () => {
    const data = dataOf(
      values({ speler: [player({ keuze: '' }), player({ keuze: '2', rol: 'basis' }), player({ keuze: 'andere' })] }),
    )

    expect(data.players.filter((one) => one.ours).map((one) => one.shirtNumber)).toEqual([2])
  })

  it('keep the order the form has, also when it is not the order of the shirt numbers', () => {
    const reversed = values({ speler: values().wij.speler.slice(0, 11).toReversed() })

    expect(buildMatchPage(dataOf(reversed)).pitch.ours.players.map((one) => one.shirtNumber)).toEqual([
      11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1,
    ])
  })

  it('leave out a second player with the same shirt number in a team, so the pitch has one disc for each', () => {
    const data = dataOf(
      values({}, { speler: [player({ naam: 'Een', rugnummer: '7' }), player({ naam: 'Twee', rugnummer: '7' })] }),
    )

    expect(data.players.filter((one) => !one.ours)).toHaveLength(1)
  })
})

describe('the events in the preview', () => {
  const finished = values({
    doelpunt: [event('doelpunt', { minuut: '12', soort: 'gewoon', speler: 'wij-9' })],
    kaart: [event('kaart', { minuut: '30', soort: 'geel', speler: '4' })],
    strafschop: [event('strafschop', { minuut: '55', soort: 'strafschop-gemist', speler: '9' })],
    wissel: [event('wissel', { erin: '12', eruit: '10', minuut: '60' })],
  })

  it('follow the rows that are finished: a goal, a card, a missed penalty and a substitution', () => {
    const data = dataOf(finished)

    expect(data.goals).toHaveLength(1)
    expect(data.cards).toHaveLength(1)
    expect(data.incidents).toHaveLength(1)
    expect(data.substitutions).toEqual([{ inId: 12, minute: 60, outId: 10, stoppageMinutes: null }])
  })

  it('leave out a row that is not finished: a goal without a minute, or a card without a player', () => {
    const data = dataOf(
      values({
        doelpunt: [event('doelpunt', { minuut: '', soort: 'gewoon', speler: 'wij-9' })],
        kaart: [event('kaart', { minuut: '30', soort: 'geel', speler: '' })],
        wissel: [event('wissel', { erin: '', eruit: '10', minuut: '60' })],
      }),
    )

    expect([data.goals.length, data.cards.length, data.substitutions.length]).toEqual([0, 0, 0])
  })

  it('leave out a minute that is not a number of 1 to 120, and added time that is not right', () => {
    const goal = (fields: Row) =>
      values({ doelpunt: [event('doelpunt', { soort: 'gewoon', speler: 'wij-9', ...fields })] })

    expect(dataOf(goal({ minuut: '0' })).goals).toHaveLength(0)
    expect(dataOf(goal({ minuut: '121' })).goals).toHaveLength(0)
    expect(dataOf(goal({ minuut: 'x' })).goals).toHaveLength(0)
    expect(dataOf(goal({ extra: '0', minuut: '45' })).goals).toHaveLength(0)
    expect(dataOf(goal({ extra: '2', minuut: '45' })).goals[0]).toMatchObject({ minute: 45, stoppageMinutes: 2 })
  })

  it('count the score from the goals of both teams, an own goal for the team that gets it', () => {
    const data = dataOf(
      values(
        { doelpunt: [event('doelpunt', { minuut: '12', soort: 'gewoon', speler: 'wij-9' })] },
        {
          doelpunt: [
            event('doelpunt', { minuut: '40', soort: 'strafschop', speler: 'zij-2' }),
            event('doelpunt', { minuut: '78', soort: 'eigen', speler: 'wij-3' }),
          ],
        },
      ),
    )

    expect([data.goalsFor, data.goalsAgainst]).toEqual([1, 2])
    expect(data.goals.find((goal) => goal.ownGoal)).toMatchObject({ ours: false, playerId: 3 })
  })

  it('show a scorer who is only written by name, in the course of the match and not on the pitch', () => {
    const data = dataOf(
      values({ doelpunt: [event('doelpunt', { minuut: '12', naam: 'Gast Scoorder', soort: 'gewoon', speler: '' })] }),
    )
    const built = buildMatchPage(data)

    expect(built.scorersFor.map((scorer) => scorer.player)).toEqual(['Gast Scoorder'])
    expect(built.pitch.ours.players.map((one) => one.shirtNumber)).not.toContain(0)
  })

  it('give a goal an assist that is in the report', () => {
    const data = dataOf(
      values({
        doelpunt: [event('doelpunt', { assist: 'wij-10', minuut: '12', soort: 'gewoon', speler: 'wij-9' })],
      }),
    )

    expect(data.goals[0]?.assistId).toBe(10)
  })
})

describe('the frame in the preview', () => {
  const finished = values({
    doelpunt: [
      event('doelpunt', { minuut: '12', soort: 'gewoon', speler: 'wij-9' }),
      event('doelpunt', { minuut: '58', soort: 'gewoon', speler: 'wij-11' }),
    ],
    kaart: [event('kaart', { minuut: '30', soort: 'geel', speler: '4' })],
  })

  it('is on the event of the row that was changed, and on no other', () => {
    const data = dataOf(finished, { kind: 'doelpunt', number: 2, side: 'wij' })

    expect(data.goals.map((goal) => goal.highlighted === true)).toEqual([false, true])
    expect(data.cards[0]?.highlighted).toBeUndefined()
  })

  it('is on nothing when the changed row is not in the preview yet', () => {
    const data = dataOf(finished, { kind: 'doelpunt', number: 5, side: 'wij' })

    expect(data.goals.some((goal) => goal.highlighted === true)).toBe(false)
  })

  it('is read from the name of a field of an event, and from no other field', () => {
    expect(changedRowOf('doelpunt-wij-2-minuut')).toEqual({ kind: 'doelpunt', number: 2, side: 'wij' })
    expect(changedRowOf('wissel-zij-10-erin')).toEqual({ kind: 'wissel', number: 10, side: 'zij' })
    expect(changedRowOf('speler-wij-2-keuze')).toBeUndefined()
    expect(changedRowOf('bron')).toBeUndefined()
  })
})

describe('the formations and the rest of the match in the preview', () => {
  it('are one of the list, or his own when it is right, and none otherwise', () => {
    const own = values()

    own.formatie = { wij: { eigen: '4-1-2-1-2', keuze: 'anders' }, zij: { eigen: 'onzin', keuze: 'anders' } }

    expect(dataOf(own).formations).toEqual({ opponent: null, ours: '4-1-2-1-2' })
    expect(dataOf(values()).formations).toEqual({ opponent: null, ours: '4-3-3' })
  })

  it('have the opponent only when his side is complete', () => {
    const open = values()

    open.tegenstander = 'nee'

    expect(dataOf(open).opponentComplete).toBe(false)
    expect(dataOf(values()).opponentComplete).toBe(true)
  })

  it('take the extra time, the score after 90 minutes and the shoot-out from the match, not from the form', () => {
    const data = previewDataOf(
      values(),
      { ...match, afterNinety: { against: 1, for: 1 }, extraTime: true, penalties: { against: 3, for: 4 } },
      squad,
    )

    expect(data).toMatchObject({
      afterNinety: { against: 1, for: 1 },
      extraTime: true,
      facts: match.facts,
      kicks: [],
      penalties: { against: 3, for: 4 },
    })
  })
})
