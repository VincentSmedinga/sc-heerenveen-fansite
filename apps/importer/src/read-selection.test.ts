import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import type { SeasonPlayer, SeasonSquad } from './season-squad.ts'

import { readSeasonSelection } from './read-selection.ts'

// Small copies of the real pages of the Dutch Wikipedia: the list of 2007/08, the wide tables
// of 2008/09 and 2009/10 and the tables of 2013/14, 2014/15 and 2016/17, with a few players
// each. Each has a link in the section after the squad, which is not a player.
const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}.wiki`, import.meta.url), 'utf8')
const page200708 = fixture('wikipedia-selection-2007-08')
const page200809 = fixture('wikipedia-selection-2008-09')
const page200910 = fixture('wikipedia-selection-2009-10')
const page201314 = fixture('wikipedia-selection-2013-14')
const page201415 = fixture('wikipedia-selection-2014-15')
const page201617 = fixture('wikipedia-selection-2016-17')

/** A page with a section Selectie and the table `rows` in the form of 2014/15. */
function tablePage(...rows: string[]): string {
  return [
    '== Selectie ==',
    '{| class="wikitable"',
    '!No.',
    '!Naam',
    '!Nationaliteit',
    '!Geboortedatum',
    '!Vorige club',
    ...rows,
    '|}',
  ].join('\n')
}

const heading = (title: string) => `|-\n| colspan="5" | '''${title}'''`
const player = (number: string, name: string) => `|-\n| ${number} || ${name} || {{NL}} || 03-03-1989 || [[Feyenoord]]`

function playersOf(text: string): SeasonPlayer[] {
  const squad = readSeasonSelection(text)

  if (squad.kind !== 'read') {
    throw new Error(`The page was not read: ${JSON.stringify(squad)}`)
  }

  return squad.players
}

function problemOf(text: string): string {
  const squad = readSeasonSelection(text)

  if (squad.kind !== 'error') {
    throw new Error(`The page gave no error: ${squad.kind}`)
  }

  return squad.message
}

/** What a player of these pages looks like: no matches or goals are given. */
function seen(
  name: string,
  page: null | string,
  position: SeasonPlayer['position'],
  shirtNumber: null | number,
): SeasonPlayer {
  return { appearances: null, goals: null, name, page, position, shirtNumber }
}

describe('the list of 2007/08', () => {
  it('reads the players of the list, without a position or a shirt number', () => {
    expect(readSeasonSelection(page200708)).toEqual({
      appearancesTotal: null,
      goalsTotal: null,
      kind: 'read',
      players: [
        seen('Rob van Dijk', 'Rob van Dijk (voetballer)', null, null),
        seen('Jakob Poulsen', 'Jakob Poulsen', null, null),
        seen('Michael Bradley', 'Michael Bradley (voetballer)', null, null),
        seen('Agil Etemadi', 'Agil Etemadi', null, null),
        seen('Paul Bosvelt', 'Paul Bosvelt', null, null),
        seen('Will Johnson', 'Will Johnson (voetballer)', null, null),
      ],
      source: 'selectie',
      warnings: [],
    } satisfies SeasonSquad)
  })

  it('keeps a name without a link when the source gives a full name', () => {
    const text = '== Voorlopige selectie ==\n;Doorlopend contract\n* {{NL-VLAG}} Pim Verbeek (medio 2009)'

    expect(playersOf(text)).toEqual([seen('Pim Verbeek', null, null, null)])
  })

  it('leaves out a name without a link that is not a full name, with a warning', () => {
    const squad = readSeasonSelection('== Selectie ==\n* [[Jakob Poulsen]]\n* {{NL-VLAG}} Drost (medio 2009)')

    expect(squad).toMatchObject({
      kind: 'read',
      players: [{ name: 'Jakob Poulsen' }],
      warnings: ["'Drost' is left out: the name is not linked and not a full name"],
    })
  })

  it('leaves out an abbreviated name without a link', () => {
    const squad = readSeasonSelection('== Selectie ==\n* [[Jakob Poulsen]]\n* {{NL-VLAG}} v. Amersfoort')

    expect(squad).toMatchObject({
      players: [{ name: 'Jakob Poulsen' }],
      warnings: [expect.stringContaining('v. Amersfoort')],
    })
  })

  it('gives an error for a line that is not a player or a heading', () => {
    expect(problemOf('== Selectie ==\n* [[Jakob Poulsen]]\nNog te bevestigen.')).toBe(
      "a line of the list Selectie has a shape we do not know: 'Nog te bevestigen.'",
    )
  })
})

describe('the wide tables of 2008/09 and 2009/10', () => {
  it('reads two players to a line and takes the position from the heading', () => {
    expect(playersOf(page200809)).toEqual([
      seen('Brian Vandenbussche', 'Brian Vandenbussche', 'doelman', null),
      seen('Agil Etemadi', 'Agil Etemadi', 'doelman', null),
      seen('Hans Vonk', 'Hans Vonk (doelman)', 'doelman', null),
      seen('Michel Breuer', 'Michel Breuer', 'verdediger', null),
      seen('Lázaro', 'Lázaro Vinícius', 'verdediger', null),
      seen('Lesly Fellinga', 'Lesly Fellinga', 'verdediger', null),
      seen('Geert Arend Roorda', 'Geert Arend Roorda', 'middenvelder', null),
      seen('Roy Beerens', 'Roy Beerens', 'middenvelder', null),
      seen('Patrik Ingelsten', 'Patrik Ingelsten', 'aanvaller', null),
      seen('Bonaventure Kalou', 'Bonaventure Kalou', 'aanvaller', null),
      seen('Tarik Elyounoussi', 'Tarik Elyounoussi', 'aanvaller', null),
      seen('Samuel Armenteros', 'Samuel Armenteros', 'aanvaller', null),
      seen('Paweł Wojciechowski', 'Paweł Wojciechowski (voetballer 1990)', 'aanvaller', null),
    ])
  })

  it('does not take a previous club, a contract or an empty cell for a player', () => {
    const names = playersOf(page200809).map((entry) => entry.name)

    expect(names).not.toContain('Sparta Rotterdam')
    expect(names).not.toContain('2011')
    expect(names).not.toContain('Atlético Mineiro')
    expect(names).not.toContain('Spelerslink in de tekst eromheen')
  })

  it('reads the shirt number in front of the name', () => {
    expect(playersOf(page200910)).toEqual([
      seen('Brian Vandenbussche', 'Brian Vandenbussche', 'doelman', 25),
      seen('Kenny Steppe', 'Kenny Steppe', 'doelman', 1),
      seen('Daryl Janmaat', 'Daryl Janmaat', 'verdediger', 19),
      seen('Goran Popov', 'Goran Popov', 'verdediger', 20),
      seen('Gerry Koning', 'Gerry Koning', 'verdediger', 37),
      seen('Viktor Elm', 'Viktor Elm', 'middenvelder', 7),
      seen('Roy Beerens', 'Roy Beerens', 'aanvaller', 8),
      seen('Gerald Sibon', 'Gerald Sibon', 'aanvaller', 35),
      seen('Samir Fazli', 'Samir Fazli', 'aanvaller', null),
    ])
  })

  it('keeps a name without a link in a cell after a flag', () => {
    const text = page200910.replace('[[Kenny Steppe]]', 'Kenny Steppe')

    expect(playersOf(text)[1]).toEqual(seen('Kenny Steppe', null, 'doelman', 1))
  })

  it('gives an error for a cell after a flag that is not a name', () => {
    expect(problemOf(page200910.replace('[[Kenny Steppe]]', '[[Kenny Steppe]] (aanvoerder, 2010)'))).toBe(
      "a row of the table Selectie has a cell after a flag that is not a name: '1 Kenny Steppe (aanvoerder, 2010)'",
    )
  })
})

describe('the tables of 2013/14 to 2017/18', () => {
  it('reads the shirt number, the name and the position of the heading', () => {
    expect(playersOf(page201415)).toEqual([
      seen('Kristoffer Nordfeldt', 'Kristoffer Nordfeldt', 'doelman', 1),
      seen('Robin Kist', 'Robin Kist', 'doelman', 30),
      seen('Kenneth Otigba', 'Kenny Otigba', 'verdediger', 2),
      seen('Pelé van Anholt', 'Pelé van Anholt', 'verdediger', 5),
      seen('Marten de Roon', 'Marten de Roon', 'middenvelder', 15),
      seen('Sam Larsson', 'Sam Larsson', 'aanvaller', 11),
    ])
  })

  it('reads the headings of 2013/14 and the link to the captain’s armband after a name', () => {
    expect(playersOf(page201314).map((entry) => [entry.shirtNumber, entry.position, entry.name])).toEqual([
      [1, 'doelman', 'Bo Kristoffer Nordfeldt'],
      [25, 'doelman', 'Brian Vandenbussche'],
      [2, 'verdediger', 'Kenny Otigba'],
      [15, 'middenvelder', 'Marten de Roon'],
      [22, 'middenvelder', 'Hakim Ziyech'],
      [11, 'aanvaller', 'Alfreð Finnbogason'],
    ])
  })

  it('reads the headings of 2016/17 and the captain’s template', () => {
    expect(playersOf(page201617).map((entry) => [entry.shirtNumber, entry.position, entry.name])).toEqual([
      [1, 'doelman', 'Erwin Mulder'],
      [31, 'doelman', 'Jan Bekkema'],
      [2, 'verdediger', 'Stefano Marzo'],
      [6, 'middenvelder', 'Stijn Schaars'],
      [7, 'aanvaller', 'Luciano Slagveer'],
    ])
  })

  it('takes a dash for a player without a shirt number', () => {
    const text = tablePage(heading('Keepers'), player('-', '[[Jan Bekkema]]'))

    expect(playersOf(text)).toEqual([seen('Jan Bekkema', 'Jan Bekkema', 'doelman', null)])
  })

  it('keeps a name without a link when the source gives a full name', () => {
    expect(playersOf(tablePage(heading('Keepers'), player('1', 'Erwin Mulder')))).toEqual([
      seen('Erwin Mulder', null, 'doelman', 1),
    ])
  })

  it('stops at the next heading: a link under it is not a player', () => {
    const text = `${tablePage(heading('Keepers'), player('1', '[[Erwin Mulder]]'))}\n\n== Transfers ==\n{|\n|-\n| 9 || [[Sam Larsson]] || a || b || c\n|}`

    expect(playersOf(text).map((entry) => entry.name)).toEqual(['Erwin Mulder'])
  })
})

describe('a season without a squad', () => {
  it.each(['2010/11', '2011/12', '2012/13'])('gives none for %s, which has no section Selectie', (season) => {
    const text = `Het seizoen ${season}.\n\n==Wedstrijden==\n[[Jakob Poulsen]]\n\n==Transfers==\n===Aangetrokken===\n* [[Michael Bradley]]`

    expect(readSeasonSelection(text)).toEqual({
      kind: 'none',
      reason: 'the page has no section Selectie or Voorlopige selectie',
    })
  })

  it('gives an error, not none, for a page whose squad is a sub-section: readSquad reads that form', () => {
    const text = readFileSync(new URL('./fixtures/wikipedia-squad-2022-23.wiki', import.meta.url), 'utf8')

    expect(problemOf(text)).toBe('the section Selectie has no list and no table')
  })
})

describe('a page that has changed shape', () => {
  it('gives an error for a heading we do not know', () => {
    expect(problemOf(tablePage(heading('Trainers'), player('1', '[[Erwin Mulder]]')))).toBe(
      "the table of the section Selectie has a heading we do not know: 'Trainers'",
    )
  })

  it('gives an error for a player above the first heading', () => {
    expect(problemOf(tablePage(player('1', '[[Erwin Mulder]]')))).toBe(
      'the table of the section Selectie has a player above the first heading',
    )
  })

  it('gives an error for a shirt number we do not know', () => {
    expect(problemOf(tablePage(heading('Keepers'), player('eerste', '[[Erwin Mulder]]')))).toBe(
      "a row of the table Selectie has a shirt number we do not know: 'eerste'",
    )
    expect(problemOf(tablePage(heading('Keepers'), player('100', '[[Erwin Mulder]]')))).toBe(
      "a row of the table Selectie has a shirt number we do not know: '100'",
    )
  })

  it('gives an error for a row with too few cells', () => {
    expect(problemOf(tablePage(heading('Keepers'), '|-\n| 1 || [[Erwin Mulder]]'))).toBe(
      'a row of the table Selectie has 2 cells, not four or more',
    )
  })

  it('gives an error for a name we cannot use', () => {
    expect(problemOf(tablePage(heading('Keepers'), player('1', '[[Erwin Mulder]] {{ref}}')))).toBe(
      "a row of the section Selectie has no usable name: 'Erwin Mulder {{ref}}'",
    )
  })

  it('gives an error for a table with columns we do not know', () => {
    expect(
      problemOf('== Selectie ==\n{| class="wikitable"\n!Speler\n!Positie\n|-\n| [[Erwin Mulder]] || Keeper\n|}'),
    ).toBe('the table of the section Selectie has columns we do not know')
  })

  it('gives an error for a section without a list or a table', () => {
    expect(problemOf('== Selectie ==\nDe selectie volgt later.')).toBe('the section Selectie has no list and no table')
  })

  it('gives an error for a table without players', () => {
    expect(problemOf(tablePage(heading('Keepers')))).toBe('the section Selectie has no players')
  })
})
