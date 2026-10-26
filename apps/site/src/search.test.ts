import { describe, expect, it } from 'vitest'

import { maxQueryLength, maxResults, parseResultCount, parseSearch, searchHref, squadGroups } from './search'

describe('parseSearch', () => {
  it('is no search without a q in the address', () => {
    expect(parseSearch(undefined)).toEqual({ kind: 'none' })
  })

  it('gives the words of a search, in the order they were written', () => {
    expect(parseSearch('Klaverboer Zwolle')).toEqual({
      kind: 'valid',
      text: 'Klaverboer Zwolle',
      words: ['Klaverboer', 'Zwolle'],
    })
  })

  it('counts control characters and runs of spaces as one space, and trims the ends', () => {
    expect(parseSearch('  klaverboer \t\n  zwolle  ')).toEqual({
      kind: 'valid',
      text: 'klaverboer zwolle',
      words: ['klaverboer', 'zwolle'],
    })
  })

  it('accepts a word of two characters, and the characters %, _ and \\', () => {
    expect(parseSearch('LC')).toMatchObject({ kind: 'valid', words: ['LC'] })
    expect(parseSearch('100% a_b c\\d')).toMatchObject({ kind: 'valid', words: ['100%', 'a_b', 'c\\d'] })
  })

  it('accepts five words and sixty characters', () => {
    expect(parseSearch('aa bb cc dd ee')).toMatchObject({ kind: 'valid' })
    expect(parseSearch('a'.repeat(maxQueryLength))).toMatchObject({ kind: 'valid' })
  })

  it.each([[''], ['   '], ['\n\t']])('asks for a word when the search is empty (%j)', (value) => {
    expect(parseSearch(value)).toEqual({ kind: 'invalid', message: 'Schrijf een woord om te zoeken.', text: '' })
  })

  it('refuses a search of more than sixty characters, and shows back no more than sixty', () => {
    const search = parseSearch('a'.repeat(maxQueryLength + 1))

    expect(search).toMatchObject({ kind: 'invalid', message: 'Schrijf hoogstens 60 tekens.' })
    expect(search.kind === 'invalid' && [...search.text]).toHaveLength(maxQueryLength)
  })

  it('counts characters, not UTF-16 units, so sixty letters with a flag or an emoji still fit', () => {
    expect(parseSearch('😀'.repeat(maxQueryLength))).toMatchObject({ kind: 'valid' })
    expect(parseSearch('😀'.repeat(maxQueryLength + 1))).toMatchObject({ kind: 'invalid' })
  })

  it('refuses more than five words', () => {
    expect(parseSearch('aa bb cc dd ee ff')).toMatchObject({
      kind: 'invalid',
      message: 'Zoek op hoogstens 5 woorden.',
      text: 'aa bb cc dd ee ff',
    })
  })

  it('refuses a word of one character', () => {
    expect(parseSearch('klaverboer a')).toMatchObject({
      kind: 'invalid',
      message: 'Schrijf woorden van minstens 2 tekens.',
      text: 'klaverboer a',
    })
    expect(parseSearch('😀')).toMatchObject({ kind: 'invalid' })
  })

  it('takes the first value when q is given twice', () => {
    expect(parseSearch(['klaverboer', 'zwolle'])).toMatchObject({ kind: 'valid', words: ['klaverboer'] })
    expect(parseSearch([])).toMatchObject({ kind: 'invalid' })
  })

  it('does not change the words: quotes and pattern characters stay as they are, for the database to take as text', () => {
    expect(parseSearch("'; DROP TABLE items; --")).toMatchObject({
      kind: 'valid',
      words: ["';", 'DROP', 'TABLE', 'items;', '--'],
    })
    expect(parseSearch("o'neil 50%_")).toMatchObject({ kind: 'valid', words: ["o'neil", '50%_'] })
  })
})

describe('parseResultCount', () => {
  it('gives ten without a number', () => {
    expect(parseResultCount(undefined)).toBe(10)
  })

  it.each(['10', '15', '20', '95', '100'])('gives %s, a whole number from 10 in steps of 5, up to 100', (value) => {
    expect(parseResultCount(value)).toBe(Number(value))
  })

  it.each(['', '0', '5', '12', '-5', '+15', '1e1', '010', '105', '110', '15.0', 'abc', '15 ', '１５'])(
    'gives ten for %j',
    (value) => {
      expect(parseResultCount(value)).toBe(10)
    },
  )

  it('gives ten for a number given twice', () => {
    expect(parseResultCount(['15', '20'])).toBe(10)
  })

  it('stops at the most results', () => {
    expect(maxResults).toBe(100)
  })
})

describe('searchHref', () => {
  it('puts the text in the address, with the characters that need it written out', () => {
    expect(searchHref('Klaverboer')).toBe('/zoeken?q=Klaverboer')
    expect(searchHref('van der Kooi')).toBe('/zoeken?q=van+der+Kooi')
    expect(searchHref('Dijkhuizen & zoon')).toBe('/zoeken?q=Dijkhuizen+%26+zoon')
    expect(searchHref('100%')).toBe('/zoeken?q=100%25')
  })

  it('makes an address that parseSearch reads back as the same words', () => {
    const query = new URL(searchHref('van der Kooi'), 'https://example.test').searchParams.get('q') ?? undefined

    expect(parseSearch(query)).toMatchObject({ kind: 'valid', words: ['van', 'der', 'Kooi'] })
  })
})

describe('squadGroups', () => {
  const player = (name: string, position: 'aanvaller' | 'doelman' | 'middenvelder' | 'verdediger') => ({
    name,
    position,
    searchTerm: name,
  })

  it('groups the players by position from the goal to the front, in the order given', () => {
    const groups = squadGroups([
      player('Aanvaller Een', 'aanvaller'),
      player('Keeper Een', 'doelman'),
      player('Midden Een', 'middenvelder'),
      player('Verdediger Een', 'verdediger'),
      player('Keeper Twee', 'doelman'),
    ])

    expect(groups.map((group) => [group.label, group.players.map((item) => item.name)])).toEqual([
      ['Doelmannen', ['Keeper Een', 'Keeper Twee']],
      ['Verdedigers', ['Verdediger Een']],
      ['Middenvelders', ['Midden Een']],
      ['Aanvallers', ['Aanvaller Een']],
    ])
  })

  it('leaves out a position without players, and gives nothing for no players', () => {
    expect(squadGroups([player('Keeper Een', 'doelman')]).map((group) => group.label)).toEqual(['Doelmannen'])
    expect(squadGroups([])).toEqual([])
  })
})
