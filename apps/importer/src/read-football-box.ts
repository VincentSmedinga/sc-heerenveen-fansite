// Reads the matches of sc Heerenveen of 2007/08 to 2009/10 from the blocks `football box`,
// `footballbox2` and `Football box collapsible` of six Wikipedia pages, Dutch and English, and
// the league matches of 2008/09 from a table on the page of the club's season. The seasons have
// no page the other readers know (`read-wikipedia.ts`), so a fixed list says per season which
// pages there are, and under which heading each competition stands. A block or a row of the
// table is put into the shape `readMatch` reads, so a match is checked the way every other
// match is. A page that has changed shape gives an error, never a guess, and a field the page
// leaves open stays empty.
import type { Competition } from '@fansite/db/schema'

import { matchGoalPlayerMaxLength } from '@fansite/db/schema'

import type { ReadGoal, ReadMatch, ReadProgramme, Template } from './read-wikipedia.ts'

import {
  clean,
  findTemplates,
  linkedPage,
  linkTarget,
  months,
  plain,
  readMatch,
  withoutRefn,
} from './read-wikipedia.ts'

/** A page with `football box` blocks, and where on it the matches of each competition are. */
export type FootballBoxPage = {
  /** The language edition of Wikipedia the page is on, as in its address. */
  language: 'en' | 'nl'
  /** The table with the league matches, on a page that has them in a table, not in blocks. */
  leagueTable?: LeagueTable
  /** The matches of ours the page has. Another number is a page that has changed shape. */
  matches: number
  sections: readonly Section[]
  title: string
}

/**
 * The table with a row for each league match of ours, on the page of the club's season of
 * 2008/09: the stadium, the date, the home club, the result, the away club, and the scorers and
 * the cards of each club.
 */
type LeagueTable = {
  /** The heading right above the table. */
  heading: RegExp
  /**
   * The opponent of a row that leaves the club open, by the date as the row writes it. It is
   * filled in by hand after someone has looked the match up, and counts only while the cell is
   * empty.
   */
  opponents: Readonly<Record<string, string>>
}

/** What a section knows of a block when it names the round. */
type RoundContext = {
  /** The place of the block among those of ours in its section, from 1. */
  position: number
  /** The `round` field of the block as it reads, or empty. */
  round: string
  /** The heading of the second level above the block, or empty. */
  topHeading: string
  /** How many blocks of ours the section has. */
  total: number
}

/** The blocks under one heading: their competition and how a round is named, in Dutch. */
type Section = {
  competition: Competition
  /** The heading right above the blocks, of any level. */
  heading: RegExp
  /** The round of a block, or undefined when the block names one we do not know. */
  round: (context: RoundContext) => string | undefined
  /** The heading of the second level the section is under, when the page needs it. */
  topHeading?: RegExp
}

/** The cup rounds on the English page of 2009/10, as the Dutch pages of then name them. */
const cupRounds: Readonly<Record<string, string>> = {
  'Fourth round': '4e ronde',
  'Second round': '2e ronde',
  'Third round': '3e ronde',
}

/** What the `round` field of a match of a tie says, and which of the two matches it is. */
const legs: Readonly<Record<string, number>> = { 'first leg': 1, 'second leg': 2, 'wedstrijd 1': 1, 'wedstrijd 2': 2 }

/** The matches of a round, numbered in the order of the page: `Eerste ronde, wedstrijd 1/2`. */
const numbered =
  (name: string) =>
  ({ position, total }: RoundContext) =>
    `${name}, wedstrijd ${position}/${total}`

/** The match of a tie by the number in its `round` field: `Wedstrijd 2` or `Second leg`. */
const leg =
  (name: string) =>
  ({ round, total }: RoundContext) => {
    const key = round.toLowerCase()

    return Object.hasOwn(legs, key) ? `${name}, wedstrijd ${legs[key]}/${total}` : undefined
  }

/**
 * The pages per season. They are listed by hand, after someone has read each page (see
 * `docs/onderzoek-wedstrijden-2007-2010.md`): a season that is not here is never asked for.
 */
