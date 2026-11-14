import {
  Card,
  DataTable,
  Disclosure,
  Heading,
  Link,
  List,
  PlayerName,
  ShortFact,
  tableColumns,
  Text,
  TopScorersTable,
} from '@fansite/design-system'

import type { allTimeScorersOf } from './all-time-players'

import {
  type AllTimeMatch,
  type ClubTopScorerSeason,
  clubTopScorerSeasonsShown,
  type CountPlace,
  countRows,
  type Hattrick,
  hattrickDay,
  matchKey,
  type PlayerRecord,
  type PlayerRecords,
  type RecordEntry,
  scorersMore,
  scorersShown,
  shortListPlaces,
  type YearsPlace,
} from './all-time-players'
import { type CompetitionChoice, competitionQuery, competitionWords } from './competition'
import { formatTableDay } from './match-format'
import { scorersCoverage } from './matches'
import { imageCredit } from './MatchViews'
import { playerFiguresPath } from './season-page'
import { seasonAddress } from './seasons'

// The cards of the page Spelers · Cijfers with the choice "Alle seizoenen" (#1219). They count
// every season we have, and a card with nothing to say is left out by the page.

/** What the cards say about the competitions they count, such as `alle wedstrijden`. */
const wordsOf = (competition: CompetitionChoice) => competitionWords(competition)

/** How many players stand in these places: a place can hold more than one. */
const playersIn = (places: readonly YearsPlace[]) => places.reduce((sum, place) => sum + place.players.length, 0)

/**
 * The card Topscorers sinds <season>: the first ten places of the goal scorers of all seasons,
 * as the card of a season counts them, with the years each was with the club. Under the table a
 * closed block shows the places 11 to 25, and a line says for how many matches we don't know
 * the scorers. The card is white and stands in the main column.
 */
export function AllTimeScorersCard({
  competition,
  matches,
  scorers,
}: {
  competition: CompetitionChoice
  matches: readonly AllTimeMatch[]
  scorers: ReturnType<typeof allTimeScorersOf>
}) {
  const { more, since, top, topGoals, total } = scorers
  const { known, played } = scorersCoverage([...matches], competition)
  const caption = (part: string) =>
    `${part} van sc Heerenveen sinds ${since ?? ''}, in ${wordsOf(competition)}, met de jaren bij de club`
  const cut = playersIn(top) < total

  return (
    <Card aria-labelledby="topscorers-sinds-1990-91" shareable={imageCredit(true, undefined, [...matches])}>
      <Heading anchor id="topscorers-sinds-1990-91" level={2}>
        {`Topscorers sinds ${since ?? ''}`}
      </Heading>
      <Text>
        {cut
          ? `De top ${scorersShown} van ${total} spelers die scoorden`
          : total === 1
            ? '1 speler heeft gescoord'
            : `${total} spelers hebben gescoord`}
      </Text>
      <TopScorersTable
        caption={caption(cut ? `De top ${scorersShown} van de doelpuntenmakers` : 'Doelpuntenmakers')}
        rows={top}
        showYears
      />
      {more.length > 0 && (
        <Disclosure summary={`Toon de top ${scorersMore}`}>
          <TopScorersTable
            caption={caption(`De plaatsen ${scorersShown + 1} tot en met ${scorersMore} van de doelpuntenmakers`)}
            rows={more}
            scaleTo={topGoals}
            showYears
          />
        </Disclosure>
      )}
      {known < played && (
        <Text appearance="meta">
          {`Van ${played - known} ${played - known === 1 ? 'wedstrijd' : 'wedstrijden'} kennen we de doelpuntenmakers niet.`}
        </Text>
      )}
    </Card>
  )
}

/**
 * The card Clubtopscorer per seizoen: a row for each season, the newest first, with the
 * season (a link to its figures), the player or players who shared the first place and their
 * goals. The last five seasons are in the table and a closed block has the rest. A season
 * whose scorers we don't all know has a star and, under the tables, a line that says so. The
 * card is white and stands in the main column, under Topscorers sinds 1990/91.
 */
