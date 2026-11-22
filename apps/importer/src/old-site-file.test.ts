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
  'answers',
  'assist',
  'attendance',
  'average',
  'away',
  'awayCorners',
  'awayFouls',
  'awayFullTime',
  'awayHalfTime',
  'awayOffside',
  'clubs',
  'coachCode',
  'coachRatings',
  'code',
  'competition',
  'correct',
  'count',
  'country',
  'dateTime',
  'event',
  'events',
  'firstName',
  'fullTime',
  'halfTime',
  'home',
  'homeCorners',
  'homeFouls',
  'homeFullTime',
  'homeHalfTime',
  'homeOffside',
  'infix',
  'kind',
  'lastName',
  'line',
  'lineup',
  'matchCode',
  'matches',
  'minute',
  'minuteIn',
  'minuteOut',
  'month',
  'months',
  'name',
  'note',
  'omitted',
  'order',
  'participants',
  'percentages',
  'playerCode',
  'playerName',
  'players',
  'predictions',
  'questions',
  'ratings',
  'referee',
  'result',
  'round',
  'season',
  'seasonRatings',
  'spread',
  'statistics',
  'text',
  'version',
  'year',
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
  const clubs = { clubs: [{ code: 'psv', country: 'NL', name: 'PSV' }], version: 3 }

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
    const player = {
      birthDate: '1970-01-01',
      code: 'a.b',
      country: null,
      firstName: 'A',
      infix: null,
      lastName: 'B',
      line: null,
    }

    expect(() => parseOldSiteFile(JSON.stringify({ players: [player], version: 3 }), 'players.json')).toThrow(
      'players.json does not match',
    )
  })

  it('reads the country of a player as two capitals or null, and refuses anything else (#1052)', () => {
    const player = { code: 'a.b', country: 'VS', firstName: 'A', infix: null, lastName: 'B', line: null }
    const file = (country: unknown) => JSON.stringify({ players: [{ ...player, country }], version: 3 })

    expect(parseOldSiteFile(file('VS'))).toEqual({ players: [player], version: 3 })
    expect(parseOldSiteFile(file(null))).toEqual({ players: [{ ...player, country: null }], version: 3 })
    for (const wrong of ['vs', 'USA', '', 'Nederland']) {
      expect(() => parseOldSiteFile(file(wrong), 'players.json')).toThrow('players.json does not match')
    }
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
      parseOldSiteFile(JSON.stringify({ matches: [match], season: '9091', version: 3 }), 'matches-9091.json'),
    ).toThrow('matches-9091.json does not match')
  })
})

describe('the predictions in the repository (#1457)', () => {
  const total = (list: { count: number }[]) => list.reduce((sum, score) => sum + score.count, 0)

  it('count 17,119 predictions in 254 matches, the same in full-time and half-time scores', async () => {
    const { predictions } = await readOldSiteData()

    expect(predictions).toHaveLength(254)
    expect(predictions.reduce((sum, one) => sum + total(one.fullTime), 0)).toBe(17_119)
    for (const one of predictions) {
      expect(total(one.halfTime)).toBe(total(one.fullTime))
    }
  })

  it('have the known counts of a handful of matches, checked against the old database', async () => {
    const { predictions } = await readOldSiteData()
    const of = (season: string, code: string) =>
      predictions.find((one) => one.season === season && one.matchCode === code)

    // Visitors with an account and, in 2001/02, those from before the accounts.
    expect(total(of('0102', 'ajax.thuis')?.fullTime ?? [])).toBe(76)
    expect(total(of('0102', 'ajax.uit')?.fullTime ?? [])).toBe(86)
    expect(total(of('0304', 'liersesk.thuis')?.fullTime ?? [])).toBe(60)
    expect(total(of('0607', 'willemii.uit')?.fullTime ?? [])).toBe(9)
    expect(of('0102', 'ajax.uit')?.fullTime).toContainEqual({ away: 1, count: 9, home: 0 })
    expect(of('0102', 'ajax.uit')?.fullTime).toContainEqual({ away: 1, count: 11, home: 1 })
  })
})

describe('the files with the predictions (#1457)', () => {
  const prediction = {
    fullTime: [
      { away: 0, count: 14, home: 2 },
      { away: 1, count: 8, home: 1 },
    ],
    halfTime: [{ away: 0, count: 22, home: 1 }],
    matchCode: 'psv.thuis',
  }
  const file = { predictions: [prediction], season: '0102', version: 3 }

  it('read a file with the counts per score', () => {
    expect(parseOldSiteFile(JSON.stringify(file))).toEqual(file)
  })

  it('refuse a field with a name, an address, a time or a visitor, and a count of zero', () => {
    for (const extra of [
      { name: 'Jan' },
      { email: 'jan@example.com' },
      { dateTime: '2001-09-01 20:00:00' },
      { visitor: 'x' },
    ]) {
      expect(() => parseOldSiteFile(JSON.stringify({ ...file, predictions: [{ ...prediction, ...extra }] }))).toThrow(
        'does not match',
      )
      expect(() =>
        parseOldSiteFile(
          JSON.stringify({
            ...file,
            predictions: [{ ...prediction, fullTime: [{ away: 0, count: 1, home: 1, ...extra }] }],
          }),
        ),
      ).toThrow('does not match')
    }
    expect(() =>
      parseOldSiteFile(
        JSON.stringify({ ...file, predictions: [{ ...prediction, fullTime: [{ away: 0, count: 0, home: 1 }] }] }),
      ),
    ).toThrow('does not match')
  })
})