const footballBoxSeasons: Readonly<Record<string, readonly FootballBoxPage[]>> = {
  '2007/08': [
    {
      language: 'nl',
      matches: 4,
      sections: [
        {
          competition: 'Play-offs Champions League',
          heading: /^Wedstrijd A$/u,
          round: leg('Halve finale'),
          topHeading: /^Play-offs voor de voorronde Champions League$/u,
        },
        // The two clubs that lost their semi-final played for a ticket for the UEFA Cup. The
        // page has them under the play-offs for the UEFA Cup; to us they are the same ones.
        {
          competition: 'Play-offs Champions League',
          heading: /^Play-offs UEFA Cup\/Intertoto Ronde 2$/u,
          round: leg('Ronde 2'),
        },
      ],
      title: 'Play-offs Nederlands voetbal 2008',
    },
    {
      language: 'en',
      matches: 2,
      sections: [{ competition: 'UEFA Cup', heading: /^Matches$/u, round: numbered('Eerste ronde') }],
      title: '2007–08 UEFA Cup first round',
    },
  ],
  '2008/09': [
    {
      language: 'nl',
      matches: 5,
      sections: [
        {
          competition: 'KNVB Beker',
          heading: /^Wedstrijd(?:en)?$/u,
          round: ({ topHeading }) => (topHeading === '' ? undefined : topHeading),
        },
      ],
      title: 'KNVB Beker 2008/09 (mannen)',
    },
    {
      language: 'en',
      matches: 2,
      sections: [{ competition: 'UEFA Cup', heading: /^Matches$/u, round: numbered('Eerste ronde') }],
      title: '2008–09 UEFA Cup first round',
    },
    {
      language: 'en',
      matches: 4,
      sections: [{ competition: 'UEFA Cup', heading: /^Group E$/u, round: numbered('Groepsfase') }],
      title: '2008–09 UEFA Cup group stage',
    },
    {
      language: 'nl',
      // The row of 15 November 2008 names no away club. It was FC Utrecht: the one club of the
      // league the table has away and not at home, and the scorers of the row played there.
      leagueTable: { heading: /^Eredivisie$/u, opponents: { '15-11-2008': '[[FC Utrecht]]' } },
      matches: 34,
      sections: [],
      title: 'Sc Heerenveen in het seizoen 2008/09 (mannen)',
    },
  ],
  '2009/10': [
    {
      language: 'en',
      matches: 46,
      sections: [
        {
          competition: 'Johan Cruijff Schaal',
          heading: /^Johan Cruyff Shield$/u,
          round: ({ round, total }) => (round === 'Final' && total === 1 ? 'Finale' : undefined),
        },
        {
          competition: 'Eredivisie',
          heading: /^Matches$/u,
          round: ({ round }) => (/^\d{1,2}$/u.test(round) ? `Speelronde ${Number(round)}` : undefined),
        },
        {
          competition: 'KNVB Beker',
          heading: /^KNVB Cup$/u,
          round: ({ round }) => (Object.hasOwn(cupRounds, round) ? cupRounds[round] : undefined),
        },
        { competition: 'Europa League', heading: /^Play-off round$/u, round: leg('Play-offronde') },
        {
          competition: 'Europa League',
          heading: /^Group stage$/u,
          round: ({ round, total }) => (/^\d$/u.test(round) ? `Groepsfase, wedstrijd ${round}/${total}` : undefined),
        },
      ],
      title: '2009–10 SC Heerenveen season',
    },
  ],
}

/**
 * The clubs on the English pages, by the title of their English article (or by their name when
 * the page does not link it), with the article of the Dutch Wikipedia and the name a Dutch page
 * would show. An English title is no key of a club, so an opponent that is not here is an
 * error until someone adds it.
 */
