import { describe, expect, it } from 'vitest'

import { manualNames, nameOfTitle, personNameOf, readSortKey } from './person-name.ts'

/** The parts of a name, in the order the columns have them. */
const parts = (title: string, sortKey: null | string, manual = new Map()) => {
  const { familyName, familyNamePrefix, givenName, name, source } = personNameOf(title, sortKey, manual)

  return { familyName, familyNamePrefix, givenName, name, source }
}

describe('readSortKey', () => {
  it('reads the key of the article', () => {
    expect(readSortKey('Tekst.\n{{DEFAULTSORT:Aken, Joost van}}\n[[Categorie:Mens]]')).toBe('Aken, Joost van')
    expect(readSortKey('{{defaultsort: Anholt, Pele van }}')).toBe('Anholt, Pele van')
  })

  it('has no key for an article without one, or with an empty one', () => {
    expect(readSortKey('Tekst zonder sleutel')).toBeNull()
    expect(readSortKey('{{DEFAULTSORT:}}')).toBeNull()
  })
})

describe('nameOfTitle', () => {
  it('takes the addition between brackets off', () => {
    expect(nameOfTitle('Joachim Andersen (voetballer)')).toBe('Joachim Andersen')
    expect(nameOfTitle('Johnny Jansen (1975)')).toBe('Johnny Jansen')
    expect(nameOfTitle('Joost van Aken')).toBe('Joost van Aken')
  })
})

describe('personNameOf with a sort key', () => {
  it('puts the small words after the given names in the prefix of the family name', () => {
    expect(parts('Joost van Aken', 'Aken, Joost van')).toEqual({
      familyName: 'Aken',
      familyNamePrefix: 'van',
      givenName: 'Joost',
      name: 'Joost van Aken',
      source: 'sort_key',
    })
  })

  it('keeps the accent of the title, and ignores accents in the key', () => {
    expect(parts('Pelé van Anholt', 'Anholt, Pele van')).toMatchObject({
      familyName: 'Anholt',
      familyNamePrefix: 'van',
      givenName: 'Pelé',
      name: 'Pelé van Anholt',
      source: 'sort_key',
    })
  })

  it('ignores full stops, and a dotless i', () => {
    expect(parts('Jerry St. Juste', 'St Juste, Jerry')).toMatchObject({
      familyName: 'St. Juste',
      givenName: 'Jerry',
      source: 'sort_key',
    })
    expect(parts('Bilal Başacıkoğlu', 'Basacikoglu, Bilal')).toMatchObject({
      familyName: 'Başacıkoğlu',
      givenName: 'Bilal',
      name: 'Bilal Başacıkoğlu',
      source: 'sort_key',
    })
  })

  it('takes more than one word as the family name when the key says so', () => {
    expect(parts('Marlon Pereira Freire', 'Pereira Freire, Marlon')).toMatchObject({
      familyName: 'Pereira Freire',
      familyNamePrefix: null,
      givenName: 'Marlon',
      source: 'sort_key',
    })
  })

  it('moves the small words at the start of a family name into the prefix', () => {
    expect(parts('Rafael van der Vaart', 'Vaart, Rafael van der')).toMatchObject({
      familyName: 'Vaart',
      familyNamePrefix: 'van der',
      givenName: 'Rafael',
    })
    expect(parts('Rafael van der Vaart', 'Van der Vaart, Rafael')).toMatchObject({
      familyName: 'Vaart',
      familyNamePrefix: 'van der',
      givenName: 'Rafael',
      source: 'sort_key',
    })
  })

  it('has no given name for a name of one word', () => {
    expect(parts('Dinho', 'Dinho')).toEqual({
      familyName: 'Dinho',
      familyNamePrefix: null,
      givenName: null,
      name: 'Dinho',
      source: 'sort_key',
    })
  })

  it('takes the title with the addition between brackets as the name', () => {
    expect(parts('Joachim Andersen (voetballer)', 'Andersen, Joachim')).toMatchObject({
      familyName: 'Andersen',
      givenName: 'Joachim',
      name: 'Joachim Andersen',
      source: 'sort_key',
    })
  })

  it('gives the parts that make the name, with a space where something stands', () => {
    for (const [title, key] of [
      ['Joost van Aken', 'Aken, Joost van'],
      ['Dinho', 'Dinho'],
      ['Marlon Pereira Freire', 'Pereira Freire, Marlon'],
    ] as const) {
      const { familyName, familyNamePrefix, givenName, name } = personNameOf(title, key)

      expect([givenName, familyNamePrefix, familyName].filter(Boolean).join(' ')).toBe(name)
    }
  })
})

describe('personNameOf without a fitting sort key', () => {
  it('guesses the last word, with the small words before it as the prefix', () => {
    expect(parts('Ramon Zomer', null)).toEqual({
      familyName: 'Zomer',
      familyNamePrefix: null,
      givenName: 'Ramon',
      name: 'Ramon Zomer',
      source: 'guess',
    })
    expect(parts('Siem de Jong', null)).toMatchObject({
      familyName: 'Jong',
      familyNamePrefix: 'de',
      givenName: 'Siem',
      source: 'guess',
    })
  })

  it('takes a name of one word as a family name', () => {
    expect(parts('Dinho', null)).toMatchObject({ familyName: 'Dinho', givenName: null, source: 'guess' })
  })

  it('guesses when the key does not end the title', () => {
    expect(parts('Luca Oyen', 'Jansen, Luca')).toMatchObject({ familyName: 'Oyen', source: 'guess' })
  })
})

describe('personNameOf with the list', () => {
  it('goes before the key and the guess', () => {
    const manual = manualNames([
      { familyName: 'Vries', familyNamePrefix: 'de', givenName: 'Jan Pieter', title: 'Jan Pieter de Vries' },
    ])

    expect(parts('Jan Pieter de Vries', 'Vries, Jan Pieter de', manual)).toEqual({
      familyName: 'Vries',
      familyNamePrefix: 'de',
      givenName: 'Jan Pieter',
      name: 'Jan Pieter de Vries',
      source: 'manual',
    })
  })
})
