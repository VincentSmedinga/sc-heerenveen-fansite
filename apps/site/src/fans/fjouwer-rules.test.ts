import { describe, expect, it } from 'vitest'

import {
  checkPicks,
  closesAt,
  countMessage,
  fourOf,
  isChoiceOpen,
  limitMessage,
  lineMessage,
  playersNotCounting,
  type SquadMember,
  usesBefore,
  usesLeft,
} from './fjouwer-rules'

const member = (id: number, line: SquadMember['line'], name = `Speler ${id}`): SquadMember => ({ id, line, name })
const squad = new Map<number, SquadMember>(
  [
    member(1, 'doelman'),
    member(2, 'doelman'),
    member(3, 'verdediger'),
    member(4, 'verdediger'),
    member(5, 'verdediger'),
    member(6, 'middenvelder'),
    member(7, 'middenvelder'),
    member(8, 'middenvelder', 'Dirk Proper'),
    member(9, 'aanvaller'),
    member(10, 'aanvaller'),
  ].map((entry) => [entry.id, entry]),
)

describe('closesAt and isChoiceOpen', () => {
  it('closes at the kick-off', () => {
    const kickoffAt = new Date('2026-11-28T15:45:00Z')

    expect(closesAt({ kickoffAt, matchDate: '2026-11-28' })).toEqual(kickoffAt)
    expect(isChoiceOpen({ kickoffAt, matchDate: '2026-11-28' }, new Date('2026-11-28T15:44:59Z'))).toBe(true)
    expect(isChoiceOpen({ kickoffAt, matchDate: '2026-11-28' }, kickoffAt)).toBe(false)
  })

  it('closes at 00.00 Dutch time on the day of a match without a known hour', () => {
    // Winter time: 00.00 on 28 November is 23.00 UTC on the 27th.
    expect(closesAt({ kickoffAt: null, matchDate: '2026-11-28' })).toEqual(new Date('2026-11-27T23:00:00Z'))
    // Summer time: 00.00 on 1 August is 22.00 UTC on 31 July.
    expect(closesAt({ kickoffAt: null, matchDate: '2026-08-01' })).toEqual(new Date('2026-07-31T22:00:00Z'))
  })
})

describe('fourOf', () => {
  const ids = [11, 12, 13, 14]
  const rows = new Map<number, readonly number[]>([
    [11, [1, 3, 6, 9]],
    [13, [2, 4, 7, 10]],
  ])

  it('gives the row of the match', () => {
    expect(fourOf(ids, rows, 13)).toEqual({ four: [2, 4, 7, 10], inherited: false })
  })

  it('inherits the four of the latest earlier match, over more matches in a row', () => {
    expect(fourOf(ids, rows, 12)).toEqual({ four: [1, 3, 6, 9], inherited: true })
    expect(fourOf(ids, rows, 14)).toEqual({ four: [2, 4, 7, 10], inherited: true })
  })

  it('gives nothing to a supporter who never chose', () => {
    expect(fourOf(ids, new Map(), 14)).toBeUndefined()
    expect(fourOf(ids, rows, 11)).toEqual({ four: [1, 3, 6, 9], inherited: false })
    expect(fourOf([20, 21], rows, 20)).toBeUndefined()
  })
})

describe('usesBefore', () => {
  const ids = Array.from({ length: 14 }, (_, index) => index + 1)

  it('counts a player in every match before, also when the four is inherited', () => {
    const rows = new Map<number, readonly number[]>([[1, [1, 3, 6, 9]]])
    const uses = usesBefore(ids, rows, 5)

    expect(uses.get(1)).toBe(4)
    expect(uses.get(2)).toBeUndefined()
    expect(usesLeft(uses, 1)).toBe(6)
    expect(usesLeft(uses, 2)).toBe(10)
  })

  it('does not count the match itself or later ones', () => {
    const rows = new Map<number, readonly number[]>([[1, [1, 3, 6, 9]]])

    expect(usesBefore(ids, rows, 1).size).toBe(0)
    expect(usesBefore(ids, rows, 2).get(1)).toBe(1)
  })

  it('never lets a player go above ten', () => {
    const rows = new Map<number, readonly number[]>([[1, [1, 3, 6, 9]]])
    const uses = usesBefore(ids, rows, 14)

    expect(uses.get(1)).toBe(10)
    expect(usesLeft(uses, 1)).toBe(0)
    expect(playersNotCounting([1, 3, 6, 9], uses)).toEqual([1, 3, 6, 9])
  })

  it('lists the inherited players who have their ten', () => {
    const rows = new Map<number, readonly number[]>([
      [1, [1, 3, 6, 9]],
      [11, [2, 4, 7, 10]],
    ])
    const uses = usesBefore(ids, rows, 12)

    expect(uses.get(1)).toBe(10)
    expect(playersNotCounting([1, 4, 8, 10], uses)).toEqual([1])
  })
})

describe('checkPicks', () => {
  const none = new Map<number, number>()

  it('accepts four players with at most two of a line', () => {
    expect(checkPicks({ ids: [1, 3, 6, 9], squad, uses: none })).toEqual({ ids: [1, 3, 6, 9], ok: true })
    expect(checkPicks({ ids: [3, 4, 6, 7], squad, uses: none }).ok).toBe(true)
  })

  it('refuses three of a line', () => {
    const result = checkPicks({ ids: [3, 4, 5, 9], squad, uses: none })

    expect(result).toEqual({ errors: { general: [], lines: { verdediger: [lineMessage('verdediger')] } }, ok: false })
    expect(lineMessage('middenvelder')).toBe('Kies hoogstens 2 middenvelders.')
  })

  it('refuses anything but four', () => {
    const five = checkPicks({ ids: [1, 3, 6, 9, 10], squad, uses: none })

    expect(five).toEqual({ errors: { general: [countMessage(5)], lines: {} }, ok: false })
    expect(countMessage(5)).toBe('Kies 4 spelers. Je hebt er nu 5.')
    expect(checkPicks({ ids: [], squad, uses: none }).ok).toBe(false)
    expect(checkPicks({ ids: [1, 3, 6], squad, uses: none }).ok).toBe(false)
  })

  it('refuses a player who is chosen twice', () => {
    const result = checkPicks({ ids: [1, 1, 6, 9], squad, uses: none })

    expect(result.ok).toBe(false)
    expect(result.ok ? [] : result.errors.general).toEqual(['Een speler kun je maar één keer kiezen.'])
  })

  it('refuses a player who is not in the squad', () => {
    const result = checkPicks({ ids: [1, 3, 6, 99], squad, uses: none })

    expect(result.ok).toBe(false)
    expect(result.ok ? [] : result.errors.general).toHaveLength(1)
  })

  it('refuses a player who has his ten, with his line', () => {
    const uses = new Map([[8, 10]])
    const result = checkPicks({ ids: [1, 3, 8, 9], squad, uses })

    expect(result).toEqual({
      errors: { general: [], lines: { middenvelder: [limitMessage('Dirk Proper')] } },
      ok: false,
    })
    expect(limitMessage('Dirk Proper')).toBe('Dirk Proper is al 10 keer gekozen.')
    expect(checkPicks({ ids: [1, 3, 8, 9], squad, uses: new Map([[8, 9]]) }).ok).toBe(true)
  })
})
