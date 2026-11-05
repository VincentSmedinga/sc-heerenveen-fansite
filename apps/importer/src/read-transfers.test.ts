import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import type { SeasonPlayer } from './season-squad.ts'

import { readSeasonScorers, readSeasonTransfers, transfersPageTitle } from './read-transfers.ts'

// Small copies of the real pages of eight seasons, one for each form the lists of transfers
// come in (see the top of `read-transfers.ts`). The page of 2006/07 is whole, the others have
// a few rows in each table.
function fixture(season: string): string {
  return readFileSync(new URL(`./fixtures/wikipedia-transfers-${season}.wiki`, import.meta.url), 'utf8')
}

function namesOf(text: string): string[] {
  const squad = readSeasonTransfers(text)

  if (squad.kind !== 'read') {
    throw new Error(`The page was not read: ${JSON.stringify(squad)}`)
  }

  return squad.players.map((player) => player.name)
}

/** A page with one heading and the given lines under it. */
function page(...lines: string[]): string {
  return ['==Transfers==', ...lines].join('\n')
}

/** A table of players in the shape of 2011/12: a first column Speler and one more. */
function table(...rows: string[]): string[] {
  return ['{| class="wikitable"', '! Speler', '! Nieuwe club', '|-', ...rows.flatMap((row) => [row, '|-']), '|}']
}

