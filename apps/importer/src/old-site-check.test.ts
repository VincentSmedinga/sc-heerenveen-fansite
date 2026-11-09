import type { TestDatabase } from '@fansite/db/test-database'

import { clubs } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { OldSiteData, OldSiteEvent, OldSiteLineupEntry, OldSiteMatch } from './old-site-file.ts'

import { oldSiteSteps } from './import-old-site.ts'
import { buildOldSiteCheck, describeNotice, dutchDate, formatOldSiteCheck } from './old-site-check.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

const words = ['aap', 'bes', 'cas', 'dik', 'eef', 'fok', 'gijs', 'hup', 'ivo', 'jan', 'kor']
const ourCode = (index: number) => `${words[index]}.speler`
const theirName = (index: number) => `Tegen ${words[index]}`

/** Eleven players of ours and eleven of the opponent, all on the pitch for ninety minutes. */
const fullLineup = (ours = 11): OldSiteLineupEntry[] =>
  words.flatMap((_, index) => [
    ...(index < ours
      ? [{ minuteIn: 0, minuteOut: 90, order: index + 1, playerCode: ourCode(index), playerName: null }]
      : []),
    { minuteIn: 0, minuteOut: 90, order: index + 1, playerCode: null, playerName: theirName(index) },
  ])

const event = (
  kind: 1 | 2 | 3 | 4,
  minute: number,
  who: { code?: string; name?: string },
  more: Partial<OldSiteEvent> = {},
) => ({
  assist: null,
  event: kind,
  kind: null,
  minute,
  playerCode: who.code ?? null,
  playerName: who.name ?? null,
  ...more,
})

const noStatistics = { awayCorners: 0, awayFouls: 0, awayOffside: 0, homeCorners: 0, homeFouls: 0, homeOffside: 0 }

function oldMatch(overrides: Partial<OldSiteMatch> = {}): OldSiteMatch {
  return {
    attendance: null,
    code: 'nec.thuis',
    competition: 1,
    dateTime: '2001-09-01 20:00:00',
    events: [],
    lineup: [],
    note: null,
    referee: null,
    result: { awayFullTime: 0, awayHalfTime: 0, homeFullTime: 0, homeHalfTime: 0, note: null },
    round: 1,
    season: '0102',
    statistics: { ...noStatistics },
    ...overrides,
  }
}

const score = (home: number, away: number) => ({
  awayFullTime: away,
  awayHalfTime: 0,
  homeFullTime: home,
  homeHalfTime: 0,
  note: null,
})

/** NEC (with dots in the database), Cambuur under another name, and Ajax, which is new. */
const oldClubs = [
  { code: 'nec', country: 'NL', name: 'NEC' },
  { code: 'ajax', country: 'NL', name: 'Ajax' },
  { code: 'cambuurleeuwarden', country: 'NL', name: 'Cambuur Lwd.' },
]

/** Four matches: a good report, a report with ten players, a score without goals, a trainer. */
const matchesOfTheSeason = [
  oldMatch({
    attendance: 12_000,
    events: [
      event(1, 10, { code: ourCode(8) }),
      event(1, 30, { name: theirName(9) }),
      event(1, 80, { code: ourCode(9) }, { assist: ourCode(8) }),
      event(2, 0, { code: ourCode(2) }),
    ],
    lineup: fullLineup(),
    note: 'Datum klopt niet',
    referee: 'Jansen',
    result: score(2, 1),
    statistics: { ...noStatistics, homeCorners: 5 },
  }),
  oldMatch({
    code: 'ajax.thuis',
    dateTime: '2001-09-08 21:00:00',
    events: [event(1, 10, { code: ourCode(8) })],
    lineup: fullLineup(10),
    result: score(1, 0),
  }),
  oldMatch({ code: 'nec.uit', dateTime: '2001-09-15 00:00:00', result: score(1, 2) }),
  oldMatch({
    code: 'ajax.uit',
    dateTime: '2001-09-22 20:00:00',
    events: [event(1, 10, { code: ourCode(8) }, { assist: 'onbekend.speler' }), event(4, 70, { code: 'foppe.dehaan' })],
    lineup: fullLineup(),
    result: score(0, 1),
  }),
]

const dataOf = (list: OldSiteMatch[]): OldSiteData => ({ clubs: oldClubs, matches: list, players: [] })

/** Runs every step of the import on the data, in their order. */
async function importAll(data: OldSiteData) {
  for (const step of oldSiteSteps) {
    await database.db.transaction((transaction) =>
      step.run(transaction, data, { titles: async () => ({ kind: 'missing' }) }),
    )
  }
}

const tables = [
  'clubs',
  'club_names',
  'matches',
  'match_edits',
  'match_statistics',
  'match_goals',
  'match_reports',
  'match_appearances',
  'match_cards',
  'match_substitutions',
  'players',
]

