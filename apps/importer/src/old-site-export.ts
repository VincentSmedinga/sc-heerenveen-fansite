import type {
  OldSiteClub,
  OldSiteEvent,
  OldSiteLine,
  OldSiteLineupEntry,
  OldSiteMatch,
  OldSitePlayer,
} from './old-site-file.ts'

import { oldSiteFileVersion, parseOldSiteFile } from './old-site-file.ts'

/**
 * The part of `pnpm export:old-site` that needs no database: it turns the rows of the old
 * fansite database into the files of `apps/importer/data/oude-fansite/` and the Markdown file
 * of the friendlies, and checks how the rows hang together. The column names are those of the
 * old tables (`wedstrijd`, `wedstrijd_res`, `wedstrijd_krk`, `wedstrijd_ops`, `wedstrijd_vsg`,
 * `club` and `speler`). A match is joined to its rows on `code` plus the season code, as in
 * the old database, never on a number.
 */

export type ClubRow = { code: string; land: string; naam: string }

export type EventRow = {
  assist: null | string
  gebeurtenis: number
  id: number
  minuut: number
  soort: null | string
  spr_code: null | string
  spr_naam: null | string
  wsd_code: string
  wsd_seizoen: string
}

export type LineupRow = {
  id: number
  mi: number
  mu: number
  ops_id: number
  spr_code: null | string
  spr_naam: null | string
  wsd_code: string
  wsd_seizoen: string
}

export type MatchRow = {
  code: string
  competitie: number
  dt: string
  opmerking: null | string
  seizoen: string
  speelronde: null | number
}

export type OldSiteRows = {
  clubs: ClubRow[]
  events: EventRow[]
  lineups: LineupRow[]
  matches: MatchRow[]
  players: PlayerRow[]
  reports: ReportRow[]
  results: ResultRow[]
}

export type PlayerRow = {
  achternaam: string
  code: string
  /** 1 doelman, 2 verdediger, 3 middenvelder, 4 aanvaller, 0 unknown. */
  linie: number
  /** The country in two letters, in the codes of the old site; empty when it is not known. */
  nationaliteit: string
  tussenvoegsel: null | string
  voornaam: string
}

/** Only the two columns of a report that the export may read. */
export type ReportRow = {
  scheidsrechter: null | string
  toeschouwers: null | number
  wsd_code: string
  wsd_seizoen: string
}

export type ResultRow = {
  bt: number
  bu: number
  et: number
  eu: number
  ht: number
  hu: number
  opmerking: null | string
  ot: number
  ou: number
  rt: number
  ru: number
  wsd_code: string
  wsd_seizoen: string
}

/** The first and last day of the matches in the export. The database also has older ones. */
export const firstDay = '1990-07-01'
export const lastDay = '2007-04-29'

/** The competition code of the friendlies, which go to a Markdown file and not to the data. */
export const friendlyCompetition = 9

export type OldSiteExport = {
  /** The files for `apps/importer/data/oude-fansite/`, by name. */
  files: Map<string, string>
  /** The Markdown of the friendlies, for `docs/oefenwedstrijden-2002-03.md`. */
  friendliesMarkdown: string
  /** Lines for the person who runs the export: counts, and what didn't hang together. */
  report: string[]
}

/**
 * Writes a value as JSON that a second run reproduces byte for byte: keys in alphabetical
 * order, and an object or array that holds only plain values on one line, so a match with its
 * goals and line-up stays a few hundred lines and not a few thousand.
 */
export function formatOldSiteJson(value: unknown, indent = ''): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value)
  }

  const entries: [string | undefined, unknown][] = Array.isArray(value)
    ? value.map((item) => [undefined, item])
    : Object.entries(value)
        .filter(([, item]) => item !== undefined)
        .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const [open, close] = Array.isArray(value) ? ['[', ']'] : ['{', '}']

  if (entries.length === 0) {
    return `${open}${close}`
  }

  const flat = entries.every(([, item]) => item === null || typeof item !== 'object')
  const render = (key: string | undefined, item: unknown, inner: string) =>
    (key === undefined ? '' : `${JSON.stringify(key)}: `) + formatOldSiteJson(item, inner)

  if (flat) {
    return `${open}${entries.map(([key, item]) => render(key, item, indent)).join(', ')}${close}`
  }

  const inner = `${indent}  `

  return `${open}\n${entries.map(([key, item]) => `${inner}${render(key, item, inner)}`).join(',\n')}\n${indent}${close}`
}

