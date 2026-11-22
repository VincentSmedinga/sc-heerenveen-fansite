import { describe, expect, it } from 'vitest'

import { playerLine, pointsText } from './fjouwer-form'

describe('the line behind a name', () => {
  it('says the points of the season and the uses that are left', () => {
    expect(playerLine(31, 3)).toBe('31 punten · nog 3 keer')
    expect(playerLine(1, 10)).toBe('1 punt · nog 10 keer')
    expect(playerLine(0, 0)).toBe('0 punten · nog 0 keer')
  })

  it('writes a negative total with a real minus sign', () => {
    expect(playerLine(-3, 3)).toBe('−3 punten · nog 3 keer')
    expect(pointsText(-8)).toBe('−8')
  })
})
