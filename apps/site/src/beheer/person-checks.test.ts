import { describe, expect, it } from 'vitest'

import { birthDateText, checkBirthDate, type PersonCheckErrors } from './person-checks'

const now = new Date('2026-11-12T12:00:00Z')

const check = (value: string) => {
  const errors: PersonCheckErrors = {}

  return { date: checkBirthDate(value, errors, now), error: errors.geboren }
}

describe('checkBirthDate', () => {
  it('takes a year as the first of January, with the precision year', () => {
    expect(check('1985')).toEqual({ date: { date: '1985-01-01', precision: 'year' }, error: undefined })
  })

  it.each(['14-3-1985', '14-03-1985', '1985-03-14'])('takes %s as a day', (value) => {
    expect(check(value)).toEqual({ date: { date: '1985-03-14', precision: 'day' }, error: undefined })
  })

  it('leaves an empty field empty, without an error', () => {
    expect(check('')).toEqual({ date: null, error: undefined })
  })

  it.each(['31-2-1985', '1849', '13-11-2026', '2027', '3-1985', 'maart 1985', '85'])(
    'refuses %s with a sentence at the field',
    (value) => {
      expect(check(value).date).toBeNull()
      expect(check(value).error).toMatch(/^Vul een jaar in, zoals 1985, of een datum, zoals 14-3-1985/u)
    },
  )

  it('takes today, and this year', () => {
    expect(check('12-11-2026').date).toEqual({ date: '2026-11-12', precision: 'day' })
    expect(check('2026').date).toEqual({ date: '2026-01-01', precision: 'year' })
  })
})

describe('birthDateText', () => {
  it('writes a date as exact as it is known, and nothing for none', () => {
    expect(birthDateText('1985-01-01', 'year')).toBe('1985')
    expect(birthDateText('1985-03-01', 'month')).toBe('3-1985')
    expect(birthDateText('1985-03-14', 'day')).toBe('14-3-1985')
    expect(birthDateText(null, null)).toBe('')
  })
})