/** Describes how the old rows hang together, for the report. */
function checkRows(rows: OldSiteRows, exported: MatchRow[]) {
  const lines: string[] = []
  const known = new Set(rows.matches.map((match) => keyOf(match.code, match.seizoen)))
  const clubs = new Set(rows.clubs.map((club) => club.code))
  const hasResult = new Set(rows.results.map((row) => keyOf(row.wsd_code, row.wsd_seizoen)))
  const orphans = (name: string, list: { wsd_code: string; wsd_seizoen: string }[]) => {
    const keys = [
      ...new Set(
        list
          .filter((row) => !known.has(keyOf(row.wsd_code, row.wsd_seizoen)))
          .map((row) => keyOf(row.wsd_code, row.wsd_seizoen)),
      ),
    ]

    lines.push(`${name} without a match: ${keys.length === 0 ? 'none' : keys.sort().join(', ')}`)
  }
  const withoutResult = exported.filter((match) => !hasResult.has(keyOf(match.code, match.seizoen)))
  const withoutClub = exported.filter((match) => !clubs.has(opponentCode(match.code)))

  lines.push(
    `matches without a result: ${withoutResult.length === 0 ? 'none' : withoutResult.map((match) => keyOf(match.code, match.seizoen)).join(', ')}`,
    `matches with an opponent that is not in club: ${withoutClub.length === 0 ? 'none' : withoutClub.map((match) => keyOf(match.code, match.seizoen)).join(', ')}`,
  )
  orphans('result rows', rows.results)
  orphans('goal and card rows', rows.events)
  orphans('line-up rows', rows.lineups)
  orphans('report rows', rows.reports)

  return lines
}

function eventEntry(row: EventRow): OldSiteEvent {
  return {
    assist: text(row.assist),
    event: row.gebeurtenis as OldSiteEvent['event'],
    kind: text(row.soort),
    minute: row.minuut,
    playerCode: text(row.spr_code),
    playerName: text(row.spr_naam),
  }
}

function groupBy<Row>(rows: Row[], key: (row: Row) => string) {
  const groups = new Map<string, Row[]>()

  for (const row of rows) {
    const group = groups.get(key(row))

    if (group) {
      group.push(row)
    } else {
      groups.set(key(row), [row])
    }
  }

  return groups
}

function keyOf(code: string, season: string) {
  return `${season}/${code}`
}

function lineupEntry(row: LineupRow): OldSiteLineupEntry {
  return {
    minuteIn: row.mi,
    minuteOut: row.mu,
    order: row.ops_id,
    playerCode: text(row.spr_code),
    playerName: text(row.spr_naam),
  }
}

const linesByNumber: readonly (null | OldSiteLine)[] = [null, 'doelman', 'verdediger', 'middenvelder', 'aanvaller']

/** The code of `speler.nationaliteit` in capitals, and null for anything but two letters. */
function countryOf(nationaliteit: string): null | string {
  const code = nationaliteit.trim().toUpperCase()

  return /^[A-Z]{2}$/u.test(code) ? code : null
}

/** The line of `speler.linie`: 1 to 4, and null for 0 (not known) or anything else. */
function lineOf(linie: number): null | OldSiteLine {
  return linesByNumber[linie] ?? null
}

/** The opponent's code is the part of the match code before the first dot (`psv.thuis`). */
function opponentCode(matchCode: string) {
  return matchCode.split('.')[0] ?? matchCode
}

/** Trims a text from the old database and turns an empty one into `null`. */
function text(value: null | string | undefined): null | string {
  const trimmed = value?.trim() ?? ''

  return trimmed === '' ? null : trimmed
}

const months = [
  'januari',
  'februari',
  'maart',
  'april',
  'mei',
  'juni',
  'juli',
  'augustus',
  'september',
  'oktober',
  'november',
  'december',
]

