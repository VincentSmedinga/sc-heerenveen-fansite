// The check report of the import of the old fansite (#880): what the import could not fill or
// did not trust, as a Markdown text in Dutch for the project owner and for #414, which fills in
// what Wikipedia still has to add. It reads the files and the database and writes nothing: the
// functions take only `select`, so the type forbids a write. It does not work anything out
// itself: it asks the steps, which hand over their notices as data (`deriveOldSiteMatches`,
// `deriveOldSiteGoals`, `deriveOldSitePlayers`, `judgeStoredOldSiteMatch`, `findOldSiteClubs`),
// so the report and the import can't disagree.
import type { Match } from '@fansite/db/schema'

import { normaliseClubName } from '@fansite/db/clubs'
import { clubs, matches, matchGoals, matchStatistics } from '@fansite/db/schema'
import { asc } from 'drizzle-orm'

import type { OldSiteData } from './old-site-file.ts'
import type { OldSiteNameSpelling } from './old-site-name-clusters.ts'
import type { OldSiteReportAbout, OldSiteReportAnomalyCode, OldSiteReportNoteCode } from './old-site-report.ts'
import type { OldSiteDatabase } from './old-site-step.ts'

import { findOldSiteClubs } from './old-site-clubs.ts'
import { deriveOldSiteGoals } from './old-site-goals.ts'
import { judgeStoredOldSiteMatch } from './old-site-lineups.ts'
import { deriveOldSiteMatches, matchKey, oldSiteSource } from './old-site-matches.ts'
import { countOldSiteNames, findOldSiteNameClusters } from './old-site-name-clusters.ts'
import { oldSiteSquadNamesToDecide } from './old-site-names.ts'
import { deriveOldSitePlayers, oldSitePlayerIds } from './old-site-players.ts'

/** Everything the report says. */
export type OldSiteCheck = {
  /** Assists the report left empty. */
  assists: OldSiteCheckItem[]
  /** Cards and line-ups the import left out (no minute or place), and yellow cards it added. */
  cards: OldSiteCheckItem[]
  /** Clubs the old fansite spells in another way than the club in the database. */
  clubsLinked: string[]
  /** Clubs of the old fansite that have no club in the database. */
  clubsMissing: string[]
  /** Clubs made by the import: no Wikipedia page, and no match from another source. */
  clubsNew: string[]
  /** How many clubs have the name of the old fansite. */
  clubsSame: number
  goals: OldSiteCheckItem[]
  /** Names that look alike and may be one person, for the owner to decide. */
  nameClusters: OldSiteNameSpelling[][]
  /** Matches of the files that are not in the database. */
  notInDatabase: OldSiteCheckItem[]
  /** Matches in the database from the old fansite that the files don't have. */
  notInFile: OldSiteCheckItem[]
  /** Players whose name comes from their code. */
  players: OldSiteCheckPlayer[]
  /** The remarks of the old editors, with whether the import copied them. */
  remarks: (OldSiteCheckItem & { copied: boolean })[]
  /** Reports that are `bezig`, each with the reasons. */
  reportsBezig: OldSiteCheckItem[]
  /** Rounds that have another number than the old fansite gave them. */
  rounds: OldSiteCheckItem[]
  /** Scorers who are not in the line-up of their team. */
  scorers: OldSiteCheckItem[]
  seasons: OldSiteCheckSeason[]
  total: OldSiteCheckSeason
  /** Yellow cards the report has with an empty minute. */
  yellowWithoutMinute: number
}

/** The database as the report uses it: it can only read. */
export type OldSiteCheckDatabase = Pick<OldSiteDatabase, 'select'>

/** One line of a list: a match and what is wrong with it. */
export type OldSiteCheckItem = { match: OldSiteCheckMatch; text: string }

/** A match as the lists name it: the season, the competition, the day and the opponent. */
export type OldSiteCheckMatch = { competition: string; date: string; opponent: string; season: string }

/** A player whose code has no row in the old table `speler`. */
export type OldSiteCheckPlayer = { code: string; name: string; seasons: string[] }

