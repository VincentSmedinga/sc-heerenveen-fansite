import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

import {
  oldSiteDataFolder,
  oldSiteFileVersion,
  oldSiteMaxBytes,
  parseOldSiteFile,
  readOldSiteData,
  readOldSiteFile,
} from './old-site-file.ts'

// Every field name the files may hold. A new name needs a person to add it here, and to check
// that it is no personal data: no birth date, e-mail, biography, contract, height, weight,
// photo or text of a report.
const allowedFieldNames = new Set([
  'assist',
  'attendance',
  'awayCorners',
  'awayFouls',
  'awayFullTime',
  'awayHalfTime',
  'awayOffside',
  'clubs',
  'code',
  'competition',
  'country',
  'dateTime',
  'event',
  'events',
  'firstName',
  'homeCorners',
  'homeFouls',
  'homeFullTime',
  'homeHalfTime',
  'homeOffside',
  'infix',
  'kind',
  'lastName',
  'lineup',
  'matches',
  'minute',
  'minuteIn',
  'minuteOut',
  'name',
  'note',
  'order',
  'playerCode',
  'playerName',
  'players',
  'referee',
  'result',
  'round',
  'season',
  'statistics',
  'version',
])

function collectNames(value: unknown, names = new Set<string>()) {
  if (Array.isArray(value)) {
    for (const item of value) {
      collectNames(item, names)
    }
  } else if (value !== null && typeof value === 'object') {
    for (const [name, item] of Object.entries(value)) {
      names.add(name)
      collectNames(item, names)
    }
  }

  return names
}

const folder = fileURLToPath(oldSiteDataFolder)

describe('the files of the old fansite in the repository', () => {
  it('only hold field names from the list of allowed names', async () => {
    const names = new Set<string>()

    for (const name of await readdir(folder)) {
      collectNames(JSON.parse(await readFile(path.join(folder, name), 'utf8')), names)
    }

    expect([...names].filter((name) => !allowedFieldNames.has(name))).toEqual([])
  })

  it('are together no bigger than 5 MB and have the version of the format', async () => {
    let bytes = 0

    for (const name of await readdir(folder)) {
      bytes += (await stat(path.join(folder, name))).size
      expect((await readOldSiteFile(path.join(folder, name))).version).toBe(oldSiteFileVersion)
    }
    expect(bytes).toBeLessThanOrEqual(oldSiteMaxBytes)
  })

  it('hold the 671 matches from 1 July 1990 to 29 April 2007, without the friendlies', async () => {
    const { matches } = await readOldSiteData()

    expect(matches).toHaveLength(671)
    expect(matches.some((match) => match.competition === 9)).toBe(false)
    expect(matches[0]?.dateTime).toBe('1990-08-25 19:30:00')
    expect(matches.at(-1)?.dateTime).toBe('2007-04-29 14:30:00')
    expect(matches.reduce((sum, match) => sum + match.events.length, 0)).toBe(3245)
    expect(matches.reduce((sum, match) => sum + match.lineup.length, 0)).toBe(14546)
  })

  it('give every opponent a club', async () => {
    const { clubs, matches } = await readOldSiteData()
    const codes = new Set(clubs.map((club) => club.code))

    expect(matches.filter((match) => !codes.has(match.code.split('.')[0] ?? ''))).toEqual([])
  })

  it('are written for the friendlies in a Markdown file with one row for each match', async () => {
    const markdown = await readFile(new URL('../../../docs/oefenwedstrijden-2002-03.md', import.meta.url), 'utf8')

    expect(markdown.split('\n').filter((line) => /^\| \d+ \w+ 2002 /.test(line))).toHaveLength(9)
  })
})

describe('parseOldSiteFile', () => {
  const clubs = { clubs: [{ code: 'psv', country: 'NL', name: 'PSV' }], version: 1 }

  it('reads a file that fits the format', () => {
    expect(parseOldSiteFile(JSON.stringify(clubs))).toEqual(clubs)
  })

  it('refuses text that is not JSON', () => {
    expect(() => parseOldSiteFile('{', 'clubs.json')).toThrow('clubs.json is not JSON.')
  })

  it('refuses another version', () => {
    expect(() => parseOldSiteFile(JSON.stringify({ ...clubs, version: 2 }), 'clubs.json')).toThrow(
      'clubs.json does not match',
    )
  })

  it('refuses a field that the format does not have', () => {
    const player = { birthDate: '1970-01-01', code: 'a.b', firstName: 'A', infix: null, lastName: 'B' }

    expect(() => parseOldSiteFile(JSON.stringify({ players: [player], version: 1 }), 'players.json')).toThrow(
      'players.json does not match',
    )
  })

  it('refuses a match with a field of a report', () => {
    const match = {
      attendance: null,
      code: 'psv.thuis',
      competition: 1,
      dateTime: '1990-09-23 14:30:00',
      events: [],
      lineup: [],
      note: null,
      referee: null,
      report: 'De wedstrijd begon rustig.',
      result: { awayFullTime: 0, awayHalfTime: 0, homeFullTime: 1, homeHalfTime: 0, note: null },
      round: 5,
      season: '9091',
      statistics: { awayCorners: 0, awayFouls: 0, awayOffside: 0, homeCorners: 0, homeFouls: 0, homeOffside: 0 },
    }

    expect(() =>
      parseOldSiteFile(JSON.stringify({ matches: [match], season: '9091', version: 1 }), 'matches-9091.json'),
    ).toThrow('matches-9091.json does not match')
  })
})
