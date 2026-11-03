import type { PublicClubMatch, PublicClubRecord, PublicSeasonWikipediaPage } from '@fansite/db/queries'

import {
  Card,
  DataTable,
  Heading,
  List,
  MarkRow,
  Match,
  RecordTable,
  ShortMatch,
  ShortStaff,
  signedNumber,
  tableColumns,
  tableLegend,
  Text,
  WikipediaCredit,
} from '@fansite/design-system'

import { type CompetitionChoice } from './competition'
import { creditName, formatReadAt, matchMoment, stadiumPeriods, wikipediaUrl } from './match-format'
import { imageCredit, markOf, metaSeparator } from './MatchViews'
import { type ClubSummary, lastResultsOf, type Meeting, type Stadium } from './opponents'

/**
 * What the cards of the opponents say about the matches they count: all the played matches
 * since the first season we have, in the Eredivisie alone when the choice is `league`. The
 * form is the one of the cards on Statistieken ("Gebaseerd op …"), with the season from which
 * we have data, so a visitor knows how far back the record goes.
 */
export function BasedOnSince({ choice, played, since }: { choice: CompetitionChoice; played: number; since: string }) {
  const matches = played === 1 ? '1 gespeelde wedstrijd' : `alle ${played} gespeelde wedstrijden`

  return (
    <Text appearance="meta">{`Gebaseerd op ${matches}${choice === 'league' ? ' in de Eredivisie' : ''} sinds ${since}`}</Text>
  )
}

/** The figures of the list in the order of its columns, as `tableColumns` sets them. */
const clubFigures = [
  tableColumns.played,
  tableColumns.won,
  tableColumns.drawn,
  tableColumns.lost,
  tableColumns.points,
  tableColumns.goalDifference,
] as const

/**
 * The columns of the list: the club, and a number each, with the word a screen reader says.
 * Every column can be sorted.
 */
export const clubColumns = [
  { name: 'Club', sortable: true },
  ...clubFigures.map((column) => ({ ...column, sortable: true })),
] as const

/** The legend under the list: the columns of the table, with what the points are. */
const clubLegend = tableLegend(
  clubFigures.map((column) =>
    column === tableColumns.points ? { ...column, note: '3 per winst, 1 per gelijkspel' } : column,
  ),
)

/** The points against a club: 3 for a win and 1 for a draw, in the cup too. */
const pointsOf = (record: { drawn: number; won: number }) => record.won * 3 + record.drawn

/** The goals for minus the goals against. */
const goalDifference = (record: { goalsAgainst: number; goalsFor: number }) => record.goalsFor - record.goalsAgainst

/**
 * The card of the page of a club with every match against it, in one list. The matches that
 * are still to come stand first, next one first, as `Match` has them in Programma, with the
 * competition and the round in the line. The matches that were played follow, the newest
 * first, as short lines, with the row Laatste wedstrijden above the list when there are five
 * or more (see `lastResultsOf`). Above each played line stand the season and the competition,
 * and the line has the day, the name as Wikipedia wrote the club in that match (so an earlier
 * name shows), where it was played and the result from our side. A match to come has no result,
 * which is what sets it apart, so there are no subheadings. It is the main content of the page,
 * so it has the white surface.
 */
export function ClubMeetingsCard({
  meetings,
  now,
  upcoming,
}: {
  meetings: Meeting[]
  now: Date
  upcoming: PublicClubMatch[]
}) {
  const last = lastResultsOf(meetings)

  return (
    <Card aria-labelledby="wedstrijden">
      <Heading id="wedstrijden" level={2}>
        Wedstrijden
      </Heading>
      {last !== undefined && <MarkRow marks={last.map((result) => markOf[result])} title="Laatste wedstrijden" />}
      <List role="list">
        {upcoming.map((match) => (
          <List.Item key={match.id}>
            <UpcomingLine match={match} now={now} />
          </List.Item>
        ))}
        {meetings.map((match) => (
          <List.Item key={match.id}>
            <Text appearance="meta">
              {match.season}
              {metaSeparator}
              {match.competition}
            </Text>
            <MeetingLine match={match} now={now} />
          </List.Item>
        ))}
      </List>
    </Card>
  )
}