const englishClubs: Readonly<Record<string, { name: string; page: string }>> = {
  'AC Milan': { name: 'AC Milan', page: 'AC Milan' },
  'ADO Den Haag': { name: 'ADO Den Haag', page: 'ADO Den Haag' },
  'AFC Ajax': { name: 'Ajax', page: 'AFC Ajax' },
  'AZ Alkmaar': { name: 'AZ', page: 'AZ (voetbalclub)' },
  'F.C. Twente': { name: 'FC Twente', page: 'FC Twente' },
  'FC Groningen': { name: 'FC Groningen', page: 'FC Groningen' },
  'FC Utrecht': { name: 'FC Utrecht', page: 'FC Utrecht' },
  Feyenoord: { name: 'Feyenoord', page: 'Feyenoord' },
  'FK Ventspils': { name: 'FK Ventspils', page: 'JFK Ventspils' },
  'Helsingborgs IF': { name: 'Helsingborgs IF', page: 'Helsingborgs IF' },
  'Heracles Almelo': { name: 'Heracles Almelo', page: 'Heracles Almelo' },
  'Hertha BSC': { name: 'Hertha BSC', page: 'Hertha BSC' },
  'N.E.C. (football club)': { name: 'N.E.C.', page: 'N.E.C.' },
  'NAC Breda': { name: 'NAC Breda', page: 'NAC Breda' },
  'PAOK FC': { name: 'PAOK Saloniki', page: 'PAOK Saloniki' },
  'Portsmouth F.C.': { name: 'Portsmouth FC', page: 'Portsmouth FC' },
  'PSV Eindhoven': { name: 'PSV', page: 'PSV (voetbalclub)' },
  'RBC Roosendaal': { name: 'RBC Roosendaal', page: 'RBC (voetbalclub)' },
  'RKC Waalwijk': { name: 'RKC Waalwijk', page: 'RKC Waalwijk' },
  'Roda JC': { name: 'Roda JC Kerkrade', page: 'Roda JC Kerkrade' },
  'S.C. Braga': { name: 'SC Braga', page: 'SC Braga' },
  'Sparta Rotterdam': { name: 'Sparta Rotterdam', page: 'Sparta Rotterdam' },
  'Sporting CP': { name: 'Sporting Lissabon', page: 'Sporting Clube de Portugal' },
  'Sterk Door Combinatie Putten': { name: 'SDC Putten', page: 'SDC Putten' },
  'VfL Wolfsburg': { name: 'VfL Wolfsburg', page: 'VfL Wolfsburg' },
  'Vitesse Arnhem': { name: 'Vitesse', page: 'SBV Vitesse' },
  'Vitória F.C.': { name: 'Vitória Setúbal', page: 'Vitória FC (Setúbal)' },
  'VVV-Venlo': { name: 'VVV-Venlo', page: 'VVV-Venlo' },
  'Willem II (football club)': { name: 'Willem II', page: 'Willem II (voetbalclub)' },
}

/** How the pages name us: the Dutch ones by our name, the English ones also by the town. */
const ourNames = ['sc heerenveen', 'heerenveen']

/** The months as the English Wikipedia writes them, January first. */
const englishMonths = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** The start of a block of a match, under each of the three names the pages use. */
const boxStart = /\{\{\s*football ?box(?: ?2| collapsible)?\s*(?=\||\n)/giu

/** A minute as the pages write it after a card or a missed penalty: `46'` or `90+2'`. */
const minuteMark = "\\d{1,3}(?:\\+\\d{1,2})?\\s*['’′]"

/** What an English page puts between the goals: a card, a red card and a missed penalty. */
const englishExtras = new RegExp(`\\{\\{\\s*(?:yel|sent off|penmiss)\\b[^{}]*\\}\\}(?:\\s*${minuteMark})?`, 'giu')

/** The picture of a card or a substitution on a Dutch page, with the minute beside it. */
const dutchExtras = new RegExp(`(?:${minuteMark}\\s*)?\\[\\[Bestand:[^\\]]*\\]\\](?:\\s*${minuteMark})?`, 'giu')

/** The headers of the league table, in the order of its columns. */
const leagueTableHeaders = [
  'Stadion',
  'Datum',
  'Thuis',
  'Uitslag',
  'Uit',
  'Doelpuntenmakers/kaarten (Heerenveen)',
  'Doelpuntenmakers/kaarten (tegenstander)',
]

/**
 * A scorer in the league table: the link of the player, `e.d.` after it for an own goal, and
 * `2X` when he scored twice. The groups are the page, the name shown, the own goal and the
 * number.
 */
const tableScorer = /\[\[([^\]|]*)(?:\|([^\]]*))?\]\]\s*(e\.d\.)?\s*(?:(\d)\s*x(?![a-z]))?/giu

/**
 * The pages with the matches of a season, such as `2009/10`, or none: only the seasons 2007/08,
 * 2008/09 and 2009/10 have them.
 */
export function footballBoxPages(season: string): readonly FootballBoxPage[] {
  return Object.hasOwn(footballBoxSeasons, season) ? (footballBoxSeasons[season] ?? []) : []
}

