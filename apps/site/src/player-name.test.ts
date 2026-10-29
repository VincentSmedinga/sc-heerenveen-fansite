import { describe, expect, it } from 'vitest'

import { pageTitleName, splitPageName, splitPlayerName, surnameOnly } from './player-name'

describe('splitPlayerName', () => {
  it.each([
    ['Joost van Aken', 'van Aken', { givenName: 'Joost', surname: 'van Aken' }],
    ['Jakob Trenskow', 'Trenskow', { givenName: 'Jakob', surname: 'Trenskow' }],
    ['Bernt Klaverboer', 'Klaverboer', { givenName: 'Bernt', surname: 'Klaverboer' }],
    ['Jan-Willem Oyen', 'Oyen', { givenName: 'Jan-Willem', surname: 'Oyen' }],
  ])('splits %s at the search term %s', (name, searchTerm, parts) => {
    expect(splitPlayerName(name, searchTerm)).toEqual(parts)
  })

  it('gives only a surname for a name that is the search term', () => {
    expect(splitPlayerName('Dinho', 'Dinho')).toEqual({ surname: 'Dinho' })
  })

  it('takes the surname as the name writes it, whatever the capitals of the search term', () => {
    expect(splitPlayerName('Joost Van Aken', 'van aken')).toEqual({ givenName: 'Joost', surname: 'Van Aken' })
  })

  it('leaves the other given names with the given name', () => {
    expect(splitPlayerName('Jan Paul van Hecke', 'van Hecke')).toEqual({ givenName: 'Jan Paul', surname: 'van Hecke' })
  })

  it('does not split when the search term is no end of the name, so the whole name stays in the normal weight', () => {
    expect(splitPlayerName('Dylan Vente', 'Vente (Dylan)')).toEqual({ givenName: 'Dylan Vente', surname: '' })
    expect(splitPlayerName('Luca Oyen', 'Luca')).toEqual({ givenName: 'Luca Oyen', surname: '' })
  })

  it('does not split in the middle of a word', () => {
    expect(splitPlayerName('Luca Boyen', 'oyen')).toEqual({ givenName: 'Luca Boyen', surname: '' })
  })

  it('does not split without a search term', () => {
    expect(splitPlayerName('Luca Oyen', '')).toEqual({ givenName: 'Luca Oyen', surname: '' })
  })
})

describe('surnameOnly', () => {
  it('shows a name as the page writes it as a surname', () => {
    expect(surnameOnly('Van Bergen')).toEqual({ surname: 'Van Bergen' })
  })
})

describe('pageTitleName', () => {
  it.each([
    ['Boy Kemper', 'Boy Kemper'],
    ['Pim Verbeek (voetballer, 1999)', 'Pim Verbeek'],
    ['Pim Verbeek (voetballer)', 'Pim Verbeek'],
    ['Joris van Overeem', 'Joris van Overeem'],
  ])('takes the name from the title %s', (title, name) => {
    expect(pageTitleName(title)).toBe(name)
  })

  it('only takes off the addition at the end', () => {
    expect(pageTitleName('Jan (Johan) de Vries')).toBe('Jan (Johan) de Vries')
  })
})

describe('splitPageName', () => {
  it('splits the title at the short name of the match page', () => {
    expect(splitPageName('Kemper', 'Boy Kemper')).toEqual({ givenName: 'Boy', surname: 'Kemper' })
  })

  it('splits a name with a prefix, whatever the capital of the short name', () => {
    expect(splitPageName('Van Overeem', 'Joris van Overeem')).toEqual({ givenName: 'Joris', surname: 'van Overeem' })
    expect(splitPageName('Van Bergen', 'Mitchell van Bergen')).toEqual({ givenName: 'Mitchell', surname: 'van Bergen' })
  })

  it('leaves the addition in brackets out', () => {
    expect(splitPageName('Verbeek', 'Pim Verbeek (voetballer, 1999)')).toEqual({ givenName: 'Pim', surname: 'Verbeek' })
  })

  it('takes the initials off the short name before it splits', () => {
    expect(splitPageName('D. Rots', 'Daniël Rots')).toEqual({ givenName: 'Daniël', surname: 'Rots' })
  })

  it('does not split when the short name is no end of the title', () => {
    expect(splitPageName('Dinho', 'Dinho Santos')).toEqual({ givenName: 'Dinho Santos', surname: '' })
  })
})
