import type { TestDatabase } from '@fansite/db/test-database'

import { adminUsers, clubs, matchEdits, matches, matchStatistics } from '@fansite/db/schema'
import { createTestDatabase } from '@fansite/db/test-database'
import { asc, eq, sql } from 'drizzle-orm'
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest'

import type { OldSiteMatch } from './old-site-file.ts'

import { importOldSiteClubs, oldSiteClubIds } from './old-site-clubs.ts'
import { readOldSiteData } from './old-site-file.ts'
import { deriveOldSiteMatches, importOldSiteMatches, oldSiteSeason, readResultNote } from './old-site-matches.ts'

let database: TestDatabase

beforeAll(async () => {
  database = await createTestDatabase()
})

afterAll(async () => {
  // Undefined when the server wasn't there, which beforeAll has already reported.
  await database?.drop()
})

const zeroStatistics = {
  awayCorners: 0,
  awayFouls: 0,
  awayOffside: 0,
  homeCorners: 0,
  homeFouls: 0,
  homeOffside: 0,
}

/** A match of the files: a league match at home that sc Heerenveen won 2-1. */
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
    result: { awayFullTime: 1, awayHalfTime: 0, homeFullTime: 2, homeHalfTime: 1, note: null },
    round: 1,
    season: '0102',
    statistics: { ...zeroStatistics },
    ...overrides,
  }
}

const goal = (minute: number, ours: boolean, kind: null | string = null) => ({
  assist: null,
  event: 1 as const,
  kind,
  minute,
  playerCode: ours ? 'jan.janssen' : null,
  playerName: ours ? null : 'Piet Pietersen',
})

/** The values of one match of the real files, by season and code. */
async function realMatch(season: string, code: string) {
  const { matches: all } = await readOldSiteData()
  const found = all.find((match) => match.season === season && match.code === code)

  if (found === undefined) {
    throw new Error(`${season} ${code} is not in the files`)
  }

  const [derived] = deriveOldSiteMatches([found])

  return derived!.values!
}

describe('the season and the remark of the result', () => {
  it('turns the code of the old database into a season', () => {
    expect(oldSiteSeason('9091')).toBe('1990/91')
    expect(oldSiteSeason('9900')).toBe('1999/00')
    expect(oldSiteSeason('0001')).toBe('2000/01')
    expect(oldSiteSeason('0607')).toBe('2006/07')
  })

  it('reads the remarks of the old editors that say how a match ended', () => {
    expect(readResultNote(null)).toEqual({ kind: 'none' })
    expect(readResultNote('*')).toEqual({ kind: 'none' })
    expect(readResultNote('n.v.')).toEqual({ kind: 'extra' })
    expect(readResultNote('3-2 n.v.')).toEqual({ away: 2, home: 3, kind: 'extra-score' })
    expect(readResultNote('5-3 n.s.')).toEqual({ away: 3, home: 5, kind: 'shootout' })
    expect(readResultNote('doorgegaan')).toEqual({ kind: 'unknown' })
  })
})

describe('the round', () => {
  const league = (count: number, overrides: Partial<OldSiteMatch> = {}) =>
    Array.from({ length: count }, (_, index) =>
      oldMatch({
        code: `club${index}.thuis`,
        dateTime: `2001-09-${String(index + 1).padStart(2, '0')} 20:00:00`,
        round: 1 + Math.floor(index / 2),
        ...overrides,
      }),
    )

  it('numbers a league season of 34 matches in the order of the date, whatever the old numbers are', () => {
    // The old numbers repeat (2000/01 has the rounds 7 to 10 twice), so they must not be used.
    const season = league(34).map((match, index) => ({ ...match, round: index < 8 ? 7 + (index % 4) : index }))
    const rounds = deriveOldSiteMatches(season.toReversed()).map((one) => one.values?.round)

    expect(rounds).toEqual(Array.from({ length: 34 }, (_, index) => `Speelronde ${index + 1}`))
  })

  it('does not copy a gap in the old numbers (1992/93 misses round 3)', () => {
    const season = league(34).map((match, index) => ({ ...match, round: index < 2 ? index + 1 : index + 2 }))
    const rounds = deriveOldSiteMatches(season).map((one) => one.values?.round)

    expect(rounds[2]).toBe('Speelronde 3')
    expect(new Set(rounds).size).toBe(34)
  })

  it('numbers a cup and every season that is not full as a match, even when the old number is zero', () => {
    const cup = league(3, { competition: 2, round: 0 })
    const short = league(4, { competition: 7, round: 0, season: '9192' }).map((match) => ({
      ...match,
      dateTime: match.dateTime.replace('2001', '1991'),
    }))
    const rounds = deriveOldSiteMatches([...cup, ...short]).map(
      (one) => `${one.values?.competition} ${one.values?.round}`,
    )

    expect(rounds).toEqual([
      'Eerste divisie Wedstrijd 1',
      'Eerste divisie Wedstrijd 2',
      'Eerste divisie Wedstrijd 3',
      'Eerste divisie Wedstrijd 4',
      'KNVB Beker Wedstrijd 1',
      'KNVB Beker Wedstrijd 2',
      'KNVB Beker Wedstrijd 3',
    ])
  })

  it('counts a season of its own for each competition', () => {
    const rounds = deriveOldSiteMatches([
      oldMatch({ code: 'a.thuis', competition: 2, dateTime: '2001-09-01 20:00:00' }),
      oldMatch({ code: 'b.thuis', competition: 6, dateTime: '2001-09-02 20:00:00' }),
      oldMatch({ code: 'c.thuis', competition: 2, dateTime: '2001-09-03 20:00:00' }),
    ]).map((one) => `${one.values?.competition} ${one.values?.round}`)

    expect(rounds).toEqual(['KNVB Beker Wedstrijd 1', 'UEFA Cup Wedstrijd 1', 'KNVB Beker Wedstrijd 2'])
  })
})