/**
 * The card of the page Tegenstanders with every club we played, A to Z, each name a link to
 * the page of that club (`address` is the base address of the pages of the clubs; `query` is
 * the part of the address that holds the choice, which every link keeps). The columns are the
 * played, won, drawn and lost matches, the points and the goal difference, with its sign, as
 * "+18". They are abbreviations, which fit a phone, and the line under the table explains them.
 * The visitor can sort on every column, with JavaScript; the table of the server is A to Z. The
 * goal difference sorts on the number, so the club we did best against is on top. There is no
 * pagination: the list is one page.
 */
export function ClubsCard({
  address,
  choice,
  query,
  records,
  since,
}: {
  address: string
  choice: CompetitionChoice
  query: string
  records: PublicClubRecord[]
  since: string
}) {
  const played = records.reduce((sum, record) => sum + record.played, 0)

  return (
    <Card aria-labelledby="alle-tegenstanders" surface="soft">
      <Heading id="alle-tegenstanders" level={2}>
        Alle tegenstanders
      </Heading>
      {records.length === 0 ? (
        <Text>We hebben nog geen uitslagen. Kijk straks nog eens.</Text>
      ) : (
        <>
          <DataTable
            caption={`De tegenstanders van sc Heerenveen, van A tot Z, met onze uitslagen tegen elk${choice === 'league' ? ' in de Eredivisie' : ''}`}
            columns={clubColumns}
            rows={records.map((record) => ({
              cells: [
                record.played,
                record.won,
                record.drawn,
                record.lost,
                pointsOf(record),
                { sortValue: goalDifference(record), text: signedNumber(goalDifference(record)) },
              ],
              header: record.name,
              href: `${address}/${record.slug}${query}`,
            }))}
          />
          <Text appearance="meta">{clubLegend}</Text>
          <BasedOnSince choice={choice} played={played} since={since} />
        </>
      )}
    </Card>
  )
}

/**
 * The card of the page of a club with our record against it: a table in the form of the
 * standings, with a row for the matches at home and away and the total under them, and a column
 * for the matches played, won, drawn and lost, the points (with the choice Eredivisie only, the
 * cup gives none) and the goal difference. Under it stand the biggest win and the biggest loss
 * against this club. It has the button for an image, with the name of the club in the heading,
 * so the image says who it is about. It is figures and records that belong to the main content,
 * so it has the soft surface, in the sidebar.
 */
export function ClubSummaryCard({
  choice,
  name,
  now,
  since,
  summary,
}: {
  choice: CompetitionChoice
  name: string
  now: Date
  since: string
  summary: ClubSummary
}) {
  // Only the Eredivisie gives points, so the choice with the cup has no column for them.
  const row = (name: string, tally: ClubSummary['total']) => ({
    ...tally,
    goalDifference: goalDifference(tally),
    name,
    ...(choice === 'league' ? { points: pointsOf(tally) } : {}),
  })
  const lines = [
    { match: summary.biggestWin, name: 'Grootste overwinning' },
    { match: summary.biggestLoss, name: 'Grootste nederlaag' },
  ].flatMap(({ match, name: label }) => (match === undefined ? [] : [{ label, match }]))

  return (
    <Card aria-labelledby="onze-uitslagen" shareable={imageCredit(true)} surface="soft">
      <Heading id="onze-uitslagen" level={2}>
        {`Onze uitslagen tegen ${name}`}
      </Heading>
      <RecordTable
        caption={`De uitslagen van sc Heerenveen tegen ${name}${choice === 'league' ? ' in de Eredivisie' : ''}, thuis, uit en in totaal`}
        rows={[row('Thuis', summary.home), row('Uit', summary.away)]}
        total={row('Totaal', summary.total)}
      />
      {lines.length > 0 && (
        <List role="list">
          {lines.map(({ label, match }) => (
            <List.Item key={label}>
              <Text appearance="meta">{label}</Text>
              <MeetingLine match={match} now={now} />
            </List.Item>
          ))}
        </List>
      )}
      <BasedOnSince choice={choice} played={summary.total.played} since={since} />
    </Card>
  )
}