export function ClubTopScorersCard({
  competition,
  current,
  matches,
  seasons,
}: {
  competition: CompetitionChoice
  /** The current season, whose figures have the address of the page itself. */
  current: string
  matches: readonly AllTimeMatch[]
  seasons: readonly ClubTopScorerSeason[]
}) {
  const recent = seasons.slice(0, clubTopScorerSeasonsShown)
  const earlier = seasons.slice(clubTopScorerSeasonsShown)
  const caption = (part: string) => `${part} van sc Heerenveen, in ${wordsOf(competition)}, met zijn doelpunten`
  const table = (rows: readonly ClubTopScorerSeason[], part: string) => (
    <DataTable
      appearance="text"
      caption={caption(part)}
      columns={['Seizoen', 'Speler', { abbreviation: 'D', name: 'Doelpunten' }]}
      rows={rows.map(({ goals, incomplete, players, season }) => ({
        cells: [
          players.map((player, index) => (
            <Text as="span" key={player.id}>
              {index > 0 && ', '}
              <PlayerName givenName={player.givenName} href={player.href} surname={player.surname} />
            </Text>
          )),
          incomplete ? (
            <>
              {goals}
              <Text aria-hidden="true" as="span">
                *
              </Text>
              <Text as="span" className="hf-visually-hidden">
                , niet alle doelpuntenmakers bekend
              </Text>
            </>
          ) : (
            goals
          ),
        ],
        header: season,
        href: `${seasonAddress(playerFiguresPath, season, current)}${competitionQuery(competition)}`,
      }))}
    />
  )

  return (
    <Card aria-labelledby="clubtopscorer-per-seizoen" shareable={imageCredit(true, undefined, [...matches])}>
      <Heading anchor id="clubtopscorer-per-seizoen" level={2}>
        Clubtopscorer per seizoen
      </Heading>
      <Text>
        {seasons.length === 1 ? 'De clubtopscorer van 1 seizoen' : `De clubtopscorer van ${seasons.length} seizoenen`}
      </Text>
      {table(
        recent,
        `De laatste ${recent.length === 1 ? 'seizoen' : `${recent.length} seizoenen`} met de clubtopscorer`,
      )}
      {earlier.length > 0 && (
        <Disclosure summary={`Toon alle ${seasons.length} seizoenen`}>
          {table(earlier, 'De oudere seizoenen met de clubtopscorer')}
        </Disclosure>
      )}
      {seasons.some((season) => season.incomplete) && (
        <Text appearance="meta">
          * Van een deel van de wedstrijden van dit seizoen kennen we de doelpuntenmakers niet.
        </Text>
      )}
    </Card>
  )
}

/**
 * The card Hattricks: the players with the most of them, from the first five places, and a
 * closed block with every hattrick: the player, the match and its day. The match is a link when
 * it has a page (`reportHrefs`, by season, competition and round). The card is soft, in the
 * sidebar.
 */
export function HattricksCard({
  competition,
  hattricks,
  matches,
  reportHrefs,
}: {
  competition: CompetitionChoice
  hattricks: { list: Hattrick[]; top: CountPlace[]; total: number }
  matches: readonly AllTimeMatch[]
  reportHrefs: ReadonlyMap<string, string>
}) {
  const { list, top, total } = hattricks

  return (
    <Card aria-labelledby="hattricks" shareable={imageCredit(true, undefined, [...matches])} surface="soft">
      <Heading anchor id="hattricks" level={2}>
        Hattricks
      </Heading>
      <Text>{total === 1 ? '1 hattrick' : `${total} hattricks`}</Text>
      <TopScorersTable
        caption={`De top ${shortListPlaces} van de spelers met de meeste hattricks voor sc Heerenveen, in ${wordsOf(competition)}`}
        figure={tableColumns.hattricks}
        rows={countRows(top)}
      />
      <Disclosure summary={total === 1 ? 'Toon de hattrick' : `Toon alle ${total} hattricks`}>
        <List role="list">
          {list.map((hattrick) => {
            const { competition: played, date, label, round, season } = hattrick.match
            const href = reportHrefs.get(matchKey(season, played, round))

            return (
              <List.Item key={`${hattrick.id}-${date}`}>
                <PlayerName
                  givenName={hattrick.scorer.givenName}
                  href={hattrick.scorer.href}
                  surname={hattrick.scorer.surname}
                />
                {hattrick.goals > 3 && ` (${hattrick.goals} doelpunten)`}
                <Text appearance="meta">
                  {`${hattrickDay(date)} · `}
                  {href === undefined ? label : <Link href={href}>{label}</Link>}
                </Text>
              </List.Item>
            )
          })}
        </List>
      </Disclosure>
    </Card>
  )
}

