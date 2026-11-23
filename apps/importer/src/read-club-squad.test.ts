import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

import { readClubSquad } from './read-club-squad.ts'

const fixture = (name: string) => readFileSync(new URL(`./fixtures/${name}`, import.meta.url), 'utf8')

describe('reading the squad of another club', () => {
  it('reads the table under Selectie with the columns found by their headings', () => {
    const read = readClubSquad(fixture('wikipedia-club-squad.wiki'))

    expect(read).toEqual({
      kind: 'read',
      players: [
        { name: 'Karel Doelman', position: 'doelman', shirtNumber: 1, wikipediaPage: 'Karel Doelman' },
        {
          name: 'Jonas Stopper',
          position: 'verdediger',
          shirtNumber: 4,
          wikipediaPage: 'Jonas Stopper (voetballer, 1998)',
        },
        { name: 'Max Zonderartikel', position: 'middenvelder', shirtNumber: 8, wikipediaPage: null },
        { name: 'Aron Aanvaller', position: 'aanvaller', shirtNumber: null, wikipediaPage: 'Aron Aanvaller' },
      ],
      warnings: [],
    })
  })

  it('reads a table in the shape of our own, with group headings and no column headings', () => {
    const read = readClubSquad(
      [
        '=== Selectie ===',
        '{| class="wikitable"',
        '! colspan=3 | Keepers',
        '|-',
        '| 1 || {{Vlag|Nederland}} || [[Karel Doelman]]',
        '|-',
        '! colspan=3 | Verdedigers',
        '|-',
        '| 4 || {{Vlag|België}} || [[Jonas Stopper]]',
        '|}',
      ].join('\n'),
    )

    expect(read).toMatchObject({
      kind: 'read',
      players: [
        { name: 'Karel Doelman', position: 'doelman', shirtNumber: 1 },
        { name: 'Jonas Stopper', position: 'verdediger', shirtNumber: 4 },
      ],
    })
  })

  it('gives an error for an article without the section, and for a section without a table', () => {
    expect(readClubSquad(fixture('wikipedia-club-without-squad.wiki'))).toEqual({
      kind: 'error',
      message: 'the article has no section Selectie',
    })
    expect(readClubSquad('== Selectie ==\nAlleen tekst.\n\n== Stadion ==\n{|\n| 1 || x || [[Y]]\n|}')).toEqual({
      kind: 'error',
      message: 'the section Selectie has no table',
    })
  })

  it('warns about a row it cannot read, and errors when no row can be read', () => {
    const read = readClubSquad('== Selectie ==\n{|\n! Nr.\n! Naam\n|-\n| 1 || [[Karel Doelman]]\n|-\n| 2 || {{x}}\n|}')

    expect(read).toMatchObject({ kind: 'read', warnings: ['1 row of the table under Selectie could not be read'] })
    expect(readClubSquad('== Selectie ==\n{|\n! Nr.\n! Naam\n|-\n| 2 || {{x}}\n|}')).toMatchObject({ kind: 'error' })
  })
})
