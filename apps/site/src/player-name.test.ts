import { describe, expect, it } from 'vitest'

import { personNameParts, personSortName, splitStaffName, surnameOnly } from './player-name'

const person = (given: null | string, prefix: null | string, family: null | string) => ({
  personFamilyName: family,
  personFamilyNamePrefix: prefix,
  personGivenName: given,
})

describe('personNameParts', () => {
  it.each([
    [person('Alfreð', null, 'Finnbogason'), { givenName: 'Alfreð', surname: 'Finnbogason' }],
    [person('Ramon', null, 'Zomer'), { givenName: 'Ramon', surname: 'Zomer' }],
    [person('Filip', null, 'Đuričić'), { givenName: 'Filip', surname: 'Đuričić' }],
    [person('Jan-Willem', null, 'Oyen'), { givenName: 'Jan-Willem', surname: 'Oyen' }],
  ])('puts the given name in the normal weight and the family name in the heavier one', (name, parts) => {
    expect(personNameParts(name)).toEqual(parts)
  })

  it('puts the prefix before the family name, in the heavier weight', () => {
    expect(personNameParts(person('Joost', 'van', 'Aken'))).toEqual({ givenName: 'Joost', surname: 'van Aken' })
    expect(personNameParts(person('Ruud', 'van der', 'Sar'))).toEqual({ givenName: 'Ruud', surname: 'van der Sar' })
  })

  it('gives only a surname for a person with one name', () => {
    expect(personNameParts(person(null, null, 'Dinho'))).toEqual({ surname: 'Dinho' })
    expect(personNameParts(person('', null, 'Dinho'))).toEqual({ surname: 'Dinho' })
  })

  it('gives the whole name in the normal weight for a person without a family name', () => {
    expect(personNameParts(person('Pelé', null, null))).toEqual({ givenName: 'Pelé', surname: '' })
  })

  it('gives nothing for a person whose name the importer has not kept, and guesses nothing', () => {
    expect(personNameParts(person(null, null, null))).toBeUndefined()
    expect(personNameParts(person('', '', ''))).toBeUndefined()
  })
})

describe('personSortName', () => {
  it('leaves the prefix out, so Joost van Aken is under the A', () => {
    expect(personSortName(person('Joost', 'van', 'Aken'))).toBe('Aken')
  })

  it('takes the given name for a person without a family name', () => {
    expect(personSortName(person('Pelé', null, null))).toBe('Pelé')
  })
})

describe('splitStaffName', () => {
  it('takes the first word as the given name and the rest as the surname', () => {
    expect(splitStaffName('Henk Brugge')).toEqual({ givenName: 'Henk', surname: 'Brugge' })
    expect(splitStaffName('Robin van Persie')).toEqual({ givenName: 'Robin', surname: 'van Persie' })
    expect(splitStaffName('Jan Olde Riekerink')).toEqual({ givenName: 'Jan', surname: 'Olde Riekerink' })
  })

  it('makes a name of one word a surname', () => {
    expect(splitStaffName('Dinho')).toEqual({ surname: 'Dinho' })
  })
})

describe('surnameOnly', () => {
  it('shows a name as a surname', () => {
    expect(surnameOnly('Ramon Zomer')).toEqual({ surname: 'Ramon Zomer' })
  })
})