describe('home and away', () => {
  it.each([
    ['nec.thuis', true],
    ['nec.bekerthuis', true],
    ['nec.playoffthuis', true],
    ['nec.uit', false],
    ['nec.bekeruit', false],
    ['nec.playoffuit', false],
  ])('reads %s as home %s', (code, home) => {
    expect(deriveOldSiteMatches([oldMatch({ code })])[0]?.values?.home).toBe(home)
  })

  it('gives the score from the side of sc Heerenveen', () => {
    const [home] = deriveOldSiteMatches([oldMatch()])
    const [away] = deriveOldSiteMatches([oldMatch({ code: 'nec.uit' })])

    expect(home?.values).toMatchObject({ goalsAgainst: 1, goalsFor: 2 })
    expect(away?.values).toMatchObject({ goalsAgainst: 2, goalsFor: 1 })
  })

  it('skips a match whose code says nothing about home or away, and a competition it does not know', () => {
    const [odd, friendly] = deriveOldSiteMatches([
      oldMatch({ code: 'nec.neutraal' }),
      oldMatch({ competition: 9, dateTime: '2001-09-02 20:00:00' }),
    ])

    expect(odd?.skip).toContain('does not say whether')
    expect(friendly?.skip).toContain('competition code 9')
  })
})

describe('extra time and penalties', () => {
  it('reads the eight matches with a remark as the decision says', async () => {
    // Fortuna Sittard (away) and PSV: `n.v.`, the goal minutes give the score after 90 minutes.
    expect(await realMatch('9293', 'fortunasittard.bekeruit')).toMatchObject({
      afterNinetyAgainst: 0,
      afterNinetyFor: 0,
      extraTime: true,
      goalsAgainst: 0,
      goalsFor: 1,
    })
    expect(await realMatch('9293', 'psv.bekerthuis')).toMatchObject({
      afterNinetyAgainst: 1,
      afterNinetyFor: 1,
      extraTime: true,
      goalsAgainst: 1,
      goalsFor: 2,
    })
    // Cambuur and NAC 1994/95: the last goal of sc Heerenveen falls in minute 96 and 91.
    expect(await realMatch('9495', 'cambuurleeuwarden.bekerthuis')).toMatchObject({
      afterNinetyAgainst: 2,
      afterNinetyFor: 2,
      extraTime: true,
      goalsAgainst: 2,
      goalsFor: 3,
    })
    expect(await realMatch('9495', 'nac.bekerthuis')).toMatchObject({
      afterNinetyAgainst: 2,
      afterNinetyFor: 2,
      extraTime: true,
      goalsAgainst: 2,
      goalsFor: 3,
    })
    // `1-0 n.v.` away at Cambuur: 0-0 after 90 minutes, Cambuur scored in extra time.
    expect(await realMatch('9596', 'cambuurleeuwarden.bekeruit')).toMatchObject({
      afterNinetyAgainst: 0,
      afterNinetyFor: 0,
      extraTime: true,
      goalsAgainst: 1,
      goalsFor: 0,
    })
    // `3-2 n.v.` at home against TOP Oss: 2-2 after 90 minutes.
    expect(await realMatch('9697', 'toposs.bekerthuis')).toMatchObject({
      afterNinetyAgainst: 2,
      afterNinetyFor: 2,
      extraTime: true,
      goalsAgainst: 2,
      goalsFor: 3,
    })
    // `4-2 n.v.` away at Varteks: 2-1 for Varteks after 90 minutes, 4-2 after extra time.
    expect(await realMatch('9899', 'nkvarteksvarazdin.uit')).toMatchObject({
      afterNinetyAgainst: 2,
      afterNinetyFor: 1,
      extraTime: true,
      goalsAgainst: 4,
      goalsFor: 2,
    })
    // `5-3 n.s.` at home against Willem II: level after extra time, and the shoot-out.
    expect(await realMatch('0102', 'willemii.bekerthuis')).toMatchObject({
      afterNinetyAgainst: null,
      afterNinetyFor: null,
      extraTime: true,
      goalsAgainst: 0,
      goalsFor: 0,
      penaltiesAgainst: 3,
      penaltiesFor: 5,
    })
  })

  it('gives a match without a remark no extra time and no score after 90 minutes', async () => {
    expect(await realMatch('0001', 'fcutrecht.uit')).toMatchObject({
      afterNinetyAgainst: null,
      afterNinetyFor: null,
      extraTime: false,
      penaltiesAgainst: null,
      penaltiesFor: null,
    })
  })

  it('leaves the score after 90 minutes empty when the goals do not prove it', () => {
    const cup = { competition: 2, result: { ...oldMatch().result, note: 'n.v.' } }
    const [missing, unknownMinute, own] = deriveOldSiteMatches([
      oldMatch({ ...cup, code: 'a.thuis', events: [goal(10, true)] }),
      oldMatch({
        ...cup,
        code: 'b.thuis',
        dateTime: '2001-09-02 20:00:00',
        events: [goal(0, true), goal(100, true), goal(50, false)],
      }),
      oldMatch({
        ...cup,
        code: 'c.thuis',
        dateTime: '2001-09-03 20:00:00',
        events: [goal(10, true), goal(100, true, 'eigen doelpunt'), goal(50, false)],
      }),
    ])

    for (const one of [missing, unknownMinute, own]) {
      expect(one?.values).toMatchObject({ afterNinetyAgainst: null, afterNinetyFor: null, extraTime: true })
    }
  })

  it('does not give a league match extra time, and says so', () => {
    const [one] = deriveOldSiteMatches([oldMatch({ result: { ...oldMatch().result, note: 'n.v.' } })])

    expect(one?.values?.extraTime).toBe(false)
    expect(one?.lines.join('\n')).toContain('a league match has no extra time')
  })

  it('does not take a score after extra time that is lower than the score after 90 minutes', () => {
    const [one] = deriveOldSiteMatches([
      oldMatch({ competition: 2, result: { ...oldMatch().result, note: '1-0 n.v.' } }),
    ])

    expect(one?.values).toMatchObject({ extraTime: false, goalsAgainst: 1, goalsFor: 2 })
    expect(one?.lines).toHaveLength(1)
  })

  it('does not take a shoot-out of a match that was not level', () => {
    const [one] = deriveOldSiteMatches([
      oldMatch({ competition: 2, result: { ...oldMatch().result, note: '5-3 n.s.' } }),
    ])

    expect(one?.values).toMatchObject({ extraTime: false, penaltiesFor: null })
  })
})