describe('readSeasonTransfers', () => {
  it('reads 2006/07 with a heading for the summer and for the winter', () => {
    const squad = readSeasonTransfers(fixture('2006-07'))

    expect(squad).toMatchObject({ appearancesTotal: null, goalsTotal: null, kind: 'read', source: 'transfers' })
    expect(namesOf(fixture('2006-07'))).toEqual([
      // Summer, Nieuw
      'Afonso Alves',
      'Age Hains Boersma',
      'Michael Dingsdag',
      'Rob Friend',
      'Gonzalo García',
      'Will Johnson',
      'Robbie Rogers',
      'Danny Wintjens',
      'Gianni Zuiverloon',
      // Summer, Weg, only the two loans
      'Henrico Drost',
      'Sebastiaan Steur',
      // Winter, Nieuw
      'Rob van Dijk',
      'Calvin Jong-A-Pin',
      'Robin Huisman de Jong',
      'Cecilio Lopes',
      'Miralem Sulejmani',
      // Winter, Weg (Rob Friend is already there)
      'Reza Ghoochannejhad',
      'Abdelkarim Kissi',
      'Ken Ilsø Larsen',
      'Boy Waterman',
    ])
  })

  it('leaves out a player who left in the summer, unless he was loaned out', () => {
    const names = namesOf(fixture('2006-07'))

    // Left in the summer before the season.
    expect(names).not.toContain('Vincent van den Berg')
    expect(names).not.toContain('Arnold Bruggink')
    // Was loaned by Leicester City and loaned on to ADO: no loan of ours.
    expect(names).not.toContain('Mark de Vries')
    // Loaned out in the summer.
    expect(names).toContain('Henrico Drost')
  })

  it('counts a player once who is in two lists, and gives him no position or number', () => {
    const squad = readSeasonTransfers(fixture('2006-07'))

    if (squad.kind !== 'read') {
      throw new Error('The page was not read')
    }

    const friends = squad.players.filter((player) => player.name === 'Rob Friend')

    expect(friends).toEqual<SeasonPlayer[]>([
      { appearances: null, goals: null, name: 'Rob Friend', page: 'Rob Friend', position: null, shirtNumber: null },
    ])
    expect(squad.players.every((player) => player.position === null && player.shirtNumber === null)).toBe(true)
  })

  it('keeps the page of a player with the addition on it, and the name the link shows', () => {
    const squad = readSeasonTransfers(fixture('2006-07'))

    if (squad.kind !== 'read') {
      throw new Error('The page was not read')
    }

    expect(squad.players.find((player) => player.name === 'Will Johnson')?.page).toBe('Will Johnson (voetballer)')
    expect(squad.players.find((player) => player.name === 'Rob van Dijk')?.page).toBe('Rob van Dijk (voetballer)')
  })

  it('reads 2007/08, a table for each kind with the kind in its caption, and leaves out the departures', () => {
    expect(namesOf(fixture('2007-08'))).toEqual([
      // Aangetrokken spelers
      'Niek Loohuis',
      'Kristian Bak Nielsen',
      'Roy Beerens',
      'Mark Bloemendaal',
      'Harmen Kuperus',
      // Terugkerende spelers
      'Cecilio Lopes',
      'Henrico Drost',
      'Sebastiaan Steur',
      // Verhuurde spelers (Steur is already there)
      'Will Johnson',
      'Robbert Maruanaya',
      'Oguzhan Türk',
    ])
  })

  it('reads 2008/09 and leaves out the players of next season and the staff', () => {
    const names = namesOf(fixture('2008-09'))

    expect(names).toEqual([
      'Lesly Fellinga',
      'Pedro Beda',
      'Goran Popov',
      'Radosław Matusiak',
      // Verhuurd
      'Timmi Johansen',
      'Jeroen Drost',
      'Oguzhan Türk',
      'Niklas Tarvajärvi',
      'Cecilio Lopes',
    ])
    // Comes in January 2010.
    expect(names).not.toContain('Filip Đuričić')
  })

  it('reads 2008/09 without a departure, because its list does not tell the summer from the winter', () => {
    const names = namesOf(fixture('2008-09'))

    expect(names).not.toContain('Harmen Kuperus')
    expect(names).not.toContain('Mark Bloemendaal')
  })

  it('reads 2009/10, which has no difference between the summer and the winter either', () => {
    expect(namesOf(fixture('2009-10'))).toEqual([
      'Filip Đuričić',
      'Samir Fazli',
      'Martin Lejsal',
      'Hernán Losada',
      // Verhuurd
      'Xander Houtkoop',
      'Michel Poldervaart',
      'Hassan Bai Kamara',
      'Henrico Drost',
    ])
  })

  it('reads 2010/11, where the arrivals are one table and the departures have a column for each window', () => {
    const names = namesOf(fixture('2010-11'))

    // A player who returns from a loan is there.
    expect(names).toContain('Björn Jónsson')
    expect(names).toContain('Milan Kopic')
    // Left in the winter.
    expect(names).toContain('Michal Papadopulos')
    // Left in the summer.
    expect(names).not.toContain('Michael Dingsdag')
    expect(names).not.toContain('Gerald Sibon')
    // Loaned out in the summer and in the winter.
    expect(names).toContain('Richard Stolte')
    expect(names).toContain('Radovan Mitrovic')
  })

  it('reads 2011/12 with a column Zomer and a column Winter for each list', () => {
    const names = namesOf(fixture('2011-12'))

    expect(names).toEqual([
      'Sven Kums',
      'Pelé van Anholt',
      'Jurjan Wouda',
      'Enzo Huntink',
      'Youssef El Akchaoui',
      'Geert Arend Roorda',
      // Winter, Aangetrokken
      'Johnny de Vries',
      'Oussama Tannane',
      'Kristoffer Nordfeldt',
      // Winter, Vertrokken
      'Robin Eriksson',
      // Verhuur, summer
      'Richard Stolte',
      'Bart de Groot',
      // Verhuur, winter
      'René Oosterhof',
    ])
    // Left in the summer.
    expect(names).not.toContain('Kevin Stuhr-Ellegaad')
  })

  it('reads 2014/15, where a table can be empty', () => {
    const names = namesOf(fixture('2014-15'))

    expect(names).toContain('Daley Sinkgraven')
    expect(names).toContain('Jukka Raitala')
    expect(names).toContain('Pascal Huser')
    expect(names).not.toContain('Samir Fazli')
    expect(names).not.toContain('Alfreð Finnbogason')
  })

  it('reads 2017/18, where the winter tables have a row with nothing in it', () => {
    expect(namesOf(fixture('2017-18'))).toEqual([
      'Warner Hahn',
      'Daniel Høegh',
      'Marco Rojas',
      'Sam Lammers',
      'Maarten de Fockert',
      'Robert van Koesveld',
      'Caner Cavlan',
    ])
  })

  it('takes the first link of a row as the player, and the other links are clubs', () => {
    const text = page(
      '===Aangetrokken===',
      ...table('| {{NL-VLAG}} & {{ES-VLAG}} [[Gonzalo García]] || [[Heracles Almelo]] [[Twente]]'),
    )

    expect(namesOf(text)).toEqual(['Gonzalo García'])
  })

  it('takes the name a link shows, and the title of the page without the addition when it shows nothing else', () => {
    const text = page(
      '===Aangetrokken===',
      ...table(
        '| [[Paulo Henrique Carneiro Filho|Paulo Henrique]] || [[Atletico Mineiro]]',
        '| /[[Christian Kum]] || [[ADO Den Haag]]',
        '| [[Johan Cruijff (voetballer)]] || [[Ajax]]',
      ),
    )

    expect(namesOf(text)).toEqual(['Paulo Henrique', 'Christian Kum', 'Johan Cruijff'])
  })

  it('keeps a name without a link when it is a full name, and warns about one that is not', () => {
    const squad = readSeasonTransfers(
      page('===Aangetrokken===', ...table('| David Easmon || [[Ajax]]', '| v. Amersfoort || [[Almere City FC]]')),
    )

    expect(squad).toMatchObject({
      kind: 'read',
      players: [{ name: 'David Easmon', page: null }],
      warnings: ["'v. Amersfoort' is left out: the name is not linked and not a full name"],
    })
  })

  it('takes the window from a bold label, and a heading of a list ends it', () => {
    const text = page(
      '===Vertrokken===',
      "'''Zomer'''",
      ...table('| [[Een Zomer]] || [[Ajax]]'),
      "'''Winter'''",
      ...table('| [[Een Winter]] || [[Ajax]]'),
      '===Verhuur===',
      ...table('| [[Een Verhuur]] || [[Ajax]]'),
      '===Vertrokken===',
      ...table('| [[Een Vertrokken]] || [[Ajax]]'),
    )

    // The last list has no window, because the heading ended the bold label.
    expect(namesOf(text)).toEqual(['Een Winter', 'Een Verhuur'])
  })

  it('counts a departure of the summer when the row says he was loaned out', () => {
    const text = page(
      '===Vertrokken===',
      "'''Zomer'''",
      ...table('| [[Een Verhuurd]] || [[Ajax]] || Verhuurd', '| [[Een Gehuurd]] || [[Ajax]] || Was gehuurd'),
    )

    expect(namesOf(text)).toEqual(['Een Verhuurd'])
  })

  it('gives none for a page without the section, and for a section without a list', () => {
    expect(readSeasonTransfers('==Selectie==\n\nGeen lijst.')).toEqual({
      kind: 'none',
      reason: 'the page has no section Transfers or Mutaties',
    })
    expect(readSeasonTransfers(page('Er waren geen transfers.', '', '==Zie ook=='))).toEqual({
      kind: 'none',
      reason: 'the section Transfers has no list',
    })
  })

  it('stops at the next heading of the same level', () => {
    const text = [
      page('===Aangetrokken===', ...table('| [[Een Speler]] || [[Ajax]]')),
      '==Statistieken==',
      ...table('| [[Een Ander]] || 3'),
    ].join('\n')

    expect(namesOf(text)).toEqual(['Een Speler'])
  })

  describe('errors', () => {
    it('is an error for a heading it does not know', () => {
      expect(readSeasonTransfers(page('===Gevorderd===', ...table('| [[Een Speler]] || [[Ajax]]')))).toEqual({
        kind: 'error',
        message: "the section Transfers has a heading we do not know: 'Gevorderd'",
      })
    })

    it('is an error for a caption it does not know', () => {
      const text = page('{| class="wikitable"', '! Speler', '|+Gevorderd', '|-', '| [[Een Speler]]', '|}')

      expect(readSeasonTransfers(text)).toEqual({
        kind: 'error',
        message: "a table of transfers has a caption we do not know: 'Gevorderd'",
      })
    })

    it('is an error for a table without a heading above it', () => {
      expect(readSeasonTransfers(page(...table('| [[Een Speler]] || [[Ajax]]')))).toEqual({
        kind: 'error',
        message: 'a table of transfers has no heading above it',
      })
    })

    it('is an error for a table whose first column is not Speler or Naam', () => {
      const text = page('===Aangetrokken===', '{| class="wikitable"', '! Club', '|-', '| [[Ajax]]', '|}')

      expect(readSeasonTransfers(text)).toEqual({
        kind: 'error',
        message: 'a table of transfers does not have the column heading Speler or Naam',
      })
    })

    it('is an error for a row without a name next to cells with something in them', () => {
      expect(readSeasonTransfers(page('===Aangetrokken===', ...table('| || [[Ajax]]')))).toEqual({
        kind: 'error',
        message: 'a row of a table of transfers has no name',
      })
    })

    it('is an error for a name that is a template or a file', () => {
      expect(
        readSeasonTransfers(page('===Aangetrokken===', ...table('| {{Speler|naam=X}} || [[Ajax]]'))),
      ).toMatchObject({
        kind: 'error',
        message: expect.stringContaining('a row has no usable name'),
      })
      expect(
        readSeasonTransfers(page('===Aangetrokken===', ...table('| [[Bestand:Foto.jpg]] || [[Ajax]]'))),
      ).toMatchObject({
        kind: 'error',
        message: expect.stringContaining('a row has a link we do not know as a name'),
      })
    })

    it('is an error for a table that is not closed', () => {
      expect(
        readSeasonTransfers(page('===Aangetrokken===', '{| class="wikitable"', '! Speler', '|-', '| [[Een Speler]]')),
      ).toEqual({
        kind: 'error',
        message: 'a table in the section Transfers is not closed',
      })
    })

    it('is an error for lists that have no players at all', () => {
      expect(readSeasonTransfers(page('===Vertrokken===', ...table('| [[Een Speler]] || [[Ajax]]')))).toEqual({
        kind: 'error',
        message: 'the lists of transfers have no players',
      })
    })
  })
})

