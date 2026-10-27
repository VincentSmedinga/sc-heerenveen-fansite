import { describe, expect, it } from 'vitest'

import { splitPlayerName, surnameOnly } from './player-name'

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
