import type { PublicClubMatch, PublicClubRecord, PublicSeasonWikipediaPage } from '@fansite/db/queries'

import { competitions } from '@fansite/db/schema'
import {
  Card,
  DataTable,
  Disclosure,
  FormTimeline,
  Heading,
  List,
  MarkRow,
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
import { creditName, formatReadAt, matchMoment, wikipediaUrl } from './match-format'
import { competitionNames, countScores, topScorersOf } from './matches'
import { imageCredit, markOf, MatchLegend, MatchLine, ScoreCountsView, TopScorers } from './MatchViews'
import {
  type ClubNameView,
  type ClubSummary,
  hasTimeline,
  lastResultsOf,
  type Meeting,
  meetingsOf,
  pointsOf,
  type StadiumView,
  startYearOf,
  timelineOf,
  timelineWindow,
  topPointsMinimum,
  topPointsOf,
} from './opponents'

/**
 * What the cards of the opponents say about the matches they count: all the played matches
 * since the first season we have, in the Eredivisie alone when the choice is `league`. The
 * form is the one of the cards on Statistieken ("Gebaseerd op …"), with the season from which
 * we have data, so a visitor knows how far back the record goes.
 */
export function BasedOnSince({
  choice,
  condition,
  played,
  since,
}: {
  choice: CompetitionChoice
  /** What the matches have in common beyond the choice, such as "tegen clubs met …". */
  condition?: string
  played: number
  since: string
}) {
  const matches = played === 1 ? '1 gespeelde wedstrijd' : `alle ${played} gespeelde wedstrijden`
  const where = condition === undefined ? '' : `, ${condition}`

  return (
    <Text appearance="meta">{`Gebaseerd op ${matches}${choice === 'league' ? ' in de Eredivisie' : ''} sinds ${since}${where}`}</Text>
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

/** The goals for minus the goals against. */
const goalDifference = (record: { goalsAgainst: number; goalsFor: number }) => record.goalsFor - record.goalsAgainst

/**
 * The card of the page of a club with every match against it, in one list of `Match` lines,
 * the same line as Programma and Uitslagen use (`MatchLine`). The matches that are still to
 * come stand first, next one first, as Programma has them. The matches that were played
 * follow, the newest first, with the row Laatste wedstrijden above the list when there are
 * five or more (see `lastResultsOf`).
 *
 * A line has the day with its year, so a match of an earlier season can be told from one of
 * this season, the competition and the round, the name as Wikipedia wrote the club in that
 * match (so an earlier name shows), where it was played and, for a match that was played, the
 * result from our side with the scorers, extra time and the shoot-out. A match to come has
 * no result, which is what sets it apart, so there are no subheadings. The legend of the
 * abbreviations is under the list. The list has all the matches, not a selection, so it has
 * one kind of line (see the decision of 4 November 2026 in `docs/beslissingen/site.md`). It is
 * the main content of the page, so it has the white surface.
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
  const shown = [...upcoming, ...meetings]

  return (
    <Card aria-labelledby="wedstrijden">
      <Heading id="wedstrijden" level={2}>
        Wedstrijden
      </Heading>
      {last !== undefined && <MarkRow marks={last.map((result) => markOf[result])} title="Laatste wedstrijden" />}
      <List role="list">
        {shown.map((match) => (
          // A competition and a round come back every season, so the match itself is the key.
          <List.Item key={match.id}>
            <MatchLine match={match} now={now} withYear />
          </List.Item>
        ))}
      </List>
      <MatchLegend matches={shown} />
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
 * pagination: the list is one page. It is the main content of the page, so it has the white
 * surface.
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
    <Card aria-labelledby="alle-tegenstanders">
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

/** An average of points as the Dutch write it, with two decimals and a comma: `2,43`. */
const averageFormat = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2, minimumFractionDigits: 2 })

/** The legend of the card: the letters of its two columns. The place has no line. */
const topPointsLegend = tableLegend([tableColumns.pointsPerMatch, tableColumns.played])

/**
 * The names the editors list for a club, in a fold under its heading, for the notes they wrote
 * with a name (when the KNVB approved it, say). It lists every name with its period, as the
 * line "Eerder" says in short, and shows the note under each name. A list without a note has no
 * fold: the line "Eerder" is all there is to say. The notes are plain text, written by us.
 */
export function ClubNamesNotes({ names }: { names: ClubNameView[] }) {
  if (!names.some((name) => name.note !== undefined)) {
    return null
  }

  return (
    <Disclosure summary="Over de namen">
      <List role="list">
        {names.map((name, index) => (
          // A name can come back after another, so the place in the list is part of the key.
          <List.Item key={`${index}-${name.name}`}>
            <ShortStaff note={name.note} period={name.period} surname={name.name} />
          </List.Item>
        ))}
      </List>
    </Disclosure>
  )
}

/**
 * The card "Hoe vaak welke uitslag" of the page of a club: the card of the page Wedstrijden
 * (`ScoreCountsView`) for the meetings the rest of the page counts, so the figures are those of
 * the row Totaal of `ClubSummaryCard` for either choice. Unlike Wedstrijden it has a second
 * chart with the goals we scored and conceded in those meetings, and under the tables a table
 * of the competitions they were played in, which follows the switch. It is under the summary,
 * in the sidebar, and nothing without a played match, so a club we only meet in the future has
 * none.
 */
export function ClubScoreCountsCard({ meetings }: { meetings: readonly Meeting[] }) {
  if (meetings.length === 0) {
    return null
  }

  return (
    <ScoreCountsView
      counts={countScores(meetings)}
      empty=""
      goals={{
        against: meetings.reduce((sum, meeting) => sum + meeting.goalsAgainst, 0),
        for: meetings.reduce((sum, meeting) => sum + meeting.goalsFor, 0),
      }}
    >
      <DataTable
        caption="De competities van deze wedstrijden en hoeveel wedstrijden er in elke werden gespeeld"
        columns={['Competitie', 'Wedstrijden']}
        rows={competitionCounts(meetings).map(({ competition, count }) => ({ cells: [count], header: competition }))}
      />
    </ScoreCountsView>
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
 * The card "Resultaten sinds <jaar>" of the page of a club: how we did against it, season after
 * season, as bars for a win, a draw and a loss with a line through the average of the points
 * over at most eight matches (see `FormTimeline`). It has two places for each season from the
 * first season we have matches of, for any club, up to now, so the axis is the same for every
 * club.
 * A season we didn't meet this club in the Eredivisie, a match still to come and a season we
 * have no matches of are an empty place. It counts the Eredivisie whatever the visitor chose,
 * and says so, and nothing else: the key and that line are all the text, because the page lists
 * every match under Wedstrijden. It is the same kind of figure as the card with the record, on
 * a surface of its own between the soft one above it and the warm one below it, and it has no
 * button for an image. A club we played fewer than `timelineMinimum` times in the Eredivisie
 * has no card, and no sentence that says why.
 */
export function ClubTimelineCard({
  matches,
  now,
  since,
}: {
  matches: readonly PublicClubMatch[]
  now: Date
  since: string
}) {
  const firstYear = startYearOf(since)

  if (!hasTimeline(matches) || !Number.isFinite(firstYear)) {
    return null
  }

  return (
    <Card aria-labelledby="resultaten-sinds">
      <Heading anchor id="resultaten-sinds" level={2}>
        {`Resultaten sinds ${firstYear}`}
      </Heading>
      <FormTimeline
        firstYear={firstYear}
        results={timelineOf(matches, now, firstYear)}
        scope="Alleen de Eredivisie."
        title="Seizoen"
        window={timelineWindow}
      />
    </Card>
  )
}

/**
 * The card "Doelpuntenmakers tegen <club>" of the page of a club: the top 5 of the players of
 * sc Heerenveen who scored against it, from the same count and the same table as the card of
 * the page Wedstrijden (`TopScorers`), with texts about the club and not about a season. The
 * page only has it from `clubScorersMinimum` matches (`hasClubScorers`), counted over all
 * competitions; the list is of the matches the choice counts, so with the Eredivisie alone it
 * can be shorter, or empty, and then a sentence says so. It is under "Hoe vaak welke uitslag",
 * soft, with the button for an image, which has the name of the club in the heading.
 */
export function ClubTopScorersCard({
  choice,
  matches,
  name,
}: {
  choice: CompetitionChoice
  matches: readonly PublicClubMatch[]
  name: string
}) {
  const counted = meetingsOf(matches, choice)

  return (
    <Card
      aria-labelledby="doelpuntenmakers"
      shareable={imageCredit(topScorersOf(counted, 'all').length > 0)}
      surface="soft"
    >
      <Heading id="doelpuntenmakers" level={2}>
        {`Doelpuntenmakers tegen ${name}`}
      </Heading>
      <TopScorers
        competition={choice}
        empty="We hebben geen doelpuntenmakers van deze wedstrijden."
        matches={counted}
        scope={`van sc Heerenveen tegen ${name}, in ${competitionNames(counted, choice)}`}
        topOnly
      />
    </Card>
  )
}

/**
 * The competitions of `meetings` and how many matches each has, the most matches first and, for
 * the same number, in the order of `competitions` (the order of the site).
 */
export function competitionCounts(meetings: readonly Meeting[]) {
  return competitions
    .map((competition) => ({
      competition,
      count: meetings.filter((meeting) => meeting.competition === competition).length,
    }))
    .filter(({ count }) => count > 0)
    .toSorted((a, b) => b.count - a.count)
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
 * The card of the page of a club with the names of its stadium, on the strong surface, like the
 * head coaches. With one name there is the name alone; with more, each name has its period (see
 * `stadiumPeriods` and `ownListPeriods`). A name can have a note under it, which the editors
 * wrote: it says why, for instance, a club played elsewhere for a while. The names of the
 * matches come from Wikipedia, and the credit at the foot of the page says so, so the card has
 * no line of its own. The anchor is the same for "Stadion" and "Stadions". A club without a
 * name has no card.
 */
export function StadiumsCard({ stadiums }: { stadiums: StadiumView[] }) {
  if (stadiums.length === 0) {
    return null
  }

  return (
    <Card aria-labelledby="stadion" surface="strong">
      <Heading anchor id="stadion" level={2}>
        {stadiums.length === 1 ? 'Stadion' : 'Stadions'}
      </Heading>
      <List role="list">
        {stadiums.map((stadium, index) => (
          // The name can come back after another, so the place in the list is part of the key.
          <List.Item key={`${index}-${stadium.name}`}>
            {/* A ShortStaff is a line with the period next to a name, as this is. */}
            <ShortStaff note={stadium.note} period={stadium.period} surname={stadium.name} />
          </List.Item>
        ))}
      </List>
    </Card>
  )
}

/**
 * The card of the page Tegenstanders with the ten clubs against which sc Heerenveen took the
 * most points per match (see `topPointsOf`), in the sidebar on the soft surface: a ranking that
 * belongs to the list of all the opponents. It counts the same matches as that list, so it
 * follows the switch of the page, and its links keep the choice (`address` and `query`, as in
 * `ClubsCard`). The line under the table says which clubs count. The table has the place, the
 * club as a link, the average with two decimals and the number of matches. It cannot be sorted:
 * its order is the point. With no club that counts there is a sentence and no table, and the
 * card stays.
 */
export function TopPointsCard({
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
  const { places, played } = topPointsOf(records)

  return (
    <Card aria-labelledby="gemiddeld-resultaat" surface="soft">
      <Heading id="gemiddeld-resultaat" level={2}>
        Gemiddeld resultaat
      </Heading>
      {places.length === 0 ? (
        <Text>{`Nog geen club met minstens ${topPointsMinimum} gespeelde wedstrijden.`}</Text>
      ) : (
        <>
          <DataTable
            caption={`De tien clubs waartegen sc Heerenveen gemiddeld de meeste punten per wedstrijd haalt, van hoog naar laag${choice === 'league' ? ', in de Eredivisie' : ''}`}
            columns={['Club', { ...tableColumns.pointsPerMatch, key: true }, tableColumns.played]}
            rows={places.map((place) => ({
              cells: [averageFormat.format(place.points / place.played), place.played],
              header: place.name,
              href: `${address}/${place.slug}${query}`,
              position: place.place,
            }))}
          />
          <Text appearance="meta">{topPointsLegend}</Text>
          <BasedOnSince
            choice={choice}
            condition={`tegen clubs met minstens ${topPointsMinimum} gespeelde wedstrijden`}
            played={played}
            since={since}
          />
        </>
      )}
    </Card>
  )
}

/** One played match against the club as a short line, for the cards that pick matches out. */
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