/** Builds every file from the rows of the old database. Throws when a file doesn't fit. */
export function buildOldSiteExport(rows: OldSiteRows): OldSiteExport {
  const exported = rows.matches
    .filter((match) => match.competitie !== friendlyCompetition)
    .filter((match) => match.dt.slice(0, 10) >= firstDay && match.dt.slice(0, 10) <= lastDay)
    .sort((a, b) => a.dt.localeCompare(b.dt) || a.code.localeCompare(b.code))
  const results = groupBy(rows.results, (row) => keyOf(row.wsd_code, row.wsd_seizoen))
  const reports = groupBy(rows.reports, (row) => keyOf(row.wsd_code, row.wsd_seizoen))
  const events = groupBy(rows.events, (row) => keyOf(row.wsd_code, row.wsd_seizoen))
  const lineups = groupBy(rows.lineups, (row) => keyOf(row.wsd_code, row.wsd_seizoen))
  const matches: OldSiteMatch[] = []

  for (const match of exported) {
    const key = keyOf(match.code, match.seizoen)
    const [result] = results.get(key) ?? []
    const [report] = reports.get(key) ?? []

    // A match without a result can't be written; the report names it.
    if (!result) {
      continue
    }

    matches.push({
      attendance: report?.toeschouwers ?? null,
      code: match.code,
      competition: match.competitie,
      dateTime: match.dt,
      events: (events.get(key) ?? []).sort((a, b) => a.id - b.id).map(eventEntry),
      lineup: (lineups.get(key) ?? []).sort((a, b) => a.ops_id - b.ops_id || a.id - b.id).map(lineupEntry),
      note: text(match.opmerking),
      referee: text(report?.scheidsrechter),
      result: {
        awayFullTime: result.eu,
        awayHalfTime: result.ru,
        homeFullTime: result.et,
        homeHalfTime: result.rt,
        note: text(result.opmerking),
      },
      round: match.speelronde,
      season: match.seizoen,
      statistics: {
        awayCorners: result.hu,
        awayFouls: result.ou,
        awayOffside: result.bu,
        homeCorners: result.ht,
        homeFouls: result.ot,
        homeOffside: result.bt,
      },
    })
  }

  // The clubs and players are those the exported matches use, and no others.
  const clubsByCode = new Map(rows.clubs.map((club) => [club.code, club]))
  const clubs: OldSiteClub[] = [...new Set(matches.map((match) => opponentCode(match.code)))].sort().flatMap((code) => {
    const club = clubsByCode.get(code)

    return club ? [{ code, country: club.land.trim(), name: club.naam.trim() }] : []
  })
  const playersByCode = new Map(rows.players.map((player) => [player.code, player]))
  const used = new Set<string>()

  for (const match of matches) {
    for (const entry of match.events) {
      for (const code of [entry.playerCode, entry.assist]) {
        if (isPlayerCode(code)) {
          used.add(code)
        }
      }
    }
    for (const entry of match.lineup) {
      if (isPlayerCode(entry.playerCode)) {
        used.add(entry.playerCode)
      }
    }
  }

  const players: OldSitePlayer[] = [...used].sort().flatMap((code) => {
    const player = playersByCode.get(code)

    return player
      ? [
          {
            code,
            country: countryOf(player.nationaliteit),
            firstName: player.voornaam.trim(),
            infix: text(player.tussenvoegsel),
            lastName: player.achternaam.trim(),
            line: lineOf(player.linie),
          },
        ]
      : []
  })
  const withoutRow = [...used].filter((code) => !playersByCode.has(code)).sort()

  const files = new Map<string, string>()
  const write = (name: string, content: unknown) => {
    const body = `${formatOldSiteJson(content)}\n`

    parseOldSiteFile(body, name)
    files.set(name, body)
  }

  write('clubs.json', { clubs, version: oldSiteFileVersion })
  write('players.json', { players, version: oldSiteFileVersion })

  for (const [season, seasonMatches] of groupBy(matches, (match) => match.season)) {
    write(`matches-${season}.json`, { matches: seasonMatches, season, version: oldSiteFileVersion })
  }

  const report = [
    `${matches.length} matches in ${files.size - 2} files, ${clubs.length} clubs and ${players.length} players`,
    `${matches.reduce((sum, match) => sum + match.events.length, 0)} goals and cards, ${matches.reduce((sum, match) => sum + match.lineup.length, 0)} line-up rows`,
    `friendlies left out of the data: ${rows.matches.filter((match) => match.competitie === friendlyCompetition).length}`,
    `matches before ${firstDay} left out: ${rows.matches.filter((match) => match.competitie !== friendlyCompetition && match.dt.slice(0, 10) < firstDay).length}`,
    `players in goals and line-ups without a row in speler: ${withoutRow.length === 0 ? 'none' : withoutRow.join(', ')}`,
    ...checkRows(rows, exported),
  ]

  return { files, friendliesMarkdown: writeFriendlies(rows), report }
}