/**
 * The card Strafschoppen benut: the first five places of the players who scored the most
 * penalties for sc Heerenveen, and under it the total of all seasons. The card is soft, in the
 * sidebar.
 */
export function PenaltiesCard({
  competition,
  matches,
  penalties,
  since,
}: {
  competition: CompetitionChoice
  matches: readonly AllTimeMatch[]
  penalties: { top: CountPlace[]; total: number }
  since: string | undefined
}) {
  const { top, total } = penalties

  return (
    <Card aria-labelledby="strafschoppen" shareable={imageCredit(true, undefined, [...matches])} surface="soft">
      <Heading anchor id="strafschoppen" level={2}>
        Strafschoppen benut
      </Heading>
      <TopScorersTable
        caption={`De top ${shortListPlaces} van de spelers die de meeste strafschoppen benutten voor sc Heerenveen, in ${wordsOf(competition)}`}
        figure={tableColumns.penalties}
        rows={countRows(top)}
      />
      <Text appearance="meta">
        {`${total} ${total === 1 ? 'strafschop' : 'strafschoppen'} benut sinds ${since ?? ''}`}
      </Text>
    </Card>
  )
}

/** The records of the card in the order they stand, with the name each has. */
const recordNames = [
  ['mostInSeason', 'Meeste doelpunten in één seizoen'],
  ['mostInMatch', 'Meeste doelpunten in één wedstrijd'],
  ['youngest', 'Jongste doelpuntenmaker'],
  ['oldest', 'Oudste doelpuntenmaker'],
  ['fastest', 'Snelste doelpunt'],
] as const satisfies readonly (readonly [keyof PlayerRecords, string])[]

/**
 * The card Records of the page with all seasons: the most goals in a season and in a match, the
 * youngest and the oldest scorer and the fastest goal, each with the player and the match or
 * the season. Players who share a record are all on its line. The match is a link when it has a
 * page (`reportHrefs`, by season, competition and round). It is built like the card Records of
 * Wedstrijden · Cijfers: a soft card with a name in the quiet style above each value. It stands
 * on top of the sidebar. A record the data has nothing for is left out.
 */
export function PlayerRecordsCard({
  matches,
  records,
  reportHrefs,
}: {
  matches: readonly AllTimeMatch[]
  records: PlayerRecords
  reportHrefs: ReadonlyMap<string, string>
}) {
  const entryLine = (entry: RecordEntry) => {
    const { match, scorer, season } = entry
    const href =
      match === undefined ? undefined : reportHrefs.get(matchKey(match.season, match.competition, match.round))

    return (
      <Text key={`${entry.id}-${match?.date ?? season}`}>
        <PlayerName givenName={scorer.givenName} href={scorer.href} surname={scorer.surname} />
        {match === undefined ? (
          `, ${season}`
        ) : (
          <>
            {', '}
            {href === undefined ? match.label : <Link href={href}>{match.label}</Link>}
            {`, ${formatTableDay(match.date)}`}
          </>
        )}
      </Text>
    )
  }

  return (
    <Card aria-labelledby="records" shareable={imageCredit(true, undefined, [...matches])} surface="soft">
      <Heading anchor id="records" level={2}>
        Records
      </Heading>
      <List role="list">
        {recordNames.flatMap(([key, name]) => {
          const record = records[key]

          return record === undefined
            ? []
            : [
                <List.Item key={key}>
                  <Text appearance="meta">{name}</Text>
                  <ShortFact>
                    {recordValue(key, record)}
                    {record.entries.map((entry) => entryLine(entry))}
                  </ShortFact>
                </List.Item>,
              ]
        })}
      </List>
      <Text appearance="meta">
        De leeftijd is op de dag van de wedstrijd. Spelers zonder geboortedag tellen niet mee voor de jongste en de
        oudste.
      </Text>
    </Card>
  )
}

/** The figure of a record as words: `5 doelpunten`, `17 jaar en 123 dagen`, `minuut 1`. */
function recordValue(key: keyof PlayerRecords, record: PlayerRecord): string {
  const [first] = record.entries

  if (key === 'fastest') {
    return `minuut ${record.value}`
  }
  if (key === 'youngest' || key === 'oldest') {
    const { days = 0, years = 0 } = first.age ?? {}

    return `${years} jaar en ${days} ${days === 1 ? 'dag' : 'dagen'}`
  }

  return `${record.value} ${record.value === 1 ? 'doelpunt' : 'doelpunten'}`
}
