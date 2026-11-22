import { describe, expect, it } from 'vitest'

import {
  closingText,
  counterText,
  deadlineTag,
  errorMessage,
  gradeField,
  nextDayText,
  parseRatings,
  playerLine,
  summaryTitle,
} from './rating'

const players = [
  { appearanceId: 11, name: 'Luca Oyen' },
  { appearanceId: 12, name: 'Pim Keeper' },
  { appearanceId: 13, name: 'Rik Verdediger' },
]

describe('the grades of the form', () => {
  it('reads a whole grade from 1 to 10 for every player', () => {
    const result = parseRatings(
      new Map<number, unknown>([
        [11, '1'],
        [12, ' 7 '],
        [13, '10'],
      ]),
      players,
    )

    expect(result.errors).toBeUndefined()
    expect(result.grades).toEqual(
      new Map([
        [11, 1],
        [12, 7],
        [13, 10],
      ]),
    )
  })

  it('allows a 1 for everybody, without a warning', () => {
    const result = parseRatings(new Map<number, unknown>(players.map((player) => [player.appearanceId, '1'])), players)

    expect(result.errors).toBeUndefined()
  })

  it('makes a gap of a player without a grade, and keeps the grades of the others', () => {
    const result = parseRatings(
      new Map<number, unknown>([
        [11, '6'],
        [13, '8'],
      ]),
      players,
    )

    expect(result.grades).toBeUndefined()
    expect(result.errors).toEqual({ 12: 'Geef Pim Keeper een cijfer.' })
    expect(result.values).toEqual({ 11: '6', 13: '8' })
  })

  it.each(['0', '11', '5.5', '-1', 'tien', '', '1e1', '07'])('counts %j as a gap', (entry) => {
    const result = parseRatings(
      new Map<number, unknown>([
        [11, entry],
        [12, '5'],
        [13, '5'],
      ]),
      players,
    )

    expect(result.errors).toEqual({ 11: errorMessage('Luca Oyen') })
  })

  it('counts anything but text as a gap', () => {
    const result = parseRatings(new Map<number, unknown>([[11, new Blob([])]]), [players[0]!])

    expect(result.errors).toEqual({ 11: errorMessage('Luca Oyen') })
  })
})

describe('the words of the page', () => {
  it('counts the cijfers in the title of the summary', () => {
    expect(summaryTitle(1)).toBe('Nog 1 cijfer')
    expect(summaryTitle(2)).toBe('Nog 2 cijfers')
  })

  it('writes the counter and the name of the field', () => {
    expect(counterText(9, 15)).toBe('Nog 9 van 15 te gaan')
    expect(gradeField(11)).toBe('cijfer-11')
  })

  it('gives the line under a player: position, minutes, and goal or assist', () => {
    expect(playerLine({ assist: false, goal: false, minutes: 90, position: 'doelman' })).toBe('Keeper · 90 min')
    expect(playerLine({ assist: true, goal: true, minutes: 63, position: 'aanvaller' })).toBe(
      'Aanvaller · 63 min · doelpunt · assist',
    )
    expect(playerLine({ assist: false, goal: false, minutes: 35, position: null })).toBe('35 min')
  })

  it('writes the moment the window closes in Dutch time, with a dot in the time', () => {
    expect(closingText(new Date('2026-11-26T19:00:00Z'))).toBe('donderdag 26 november, 20.00 uur')
    expect(closingText(new Date('2026-07-02T18:00:00Z'))).toBe('donderdag 2 juli, 20.00 uur')
  })

  it('writes the tag of an open window as the Prognose does', () => {
    const now = new Date('2026-11-22T12:00:00Z')

    expect(deadlineTag(new Date('2026-11-26T19:00:00Z'), now)).toBe('Open tot do 20.00')
  })

  it('names the day of the next match', () => {
    expect(nextDayText({ kickoffAt: new Date('2026-11-28T19:45:00Z'), matchDate: '2026-11-28' })).toBe(
      'zaterdag 28 november',
    )
    expect(nextDayText({ kickoffAt: null, matchDate: '2026-11-28' })).toBe('zaterdag 28 november')
  })

  it('reads the grade of the head coach with those of the players, and makes a gap of him like one of a player', () => {
    const entries = new Map<number, unknown>(players.map((player) => [player.appearanceId, '5']))
    const given = parseRatings(entries, players, { entry: ' 8 ', name: 'Robin Veldman' })

    expect(given.errors).toBeUndefined()
    expect(given.coachGrade).toBe(8)
    expect(given.coachValue).toBe('8')

    const missing = parseRatings(entries, players, { entry: null, name: 'Robin Veldman' })

    expect(missing.grades).toBeUndefined()
    expect(missing.coachError).toBe('Geef Robin Veldman een cijfer.')
    expect(missing.values).toEqual({ 11: '5', 12: '5', 13: '5' })

    for (const entry of ['0', '11', '5.5', 'tien']) {
      expect(parseRatings(entries, players, { entry, name: 'Robin Veldman' }).coachError).toBeDefined()
    }
  })

  it('keeps the grade of the coach when a player has a gap, and asks nothing of a match without a coach', () => {
    const gap = parseRatings(new Map<number, unknown>([[11, '5']]), players, { entry: '9', name: 'Robin Veldman' })

    expect(gap.errors).toBeDefined()
    expect(gap.coachValue).toBe('9')
    expect(gap.coachError).toBeUndefined()
    expect(parseRatings(new Map<number, unknown>(players.map((p) => [p.appearanceId, '5'])), players).coachGrade).toBe(
      undefined,
    )
  })
})
