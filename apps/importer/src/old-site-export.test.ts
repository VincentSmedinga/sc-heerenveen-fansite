import { describe, expect, it } from 'vitest'

import type { OldSiteRows } from './old-site-export.ts'

import { buildOldSiteExport, formatOldSiteJson, writeFriendlies } from './old-site-export.ts'
import { parseOldSiteFile } from './old-site-file.ts'

const match = (code: string, season: string, dt: string, competitie = 1) => ({
  code,
  competitie,
  dt,
  opmerking: null,
  seizoen: season,
  speelronde: 1,
})
const result = (code: string, season: string, et: number, eu: number) => ({
  bt: 0,
  bu: 0,
  et,
  eu,
  ht: 3,
  hu: 4,
  opmerking: '',
  ot: 0,
  ou: 0,
  rt: 0,
  ru: 0,
  wsd_code: code,
  wsd_seizoen: season,
})
const event = (id: number, code: string, season: string, playerCode: string, playerName = '', kind = '') => ({
  assist: null,
  gebeurtenis: 1,
  id,
  minuut: 10,
  soort: kind,
  spr_code: playerCode,
  spr_naam: playerName,
  wsd_code: code,
  wsd_seizoen: season,
})

const rows: OldSiteRows = {
  clubs: [
    { code: 'psv', land: 'NL', naam: 'PSV' },
    { code: 'ajax', land: 'NL', naam: 'Ajax' },
    { code: 'amateurs', land: 'NL', naam: 'VV Amateurs' },
  ],
  events: [
    event(2, 'psv.thuis', '9091', 'hans.vonk'),
    event(1, 'psv.thuis', '9091', '', 'Een Speler'),
    event(3, 'amateurs.uit', '0203', 'romano.denneboom'),
    event(4, 'amateurs.uit', '0203', 'romano.denneboom'),
    event(5, 'amateurs.uit', '0203', '', 'Henk Herder', 'eigen doelpunt'),
  ],
  lineups: [
    {
      id: 11,
      mi: 0,
      mu: 90,
      ops_id: 2,
      spr_code: 'hans.vonk',
      spr_naam: '',
      wsd_code: 'psv.thuis',
      wsd_seizoen: '9091',
    },
    {
      id: 10,
      mi: 0,
      mu: 90,
      ops_id: 1,
      spr_code: null,
      spr_naam: 'Een Speler',
      wsd_code: 'psv.thuis',
      wsd_seizoen: '9091',
    },
  ],
  matches: [
    match('amateurs.uit', '0203', '2002-07-10 19:00:00', 9),
    match('ajax.uit', '9091', '1990-06-30 14:30:00'),
    match('psv.thuis', '9091', '1990-09-23 14:30:00'),
    match('ajax.thuis', '9091', '1990-10-23 14:30:00'),
  ],
  players: [
    { achternaam: 'Vonk', code: 'hans.vonk', linie: 1, nationaliteit: 'za', tussenvoegsel: null, voornaam: 'Hans' },
    {
      achternaam: 'Denneboom',
      code: 'romano.denneboom',
      linie: 0,
      nationaliteit: '',
      tussenvoegsel: null,
      voornaam: 'Romano',
    },
    {
      achternaam: 'Weij',
      code: 'rene.vanderweij',
      linie: 4,
      nationaliteit: 'NL',
      tussenvoegsel: 'van der',
      voornaam: 'René',
    },
  ],
  reports: [
    { scheidsrechter: 'Eric Braamhaar', toeschouwers: 4251, wsd_code: 'psv.thuis', wsd_seizoen: '9091' },
    { scheidsrechter: '', toeschouwers: 0, wsd_code: 'nec.bekeruit', wsd_seizoen: '9798' },
  ],
  results: [
    result('psv.thuis', '9091', 2, 1),
    result('amateurs.uit', '0203', 0, 3),
    result('ajax.uit', '9091', 0, 0),
    result('ajax.thuis', '9091', 1, 1),
  ],
}

describe('buildOldSiteExport', () => {
  const built = buildOldSiteExport(rows)

  it('writes a file for the clubs, one for the players and one for each season', () => {
    expect([...built.files.keys()]).toEqual(['clubs.json', 'players.json', 'matches-9091.json'])
  })

  it('leaves out the friendlies and the matches before 1 July 1990', () => {
    const file = parseOldSiteFile(built.files.get('matches-9091.json') ?? '')

    expect('matches' in file && file.matches.map((entry) => entry.code)).toEqual(['psv.thuis', 'ajax.thuis'])
  })

  it('joins a match to its rows on the code and the season', () => {
    const file = parseOldSiteFile(built.files.get('matches-9091.json') ?? '')
    const entry = 'matches' in file ? file.matches[0] : undefined

    expect(entry?.referee).toBe('Eric Braamhaar')
    expect(entry?.attendance).toBe(4251)
    expect(entry?.result).toEqual({ awayFullTime: 1, awayHalfTime: 0, homeFullTime: 2, homeHalfTime: 0, note: null })
    expect(entry?.statistics.homeCorners).toBe(3)
    expect(entry?.events.map((item) => item.playerCode ?? item.playerName)).toEqual(['Een Speler', 'hans.vonk'])
    expect(entry?.lineup.map((item) => item.order)).toEqual([1, 2])
  })

  it('has the opponents and the players of the exported matches only', () => {
    expect(JSON.parse(built.files.get('clubs.json') ?? '').clubs.map((club: { code: string }) => club.code)).toEqual([
      'ajax',
      'psv',
    ])
    expect(JSON.parse(built.files.get('players.json') ?? '').players).toEqual([
      { code: 'hans.vonk', country: 'ZA', firstName: 'Hans', infix: null, lastName: 'Vonk', line: 'doelman' },
    ])
  })

  it('gives the same bytes in a second run', () => {
    expect([...buildOldSiteExport(rows).files]).toEqual([...built.files])
  })

  it('reports what does not hang together', () => {
    expect(built.report).toContain('report rows without a match: 9798/nec.bekeruit')
    expect(built.report).toContain('matches without a result: none')
  })

  it('names a match without a result and one without a club', () => {
    const report = buildOldSiteExport({
      ...rows,
      clubs: rows.clubs.filter((club) => club.code !== 'ajax'),
      results: rows.results.filter((entry) => entry.wsd_code !== 'ajax.thuis'),
    }).report

    expect(report).toContain('matches without a result: 9091/ajax.thuis')
    expect(report).toContain('matches with an opponent that is not in club: 9091/ajax.thuis')
  })

  it('refuses a row that does not fit the format', () => {
    expect(() =>
      buildOldSiteExport({ ...rows, events: [{ ...event(9, 'psv.thuis', '9091', 'hans.vonk'), gebeurtenis: 7 }] }),
    ).toThrow('does not match')
  })
})

describe('writeFriendlies', () => {
  const markdown = writeFriendlies(rows)

  it('writes the friendlies with sc Heerenveen first in the result and the scorers of sc Heerenveen', () => {
    expect(markdown).toContain(
      '| 10 juli 2002 | VV Amateurs | Uit | 3-0 |  | Romano Denneboom (2), eigen doelpunt tegenstander |',
    )
  })

  it('leaves the matches of the competitions out', () => {
    expect(markdown).not.toContain('PSV')
  })
})

describe('formatOldSiteJson', () => {
  it('sorts the keys and puts a list of plain values on one line', () => {
    expect(formatOldSiteJson({ a: 'één', b: [{ x: null, y: 1 }] })).toBe(
      '{\n  "a": "één",\n  "b": [\n    {"x": null, "y": 1}\n  ]\n}',
    )
  })
})
