import { lostLetters } from '@fansite/db/person-slugs'
import { describe, expect, it } from 'vitest'

import { madeUpPersonNames } from '../e2e/persons'

describe('the names of the made-up persons', () => {
  it('lose no letter in their address (#1113), so a new letter is noticed', () => {
    expect(madeUpPersonNames.length).toBeGreaterThan(0)

    for (const name of madeUpPersonNames) {
      expect(lostLetters(name), name).toEqual([])
    }
  })
})