/** The number of rows in every table the import writes to. */
async function rowCounts() {
  const counts: Record<string, number> = {}

  for (const table of tables) {
    const [rows] = await database.pool.query(`SELECT COUNT(*) AS total FROM ${table}`)

    counts[table] = Number((rows as { total: number }[])[0]?.total)
  }

  return counts
}

beforeEach(async () => {
  for (const table of ['match_edits', 'match_statistics', 'matches', 'players', 'club_names', 'clubs']) {
    await database.pool.query(`DELETE FROM ${table}`)
  }
  await database.db.insert(clubs).values([
    { name: 'N.E.C.', slug: 'nec', wikipediaPage: 'N.E.C.' },
    { name: 'SC Cambuur', slug: 'sc-cambuur', wikipediaPage: 'SC Cambuur' },
  ])
})

describe('the check report', () => {
  it('counts the matches of a season in a table', async () => {
    const data = dataOf(matchesOfTheSeason)

    await importAll(data)

    const check = await buildOldSiteCheck(database.db, data)

    expect(check.seasons).toEqual([
      {
        dateOnly: 1,
        goalsAddUp: 3,
        goalsNone: 1,
        goalsPartial: 0,
        inDatabase: 4,
        inFile: 4,
        reportsBezig: 1,
        reportsKlaar: 2,
        season: '2001/02',
        withAttendance: 1,
        withLineup: 3,
        withReferee: 1,
        withStatistics: 1,
      },
    ])
    expect(check.total).toMatchObject({ inFile: 4, reportsBezig: 1, reportsKlaar: 2, season: 'Totaal' })
  })

  it('lists the reports that are bezig with the reason of the rule', async () => {
    await importAll(dataOf(matchesOfTheSeason))

    const check = await buildOldSiteCheck(database.db, dataOf(matchesOfTheSeason))

    expect(check.reportsBezig).toEqual([
      {
        match: { competition: 'Eredivisie', date: '2001-09-08', opponent: 'Ajax', season: '2001/02' },
        text: expect.stringContaining('regel `lineup-size`: De opstelling van sc Heerenveen heeft 10 spelers'),
      },
    ])
  })

  it('lists a goal list that does not add up, a remark, a card of the trainer and an assist without a player', async () => {
    await importAll(dataOf(matchesOfTheSeason))

    const check = await buildOldSiteCheck(database.db, dataOf(matchesOfTheSeason))

    expect(check.goals.map((item) => item.text)).toEqual(['uitslag 2-1, geen doelpunten in het bestand'])
    expect(check.goals[0]?.match).toEqual({
      competition: 'Eredivisie',
      date: '2001-09-15',
      opponent: 'NEC',
      season: '2001/02',
    })
    expect(check.remarks).toEqual([
      { copied: false, match: expect.objectContaining({ opponent: 'NEC' }), text: 'Datum klopt niet' },
    ])
    expect(check.cards.map((item) => item.text)).toEqual([
      'rode kaart voor foppe.dehaan: staat niet in de opstelling (de trainer of geen speler), weggelaten',
    ])
    expect(check.assists.map((item) => item.text)).toEqual([
      'assist van onbekend.speler bij het doelpunt van Ivo Speler (minuut 10): staat niet in de opstelling van het team, leeg gelaten',
    ])
    expect(check.yellowWithoutMinute).toBe(1)
  })

  it('lists the players whose name comes from their code, once for each code', async () => {
    await importAll(dataOf(matchesOfTheSeason))

    const check = await buildOldSiteCheck(database.db, dataOf(matchesOfTheSeason))

    // Eleven players, and the code of the assist, which has the shape of a code of ours.
    expect(check.players).toHaveLength(12)
    expect(check.players[0]).toEqual({ code: 'aap.speler', name: 'Aap Speler', seasons: ['2001/02'] })
  })

  it('tells a new club from a club linked to an existing one', async () => {
    await importAll(dataOf(matchesOfTheSeason))

    const check = await buildOldSiteCheck(database.db, dataOf(matchesOfTheSeason))

    expect(check.clubsNew).toEqual(['Ajax (ajax)'])
    expect(check.clubsLinked).toEqual(['Cambuur Lwd. (cambuurleeuwarden): club SC Cambuur'])
    // NEC is N.E.C. to the importer, which compares names without punctuation.
    expect(check.clubsSame).toBe(1)
    expect(check.clubsMissing).toEqual([])
  })

  it('lists a match of the files that is not in the database and a match of the database that is not in the files', async () => {
    await importAll(dataOf(matchesOfTheSeason))

    const extra = oldMatch({ code: 'ajax.uit', dateTime: '2001-10-06 20:00:00', result: score(3, 0) })
    const more = await buildOldSiteCheck(database.db, dataOf([...matchesOfTheSeason, extra]))

    expect(more.notInDatabase).toEqual([
      {
        match: { competition: 'Eredivisie', date: '2001-10-06', opponent: 'Ajax', season: '2001/02' },
        text: 'niet in de database als wedstrijd van de oude fansite',
      },
    ])
    expect(more.total.inFile).toBe(5)
    expect(more.total.inDatabase).toBe(4)

    const fewer = await buildOldSiteCheck(database.db, dataOf(matchesOfTheSeason.slice(0, 3)))

    expect(fewer.notInFile).toHaveLength(1)
    expect(fewer.notInFile[0]?.match).toMatchObject({ date: '2001-09-22', opponent: 'Ajax' })
  })

  it('lists a round of a league that has another number than the old fansite gave it', async () => {
    const season = Array.from({ length: 34 }, (_, index) =>
      oldMatch({
        dateTime: `2001-${index < 20 ? '09' : '10'}-${String((index % 20) + 1).padStart(2, '0')} 20:00:00`,
        // The old fansite numbered the tenth match of the season 3.
        round: index === 9 ? 3 : index + 1,
      }),
    )

    await importAll(dataOf(season))

    const check = await buildOldSiteCheck(database.db, dataOf(season))

    expect(check.rounds).toEqual([
      {
        match: expect.objectContaining({ date: '2001-09-10', opponent: 'NEC' }),
        text: 'de oude fansite had ronde 3, de database heeft ronde 10',
      },
    ])
  })

  it('writes nothing to the database', async () => {
    const data = dataOf(matchesOfTheSeason)

    await importAll(data)

    const before = await rowCounts()
    const edited = await database.pool.query('SELECT * FROM matches ORDER BY id')

    formatOldSiteCheck(await buildOldSiteCheck(database.db, data), '2026-11-08')
    // Also with a database that has not had the import: the report only reads.
    formatOldSiteCheck(await buildOldSiteCheck(database.db, dataOf([oldMatch({ code: 'ajax.thuis' })])), '2026-11-08')

    expect(await rowCounts()).toEqual(before)
    expect(await database.pool.query('SELECT * FROM matches ORDER BY id')).toEqual(edited)
  })
})