describe('the kick-off', () => {
  const at = (dateTime: string) => deriveOldSiteMatches([oldMatch({ dateTime })])[0]!.values!

  it('is Amsterdam time, also around the change to summer time (25 March 2001)', () => {
    expect(at('2001-03-24 20:00:00').kickoffAt?.toISOString()).toBe('2001-03-24T19:00:00.000Z')
    expect(at('2001-03-25 20:00:00').kickoffAt?.toISOString()).toBe('2001-03-25T18:00:00.000Z')
  })

  it('is Amsterdam time, also around the change to winter time (28 October 2001)', () => {
    expect(at('2001-10-27 20:00:00').kickoffAt?.toISOString()).toBe('2001-10-27T18:00:00.000Z')
    expect(at('2001-10-28 20:00:00').kickoffAt?.toISOString()).toBe('2001-10-28T19:00:00.000Z')
  })

  it('keeps the local day as the date of the match, also late in the evening', () => {
    expect(at('2001-03-24 23:30:00')).toMatchObject({ dateText: null, matchDate: '2001-03-24' })
  })

  it('is empty for 00:00: the match has a date and no time', () => {
    expect(at('1991-11-08 00:00:00')).toMatchObject({ dateText: null, kickoffAt: null, matchDate: '1991-11-08' })
  })
})

