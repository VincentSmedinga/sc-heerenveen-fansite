import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import type { ReadPlayer } from './read-squad.ts'

import { readSquad, searchTerm, squadPageTitle } from './read-squad.ts'

const page = readFileSync(new URL('./fixtures/wikipedia-squad.wiki', import.meta.url), 'utf8')

/** A small page with a table under "Spelers", from the lines between the group headings. */
function pageWith(...lines: string[]) {
  return `== Selectie 2026/27 ==\n=== Spelers ===\n{| class="wikitable"\n|-\n! Nr.\n! Naam\n${lines.join('\n')}\n|}\n`
}

function playersOf(text: string): ReadPlayer[] {
  const read = readSquad(text)

  if (read.kind === 'error') {
    throw new Error(read.message)
  }

  return read.players
}

function problemOf(text: string): string {
  const read = readSquad(text)

  if (read.kind === 'read') {
    throw new Error('The squad was read')
  }

  return read.message
}

const keeper = '|-\n! colspan="13" align="left" |Doelmannen'

describe('the title of the page', () => {
  it('follows from the season', () => {
    expect(squadPageTitle('2026/27')).toBe('Sc Heerenveen in het seizoen 2026/27 (mannen)')
  })
})

describe('the search term', () => {
  it.each([
    ['Bernt Klaverboer', 'Klaverboer'],
    ['Joost van Aken', 'van Aken'],
    ['Jurre van der Kooi', 'van der Kooi'],
    ['Lars de Boer', 'de Boer'],
    ['Henk ten Cate', 'ten Cate'],
    ['Jan Paul van Hecke', 'Paul van Hecke'],
    ['Jan-Willem Pieters', 'Pieters'],
    ['Ruben Hart-Visser', 'Hart-Visser'],
    ['Maxence Rivera', 'Rivera'],
    ['Dinho', 'Dinho'],
    ['Van Bergen', 'Van Bergen'],
    ['Van der Flier', 'Van der Flier'],
    ['  Dylan   Vente ', 'Vente'],
  ])('of %s is %s', (name, term) => {
    expect(searchTerm(name)).toBe(term)
  })
})