describe('readSeasonScorers', () => {
  it('reads the scorers of 2006/07 and adds up the goals of a player in more than one competition', () => {
    const squad = readSeasonScorers(fixture('2006-07'))

    expect(squad).toMatchObject({
      appearancesTotal: null,
      goalsTotal: 66,
      kind: 'read',
      source: 'doelpunten',
      warnings: [],
    })
    if (squad.kind !== 'read') {
      throw new Error('The page was not read')
    }
    expect(squad.players.map((player) => [player.name, player.goals])).toEqual([
      ['Afonso Alves', 37],
      ['Lasse Nilsson', 11],
      ['Rob Friend', 5],
      ['Petter Hansson', 4],
      ['Danijel Pranjić', 3],
      ['Paul Bosvelt', 1],
      ['Gonzalo García', 1],
      ['Will Johnson', 1],
      ['Niklas Tarvajärvi', 1],
      ['Uğur Yıldırım', 1],
      ['Gianni Zuiverloon', 1],
    ])
    expect(squad.players.every((player) => player.position === null && player.shirtNumber === null)).toBe(true)
  })

  it('leaves out the row Totaal and a competition without goals', () => {
    const names = (readSeasonScorers(fixture('2006-07')) as { players: SeasonPlayer[] }).players.map(
      (player) => player.name,
    )

    expect(names).not.toContain('Totaal')
    expect(names).toHaveLength(11)
  })

  it('gives none for a page without the section, or a section without a table', () => {
    expect(readSeasonScorers(fixture('2011-12'))).toEqual({
      kind: 'none',
      reason: 'the page has no section Doelpuntenmakers',
    })
    expect(readSeasonScorers('==Doelpuntenmakers==\nGeen doelpunten.')).toEqual({
      kind: 'none',
      reason: 'the section Doelpuntenmakers has no table',
    })
  })

  it('is an error for a table without the headings Naam and Doelpunten', () => {
    const text = [
      '==Doelpuntenmakers==',
      '{| class="wikitable"',
      '! Speler',
      '! Goals',
      '|-',
      '| [[Een Speler]] || 3',
      '|}',
    ].join('\n')

    expect(readSeasonScorers(text)).toEqual({
      kind: 'error',
      message: 'a table of scorers does not have the column headings Naam and Doelpunten',
    })
  })

  it('is an error for a number of goals that is not a number', () => {
    const text = [
      '==Doelpuntenmakers==',
      '{| class="wikitable"',
      '! Naam',
      '! Doelpunten',
      '|-',
      '| [[Een Speler]] || twee',
      '|}',
    ].join('\n')

    expect(readSeasonScorers(text)).toEqual({
      kind: 'error',
      message: "Een Speler has a number of goals we do not know: 'twee'",
    })
  })
})

describe('transfersPageTitle', () => {
  it('names the page of a season, with (mannen) from 2007/08 on', () => {
    expect(transfersPageTitle('2006/07')).toBe('Sc Heerenveen in het seizoen 2006/07')
    expect(transfersPageTitle('2011/12')).toBe('Sc Heerenveen in het seizoen 2011/12 (mannen)')
  })
})