describe('referee, attendance, remark and statistics', () => {
  it('takes the referee and the attendance, and reads empty and 0 as unknown', () => {
    const [known, unknown] = deriveOldSiteMatches([
      oldMatch({ attendance: 13_500, referee: 'Jan Wegereef' }),
      oldMatch({ attendance: 0, dateTime: '2001-09-02 20:00:00', referee: '  ' }),
    ])

    expect(known?.values).toMatchObject({ attendance: 13_500, referee: 'Jan Wegereef' })
    expect(unknown?.values).toMatchObject({ attendance: null, referee: null })
  })

  it('leaves out a referee or an attendance that the database does not take, and says so', () => {
    const [one] = deriveOldSiteMatches([oldMatch({ attendance: 150_001, referee: 'x'.repeat(101) })])

    expect(one?.values).toMatchObject({ attendance: null, referee: null })
    expect(one?.lines).toHaveLength(2)
  })

  it('keeps only the remarks that are a fact for a visitor', () => {
    const note = (text: null | string) => deriveOldSiteMatches([oldMatch({ note: text })])[0]!.values!.note

    expect(note('Debuut in Eredivisie')).toBe('Debuut in Eredivisie')
    expect(note('kwartfinale')).toBe('Kwartfinale')
    expect(note('begon later door file')).toBe('Begon later door file')
    expect(note('28 januari afgelast wegens sneeuw')).toBe('28 januari afgelast wegens sneeuw')
    for (const dropped of [
      'Datum klopt niet',
      'naar zondag als Uefa Cup',
      'was 14/9',
      '*',
      'Play-off',
      'http://members.tripod.com/~rodajc/',
      'olympia.fortunecity.com/lipinsky/524/',
      null,
    ]) {
      expect(note(dropped)).toBeNull()
    }
  })

  it('gives the statistics from the side of sc Heerenveen, and none when all six are 0', () => {
    const statistics = { ...zeroStatistics, awayCorners: 3, awayFouls: 12, homeCorners: 7, homeOffside: 2 }
    const [home, away, none] = deriveOldSiteMatches([
      oldMatch({ statistics }),
      oldMatch({ code: 'nec.uit', dateTime: '2001-09-02 20:00:00', statistics }),
      oldMatch({ code: 'x.uit', dateTime: '2001-09-03 20:00:00' }),
    ])

    expect(home?.statistics).toEqual({
      cornersAgainst: 3,
      cornersFor: 7,
      foulsAgainst: 12,
      foulsFor: 0,
      offsidesAgainst: 0,
      offsidesFor: 2,
    })
    expect(away?.statistics).toEqual({
      cornersAgainst: 7,
      cornersFor: 3,
      foulsAgainst: 0,
      foulsFor: 12,
      offsidesAgainst: 2,
      offsidesFor: 0,
    })
    expect(none?.statistics).toBeNull()
  })
})