describe('the text of the report', () => {
  it('has an introduction, the table with a row for the total, and the lists', async () => {
    const data = dataOf(matchesOfTheSeason)

    await importAll(data)

    const text = formatOldSiteCheck(await buildOldSiteCheck(database.db, data), '2026-11-08')

    expect(text.startsWith('# Oude wedstrijden: wat ontbreekt of niet klopt\n')).toBe(true)
    expect(text).toContain('Gemaakt op 8 november 2026')
    expect(text).toContain('pnpm --silent import:old-site --report')
    expect(text).toContain('| Seizoen | Bestand | Database |')
    expect(text).toContain('| 2001/02 | 4 | 4 | 3 | 1 | 0 | 3 | 2 | 1 | 1 | 1 | 1 | 1 |')
    expect(text).toContain('| Totaal | 4 | 4 | 3 | 1 | 0 | 3 | 2 | 1 | 1 | 1 | 1 | 1 |')
    expect(text).toContain('- 2001/02, Eredivisie, 8 september 2001, Ajax: regel `lineup-size`')
    expect(text).toContain('- 2001/02, Eredivisie, 1 september 2001, NEC: Datum klopt niet (niet overgenomen)')
    expect(text).toContain('## Wedstrijden die niet in de database staan\n\nDe bestanden hebben')
    expect(text).toMatch(/## Wedstrijden die niet in de database staan[^#]*Geen\./u)
    expect(text.endsWith('\n')).toBe(true)
  })

  it('keeps one sentence to a line, also when a rule says two', async () => {
    const data = dataOf(matchesOfTheSeason)

    await importAll(data)

    const text = formatOldSiteCheck(await buildOldSiteCheck(database.db, data), '2026-11-08')

    for (const line of text.split('\n').filter((one) => !one.startsWith('|'))) {
      expect(line).not.toMatch(/[\da-z)`][.!?] \p{Lu}/u)
    }
  })

  it('writes a date and a notice in Dutch', () => {
    expect(dutchDate('1999-08-14')).toBe('14 augustus 1999')
    expect(describeNotice('early-exit', { minute: 40, subject: 'Aap Speler' })).toBe(
      'Aap Speler gaat in minuut 40 eruit zonder invaller en zonder rode kaart',
    )
    expect(describeNotice('yellow-derived', { kind: 'geel', subject: 'Bes Speler' })).toBe(
      'Bes Speler heeft een geel-rode kaart en geen gele kaart: de gele kaart is afgeleid, zonder minuut',
    )
    expect(describeNotice('red-card-without-minute', { kind: 'geel-rood', subject: 'Bes Speler' })).toBe(
      'geel-rode kaart voor Bes Speler: geen minuut en ook geen minuut van weggaan, weggelaten',
    )
  })
})
