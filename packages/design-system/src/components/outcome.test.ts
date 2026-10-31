import { describe, expect, it } from 'vitest'

import { outcomeOf } from './outcome'

describe('outcomeOf', () => {
  it('is a win when sc Heerenveen scored more, a loss when it scored fewer and a draw when level', () => {
    expect(outcomeOf(3, 0)).toBe('win')
    expect(outcomeOf(0, 3)).toBe('loss')
    expect(outcomeOf(2, 2)).toBe('draw')
    expect(outcomeOf(0, 0)).toBe('draw')
  })
})