describe('the step matches', () => {
  const oldClubs = [
    { code: 'nec', country: 'NL', name: 'NEC' },
    { code: 'ajax', country: 'NL', name: 'Ajax' },
  ]
  let adminId = 0

  beforeEach(async () => {
    for (const table of ['match_edits', 'match_statistics', 'matches', 'clubs', 'admin_users']) {
      await database.pool.query(`DELETE FROM ${table}`)
    }
    await database.pool.query("INSERT INTO admin_users (email, role) VALUES ('redactie@example.org', 'beheerder')")
    adminId = (await database.db.select().from(adminUsers))[0]?.id ?? 0
  })

  /** Runs the step on a list of matches with the clubs of `oldClubs`. */
  async function run(list: OldSiteMatch[]) {
    await importOldSiteClubs(database.db, oldClubs)

    return importOldSiteMatches(database.db, list, oldClubs, await oldSiteClubIds(database.db, oldClubs))
  }

  const rows = () => database.db.select().from(matches).orderBy(asc(matches.matchDate))

  it('makes the rows of a played match with its club, its source and its statistics', async () => {
    const report = await run([
      oldMatch({
        attendance: 13_500,
        referee: 'Jan Wegereef',
        statistics: { ...zeroStatistics, awayFouls: 9, homeCorners: 5 },
      }),
      oldMatch({ code: 'ajax.uit', dateTime: '2001-09-02 00:00:00' }),
    ])
    const [first, second] = await rows()
    const [nec] = await database.db.select().from(clubs).where(eq(clubs.name, 'NEC'))

    expect(report).toMatchObject({ changed: 0, created: 2, skipped: 0, unchanged: 0 })
    expect(first).toMatchObject({
      attendance: 13_500,
      clubId: nec?.id,
      competition: 'Eredivisie',
      dataSource: 'oude-fansite',
      goalsAgainst: 1,
      goalsFor: 2,
      home: true,
      opponent: 'NEC',
      referee: 'Jan Wegereef',
      round: 'Wedstrijd 1',
      season: '2001/02',
      stadium: null,
      status: 'played',
    })
    expect(first?.kickoffAt?.toISOString()).toBe('2001-09-01T18:00:00.000Z')
    expect(second).toMatchObject({ home: false, kickoffAt: null, matchDate: '2001-09-02', opponent: 'Ajax' })
    expect(await database.db.select().from(matchStatistics)).toEqual([
      {
        cornersAgainst: 0,
        cornersFor: 5,
        foulsAgainst: 9,
        foulsFor: 0,
        matchId: first?.id,
        offsidesAgainst: 0,
        offsidesFor: 0,
      },
    ])
  })

  it('changes nothing in a second run, and leaves the ids as they are', async () => {
    const list = [
      oldMatch({ statistics: { ...zeroStatistics, homeCorners: 5 } }),
      oldMatch({
        code: 'ajax.bekeruit',
        competition: 2,
        dateTime: '2001-09-02 20:00:00',
        result: { ...oldMatch().result, note: '5-3 n.s.' },
      }),
    ]

    await run(list)

    const before = { rows: await rows(), statistics: await database.db.select().from(matchStatistics) }
    const report = await run(list)

    expect(report).toMatchObject({ changed: 0, created: 0, skipped: 0, unchanged: 2 })
    expect({ rows: await rows(), statistics: await database.db.select().from(matchStatistics) }).toEqual(before)
  })

  it('updates a row of its own source when the file says something else', async () => {
    await run([oldMatch({ statistics: { ...zeroStatistics, homeCorners: 5 } })])

    const report = await run([oldMatch({ referee: 'Jan Wegereef', statistics: { ...zeroStatistics, homeCorners: 6 } })])

    expect(report).toMatchObject({ changed: 1, created: 0, unchanged: 0 })
    expect(report.lines.join('\n')).toContain('referee, statistics updated')
    expect((await rows())[0]?.referee).toBe('Jan Wegereef')
    expect((await database.db.select().from(matchStatistics))[0]?.cornersFor).toBe(6)
  })

  it('skips a match under the same key from Wikipedia, and says so', async () => {
    await run([])
    await importOldSiteClubs(database.db, oldClubs)

    const [club] = await database.db.select().from(clubs).limit(1)

    await database.db.insert(matches).values({
      clubId: club!.id,
      competition: 'Eredivisie',
      dataSource: 'wikipedia',
      goalsAgainst: 0,
      goalsFor: 3,
      home: true,
      kickoffAt: new Date('2001-09-01T18:00:00Z'),
      matchDate: '2001-09-01',
      opponent: 'N.E.C.',
      round: 'Wedstrijd 1',
      season: '2001/02',
      status: 'played',
    })

    const report = await run([oldMatch()])

    expect(report).toMatchObject({ created: 0, skipped: 1 })
    expect(report.lines.join('\n')).toContain('a match from wikipedia under the same key')
    expect(await rows()).toMatchObject([{ dataSource: 'wikipedia', goalsFor: 3, opponent: 'N.E.C.' }])
  })

  it('leaves the kick-off and the result that the editors filled in as they are', async () => {
    await run([oldMatch()])

    const [stored] = await rows()
    const edited = new Date('2001-09-01T17:00:00Z')

    await database.db
      .update(matches)
      .set({ goalsAgainst: 3, goalsFor: 3, kickoffAt: edited })
      .where(eq(matches.id, stored!.id))
    await database.db.insert(matchEdits).values({
      beforeGoals: '[]',
      beforeMatch: '{}',
      editedAt: new Date(),
      editedBy: adminId,
      kickoffEdited: true,
      matchId: stored!.id,
      reason: 'De redactie wist het beter',
      resultEdited: true,
    })

    const report = await run([oldMatch({ referee: 'Jan Wegereef' })])
    const [after] = await rows()

    expect(report).toMatchObject({ changed: 1 })
    expect(after).toMatchObject({ goalsAgainst: 3, goalsFor: 3, referee: 'Jan Wegereef' })
    expect(after?.kickoffAt?.getTime()).toBe(edited.getTime())
  })

  it('follows the file again for the part the editors did not fill in', async () => {
    await run([oldMatch()])

    const [stored] = await rows()

    await database.db.update(matches).set({ goalsFor: 3 }).where(eq(matches.id, stored!.id))
    await database.db.insert(matchEdits).values({
      beforeGoals: '[]',
      beforeMatch: '{}',
      editedAt: new Date(),
      editedBy: adminId,
      kickoffEdited: true,
      matchId: stored!.id,
      reason: 'De redactie wist het beter',
    })
    await run([oldMatch()])

    expect((await rows())[0]?.goalsFor).toBe(2)
  })

  it('never removes a row: a match that left the files is reported', async () => {
    await run([oldMatch(), oldMatch({ code: 'ajax.thuis', dateTime: '2001-09-02 20:00:00' })])

    const report = await run([oldMatch()])

    expect(await rows()).toHaveLength(2)
    expect(
      await database.db
        .select()
        .from(matches)
        .where(sql`1 = 1`),
    ).toHaveLength(2)
    expect(report.lines.join('\n')).toContain('is no longer in the files, left as it is')
  })

  it('skips a match whose club is not in the database', async () => {
    const report = await importOldSiteMatches(database.db, [oldMatch()], oldClubs, new Map())

    expect(report).toMatchObject({ created: 0, skipped: 1 })
    expect(report.lines.join('\n')).toContain("its club 'nec' is not in the database")
  })

  it('counts the remarks it does not copy in one line', async () => {
    const report = await run([
      oldMatch({ note: 'Datum klopt niet' }),
      oldMatch({ code: 'ajax.thuis', dateTime: '2001-09-02 20:00:00', note: 'Debuut in Eredivisie' }),
    ])

    expect(report.lines).toEqual(['1 remarks of the old editors are not copied to the note: they are working notes'])
    expect((await rows()).map((row) => row.note)).toEqual([null, 'Debuut in Eredivisie'])
  })
})

