import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import type { SeasonPlayer, SeasonSquad } from './season-squad.ts'

import { englishWikipediaOrigin } from './import-matches.ts'
import { englishSquadPage, englishSquadSeasons, readEnglishSquad } from './read-english-squad.ts'
import { pageUrl } from './read-wikipedia.ts'

// Small copies of the real pages of the English Wikipedia: 2018/19 (a squad), 2019/20 (only
// transfers), 2020/21 and 2021/22 (a squad, a list of players on loan and tables of transfers
// that are empty) and 2024/25 (a squad and transfers).
function fixture(season: string): string {
  return readFileSync(new URL(`./fixtures/wikipedia-english-squad-${season}.wiki`, import.meta.url), 'utf8')
}

function problemOf(text: string): string {
  const squad: SeasonSquad = readEnglishSquad(text)

  if (squad.kind !== 'error') {
    throw new Error(`The page gave no error: ${squad.kind}`)
  }

  return squad.message
}

function readPlayers(text: string): SeasonPlayer[] {
  const squad = readEnglishSquad(text)

  if (squad.kind !== 'read') {
    throw new Error(`The page was not read: ${JSON.stringify(squad)}`)
  }

  return squad.players
}

/** What a player of these pages looks like: a name, no page, and no matches or goals. */
function seen(
  name: string,
  position: SeasonPlayer['position'],
  shirtNumber: null | number,
  country: null | string = null,
  englishPage: null | string = name,
): SeasonPlayer {
  return { appearances: null, country, englishPage, goals: null, name, page: null, position, shirtNumber }
}

/** A page with a squad of the given templates. */
function squadPage(...lines: string[]): string {
  return ['==Players==', '===First-team squad===', '{{Fs start}}', ...lines, '{{Fs end}}'].join('\n')
}

