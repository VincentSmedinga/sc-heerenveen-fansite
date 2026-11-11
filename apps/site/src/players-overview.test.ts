import { describe, expect, it } from 'vitest'

import {
  byCountry,
  byLetter,
  countryAnchor,
  factsOf,
  letterOf,
  overviewOf,
  sortPlayers,
  yearsOf,
} from './players-overview'

const row = (
  id: number,
  name: { family?: string; given?: string; prefix?: string; text?: string },
  extra: { country?: string; line?: string; season?: string; slug?: string } = {},
) => ({
  country: extra.country ?? null,
  familyName: name.family ?? null,
  familyNamePrefix: name.prefix ?? null,
  givenName: name.given ?? null,
  id,
  line: extra.line ?? null,
  name: name.text ?? null,
  rowName: name.text ?? `${name.given ?? ''} ${name.family ?? ''}`.trim(),
  season: extra.season ?? '2013/14',
  slug: extra.slug ?? null,
})

describe('overviewOf', () => {
  it('makes one player of each person, with the seasons of all his rows and the name in two parts', () => {
    const { players, since } = overviewOf([
      row(
        1,
        { family: 'Aken', given: 'Joost', prefix: 'van' },
        { line: 'verdediger', season: '2021/22', slug: 'joost-van-aken' },
      ),
      row(
        1,
        { family: 'Aken', given: 'Joost', prefix: 'van' },
        { line: 'verdediger', season: '2013/14', slug: 'joost-van-aken' },
      ),
      row(2, { family: 'Dinho' }),
    ])

    expect(players).toHaveLength(2)
    expect(since).toBe('2013')
    expect(players[0]).toMatchObject({
      line: 'Verdediger',
      rest: 'Joost van',
      seasons: ['2013/14', '2021/22'],
      slug: 'joost-van-aken',
      sortName: 'Aken',
      surname: 'Aken',
    })
    expect(players[1]).toMatchObject({ rest: '', slug: undefined, surname: 'Dinho' })
  })

  it('splits the name of a person without parts, so a prefix does not count', () => {
    const [player] = overviewOf([row(3, { text: 'Joost van Aken' })]).players

    expect(player).toMatchObject({ rest: 'Joost van', sortName: 'Aken', surname: 'Aken' })
  })
})

describe('the order and the letters', () => {
  const names = [
    row(1, { family: 'Đuričić', given: 'Dušan' }),
    row(2, { family: 'Ødegaard', given: 'Martin' }),
    row(3, { family: 'Čmovš', given: 'Ivan' }),
    row(4, { family: 'Þórisson', given: 'Jón' }),
    row(5, { family: 'Aken', given: 'Joost', prefix: 'van' }),
    row(6, { family: 'Dinho' }),
    row(7, { family: 'Alves', given: 'Zé' }),
    row(8, { family: 'Alves', given: 'André' }),
  ]
  const { players } = overviewOf(names)

  it('puts Đuričić under D, Ødegaard under O, Čmovš under C and Þórisson under T', () => {
    const letters = Object.fromEntries(players.map((player) => [player.surname, letterOf(player)]))

    expect(letters).toMatchObject({ Aken: 'A', Čmovš: 'C', Dinho: 'D', Đuričić: 'D', Ødegaard: 'O', Þórisson: 'T' })
  })

  it('puts a name with a prefix under the family name, and equal family names by given name', () => {
    expect(sortPlayers(players).map((player) => `${player.surname}${player.givenName}`)).toEqual([
      'AkenJoost',
      'AlvesAndré',
      'AlvesZé',
      'Čmovš' + 'Ivan',
      'Dinho',
      'Đuričić' + 'Dušan',
      'ØdegaardMartin',
      'Þórisson' + 'Jón',
    ])
  })

  it('leaves out a letter without players and counts each group', () => {
    const groups = byLetter(players)

    expect(groups.map((group) => group.letter)).toEqual(['A', 'C', 'D', 'O', 'T'])
    expect(groups.find((group) => group.letter === 'D')?.players).toHaveLength(2)
  })
})

describe('byCountry', () => {
  const { players } = overviewOf([
    row(1, { family: 'A' }, { country: 'NL' }),
    row(2, { family: 'B' }, { country: 'NL' }),
    row(3, { family: 'C' }, { country: 'SE' }),
    row(4, { family: 'D' }, { country: 'DK' }),
    row(5, { family: 'E' }),
  ])

  it('puts the largest country first, equal ones by name, and a player without a country last', () => {
    expect(byCountry(players).map((group) => [group.name, group.players.length])).toEqual([
      ['Nederland', 2],
      ['Denemarken', 1],
      ['Zweden', 1],
      ['Land onbekend', 1],
    ])
  })

  it('gives each section an anchor from its name', () => {
    expect(byCountry(players).map(countryAnchor)).toEqual([
      'land-nederland',
      'land-denemarken',
      'land-zweden',
      'land-land-onbekend',
    ])
  })
})

describe('the years of a player', () => {
  it('writes a period as the years it spans, and one season as the season', () => {
    expect(yearsOf(['2013/14', '2014/15', '2015/16', '2016/17', '2021/22', '2022/23'], '2026/27')).toBe(
      '2013–2017, 2021–2023',
    )
    expect(yearsOf(['2024/25'], '2026/27')).toBe('2024/25')
  })

  it('ends in "sinds" for a player in the squad now', () => {
    expect(yearsOf(['2024/25', '2025/26', '2026/27'], '2026/27')).toBe('sinds 2024')
  })

  it('leaves out what is unknown, without a double separator', () => {
    expect(factsOf({ line: 'Verdediger', seasons: ['2013/14', '2014/15'] }, '2026/27')).toBe('Verdediger · 2013–2015')
    expect(factsOf({ line: undefined, seasons: ['2013/14'] }, '2026/27')).toBe('2013/14')
  })
})
