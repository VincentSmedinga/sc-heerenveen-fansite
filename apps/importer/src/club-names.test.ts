import { clubSlug } from '@fansite/db/clubs'
import { lostLetters } from '@fansite/db/slug-letters'
import { describe, expect, it } from 'vitest'

import { clubFullNames } from './club-names.ts'

describe('the list of full names of clubs', () => {
  it('loses no letter of a name in its address (#1121), so a new letter is noticed', () => {
    for (const { aliases, name } of clubFullNames) {
      expect(lostLetters(name), name).toEqual([])

      for (const alias of aliases) {
        expect(lostLetters(alias), alias).toEqual([])
      }
    }
  })

  it('gives the two clubs that lost a letter the address of their name', () => {
    expect(clubSlug('Lillestrøm SK')).toBe('lillestrom-sk')
    expect(clubSlug('Næstved IF')).toBe('naestved-if')
    expect(clubFullNames.map(({ name }) => name)).toEqual(expect.arrayContaining(['Lillestrøm SK', 'Næstved IF']))
  })
})
