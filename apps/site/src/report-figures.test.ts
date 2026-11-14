import { describe, expect, it } from 'vitest'

import { basedOnSentence, figureRows, rankedPlaces } from './report-figures'
import { reportPlayer, reportPlayers } from './test-report-figures'

describe('rankedPlaces', () => {
  it('ranks the substitutes who scored, the most first, and leaves out the players who did not', () => {
    const { rows, total } = rankedPlaces(reportPlayers, 'substituteGoals', false)

    expect(total).toBe(1)
    expect(rows).toEqual([expect.objectContaining({ goals: 2, position: 1 })])
    expect(rows[0]?.players.map((player) => player.surname)).toEqual(['Bank'])
  })

  it('puts players with the same figure on one place, as one row, in the order of their names, and the next place after them', () => {
    const { rows, total } = rankedPlaces(reportPlayers, 'assists', false)

    expect(total).toBe(3)
    expect(rows).toMatchObject([
      {
        goals: 4,
        players: [
          { givenName: 'Jan', surname: 'Bank' },
          { givenName: 'Sander', surname: 'Vos' },
        ],
        position: 1,
      },
      { goals: 2, players: [{ givenName: 'Luca', surname: 'Oyen' }], position: 3 },
    ])
  })

  it('leaves out a player with none of the figure, for the assists of a player who never gave one and for a player of the bench', () => {
    const names = rankedPlaces(reportPlayers, 'assists', false).rows.flatMap((row) => row.players.map((p) => p.surname))

    expect(names).not.toContain('Mees')
    expect(names).not.toContain('Reserve')
    expect(rankedPlaces(reportPlayers, 'minutes', false).total).toBe(4)
  })

  it('orders the minutes from the most down, and equal minutes by name', () => {
    const { rows } = rankedPlaces(reportPlayers, 'minutes', false)

    expect(rows.map((row) => [row.position, row.goals, row.players.map((player) => player.surname)])).toEqual([
      [1, 930, ['Oyen']],
      [2, 900, ['Mees', 'Vos']],
      [4, 120, ['Bank']],
    ])
  })

  it('keeps the first five places and everyone who shares the last of them, and says how many there are', () => {
    const many = Array.from({ length: 9 }, (_nothing, index) =>
      reportPlayer(index + 1, `Speler ${index + 1}`, { assists: index < 2 ? 3 : index < 7 ? 2 : 1 }),
    )
    const top = rankedPlaces(many, 'assists', true)

    // Two with 3 (place 1), five with 2 (place 3), two with 1 (place 8): the third place holds
    // five players and the list is cut before place 8.
    expect(top.rows.map((row) => [row.position, row.players.length])).toEqual([
      [1, 2],
      [3, 5],
    ])
    expect(top.total).toBe(9)
    expect(rankedPlaces(many, 'assists', false).rows).toHaveLength(3)
  })

  it('shows the parts of a person, and the whole name in the given name when no name was kept', () => {
    const { rows } = rankedPlaces([reportPlayer(9, 'Zonder Persoon', { assists: 1 })], 'assists', false)

    expect(rows[0]?.players[0]).toEqual({ givenName: 'Zonder Persoon', id: 9, surname: '' })
    expect(rankedPlaces(reportPlayers, 'minutes', false).rows[0]?.players[0]).toEqual({
      givenName: 'Luca',
      id: 1,
      surname: 'Oyen',
    })
  })

  it('gives nothing without players', () => {
    expect(rankedPlaces([], 'minutes', true)).toEqual({ rows: [], total: 0 })
  })
})

describe('figureRows', () => {
  it('gives a row for every player, the most minutes first and then by name, with the bench player last', () => {
    expect(figureRows(reportPlayers).map((row) => row.surname)).toEqual(['Oyen', 'Mees', 'Vos', 'Bank', 'Reserve'])
  })

  it('has the figures of the table, and counts a yellow-red card as a yellow and a red card', () => {
    const rows = figureRows(reportPlayers)

    expect(rows.find((row) => row.surname === 'Oyen')).toMatchObject({
      assists: 2,
      goals: 5,
      minutes: 930,
      played: 12,
      red: 0,
      started: 10,
      substituted: 2,
      yellow: 3,
    })
    // Vos has one yellow card, one yellow-red card and one red card.
    expect(rows.find((row) => row.surname === 'Vos')).toMatchObject({ red: 2, yellow: 2 })
    expect(rows.find((row) => row.surname === 'Reserve')).toMatchObject({
      assists: 0,
      goals: 0,
      minutes: 0,
      played: 0,
      red: 0,
      started: 0,
      substituted: 0,
      yellow: 0,
    })
  })
})

describe('basedOnSentence', () => {
  it('says how many of the played matches the figures rest on', () => {
    expect(basedOnSentence({ known: 12, played: 14 })).toBe('Op basis van 12 van de 14 gespeelde wedstrijden.')
  })

  it('says "alle" when every played match has a report, and names the only match', () => {
    expect(basedOnSentence({ known: 14, played: 14 })).toBe('Op basis van alle 14 gespeelde wedstrijden.')
    expect(basedOnSentence({ known: 1, played: 1 })).toBe('Op basis van de enige gespeelde wedstrijd.')
  })
})