describe('the files with the ratings (#1465)', () => {
  const rating = { average: 7.4, count: 5, matchCode: 'psv.thuis', playerCode: 'hans.vonk', spread: 1.02 }
  const coachRating = { average: 6.8, coachCode: 'foppe.dehaan', count: 40, matchCode: 'psv.thuis', spread: 1.3 }
  const ratings = { coachRatings: [coachRating], ratings: [rating], season: '0102', version: 3 }
  const seasons = {
    seasonRatings: [{ average: 7.1, playerCode: 'hans.vonk', season: '9899' }],
    version: 3,
  }

  it('read a file with the averages and a file with the season ratings', () => {
    expect(parseOldSiteFile(JSON.stringify(ratings))).toEqual(ratings)
    expect(parseOldSiteFile(JSON.stringify(seasons))).toEqual(seasons)
  })

  it('refuse a rating with a field more, such as a name, a time or a visitor', () => {
    for (const extra of [{ visitor: 'Olaf' }, { name: 'Olaf' }, { dateTime: '2001-11-15 01:05:34' }, { user: 1 }]) {
      expect(() => parseOldSiteFile(JSON.stringify({ ...ratings, ratings: [{ ...rating, ...extra }] }))).toThrow(
        /does not match the format/,
      )
    }
    expect(() => parseOldSiteFile(JSON.stringify({ ...ratings, visitors: [] }))).toThrow(/does not match the format/)
    for (const extra of [{ visitor: 'Olaf' }, { name: 'Foppe de Haan' }, { dateTime: '2001-11-15 01:05:34' }]) {
      expect(() =>
        parseOldSiteFile(JSON.stringify({ ...ratings, coachRatings: [{ ...coachRating, ...extra }] })),
      ).toThrow(/does not match the format/)
    }
    expect(() =>
      parseOldSiteFile(JSON.stringify({ ...seasons, seasonRatings: [{ ...seasons.seasonRatings[0], votes: 3 }] })),
    ).toThrow(/does not match the format/)
    // The site works out the Uitblinker of the year: a list of names is not part of the file.
    expect(() => parseOldSiteFile(JSON.stringify({ ...seasons, winners: [] }))).toThrow(/does not match the format/)
  })

  it('refuse a grade outside 1 to 10, a count of zero and a negative spread', () => {
    for (const wrong of [{ average: 0.5 }, { average: 10.5 }, { count: 0 }, { spread: -1 }]) {
      expect(() => parseOldSiteFile(JSON.stringify({ ...ratings, ratings: [{ ...rating, ...wrong }] }))).toThrow(
        /does not match the format/,
      )
    }
  })

  it('are read with the data, each rating with the season of its file', async () => {
    const data = await readOldSiteData()
    const keys = new Set(data.matches.map((match) => `${match.season}/${match.code}`))

    expect(data.ratings.length).toBeGreaterThan(2000)
    expect(data.ratings.every((one) => keys.has(`${one.season}/${one.matchCode}`))).toBe(true)
    expect(data.coachRatings.length).toBeGreaterThan(200)
    expect(data.coachRatings.every((one) => keys.has(`${one.season}/${one.matchCode}`))).toBe(true)
    expect(new Set(data.coachRatings.map((one) => one.coachCode))).toEqual(new Set(['foppe.dehaan', 'gertjan.verbeek']))
    expect(data.seasonRatings.map((one) => one.season).filter((season, i, all) => all.indexOf(season) === i)).toEqual([
      '0001',
      '9899',
      '9900',
    ])
  })
})

describe('the file with the Fantest (#1480)', () => {
  const question = {
    answers: ['Ajax', 'Feyenoord', 'Sunderland', 'Newcastle United'],
    correct: 2,
    order: 1,
    percentages: [10, 20, 60, 10],
    text: 'Naar welke club vertrok Jon Dahl Tomasson?',
  }
  const month = { average: 4.1, month: 5, omitted: 0, participants: 38, questions: [question], year: 2003 }
  const file = (extra: Record<string, unknown> = {}, questionExtra: Record<string, unknown> = {}) =>
    JSON.stringify({
      months: [{ ...month, ...extra, questions: [{ ...question, ...questionExtra }] }],
      version: 3,
    })

  it('reads a month with its questions and the percentages per answer', () => {
    expect(parseOldSiteFile(file(), 'fantest.json')).toEqual({ months: [month], version: 3 })
  })

  it('refuses a field with a name, an address, a time or the answers of a visitor', () => {
    for (const extra of [
      { name: 'Tjalle99' },
      { email: 'a@b.nl' },
      { dateTime: '2003-05-01 20:00:00' },
      { scores: [3] },
    ]) {
      expect(() => parseOldSiteFile(file(extra), 'fantest.json')).toThrow('fantest.json does not match')
    }
    for (const extra of [{ answeredBy: 'Tjalle99' }, { introduction: 'Welkom' }]) {
      expect(() => parseOldSiteFile(file({}, extra), 'fantest.json')).toThrow('fantest.json does not match')
    }
  })

  it('refuses a question without four answers or with a right answer outside them', () => {
    expect(() => parseOldSiteFile(file({}, { answers: ['a', 'b', 'c'] }), 'fantest.json')).toThrow('does not match')
    expect(() => parseOldSiteFile(file({}, { correct: 4 }), 'fantest.json')).toThrow('does not match')
  })

  it('has 42 months with 418 questions in the repository, and none in 2001 before December', async () => {
    const { fantest } = await readOldSiteData()

    expect(fantest).toHaveLength(42)
    expect(fantest.reduce((sum, one) => sum + one.questions.length, 0)).toBe(418)
    expect(fantest[0]).toMatchObject({ month: 12, year: 2001 })
    expect(fantest.some((one) => one.year === 2003 && (one.month === 7 || one.month === 8))).toBe(false)
  })
})