/** The numbers of one season, or of all of them. */
export type OldSiteCheckSeason = {
  /** Matches with a day and no time. */
  dateOnly: number
  /** Matches with goals that add up to the score, also a match without goals. */
  goalsAddUp: number
  /** Matches with a score and no goals. */
  goalsNone: number
  /** Matches with part of the goals. */
  goalsPartial: number
  /** Matches that are in the database. */
  inDatabase: number
  /** Matches in the files. */
  inFile: number
  reportsBezig: number
  reportsKlaar: number
  season: string
  withAttendance: number
  withLineup: number
  withReferee: number
  withStatistics: number
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

/** `1999-08-14` as `14 augustus 1999`. */
export function dutchDate(date: string): string {
  const [year = '', month = '', day = ''] = date.split('-')

  return `${Number(day)} ${months[Number(month) - 1] ?? month} ${year}`
}

const cardNames: Readonly<Record<string, string>> = {
  geel: 'gele kaart',
  'geel-rood': 'geel-rode kaart',
  rood: 'rode kaart',
}

const cardName = (kind: string | undefined) => cardNames[kind ?? ''] ?? 'kaart'

const minuteText = (minute: null | number | undefined) =>
  minute === null || minute === undefined ? 'minuut onbekend' : `minuut ${minute}`

/** What a notice of the report says, in Dutch, from its code and what it is about. */
export function describeNotice(
  code: OldSiteReportAnomalyCode | OldSiteReportNoteCode,
  about: OldSiteReportAbout,
): string {
  const { kind, minute, other, subject } = about
  const goal = `${other ?? 'onbekend'} (${minuteText(minute)})`

  switch (code) {
    case 'assist-empty':
      return kind === 'penalty'
        ? `assist van ${subject} bij de strafschop van ${goal}: weggelaten`
        : kind === 'own-goal'
          ? `assist van ${subject} bij het eigen doelpunt van ${goal}: weggelaten`
          : `assist van ${subject} is de doelpuntenmaker zelf (${goal}): leeg gelaten`
    case 'assist-not-found':
      return `assist van ${subject} bij het doelpunt van ${goal}: staat niet in de opstelling van het team, leeg gelaten`
    case 'card-not-in-lineup':
      return `${cardName(kind)} voor ${subject}: staat niet in de opstelling (de trainer of geen speler), weggelaten`
    case 'card-twice':
      return `${subject} heeft twee keer een ${cardName(kind)}: de tweede is weggelaten`
    case 'duplicate-player':
      return `${subject} staat twee keer in de opstelling: de tweede is weggelaten`
    case 'early-exit':
      return `${subject} gaat in ${minuteText(minute)} eruit zonder invaller en zonder rode kaart`
    case 'goal-scorer-not-found':
      return `doelpuntenmaker ${subject} (${minuteText(minute)}) staat niet in de opstelling`
    case 'no-player-row':
      return kind === 'code'
        ? `de code '${subject}' in de opstelling is geen speler`
        : kind === 'no-name'
          ? 'een speler in de opstelling heeft geen naam'
          : kind === 'long-name'
            ? `de naam '${subject}' is te lang voor de database`
            : `${subject} heeft geen rij bij de spelers van het seizoen`
    case 'no-substitute-out':
      return `${subject} komt in ${minuteText(minute)} erin en niemand van het team gaat er dan uit`
    case 'red-card-without-minute':
      return `${cardName(kind)} voor ${subject}: geen minuut en ook geen minuut van weggaan, weggelaten`
    case 'unusable-minute':
      return kind === 'lineup'
        ? `${subject} komt erin of gaat eruit na minuut 120: de speler is weggelaten`
        : `${cardName(kind)} voor ${subject} valt na minuut 120: weggelaten`
    case 'yellow-derived':
      return `${subject} heeft een geel-rode kaart en geen gele kaart: de gele kaart is afgeleid, zonder minuut`
  }
}

/** The text of a rule of `@fansite/shared/match-report`, without its closing full stop. */
const ruleText = (code: string, message: string) =>
  `regel \`${code}\`: ${message
    .replace(/\s+/gu, ' ')
    .replace(/[.!?]+$/u, '')
    // A rule may say two sentences; the report keeps one sentence to a line.
    .replace(/[.!?] (\p{Lu})/gu, (_, letter: string) => `; ${letter.toLowerCase()}`)}`

const emptySeason = (season: string): OldSiteCheckSeason => ({
  dateOnly: 0,
  goalsAddUp: 0,
  goalsNone: 0,
  goalsPartial: 0,
  inDatabase: 0,
  inFile: 0,
  reportsBezig: 0,
  reportsKlaar: 0,
  season,
  withAttendance: 0,
  withLineup: 0,
  withReferee: 0,
  withStatistics: 0,
})

/**
 * Works out the report from the files and the database. It reads and never writes. A match
 * that is not in the database as a match of the old fansite counts in the files and in the
 * list `notInDatabase`, and has no numbers of the database.
 */
export async function buildOldSiteCheck(db: OldSiteCheckDatabase, data: OldSiteData): Promise<OldSiteCheck> {
  const byCode = new Map(data.players.map((player) => [player.code, player]))
  const derived = deriveOldSiteMatches(data.matches)
  const clubNames = new Map(data.clubs.map((club) => [club.code, club.name]))
  const seasons = [...new Set(derived.flatMap((one) => (one.values === null ? [] : [one.values.season])))]
  const playerIds = await oldSitePlayerIds(db, seasons)
  const allMatches = await db.select().from(matches)
  const stored = new Map<string, Match>()
  const otherSourceClubs = new Set<number>()

  for (const row of allMatches) {
    if (row.dataSource === oldSiteSource) {
      stored.set(matchKey(row), row)
    } else {
      otherSourceClubs.add(row.clubId)
    }
  }

  const withStatistics = new Set((await db.select().from(matchStatistics)).map((row) => row.matchId))
  const goalsOf = new Map<number, (typeof matchGoals.$inferSelect)[]>()

  for (const row of await db.select().from(matchGoals).orderBy(asc(matchGoals.id))) {
    goalsOf.set(row.matchId, [...(goalsOf.get(row.matchId) ?? []), row])
  }

  const check: OldSiteCheck = {
    assists: [],
    cards: [],
    clubsLinked: [],
    clubsMissing: [],
    clubsNew: [],
    clubsSame: 0,
    goals: [],
    nameClusters: [],
    notInDatabase: [],
    notInFile: [],
    players: [],
    remarks: [],
    reportsBezig: [],
    rounds: [],
    scorers: [],
    seasons: [],
    total: emptySeason('Totaal'),
    yellowWithoutMinute: 0,
  }
  const perSeason = new Map<string, OldSiteCheckSeason>()
  const keys = new Set<string>()

  for (const one of derived) {
    const { match, values } = one
    const clubName = clubNames.get(one.clubCode) ?? one.clubCode

    if (values === null) {
      const day = match.dateTime.slice(0, 10)

      check.notInDatabase.push({
        match: { competition: `code ${match.competition}`, date: day, opponent: clubName, season: match.season },
        text: one.skip ?? 'niet te gebruiken',
      })
      continue
    }

    const label: OldSiteCheckMatch = {
      competition: values.competition,
      date: values.matchDate,
      opponent: clubName,
      season: values.season,
    }
    const before = stored.get(matchKey(values))
    const season = perSeason.get(values.season) ?? emptySeason(values.season)

    perSeason.set(values.season, season)
    season.inFile += 1

    if (values.kickoffAt === null) {
      season.dateOnly += 1
    }

    const goalState = deriveOldSiteGoals(
      match,
      { against: values.goalsAgainst ?? 0, for: values.goalsFor ?? 0 },
      byCode,
    )

    if (goalState.state === 'adds-up') {
      season.goalsAddUp += 1
    } else if (goalState.state === 'none') {
      season.goalsNone += 1
    } else {
      season.goalsPartial += 1
    }
    if (goalState.state !== 'adds-up') {
      const listed = goalState.listed.for + goalState.listed.against

      check.goals.push({
        match: label,
        text:
          goalState.state === 'none'
            ? `uitslag ${values.goalsFor}-${values.goalsAgainst}, geen doelpunten in het bestand`
            : `uitslag ${values.goalsFor}-${values.goalsAgainst}, maar ${listed} ${listed === 1 ? 'doelpunt' : 'doelpunten'} in het bestand (${goalState.listed.for}-${goalState.listed.against})`,
      })
    }
    if (match.lineup.length > 0) {
      season.withLineup += 1
    }
    if (match.note !== null && match.note.trim() !== '') {
      check.remarks.push({ copied: values.note !== null, match: label, text: match.note.trim() })
    }

    // The round: only a league has rounds of its own to compare with. In a cup the old fansite
    // numbered the rounds of the cup, and the import counts the matches.
    const number = Number(/(\d+)$/u.exec(values.round)?.[1])

    if (values.round.startsWith('Speelronde') && match.round !== null && match.round > 0 && match.round !== number) {
      check.rounds.push({
        match: label,
        text: `de oude fansite had ronde ${match.round}, de database heeft ronde ${number}`,
      })
    }

    if (before === undefined) {
      check.notInDatabase.push({ match: label, text: 'niet in de database als wedstrijd van de oude fansite' })
      continue
    }

    keys.add(matchKey(values))
    season.inDatabase += 1

    if (before.referee !== null) {
      season.withReferee += 1
    }
    if (before.attendance !== null) {
      season.withAttendance += 1
    }
    if (withStatistics.has(before.id)) {
      season.withStatistics += 1
    }
    if (match.lineup.length === 0) {
      continue
    }

    const { verdict, wanted } = judgeStoredOldSiteMatch(
      match,
      values.season,
      before,
      goalsOf.get(before.id) ?? [],
      byCode,
      playerIds,
    )

    if (verdict.status === 'klaar') {
      season.reportsKlaar += 1
    } else {
      season.reportsBezig += 1
      check.reportsBezig.push({
        match: label,
        text: [
          ...wanted.anomalies.map((anomaly) => describeNotice(anomaly.code, anomaly.about)),
          ...[...new Map(verdict.check.errors.map((issue) => [issue.code, issue])).values()].map((issue) =>
            ruleText(issue.code, issue.message),
          ),
        ].join('; '),
      })
    }

    check.yellowWithoutMinute += wanted.cards.filter((card) => card.kind === 'geel' && card.minute === null).length

    for (const note of wanted.notes) {
      const item = { match: label, text: describeNotice(note.code, note.about) }

      if (note.code === 'card-not-in-lineup' || note.code === 'yellow-derived') {
        check.cards.push(item)
      } else if (note.code === 'goal-scorer-not-found') {
        check.scorers.push(item)
      } else if (note.code === 'assist-empty' || note.code === 'assist-not-found') {
        check.assists.push(item)
      }
    }
    for (const anomaly of wanted.anomalies) {
      if (
        anomaly.code === 'red-card-without-minute' ||
        (anomaly.code === 'unusable-minute' && anomaly.about.kind !== 'lineup')
      ) {
        check.cards.push({ match: label, text: describeNotice(anomaly.code, anomaly.about) })
      }
    }
  }

  const total = check.total

  check.seasons = [...perSeason.values()].toSorted((a, b) => a.season.localeCompare(b.season))

  for (const season of check.seasons) {
    for (const key of Object.keys(total) as (keyof OldSiteCheckSeason)[]) {
      if (key !== 'season') {
        total[key] += season[key]
      }
    }
  }

  for (const row of stored.values()) {
    if (!keys.has(matchKey(row))) {
      check.notInFile.push({
        match: { competition: row.competition, date: row.matchDate, opponent: row.opponent, season: row.season },
        text: `staat in de database als wedstrijd van de oude fansite (${row.round}), maar niet in de bestanden`,
      })
    }
  }

  // The players whose name comes from their code, once for each code with their seasons.
  const byPlayer = new Map<string, OldSiteCheckPlayer>()

  for (const player of deriveOldSitePlayers(data.matches, data.players)) {
    if (player.nameFromCode) {
      const one = byPlayer.get(player.code) ?? { code: player.code, name: player.name, seasons: [] }

      one.seasons.push(player.season)
      byPlayer.set(player.code, one)
    }
  }
  check.players = [...byPlayer.values()].toSorted((a, b) => a.name.localeCompare(b.name))

  check.nameClusters = findOldSiteNameClusters(countOldSiteNames(data))

  // The clubs: new, linked to a club that was there, or the same.
  const clubRows = new Map((await db.select().from(clubs)).map((row) => [row.id, row]))

  for (const { club, old } of await findOldSiteClubs(db, data.clubs)) {
    if (club === undefined) {
      check.clubsMissing.push(`${old.name} (${old.code})`)
    } else if (clubRows.get(club.id)?.wikipediaPage === null && !otherSourceClubs.has(club.id)) {
      check.clubsNew.push(
        normaliseClubName(club.name) === normaliseClubName(old.name)
          ? `${old.name} (${old.code})`
          : `${old.name} (${old.code}): club ${club.name}`,
      )
    } else if (normaliseClubName(club.name) === normaliseClubName(old.name)) {
      check.clubsSame += 1
    } else {
      check.clubsLinked.push(`${old.name} (${old.code}): club ${club.name}`)
    }
  }

  return check
}

const tableColumns: readonly [header: string, value: (season: OldSiteCheckSeason) => number | string][] = [
  ['Seizoen', (season) => season.season],
  ['Bestand', (season) => season.inFile],
  ['Database', (season) => season.inDatabase],
  ['Goals kloppen', (season) => season.goalsAddUp],
  ['Geen goals', (season) => season.goalsNone],
  ['Deel van goals', (season) => season.goalsPartial],
  ['Opstelling', (season) => season.withLineup],
  ['Klaar', (season) => season.reportsKlaar],
  ['Bezig', (season) => season.reportsBezig],
  ['Scheids', (season) => season.withReferee],
  ['Publiek', (season) => season.withAttendance],
  ['Cijfers', (season) => season.withStatistics],
  ['Alleen datum', (season) => season.dateOnly],
]

const itemText = ({ match, text }: OldSiteCheckItem) =>
  `${match.season}, ${match.competition}, ${dutchDate(match.date)}, ${match.opponent}: ${text}`

/** The report as Markdown: an introduction, a table per season and the lists. */
export function formatOldSiteCheck(check: OldSiteCheck, today: string): string {
  const lines: string[] = []
  const section = (title: string, intro: string[], items: string[]) => {
    lines.push('', `## ${title}`, '', ...intro)

    if (items.length === 0) {
      lines.push('', 'Geen.')

      return
    }

    lines.push('', ...items.map((item) => `- ${item}`))
  }

  lines.push(
    '# Oude wedstrijden: wat ontbreekt of niet klopt',
    '',
    'Dit verslag laat zien wat de import van de wedstrijden van de oude fansite (1990 tot 2007) niet kon vullen, of niet vertrouwde.',
    'De projecteigenaar leest het, en het issue over de aanvulling met Wikipedia (#414) gebruikt het om te zien wat daar nog bij moet.',
    `Gemaakt op ${dutchDate(today)}, op een database met de import van de bestanden in \`apps/importer/data/oude-fansite\`.`,
    'Maak het opnieuw na de import met `pnpm --silent import:old-site --report > docs/oude-wedstrijden-hiaten.md`, of met de workflow _Import old site_ en de keuze `report`.',
    'De opdracht leest de bestanden en de database en schrijft niets in de database.',
    'Het verslag noemt namen zoals ze in de wedstrijd stonden, op de samengevoegde spellingen na.',
    '',
    '## Per seizoen',
    '',
    `| ${tableColumns.map(([header]) => header).join(' | ')} |`,
    `| ${tableColumns.map((_, index) => (index === 0 ? '---' : '---:')).join(' | ')} |`,
    ...[...check.seasons, check.total].map(
      (season) => `| ${tableColumns.map(([, value]) => value(season)).join(' | ')} |`,
    ),
    '',
    'Bestand en Database zijn het aantal wedstrijden in de bestanden en in de database.',
    'Goals kloppen telt de wedstrijden waarvan de doelpunten optellen tot de uitslag, ook een wedstrijd zonder doelpunten.',
    'Geen goals en Deel van goals zijn de wedstrijden waarvan de doelpunten ontbreken of niet optellen: die krijgen geen doelpunten in de database.',
    'Opstelling telt de wedstrijden met een opstelling in de bestanden, Klaar en Bezig de verslagen van die wedstrijden.',
    'Scheids, Publiek en Cijfers zijn de wedstrijden met een scheidsrechter, toeschouwers en statistieken in de database.',
    'Alleen datum zijn de wedstrijden met een dag en zonder aanvangstijd.',
  )

  section(
    'Wedstrijden die niet in de database staan',
    ['De bestanden hebben deze wedstrijden, de database niet als wedstrijd van de oude fansite.'],
    check.notInDatabase.map(itemText),
  )
  section(
    'Wedstrijden in de database die niet in de bestanden staan',
    ["De import haalt zo'n wedstrijd nooit weg."],
    check.notInFile.map(itemText),
  )
  section(
    'Rondes met een ander nummer',
    [
      'De import nummert de speelrondes van een competitie op de volgorde van de datum, want de nummers van de oude fansite zijn niet te vertrouwen.',
      'Bij de beker staan alleen de nummers van de wedstrijden; die worden niet vergeleken.',
    ],
    check.rounds.map(itemText),
  )
  section(
    'Wedstrijden met een opmerking van de oude fansite',
    [
      'Alleen een opmerking die een bezoeker iets zegt, gaat mee naar de wedstrijd (overgenomen).',
      'De andere zijn werkaantekeningen van de oude redacteuren en zijn niet gekopieerd.',
    ],
    check.remarks.map((remark) =>
      itemText({ ...remark, text: `${remark.text} (${remark.copied ? 'overgenomen' : 'niet overgenomen'})` }),
    ),
  )
  section(
    'Doelpunten die niet optellen',
    [
      "Zo'n wedstrijd krijgt geen doelpunten, want een lijst die de uitslag tegenspreekt, spreekt ook de bezoeker tegen.",
    ],
    check.goals.map(itemText),
  )
  section(
    'Verslagen die bezig zijn',
    [
      'Een verslag is klaar als de regels van het verslag geen fout vinden en er niets is weggelaten of twijfelachtig is.',
      'Anders is het bezig, met de reden hier.',
    ],
    check.reportsBezig.map(itemText),
  )
  section(
    'Spelers van wie de code geen rij in de oude tabel had',
    ['De naam is gemaakt uit de code, dus de schrijfwijze kan afwijken.'],
    check.players.map((player) => `${player.name} (\`${player.code}\`), ${player.seasons.join(', ')}`),
  )
  section(
    'Kaarten die de import oversloeg of afleidde',
    [
      'Kaarten van de trainer en van iemand die niet in de opstelling staat, en rode kaarten zonder minuut en zonder minuut van weggaan.',
      'Een geel-rode kaart zonder gele kaart krijgt een gele kaart zonder minuut: de oude fansite schreef de twee als één kaart.',
      `Daarnaast hebben ${check.yellowWithoutMinute} gele kaarten een lege minuut in het verslag, want de oude fansite kende de minuut niet (ook de afgeleide).`,
    ],
    check.cards.map(itemText),
  )
  section(
    'Doelpuntenmakers die niet in de opstelling staan',
    ["Zo'n doelpunt heeft in het verslag geen speler."],
    check.scorers.map(itemText),
  )
  section('Assists zonder speler', ['Deze assists zijn leeg gelaten in het verslag.'], check.assists.map(itemText))
  section(
    'Namen om te beslissen',
    [
      'Deze namen lijken op elkaar en horen misschien bij één persoon.',
      'Namen die zeker één persoon zijn, of waarvan de projecteigenaar de paren goedkeurde, hebben de schrijfwijze van nl.wikipedia gekregen (en.wikipedia als nl geen artikel heeft).',
      'De import laat ze zoals ze zijn, en de projecteigenaar beslist per groep.',
      'Tussen haakjes staat hoe vaak de spelling in de opstellingen, doelpunten, kaarten en assists voorkomt.',
      'Een groep kan ook uit twee mensen bestaan, zoals Michel Vonk en Michel Vorm.',
    ],
    check.nameClusters.map((group) => group.map((one) => `${one.name} (${one.count})`).join(' / ')),
  )
  section(
    'Namen op de spelerskaarten om te beslissen',
    [
      'Deze namen staan in de selectie van een seizoen, uit Wikipedia en uit de oude fansite, en horen misschien bij één persoon.',
      'De import laat ze zoals ze zijn, en de projecteigenaar beslist per groep.',
      'Jordy Bruijn en Jordy Buijs zijn waarschijnlijk twee mensen.',
    ],
    oldSiteSquadNamesToDecide.map((group) => group.join(' / ')),
  )
  section(
    'Nieuwe clubs',
    [
      'De import maakte deze clubs, zonder Wikipedia-pagina; de import van Wikipedia geeft ze die zodra een wedstrijd ze noemt.',
    ],
    check.clubsNew,
  )
  section(
    'Clubs gekoppeld aan een bestaande club',
    ['De oude fansite schrijft deze clubs anders dan de club in de database.'],
    check.clubsLinked,
  )

  lines.push('', `${check.clubsSame} clubs hebben dezelfde naam als in de oude fansite.`)

  if (check.clubsMissing.length > 0) {
    section('Clubs zonder club in de database', [], check.clubsMissing)
  }

  return `${lines.join('\n')}\n`
}