/**
 * The Markdown file of the friendlies: an introduction and a table with the date, the opponent,
 * home or away, the result with sc Heerenveen first, the place from the remark and the scorers
 * of sc Heerenveen. Players of the opponent (amateur clubs) are not in it.
 */
export function writeFriendlies(rows: OldSiteRows): string {
  const clubs = new Map(rows.clubs.map((club) => [club.code, club.naam.trim()]))
  const players = new Map(rows.players.map((player) => [player.code, playerName(player)]))
  const results = new Map(rows.results.map((row) => [keyOf(row.wsd_code, row.wsd_seizoen), row]))
  const events = groupBy(rows.events, (row) => keyOf(row.wsd_code, row.wsd_seizoen))
  const friendlies = rows.matches
    .filter((match) => match.competitie === friendlyCompetition)
    .sort((a, b) => a.dt.localeCompare(b.dt) || a.code.localeCompare(b.code))

  const tableRows = friendlies.map((match) => {
    const key = keyOf(match.code, match.seizoen)
    const result = results.get(key)
    const home = match.code.endsWith('.thuis')
    const [ours, theirs] = result ? (home ? [result.et, result.eu] : [result.eu, result.et]) : [null, null]
    const [year, month, day] = match.dt.slice(0, 10).split('-').map(Number)
    const scorers = new Map<string, number>()
    let ownGoals = 0

    for (const event of (events.get(key) ?? []).sort((a, b) => a.id - b.id)) {
      if (event.gebeurtenis !== 1) {
        continue
      }

      const code = text(event.spr_code)
      const own = text(event.soort) === 'eigen doelpunt'

      if (isPlayerCode(code) && !own) {
        const name = players.get(code) ?? code

        scorers.set(name, (scorers.get(name) ?? 0) + 1)
      } else if (!isPlayerCode(code) && own) {
        ownGoals += 1
      }
    }

    const scorerText = [
      ...[...scorers].map(([name, goals]) => (goals > 1 ? `${name} (${goals})` : name)),
      ...(ownGoals > 0
        ? [ownGoals > 1 ? `eigen doelpunt tegenstander (${ownGoals})` : 'eigen doelpunt tegenstander']
        : []),
    ].join(', ')
    const date = `${day} ${months[(month ?? 1) - 1]} ${year}`
    const opponent = clubs.get(opponentCode(match.code)) ?? opponentCode(match.code)

    return `| ${date} | ${opponent} | ${home ? 'Thuis' : 'Uit'} | ${ours === null ? '' : `${ours}-${theirs}`} | ${text(match.opmerking) ?? ''} | ${scorerText} |`
  })

  return [
    '# Oefenwedstrijden van sc Heerenveen in 2002',
    '',
    `Dit zijn de ${friendlies.length} oefenwedstrijden van sc Heerenveen in de zomer van 2002, vóór het seizoen 2002/03.`,
    'De gegevens komen uit de database van de oude fansite (1987 tot 2007), die de projecteigenaar aan het project heeft gegeven.',
    'Ze staan hier en niet in de database van de site, omdat oefenwedstrijden niet bij een competitie horen.',
    'De tegenstanders zijn amateurclubs en buitenlandse clubs.',
    '',
    'De uitslag staat met sc Heerenveen eerst.',
    'De plaats is de opmerking uit de oude database.',
    'Bij de doelpuntenmakers staan alleen spelers van sc Heerenveen, en een eigen doelpunt van de tegenstander.',
    'Het script `pnpm export:old-site` in `apps/importer` schrijft dit bestand.',
    'Pas de tabel dus niet met de hand aan.',
    '',
    '| Datum | Tegenstander | Thuis of uit | Uitslag | Plaats | Doelpuntenmakers sc Heerenveen |',
    '| ----- | ------------ | ------------ | ------- | ------ | ------------------------------ |',
    ...tableRows,
    '',
  ].join('\n')
}

/** A code like `voornaam.achternaam` is one of our players; a code with a space is a name. */
function isPlayerCode(code: null | string): code is string {
  return code !== null && code.includes('.') && !code.includes(' ')
}

function playerName(player: PlayerRow) {
  return [player.voornaam, player.tussenvoegsel, player.achternaam]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(' ')
}