/**
 * The credit of Wikipedia for a page that counts across seasons: a link to each page of each
 * season in `seasons`, with the moment the importer last read any of them, in a card without a
 * border or background, so its text lines up with the cards above. It is nothing when the
 * importer has read none of them.
 */
export function OpponentsCredit({
  edited,
  pages,
  seasons,
}: {
  edited: boolean
  pages: PublicSeasonWikipediaPage[]
  seasons: readonly string[]
}) {
  const credited = pages
    .filter((page) => seasons.includes(page.season))
    .map((page) => ({
      href: wikipediaUrl(page.title, page.kind),
      name: creditName(page.kind, page.season),
      readAt: page.readAt,
    }))
  const [first, ...rest] = credited

  if (first === undefined) {
    return null
  }

  const readAt = new Date(Math.max(...credited.map((page) => page.readAt.getTime())))

  return (
    <Card as="div" surface="transparent">
      <WikipediaCredit
        edited={edited}
        pages={[first, ...rest]}
        readAt={formatReadAt(readAt)}
        readAtDateTime={readAt.toISOString()}
      />
    </Card>
  )
}

/**
 * The card of the page of a club with the names of its stadium in the order we saw them, on the
 * strong surface, like the head coaches. With one name there is the name alone; with more, each
 * name has "tot" and the day of the last match with it, and the last has "vanaf" and the day of
 * the first (see `stadiumPeriods`). The line under the list says where the names come
 * from and, with more than one, that the days are those of our matches and not of the change of
 * the name. The anchor is the same for "Stadion" and
 * "Stadions". A club without a name has no card.
 */
export function StadiumsCard({ stadiums }: { stadiums: Stadium[] }) {
  if (stadiums.length === 0) {
    return null
  }

  const periods = stadiumPeriods(stadiums)

  return (
    <Card aria-labelledby="stadion" surface="strong">
      <Heading anchor id="stadion" level={2}>
        {stadiums.length === 1 ? 'Stadion' : 'Stadions'}
      </Heading>
      <List role="list">
        {stadiums.map((stadium, index) => (
          // The name can come back after another, so the place in the list is part of the key.
          <List.Item key={`${index}-${stadium.name}`}>
            {/* A ShortStaff is a line with the days in front of a name, as this is. */}
            <ShortStaff period={periods[index]} surname={stadium.name} />
          </List.Item>
        ))}
      </List>
      <Text appearance="meta">
        {stadiums.length === 1
          ? 'Zo noemt Wikipedia het stadion bij onze uitwedstrijden in de Eredivisie.'
          : 'Zo noemt Wikipedia het stadion bij onze uitwedstrijden in de Eredivisie. De dagen zijn die van onze wedstrijden, niet van de dag dat de naam veranderde.'}
      </Text>
    </Card>
  )
}

/** One played match against the club as a short line. */
function MeetingLine({ match, now }: { match: Meeting; now: Date }) {
  return (
    <ShortMatch
      {...matchMoment(match, now)}
      goalsAgainst={match.goalsAgainst}
      goalsFor={match.goalsFor}
      home={match.home}
      opponent={match.opponent}
    />
  )
}

/**
 * A match that is still to come, as `Match` shows it in Programma: the day and the stadium, the
 * clubs, and the competition with the round. A match that is called off says so instead of a
 * time. It has begun for none of them, so no line says the result is missing.
 */
function UpcomingLine({ match, now }: { match: PublicClubMatch; now: Date }) {
  const common = {
    competition: match.competition,
    home: match.home,
    opponent: match.opponent,
    round: match.round,
    stadium: match.stadium,
  }

  return match.status === 'postponed' ? (
    <Match {...common} status="postponed" />
  ) : (
    <Match {...common} {...matchMoment(match, now)} status="scheduled" />
  )
}
