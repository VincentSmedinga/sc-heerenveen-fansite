import { DrizzleQueryError } from 'drizzle-orm/errors'
import { describe, expect, it } from 'vitest'

import { adminFailure, kindOf } from './failure'

// A made-up birth date, as an editor could type it.
const birthDate = '1985-02-14'

/** An error as MariaDB gives it, with the code that mysql2 adds. */
function mariaDbError(message: string, code: string) {
  return Object.assign(new Error(message), { code, errno: 1292 })
}

describe('adminFailure', () => {
  it('leaves the values of a failed query out of the line', () => {
    const cause = mariaDbError(
      `Incorrect date value: '${birthDate}' for column 'birth_date' at row 1`,
      'ER_TRUNCATED_WRONG_VALUE',
    )
    const error = new DrizzleQueryError('update `persons` set `birth_date` = ? where `id` = ?', [birthDate, 12], cause)

    expect(error.message).toContain(birthDate)

    const line = adminFailure('change person 12', error)

    expect(line).toBe('Could not change person 12: ER_TRUNCATED_WRONG_VALUE')
    expect(line).not.toContain(birthDate)
    expect(line).not.toContain('1985')
  })

  it('names an error without a code by its name, not by its message', () => {
    expect(adminFailure('add a match', new TypeError(`Cannot read ${birthDate}`))).toBe(
      'Could not add a match: TypeError',
    )
  })

  it('says unknown error for something that is not an error', () => {
    expect(adminFailure('add a player', birthDate)).toBe('Could not add a player: unknown error')
  })
})

describe('kindOf', () => {
  it('takes the code of the error itself first', () => {
    expect(kindOf(mariaDbError('Duplicate entry', 'ER_DUP_ENTRY'))).toBe('ER_DUP_ENTRY')
  })

  it('takes the name of the innermost error when no error has a code', () => {
    expect(kindOf(new Error('outer', { cause: new RangeError('inner') }))).toBe('RangeError')
  })
})
