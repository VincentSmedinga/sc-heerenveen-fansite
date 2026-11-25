import { describe, expect, it } from 'vitest'

import {
  leadOfName,
  leadOfNamesake,
  personNameParts,
  personSortName,
  shortOpponentNames,
  splitPersonName,
  textSortName,
} from './player-name'

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

describe('splitPersonName', () => {
  it('takes the first word as the given name and the rest as the surname', () => {
    expect(splitPersonName('Henk Brugge')).toEqual({ givenName: 'Henk', surname: 'Brugge' })
    expect(splitPersonName('Robin van Persie')).toEqual({ givenName: 'Robin', surname: 'van Persie' })
    expect(splitPersonName('Jan Olde Riekerink')).toEqual({ givenName: 'Jan', surname: 'Olde Riekerink' })
  })

  it('keeps a second given name with the first, and starts the surname at the prefix', () => {
    expect(splitPersonName('Jan Willem van Hanegem')).toEqual({ givenName: 'Jan Willem', surname: 'van Hanegem' })
    expect(splitPersonName('Joost van der Meer')).toEqual({ givenName: 'Joost', surname: 'van der Meer' })
  })

  it('makes a name that starts with a prefix, or has one word, all surname', () => {
    expect(splitPersonName('van Aken')).toEqual({ surname: 'van Aken' })
    expect(splitPersonName('Dinho')).toEqual({ surname: 'Dinho' })
  })

  it('guesses nothing else: Jon Dahl Tomasson is Jon and Dahl Tomasson', () => {
    expect(splitPersonName('Jon Dahl Tomasson')).toEqual({ givenName: 'Jon', surname: 'Dahl Tomasson' })
  })
})

describe('textSortName', () => {
  it('is the surname without its prefix', () => {
    expect(textSortName('Afonso Alves')).toBe('Alves')
    expect(textSortName('Joost van Aken')).toBe('Aken')
    expect(textSortName('Dinho')).toBe('Dinho')
  })
})

describe('leadOfNamesake', () => {
  const jeroen = { givenName: 'Jeroen', seasons: ['2004/05', '2008/09'] }

  it('gives the first letter when a namesake has a season at most one season from his', () => {
    expect(leadOfNamesake({ ...jeroen, namesakes: [{ givenName: 'Henrico', seasons: ['2009/10'] }] })).toBe('J.')
  })

  it('gives nothing for a namesake with two seasons in between', () => {
    expect(leadOfNamesake({ ...jeroen, namesakes: [{ givenName: 'Henrico', seasons: ['2011/12'] }] })).toBe('')
    expect(
      leadOfNamesake({
        givenName: 'Jan',
        namesakes: [{ givenName: 'Jan', seasons: ['2020/21'] }],
        seasons: ['1990/91'],
      }),
    ).toBe('')
  })

  it('gives the whole given name when the first letters are the same', () => {
    expect(leadOfNamesake({ ...jeroen, namesakes: [{ givenName: 'Jan', seasons: ['2005/06'] }] })).toBe('Jeroen')
  })

  it('gives nothing without a namesake, a given name or a player', () => {
    expect(leadOfNamesake({ ...jeroen, namesakes: [] })).toBe('')
    expect(
      leadOfNamesake({
        givenName: null,
        namesakes: [{ givenName: 'Jan', seasons: ['2005/06'] }],
        seasons: ['2005/06'],
      }),
    ).toBe('')
    expect(leadOfNamesake(undefined)).toBe('')
  })
})

describe('shortOpponentNames', () => {
  const shortened = (...names: string[]) => shortOpponentNames(names.map((name) => ({ name })))
  const person = (givenName: null | string, familyName: null | string, prefix: null | string = null) => ({
    personFamilyName: familyName,
    personFamilyNamePrefix: prefix,
    personGivenName: givenName,
  })

  it('takes the prefix and the family name of a linked person', () => {
    expect(shortOpponentNames([{ name: 'Kayne van Oevelen', person: person('Kayne', 'Oevelen', 'van') }])).toEqual([
      { lead: '', shortName: 'van Oevelen' },
    ])
    expect(shortOpponentNames([{ name: 'Jan Willem Testma', person: person('Jan Willem', 'Testma') }])).toEqual([
      { lead: '', shortName: 'Testma' },
    ])
  })

  it('keeps the given name of a person who has nothing else', () => {
    expect(shortOpponentNames([{ name: 'Koke', person: person('Koke', null) }])).toEqual([
      { lead: '', shortName: 'Koke' },
    ])
  })

  it('reads the text when the linked person has no name yet', () => {
    expect(shortOpponentNames([{ name: 'Ozan Kökçü', person: person(null, null) }])).toEqual([
      { lead: '', shortName: 'Kökçü' },
    ])
  })

  it('drops the first word of a name as text', () => {
    expect(shortened('Eric da Silva Moreira', 'Anis Hadj Moussa').map((one) => one.shortName)).toEqual([
      'da Silva Moreira',
      'Hadj Moussa',
    ])
  })

  it('keeps a name of one word, and one that starts with a prefix, whole', () => {
    expect(shortened('Koke', 'van Testma')).toEqual([
      { lead: '', shortName: 'Koke' },
      { lead: '', shortName: 'van Testma' },
    ])
  })

  it('gives two players with the same name the initial of the given name', () => {
    expect(shortened('Julian Baas', 'Youri Baas', 'Anis Testma')).toEqual([
      { lead: 'J.', shortName: 'Baas' },
      { lead: 'Y.', shortName: 'Baas' },
      { lead: '', shortName: 'Testma' },
    ])
  })

  it('gives the whole given name when the initial is shared too, also between a person and text', () => {
    expect(
      shortOpponentNames([{ name: 'Julian Baas', person: person('Julian', 'Baas') }, { name: 'Joris Baas' }]),
    ).toEqual([
      { lead: 'Julian', shortName: 'Baas' },
      { lead: 'Joris', shortName: 'Baas' },
    ])
  })

  it('gives no lead to a namesake without a given name', () => {
    expect(shortened('Baas', 'Youri Baas')).toEqual([
      { lead: '', shortName: 'Baas' },
      { lead: 'Y.', shortName: 'Baas' },
    ])
  })
})

describe('leadOfName', () => {
  it('gives the first letter in capitals with a full stop, or the whole name for the same letter', () => {
    expect(leadOfName('gérard', ['Dennis'])).toBe('G.')
    expect(leadOfName('Dennis', ['Daan'])).toBe('Dennis')
    expect(leadOfName(null, ['Daan'])).toBe('')
  })
})