describe('readEnglishSquad', () => {
  it('reads the squad of 2018/19 with the numbers and the positions', () => {
    const squad = readEnglishSquad(fixture('2018-19'))

    expect(squad).toMatchObject({
      appearancesTotal: null,
      goalsTotal: null,
      kind: 'read',
      source: 'engels',
      warnings: [],
    })
    expect(readPlayers(fixture('2018-19'))).toEqual([
      seen('Warner Hahn', 'doelman', 1, 'NL'),
      seen('Daniel Høegh', 'verdediger', 3, 'DK'),
      seen('Michel Vlap', 'verdediger', 18, 'NL'),
      seen('Yuki Kobayashi', 'middenvelder', 21, 'JP', 'Yuki Kobayashi (footballer, born 1992)'),
      seen('Jan Bekkema', 'doelman', 31, 'NL', null),
      seen('Arbër Zeneli', 'middenvelder', null, 'XK'),
      seen('Jan de Boer', 'doelman', null, 'NL', 'Jan de Boer (footballer, born 2000)'),
      seen('Nicolai Næss', 'verdediger', null, 'NO'),
    ])
  })

  it('gives a name and no page, so no player of the Dutch Wikipedia is linked', () => {
    for (const player of readPlayers(fixture('2018-19'))) {
      expect(player.page).toBeNull()
    }
  })

  it('does not take the scorers after the squad for players', () => {
    expect(readPlayers(fixture('2018-19')).map((player) => player.name)).not.toContain('Sam Lammers')
  })

  it('reads 2019/20, which has only transfers: who came, was loaned out or left in the winter', () => {
    expect(readPlayers(fixture('2019-20'))).toEqual([
      seen('Hicham Faik', 'middenvelder', null, null),
      seen('Jens Odgaard', 'aanvaller', null, null),
      seen('Emil Frederiksen', 'middenvelder', null, null),
      seen('Andreas Skovgaard', 'verdediger', null, null),
    ])
  })

  it('reads 2020/21 with the notes after a name and the player out on loan, and an unfilled template', () => {
    expect(readPlayers(fixture('2020-21'))).toEqual([
      seen('Erwin Mulder', 'doelman', 1, 'NL'),
      seen('Jan Paul van Hecke', 'verdediger', 3, 'NL'),
      seen('Joaquín Fernández', 'verdediger', 4, 'UY', 'Joaquín Fernández Pertusso'),
      seen('Henk Veerman', 'aanvaller', 9, 'NL'),
      seen('Jaimy Kroesen', 'doelman', 24, 'NL', null),
      seen('Paweł Bochniewicz', 'verdediger', 25, 'PL'),
      seen('Runar Espejord', 'aanvaller', null, 'NO'),
    ])
  })

  it('reads 2021/22 with the parameters in another order and a player once who is on both lists', () => {
    expect(readPlayers(fixture('2021-22'))).toEqual([
      seen('Erwin Mulder', 'doelman', 1, 'NL'),
      seen('Filip Stevanović', 'aanvaller', 7, 'RS'),
      seen("Trustin van 't Loo", 'aanvaller', 37, 'NL'),
      seen('Joaquín Fernández', 'verdediger', null, 'UY', 'Joaquín Fernández (footballer, born 1999)'),
    ])
  })

  it('reads 2024/25 and puts a player of the squad and of the transfers on the list once', () => {
    const squad = readEnglishSquad(fixture('2024-25'))

    expect(readPlayers(fixture('2024-25'))).toEqual([
      seen('Jordy de Wijs', 'verdediger', 3, 'NL'),
      seen('Sam Kersten', 'verdediger', 4, 'NL'),
      seen('Luuk Brouwers', 'middenvelder', 8, 'NL'),
      seen('Hussein Ali', 'verdediger', 15, 'IQ', 'Hussein Ali (footballer, born 2002)'),
      seen('Jacob Trenskow', 'aanvaller', 20, 'DK'),
      seen('Mateja Milovanović', 'verdediger', 27, 'RS'),
      seen('Melle Witteveen', 'middenvelder', 32, 'NL', null),
      seen('Hristiyan Petrov', 'verdediger', null, null),
      seen('Dimitris Rallis', 'aanvaller', null, null),
    ])
    expect(squad).toMatchObject({
      kind: 'read',
      warnings: ["'Player Undated' is left out: the date of leaving is not one we can read"],
    })
  })

  it('leaves out a player who left in the summer, whatever the reason', () => {
    const names = readPlayers(fixture('2024-25')).map((player) => player.name)

    expect(names).not.toContain('Thom Haye')
    expect(names).not.toContain('Osame Sahraoui')
  })

  it('reads a page without a squad and with transfers from an unlinked name in a template', () => {
    const text = [
      '== Transfers ==',
      '=== In ===',
      '{| class="wikitable"',
      '!Pos.',
      '!Player',
      '!Date',
      '|-',
      '|FW',
      '|{{sort|Roos, Kees|{{flagicon|NED}} Kees Roos}}',
      '|{{dts|3 January 2025}}',
      '|}',
    ].join('\n')

    expect(readPlayers(text)).toEqual([seen('Kees Roos', 'aanvaller', null, null, null)])
  })

  it('gives none for a page without a squad and without transfers', () => {
    expect(readEnglishSquad("'''2022–23 SC Heerenveen season''' is a season.\n\n==Competitions==\n")).toEqual({
      kind: 'none',
      reason: 'the page has no squad and no transfers',
    })
  })

  it('gives none for a page whose transfers have no players', () => {
    expect(readEnglishSquad('==Transfers==\n===In===\n===Out===\n')).toEqual({
      kind: 'none',
      reason: 'the page has no squad and its transfers have no players',
    })
  })

  it('gives an error for a squad without a player we know', () => {
    expect(problemOf('==Players==\n===First-team squad===\n{{Fs start}}\n{{Fs end}}')).toBe(
      'the squad of the page has no players we know',
    )
  })

  it('gives an error for a squad that has become a table', () => {
    expect(problemOf('==Players==\n===First-team squad===\n{|\n|-\n|1||Name\n|}')).toBe(
      "the list 'First-team squad' is a table we do not know",
    )
  })

  it('gives an error for a template of the squad we do not know', () => {
    expect(problemOf(squadPage('{{Fs player|no=1|pos=GK|name=[[A B]]}}', '{{Fs coach|name=[[Ab Cd]]}}'))).toBe(
      "the list 'First-team squad' has a template we do not know",
    )
  })

  it('gives an error for a position, a shirt number or a name we do not know', () => {
    expect(problemOf(squadPage('{{Fs player|no=1|pos=CB|name=[[Ab Cd]]}}'))).toContain('a position we do not know')
    expect(problemOf(squadPage('{{Fs player|no=one|pos=GK|name=[[Ab Cd]]}}'))).toContain(
      'a shirt number we do not know',
    )
    expect(problemOf(squadPage('{{Fs player|no=0|pos=GK|name=[[Ab Cd]]}}'))).toContain('a shirt number we do not know')
    expect(problemOf(squadPage('{{Fs player|no=1|pos=GK}}'))).toContain('no usable name')
  })

  it('gives an error for a template that is never closed', () => {
    expect(problemOf(squadPage('{{Fs player|no=1|pos=GK|name=[[Ab Cd]]'))).toContain('has no end')
  })

  it('gives an error for a table of transfers without a column Player', () => {
    const text = '==Transfers==\n===In===\n{|\n!Pos.\n!Name\n|-\n|FW\n|[[Kees Roos]]\n|}'

    expect(problemOf(text)).toBe('a table of transfers has no column Player')
  })

  it('gives an error for a table of transfers under a heading we do not know', () => {
    const text = '==Transfers==\n===Rumours===\n{|\n!Player\n|-\n|[[Kees Roos]]\n|}'

    expect(problemOf(text)).toBe("the transfers have a table under a heading we do not know: 'Rumours'")
  })
})