describe('the page of the squad', () => {
  const players = playersOf(page)

  it('has every player of the table, in the order of the page, with the group as the position', () => {
    expect(players).toHaveLength(25)

    const names = (position: string) => players.filter((player) => player.position === position).map((p) => p.name)

    expect(names('doelman')).toEqual(['Bernt Klaverboer', 'Timo Schreuder', 'Andries Noppert', 'Sten Kremers'])
    expect(names('verdediger')).toHaveLength(9)
    expect(names('middenvelder')).toEqual([
      'Dirk Proper',
      'Ringo Meerveld',
      'Levi Smans',
      'Marcus Linday',
      'Nolhan Courtens',
    ])
    expect(names('aanvaller')).toHaveLength(7)
  })

  it('reads a row with all cells on one line', () => {
    expect(players.find((player) => player.name === 'Bernt Klaverboer')).toEqual({
      name: 'Bernt Klaverboer',
      position: 'doelman',
      searchTerm: 'Klaverboer',
      shirtNumber: 22,
      wikipediaPage: 'Bernt Klaverboer',
    })
    expect(players.find((player) => player.name === 'Sam Kersten')).toMatchObject({ shirtNumber: 4 })
  })

  it('reads a row with a cell on every line', () => {
    expect(players.find((player) => player.name === 'Maas Willemsen')).toEqual({
      name: 'Maas Willemsen',
      position: 'verdediger',
      searchTerm: 'Willemsen',
      shirtNumber: 3,
      wikipediaPage: 'Maas Willemsen',
    })
  })

  it('reads a player without a shirt number, written as a dash', () => {
    expect(players.find((player) => player.name === 'Sten Kremers')).toEqual({
      name: 'Sten Kremers',
      position: 'doelman',
      searchTerm: 'Kremers',
      shirtNumber: null,
      wikipediaPage: 'Sten Kremers',
    })
  })

  it('takes the name a link shows, and keeps the page it points to', () => {
    expect(players.find((player) => player.shirtNumber === 17)).toMatchObject({
      name: 'Roberts Uldrikis',
      searchTerm: 'Uldrikis',
      wikipediaPage: 'Roberts Uldriķis',
    })
  })

  it('keeps nothing but the name, the position, the number, the search term and the page', () => {
    for (const player of players) {
      expect(Object.keys(player).sort()).toEqual(['name', 'position', 'searchTerm', 'shirtNumber', 'wikipediaPage'])
    }
  })

  it('has no markup, flag, link or statistic in a name', () => {
    for (const player of players) {
      expect(player.name).toMatch(/^[\p{L}][\p{L} .'-]*$/u)
    }
  })

  it('reads the table of a heading of another level too', () => {
    const other = page.replace('=== Spelers ===', '==== Spelers ====')

    expect(playersOf(other)).toEqual(players)
  })
})

describe('the ways a name is written', () => {
  const row = (name: string) => `${keeper}\n|-\n|'''1'''||{{NL-VLAG}}|| align="left" |${name}||2029`

  it('reads [[Naam]]', () => {
    expect(playersOf(pageWith(row('[[Pim Verbeek]]')))).toMatchObject([
      { name: 'Pim Verbeek', searchTerm: 'Verbeek', wikipediaPage: 'Pim Verbeek' },
    ])
  })

  it('reads [[Pagina|Naam]] as the name, and the page as the page', () => {
    expect(playersOf(pageWith(row('[[Pim Verbeek (voetballer, 1999)|Pim Verbeek]]')))).toMatchObject([
      { name: 'Pim Verbeek', wikipediaPage: 'Pim Verbeek (voetballer, 1999)' },
    ])
  })

  it('takes a disambiguation off the title when the name comes from it, and keeps it in the page', () => {
    expect(playersOf(pageWith(row('[[Pim Verbeek (voetballer)]]')))).toMatchObject([
      { name: 'Pim Verbeek', wikipediaPage: 'Pim Verbeek (voetballer)' },
    ])
    expect(playersOf(pageWith(row('[[Pim Verbeek (voetballer, 1999)]]')))).toMatchObject([
      { name: 'Pim Verbeek', wikipediaPage: 'Pim Verbeek (voetballer, 1999)' },
    ])
  })

  it('reads a name without a link, and gives it no page', () => {
    expect(playersOf(pageWith(row('Pim Verbeek')))).toMatchObject([{ name: 'Pim Verbeek', wikipediaPage: null }])
  })

  it('reads a cell without an attribute and with a comment', () => {
    const text = pageWith(`${keeper}\n|-\n|1||{{NL-VLAG}}||<!-- let op -->[[Pim Verbeek]]||2029`)

    expect(playersOf(text)).toMatchObject([{ name: 'Pim Verbeek', shirtNumber: 1 }])
  })

  it('reads a row with a cell on every line and no attribute on the name', () => {
    expect(playersOf(pageWith(`${keeper}\n|-\n|1\n|{{NL-VLAG}}\n|[[Pim Verbeek]]\n|2029`))).toMatchObject([
      { name: 'Pim Verbeek', shirtNumber: 1 },
    ])
  })
})

describe('a page that has changed', () => {
  it('has no heading Spelers', () => {
    expect(problemOf(page.replace('=== Spelers ===', '=== Selectie ==='))).toBe(
      'the squad page has no table under the heading Spelers',
    )
  })

  it('has a heading but no table', () => {
    expect(problemOf('== Selectie ==\n=== Spelers ===\nGeen tabel.\n')).toBe(
      'the squad page has no table under the heading Spelers',
    )
  })

  it('has the table under another heading', () => {
    expect(problemOf(page.replace('=== Spelers ===\n', '=== Spelers ===\n=== Staf ===\n'))).toBe(
      'the squad page has no table under the heading Spelers',
    )
  })

  it('has a table that is never closed', () => {
    expect(problemOf(page.replace('\n|}', ''))).toBe('the squad page has no table under the heading Spelers')
  })

  it('has a group heading we do not know', () => {
    expect(problemOf(page.replace('|Aanvallers', '|Trainers'))).toBe(
      "the squad table has a heading we do not know: 'Trainers'",
    )
  })

  it('has a player above the first group heading', () => {
    expect(problemOf(pageWith("|-\n|'''1'''||{{NL-VLAG}}||[[Pim Verbeek]]"))).toBe(
      'the squad table has a player above the first group heading',
    )
  })

  it('has a row with too few cells', () => {
    expect(problemOf(pageWith(`${keeper}\n|-\n|1||[[Pim Verbeek]]`))).toBe(
      'a row of the squad table has 2 cells, not three or more',
    )
  })

  it.each([
    ['text', 'een', "Pim Verbeek has a shirt number we do not know: 'een'"],
    ['a number of three digits', '100', "Pim Verbeek has a shirt number we do not know: '100'"],
    ['zero', '0', "Pim Verbeek has a shirt number we do not know: '0'"],
  ])('has %s as a shirt number', (_what, number, message) => {
    expect(problemOf(pageWith(`${keeper}\n|-\n|${number}||{{NL-VLAG}}||[[Pim Verbeek]]`))).toBe(message)
  })

  it('has a name that is empty or holds a template', () => {
    expect(problemOf(pageWith(`${keeper}\n|-\n|1||{{NL-VLAG}}||`))).toContain('has no usable name')
    expect(problemOf(pageWith(`${keeper}\n|-\n|1||{{NL-VLAG}}||{{Speler|Pim}}`))).toContain('has no usable name')
  })

  it('has a name that is too long for the database', () => {
    expect(problemOf(pageWith(`${keeper}\n|-\n|1||{{NL-VLAG}}||${'Pim '.repeat(30)}`))).toContain('has no usable name')
  })

  it('reads an empty table as no players', () => {
    expect(playersOf(pageWith())).toEqual([])
  })
})