/**
 * Reads one of the pages of `footballBoxPages` for the matches of sc Heerenveen. Every block
 * of ours must be under a heading the page is listed with, name a round we know and have a
 * result, and the page must have as many matches of ours as the list says. Anything else is an
 * error that names the page. A match of "Jong sc Heerenveen" is not one of ours. A page with a
 * league table gives the rows of that table as well (see `readLeagueTable`).
 *
 * A scorer on an English page keeps his name and loses his link: an English title is no
 * article we know, so the import ties the goal to a player by the name alone. The opponent
 * gets the name and the article of the Dutch Wikipedia (`englishClubs`). A time counts when the
 * page says which zone it is in, and is turned into the time in the Netherlands.
 */
export function readFootballBoxes(text: string, page: FootballBoxPage): ReadProgramme {
  const cleaned = withoutRefn(clean(text))
  const name = `the page '${page.title}'`
  const topHeadings = [...cleaned.matchAll(/^==[ \t]*([^=\n].*?)[ \t]*==[ \t]*$/gmu)].map((heading) => ({
    index: heading.index,
    title: plain(heading[1] ?? ''),
  }))
  // The UEFA pages say once, above the matches, that their times are those of the Netherlands.
  const pageZoneKnown = /^Times are \[\[Central European (?:Summer )?Time\b/imu.test(cleaned)
  const ours = findTemplates(cleaned, boxStart)
    .filter(isOurs)
    .map((box) => {
      const topHeading = topHeadings.findLast((heading) => heading.index < box.index)?.title ?? ''
      const section = page.sections.find(
        (candidate) => candidate.heading.test(box.heading ?? '') && (candidate.topHeading?.test(topHeading) ?? true),
      )

      return { box, section, topHeading }
    })
  const matches: ReadMatch[] = []
  const problems: string[] = []

  for (const [index, { box, section, topHeading }] of ours.entries()) {
    if (section === undefined) {
      problems.push(`${name} has a match of ours under a heading we do not know: '${(box.heading ?? '').slice(0, 60)}'`)
      continue
    }

    const inSection = ours.filter((found) => found.section === section)
    const round = section.round({
      position: inSection.findIndex((found) => found.box === box) + 1,
      round: plain(box.params.get('round') ?? ''),
      topHeading,
      total: inSection.length,
    })

    if (round === undefined) {
      problems.push(
        `${name} has a match of ours in a round we do not know, match ${index + 1}: '${plain(box.params.get('round') ?? '').slice(0, 40)}'`,
      )
      continue
    }

    const params = page.language === 'en' ? englishBox(box, pageZoneKnown) : dutchBox(box)

    if (typeof params === 'string') {
      problems.push(`${name}: ${params}`)
      continue
    }

    const read = readMatch({ ...box, heading: null, params }, section.competition, round)

    if (typeof read === 'string') {
      problems.push(`${name}: ${read}`)
    } else if (read.status !== 'played') {
      problems.push(`${name}: ${read.round} (${read.competition}) has no result`)
    } else {
      matches.push(read)
    }
  }

  if (page.leagueTable !== undefined) {
    const table = readLeagueTable(cleaned, page.leagueTable)

    matches.push(...table.matches)
    problems.push(...table.problems.map((problem) => `${name}: ${problem}`))
  }

  if (problems.length === 0 && matches.length !== page.matches) {
    problems.push(`${name} has ${matches.length} matches of sc Heerenveen, not ${page.matches}`)
  }

  return problems.length > 0
    ? { kind: 'error', message: problems.join('; ') }
    : { hasTemplates: true, kind: 'read', lastPlayedOn: null, matches }
}

/**
 * The time in the Netherlands of a time in another zone, as `20:05`, or empty when the day
 * there is another day than the day of the match here: the match then keeps its day only.
 */
function amsterdamTime(day: string, time: string, offsetHours: number): string {
  const [hours = 0, minutes = 0] = time.split(':').map(Number)
  const date = new RegExp(`^(\\d{1,2}) (${months.join('|')}) (\\d{4})$`, 'u').exec(day)

  if (date === null) {
    return ''
  }

  const moment = new Date(
    Date.UTC(Number(date[3]), months.indexOf(date[2] ?? ''), Number(date[1]), hours - offsetHours, minutes),
  )
  const parts = new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    hour: '2-digit',
    hourCycle: 'h23',
    minute: '2-digit',
    timeZone: 'Europe/Amsterdam',
  }).formatToParts(moment)
  const part = (type: string) => parts.find((found) => found.type === type)?.value ?? ''

  return Number(part('day')) === Number(date[1]) ? `${part('hour')}:${part('minute')}` : ''
}