describe('the files of the old fansite', () => {
  it('makes 671 matches in the right competitions, and a second run changes nothing', async () => {
    for (const table of ['match_edits', 'match_statistics', 'matches', 'clubs']) {
      await database.pool.query(`DELETE FROM ${table}`)
    }

    const data = await readOldSiteData()

    await importOldSiteClubs(database.db, data.clubs)

    const ids = await oldSiteClubIds(database.db, data.clubs)
    const first = await importOldSiteMatches(database.db, data.matches, data.clubs, ids)
    const before = await database.db.select().from(matches).orderBy(asc(matches.id))
    const second = await importOldSiteMatches(database.db, data.matches, data.clubs, ids)
    const perCompetition = new Map<string, number>()

    for (const row of before) {
      perCompetition.set(row.competition, (perCompetition.get(row.competition) ?? 0) + 1)
    }

    expect(first).toMatchObject({ changed: 0, created: 671, skipped: 0, unchanged: 0 })
    expect(second).toMatchObject({ changed: 0, created: 0, skipped: 0, unchanged: 671 })
    expect(await database.db.select().from(matches).orderBy(asc(matches.id))).toEqual(before)
    expect(Object.fromEntries(perCompetition)).toEqual({
      'Champions League': 6,
      'Eerste divisie': 38,
      Eredivisie: 510,
      'Europacup II': 4,
      'Intertoto Cup': 28,
      'KNVB Beker': 58,
      'Play-offs UEFA Cup': 4,
      'UEFA Cup': 23,
    })
    expect(before.every((row) => row.dataSource === 'oude-fansite' && row.status === 'played')).toBe(true)
    expect(before.filter((row) => row.kickoffAt === null)).toHaveLength(12)
    expect(before.filter((row) => row.round.startsWith('Speelronde'))).toHaveLength(15 * 34 + 34)
    expect(before.filter((row) => row.extraTime)).toHaveLength(8)
    expect(before.filter((row) => row.penaltiesFor !== null)).toHaveLength(1)
    // Only the remarks that are a fact, and no link.
    expect(new Set(before.map((row) => row.note))).toEqual(
      new Set([
        '28 januari afgelast wegens sneeuw',
        'Begon later door file',
        'Debuut in Eredivisie',
        'Kwartfinale',
        null,
      ]),
    )
    expect(await database.db.select().from(matchStatistics)).toHaveLength(359)
  })
})
