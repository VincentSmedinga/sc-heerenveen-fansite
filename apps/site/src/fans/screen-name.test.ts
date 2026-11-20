import { describe, expect, it } from 'vitest'

import { checkScreenName, refusedNames, screenNameKey } from './screen-name'

describe('a screen name', () => {
  it.each(['Tjalle99', 'Sietske_H', 'De Kowet', 'Jørgen-Ål', 'Ștefan', 'abc', 'A'.repeat(20)])('may be %s', (name) => {
    expect(checkScreenName(name)).toEqual({ key: screenNameKey(name), name })
  })

  it('loses the spaces around it', () => {
    expect(checkScreenName('  Tjalle99 ')).toMatchObject({ name: 'Tjalle99' })
  })

  it('is composed, so an accent typed as two characters counts as one', () => {
    expect(checkScreenName('Káre')).toMatchObject({ name: 'Káre' })
  })

  it('has 3 to 20 characters', () => {
    expect(checkScreenName('ab')).toEqual({ problem: 'length' })
    expect(checkScreenName('A'.repeat(21))).toEqual({ problem: 'length' })
    expect(checkScreenName('')).toEqual({ problem: 'empty' })
    expect(checkScreenName('   ')).toEqual({ problem: 'empty' })
  })

  it.each([
    ['Tjalle@99', '@'],
    ['Tjalle.99', '.'],
    // A Cyrillic а, that looks like a Latin a.
    ['Tjаlle', 'а'],
    ['Γιάννης', 'Γ'],
    // Fullwidth Latin letters.
    ['Ｔjalle', 'Ｔ'],
    ['Tjalle😀', '😀'],
    ['Tjalle​99', '​'],
  ])('refuses %s for the character %s', (name, character) => {
    expect(checkScreenName(name)).toEqual({ character, problem: 'character' })
  })

  it('has no two spaces in a row', () => {
    expect(checkScreenName('De  Kowet')).toEqual({ problem: 'spaces' })
    expect(checkScreenName('De Ko wet')).toMatchObject({ name: 'De Ko wet' })
  })

  it('has a letter or a digit', () => {
    expect(checkScreenName('_-_')).toEqual({ problem: 'no-letter' })
  })
})

describe('the normalised form of a screen name', () => {
  it.each([
    ['Tjalle99', 'TJALLE99'],
    ['Tjalle99', 'tjálle 99'],
    ['Tjalle99', 'Tjalle_99'],
    ['Tjalle99', 'Tja-lle99'],
    ['Sjoerd', 'SJ0ERD'],
    ['Hilde', 'H1lde'],
    ['Hilde', 'HiIde'],
    ['Bram', 'Brarn'],
    ['Wouter', 'VVouter'],
    ['Jorgen', 'Jørgen'],
    ['Strasse', 'Straße'],
    ['Aeron', 'Æron'],
    ['Sees', 'S33s'],
  ])('makes %s and %s the same', (one, other) => {
    expect(screenNameKey(one)).toBe(screenNameKey(other))
  })

  it.each([
    ['Tjalle99', 'Tjalle98'],
    ['Sanne', 'Sanna'],
  ])('keeps %s and %s apart', (one, other) => {
    expect(screenNameKey(one)).not.toBe(screenNameKey(other))
  })
})

describe('the refused names', () => {
  it.each([
    'sc Heerenveen',
    'SC Heerenveen',
    'scHeerenveen',
    'sc_heerenveen',
    'Heer3nveen',
    'Heerenveen Fan',
    'Fansite',
    'FANS1TE',
    'Redactie',
    'redactie_fan',
    'Beheer',
    'Beheerder',
    'Admin',
    'Adm1n',
    'xxAdminxx',
    'Moderator',
    'Webmaster',
  ])('refuse %s', (name) => {
    expect(checkScreenName(name)).toEqual({ problem: 'refused' })
  })

  it('are the names of the issue', () => {
    expect(refusedNames).toEqual([
      'sc Heerenveen',
      'Heerenveen',
      'Fansite',
      'redactie',
      'beheer',
      'beheerder',
      'admin',
      'moderator',
      'webmaster',
    ])
  })

  it.each(['Tjalle99', 'Fan van de club', 'Abe Lenstra'])('let %s pass', (name) => {
    expect(checkScreenName(name)).toMatchObject({ name })
  })
})