/**
 * The parameters of a block of a Dutch page in the shape `readMatch` reads. The final of the
 * cup has its time in the field of the date, on a line of its own, and its town after the
 * stadium; the cards and the substitutions between the scorers are pictures, which go.
 */
function dutchBox(box: Template): Map<string, string> {
  const params = new Map(box.params)
  const dateAndTime = /^(.*\d{4}) (\d{1,2}[:.]\d{2})$/u.exec(plain(box.params.get('date') ?? ''))

  if (dateAndTime !== null && plain(box.params.get('time') ?? '') === '') {
    params.set('date', dateAndTime[1] ?? '')
    params.set('time', dateAndTime[2] ?? '')
  }
  params.set('stadium', stadiumOf(box))
  for (const side of ['goals1', 'goals2']) {
    params.set(side, (box.params.get(side) ?? '').replace(dutchExtras, ' '))
  }

  return params
}

/**
 * The parameters of a block of an English page in the shape `readMatch` reads, or what is wrong
 * with the block: the clubs by their Dutch names, the date as `25 juli 2009`, the time in the
 * Netherlands, the attendance without the commas of the thousands, the stadium without the town
 * after it, and the scorers one to a line without their links, cards and missed penalties.
 */
function englishBox(box: Template, pageZoneKnown: boolean): Map<string, string> | string {
  const params = new Map(box.params)

  for (const team of ['team1', 'team2']) {
    const target = teamOf(box.params.get(team) ?? '')

    if (ourNames.includes(target.toLowerCase())) {
      params.set(team, '[[sc Heerenveen]]')
    } else if (Object.hasOwn(englishClubs, target)) {
      const club = englishClubs[target]

      params.set(team, `[[${club?.page}|${club?.name}]]`)
    } else {
      return `'${target.slice(0, 60)}' has no name on the Dutch Wikipedia in the list of the importer`
    }
  }

  const date = englishDate(box.params.get('date') ?? '')

  params.set('date', date)
  params.set('time', englishTime(box.params.get('time') ?? '', date, pageZoneKnown))
  params.set('attendance', plain(box.params.get('attendance') ?? '').replace(/(?<=\d),(?=\d{3}\b)/gu, ''))
  params.set('stadium', stadiumOf(box))
  for (const side of ['goals1', 'goals2']) {
    params.set(
      side,
      (box.params.get(side) ?? '')
        .replace(englishExtras, ' ')
        .split('\n')
        .map((line) => line.replace(/^\s*\*\s*/u, '').replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/gu, '$1'))
        .filter((line) => line.trim() !== '')
        .join('<br />'),
    )
  }

  return params
}

/**
 * The date of an English block as the Dutch pages write one: `25 juli 2009` for `25 July 2009`
 * and for `{{Start date|2009|7|25|df=y}}`. Anything else stays as it is, and `readMatch` says
 * that it is no date we know.
 */