describe('englishSquadPage', () => {
  it('names the page of the five seasons with an en dash, and no other', () => {
    expect(englishSquadSeasons()).toEqual(['2018/19', '2019/20', '2020/21', '2021/22', '2024/25'])
    expect(englishSquadPage('2018/19')).toBe('2018–19 SC Heerenveen season')
    expect(englishSquadPage('2024/25')).toBe('2024–25 SC Heerenveen season')
    expect(englishSquadPage('2022/23')).toBeUndefined()
    expect(englishSquadPage('2025/26')).toBeUndefined()
  })

  it('makes a request with only ?action=raw to the address of the English Wikipedia', () => {
    const title = englishSquadPage('2019/20') ?? ''

    expect(pageUrl(englishWikipediaOrigin, title)).toBe(
      'https://en.wikipedia.org/wiki/2019%E2%80%9320_SC_Heerenveen_season?action=raw',
    )
  })
})

describe('the country of a player', () => {
  const read = (...lines: string[]) => readEnglishSquad(squadPage(...lines))
  const player = (nat: string) => `{{Fs player|no=1|nat=${nat}|pos=GK|name=[[Ab Cd]]}}`

  it('turns the code of the football association into the code of the country', () => {
    expect(read(player('NED'))).toMatchObject({ players: [{ country: 'NL' }], warnings: [] })
    expect(read(player('JAP'))).toMatchObject({ players: [{ country: 'JP' }] })
    expect(read(player('kos'))).toMatchObject({ players: [{ country: 'XK' }] })
  })

  it('leaves the country empty, without a warning, when the template has no nat', () => {
    expect(read('{{Fs player|no=1|pos=GK|name=[[Ab Cd]]}}')).toMatchObject({
      players: [{ country: null }],
      warnings: [],
    })
    expect(read(player(''))).toMatchObject({ players: [{ country: null }], warnings: [] })
  })

  it.each([['ENG'], ['XYZ'], ['Netherlands']])('leaves the country empty, with a warning, for %s', (nat) => {
    expect(read(player(nat))).toMatchObject({
      players: [{ country: null, name: 'Ab Cd' }],
      warnings: [`Ab Cd: the country '${nat.toUpperCase()}' is not one we know, so it is left empty`],
    })
  })

  it('keeps the country of the squad when the same player is in the transfers too', () => {
    const text = [
      squadPage(player('NED')),
      '== Transfers ==',
      '=== In ===',
      '{| class="wikitable"',
      '!Pos.',
      '!Player',
      '!Date',
      '|-',
      '|GK',
      '|[[Ab Cd]]',
      '|{{dts|3 January 2025}}',
      '|}',
    ].join('\n')

    expect(readEnglishSquad(text)).toMatchObject({ players: [{ country: 'NL', name: 'Ab Cd' }] })
  })
})