function englishDate(value: string): string {
  const start = /\{\{\s*Start date\s*\|\s*(\d{4})\s*\|\s*(\d{1,2})\s*\|\s*(\d{1,2})\b/iu.exec(value)
  const written = new RegExp(`^(\\d{1,2}) (${englishMonths.join('|')}) (\\d{4})$`, 'u').exec(plain(value))
  const [day, month, year] =
    start !== null
      ? [Number(start[3]), months[Number(start[2]) - 1], start[1]]
      : written !== null
        ? [Number(written[1]), months[englishMonths.indexOf(written[2] ?? '')], written[3]]
        : []

  return month === undefined ? plain(value) : `${day} ${month} ${year}`
}

/**
 * The kick-off of an English block as a time in the Netherlands, or empty when the page does
 * not say which zone the time is in. A block names its own zone with the hours from UTC,
 * `22:05 EEST (UTC+3)`, and that time is turned into ours. A block with a time alone follows
 * the line above the matches (`pageZoneKnown`): the time is then ours already, and what stands
 * after it is the local time once more.
 */
function englishTime(value: string, date: string, pageZoneKnown: boolean): string {
  const text = plain(value)
  const time = /^(\d{1,2}:\d{2})\b/u.exec(text)?.[1]
  const zone = /^\d{1,2}:\d{2} [A-Z]{2,5} \(UTC(?:([+−-])(\d{1,2}))?\)$/u.exec(text)

  if (time === undefined) {
    return text
  }
  if (zone !== null) {
    return amsterdamTime(date, time, zone[1] === undefined ? 0 : Number(zone[2]) * (zone[1] === '+' ? 1 : -1))
  }

  return pageZoneKnown ? time : ''
}

function isOurs(box: Template): boolean {
  return [box.params.get('team1'), box.params.get('team2')].some(
    (team) => team !== undefined && ourNames.includes(teamOf(team).toLowerCase()),
  )
}

/**
 * Reads the league table of the page of the club's season: a row is a match. The table has no
 * round, so a match gets `Speelronde 1` to `Speelronde 34` in the order of the rows, which must
 * be the order of the dates; a match that was played later than its round then has the number
 * of the day it was played, as the matches of the old fansite have. The date `31-08-2008` is
 * written the way the other pages write one, and our club, which the table shows without a
 * link, gets its link. The rest of a row goes through `readMatch`. The scorers have no minute
 * (see `tableGoals`). A header, a row or a date of another shape is a problem, and so is a row
 * without us or without a result.
 */
function readLeagueTable(cleaned: string, table: LeagueTable): { matches: ReadMatch[]; problems: string[] } {
  const headings = [...cleaned.matchAll(/^(={2,})[ \t]*(.+?)[ \t]*\1[ \t]*$/gmu)]
  const heading = headings.find((found) => table.heading.test(plain(found[2] ?? '')))
  const end = headings.find((found) => heading !== undefined && found.index > heading.index)?.index
  const body =
    heading === undefined
      ? undefined
      : /^\{\|[^\n]*\n([\s\S]*?)^\|\}/mu.exec(cleaned.slice(heading.index + heading[0].length, end))?.[1]

  if (body === undefined) {
    return { matches: [], problems: ['the page has no table with the league matches under the heading we know'] }
  }

  const [header = '', ...rows] = body
    .split(/^\|-[^\n]*$/mu)
    .map((row) => row.trim())
    .filter((row) => row !== '')
  const headers = header.split('\n').map((line) => plain(line.replace(/^!/u, '')))

  if (headers.join('|') !== leagueTableHeaders.join('|')) {
    return { matches: [], problems: ['the table with the league matches has other columns than the ones we know'] }
  }

  const matches: ReadMatch[] = []
  const problems: string[] = []

  for (const [index, row] of rows.entries()) {
    const round = `Speelronde ${index + 1}`
    // A cell may start with a stray bar or with an attribute: `align="center"|31-08-2008`.
    const cells = row
      .replace(/^\|/u, '')
      .split('||')
      .map((cell) => cell.replace(/^\s*(?:\|\s*)?(?:(?:[a-z]+="[^"]*"\s*)+\|)?/u, '').trim())
    const [stadium = '', date = '', team1 = '', score = '', team2 = '', ourGoals = '', theirGoals = ''] = cells
    const day = /^(\d{1,2})-(\d{1,2})-(\d{4})$/u.exec(plain(date))
    const teams = [team1, team2].map((team) => {
      const shown = plain(team)

      return ourNames.includes(shown.toLowerCase())
        ? '[[sc Heerenveen]]'
        : shown === '' && Object.hasOwn(table.opponents, plain(date))
          ? (table.opponents[plain(date)] ?? '')
          : team
    })

    if (cells.length !== leagueTableHeaders.length) {
      problems.push(`row ${index + 1} of the league table has ${cells.length} cells, not ${leagueTableHeaders.length}`)
      continue
    }
    if (teams.filter((team) => team === '[[sc Heerenveen]]').length !== 1) {
      problems.push(`row ${index + 1} of the league table is no match of ours against another club`)
      continue
    }

    const read = readMatch(
      {
        heading: null,
        index: heading?.index ?? 0,
        params: new Map([
          ['date', day === null ? date : `${Number(day[1])} ${months[Number(day[2]) - 1] ?? day[2]} ${day[3]}`],
          ['score', score],
          ['stadium', stadium],
          ['team1', teams[0] ?? ''],
          ['team2', teams[1] ?? ''],
        ]),
      },
      'Eredivisie',
      round,
    )

    if (typeof read === 'string') {
      problems.push(read)
    } else if (read.status !== 'played') {
      problems.push(`${round} (Eredivisie) has no result`)
    } else if (read.matchDate < (matches.at(-1)?.matchDate ?? '')) {
      problems.push(`${round} (Eredivisie) is on an earlier day than the row above it`)
    } else {
      matches.push({ ...read, ...tableGoals(read.home ? [ourGoals, theirGoals] : [theirGoals, ourGoals], read) })
    }
  }

  return { matches, problems }
}

/** The stadium of a block without the town after it: `De Kuip` for `De Kuip, Rotterdam`. */
function stadiumOf(box: Template): string {
  return (
    plain(withoutTemplates(box.params.get('stadium') ?? ''))
      .split(',')[0]
      ?.trim() ?? ''
  )
}

/**
 * The goals of a row of the league table, the home club first: `[ours, theirs]` or the other
 * way round. A cell names the scorers after `{{goal}}` and before the first picture of a card:
 * `{{goal}} [[Danijel Pranjić|Pranjic]] 2X en [[Roy Beerens|Beerens]]`, with commas, `en` and
 * line breaks between them. `2X` is two goals of that player and `e.d.` an own goal, which
 * stands with the club that benefits. The table has no minutes, so a goal has none, and the
 * goals of a club keep the order of the cell. What stands before `{{goal}}` is no scorer. Two
 * cells without a goal mean the page names no scorers; a part we do not know is a problem and
 * no goals at all, since half a list says something false.
 */
function tableGoals(
  cells: string[],
  match: Pick<ReadMatch, 'competition' | 'home' | 'round'>,
): Pick<ReadMatch, 'goals' | 'goalsProblem'> {
  const goals: ReadGoal[] = []
  const problem = (text: string) => ({ goals: null, goalsProblem: `${match.round} (${match.competition}): ${text}` })

  if (cells.every((cell) => !/\{\{/u.test(cell))) {
    return { goals: null, goalsProblem: null }
  }

  for (const [index, cell] of cells.entries()) {
    const marks = [...cell.matchAll(/\{\{\s*goal\s*\}\}/giu)]
    const [mark] = marks

    if (marks.length > 1 || (mark === undefined && /\{\{/u.test(cell))) {
      return problem(`the scorers have a template we do not know: '${plain(cell).slice(0, 40)}'`)
    }
    if (mark === undefined) {
      continue
    }

    const scorers = cell
      .slice(mark.index + mark[0].length)
      .replace(/\[\[Bestand:[\s\S]*$/iu, '')
      .replace(/<br\s*\/?>/giu, ' ')
    const found = [...scorers.matchAll(tableScorer)]
    const rest = scorers.replace(tableScorer, ' ').replace(/,|(?<![^\s,])en(?![^\s,])/giu, ' ')

    if (found.length === 0 || rest.trim() !== '') {
      return problem(`the scorers have a part we do not know: '${plain(scorers).slice(0, 40)}'`)
    }

    for (const scorer of found) {
      const player = plain(scorer[2] ?? scorer[1] ?? '')

      if (player === '' || player.length > matchGoalPlayerMaxLength) {
        return problem(`a goal has no usable name: '${plain(scorers).slice(0, 40)}'`)
      }
      for (let count = Number(scorer[4] ?? 1); count > 0; count -= 1) {
        goals.push({
          minute: null,
          ours: (index === 0) === match.home,
          ownGoal: scorer[3] !== undefined,
          penalty: false,
          player,
          playerPage: linkedPage(scorer[0]),
          stoppageMinutes: null,
        })
      }
    }
  }

  return { goals, goalsProblem: null }
}

/** Where the link of a team points, or its name, without the flag beside it. */
function teamOf(value: string): string {
  return linkTarget(withoutTemplates(value))
}

/** A value without the templates in it, such as the flag `{{fbaicon|NED}}` beside a club. */
function withoutTemplates(value: string): string {
  return value.replace(/\{\{[^{}]*\}\}/gu, '')
}
