import type { PublicClubMatch, PublicClubRecord, PublicSeasonWikipediaPage } from '@fansite/db/queries'
import type { DataTableCell } from '@fansite/design-system'
import type { ReactNode } from 'react'

import { competitions } from '@fansite/db/schema'
import {
  Bar,
  BarChart,
  BarPlace,
  Card,
  countryName,
  DataTable,
  DescriptionList,
  Disclosure,
  FormTimeline,
  Heading,
  List,
  MarkRow,
  Match,
  NewsItem,
  Pagination,
  PlayerName,
  RecordTable,
  sharesOf,
  ShortStaff,
  signedNumber,
  tableColumns,
  tableLegend,
  Text,
  WikipediaCredit,
} from '@fansite/design-system'

import { type CompetitionChoice, competitionWords } from './competition'
import { DataLine } from './DataLine'
import { creditName, formatReadAt, formatTableDay, matchMoment, wikipediaUrl } from './match-format'
import { type MatchPage, matchPageKey, pageProps } from './match-pages'
import { shootOutOf } from './match-result'
import { type MatchSource, sourceOf } from './match-sources'
import { competitionNames, countScores, topScorersOf } from './matches'
import { EredivisieOnly, imageCredit, markOf, MatchLegend, MatchLine, ScoreCountsView, TopScorers } from './MatchViews'
import { dateTimeOf, formatNewsTime } from './news'
import {
  type ClubAttendance,
  clubAttendanceId,
  type ClubHeadline,
  type ClubNameView,
  type ClubPlace,
  clubPlacesId,
  type ClubSummary,
  hardestOf,
  hasTimeline,
  lastResultsOf,
  type LastWinPlace,
  type Meeting,
  meetingPageCount,
  meetingsOf,
  meetingsOnPage,
  pointsOf,
  type PointsPlace,
  shownPlaces,
  type StadiumView,
  startYearOf,
  timelineOf,
  timelineWindow,
  topPointsMinimum,
  topPointsOf,
  topPointsPlaces,
  type Venue,
  venues,
} from './opponents'
import { placeInLeague } from './SeasonBySeasonCard'
import { figureCell } from './table-values'
import { VenueSwitch } from './VenueSwitch'

/**
 * What limits the data of the cards of the opponents, in one line at the end of the card: the
 * season from which we have data, so a visitor knows how far back the record goes, the
 * Eredivisie alone when the choice is `league`, and what the matches have in common beyond
 * that.
 */
export function BasedOnSince({
  choice,
  condition,
  since,
}: {
  choice: CompetitionChoice
  /** What the matches have in common beyond the choice, such as "tegen clubs met …". */
  condition?: string
  since: string
}) {
  return (
    <DataLine
      limits={[choice === 'all' ? undefined : `alleen ${competitionWords(choice)}`, `sinds ${since}`, condition]}
    />
  )
}

/** The figures of the list in the order of its columns, as `tableColumns` sets them. */
const clubFigures = [
  tableColumns.played,
  { ...tableColumns.won, more: true },
  { ...tableColumns.drawn, more: true },
  { ...tableColumns.lost, more: true },
  tableColumns.points,
  tableColumns.goalDifference,
] as const

/**
 * The columns of the list: the club, and a number each, with the word a screen reader says.
 * Every column can be sorted, as in every table.
 */
export const clubColumns = [{ name: 'Club' }, ...clubFigures] as const

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
 * five or more (see `lastResultsOf`). The played matches come ten to a page with `Pagination`
 * (see `meetingsPerPage`); the matches to come and the row Laatste wedstrijden are on the
 * first page only. `pageHref` gives the address of a page.
 *
 * A line has the day with its year, so a match of an earlier season can be told from one of
 * this season, the competition and the round, the name as Wikipedia wrote the club in that
 * match (so an earlier name shows), where it was played and, for a match that was played, the
 * result from our side with the scorers, extra time and the shoot-out. A match to come has
 * no result, which is what sets it apart, so there are no subheadings. The legend of the
 * abbreviations is under the list. The list has all the matches, not a selection, only
 * spread over pages, so it has one kind of line (see the decision of 4 November 2026 in
 * `docs/beslissingen/site.md`). It is the main content of the page, so it has the white
 * surface.
 */
export function ClubMeetingsCard({
  meetings,
  now,
  page = 1,
  pageHref = () => '',
  pages,
  upcoming,
}: {
  meetings: Meeting[]
  now: Date
  page?: number
  pageHref?: (page: number) => string
  /** The pages of the matches that have one (see `getMatchPages`): the lines link to them. */
  pages?: ReadonlyMap<string, MatchPage> | undefined
  upcoming: PublicClubMatch[]
}) {
  const pageCount = meetingPageCount(meetings)
  const last = page === 1 ? lastResultsOf(meetings) : undefined
  const shown = [...(page === 1 ? upcoming : []), ...meetingsOnPage(meetings, page)]

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
            <MatchLine {...pageProps(pages?.get(matchPageKey(match)))} match={match} now={now} withYear />
          </List.Item>
        ))}
      </List>
      <MatchLegend matches={shown} />
      {pageCount > 1 && (
        <Pagination
          current={page}
          label="Paginering van de wedstrijden"
          nextHref={page < pageCount ? pageHref(page + 1) : undefined}
          previousHref={page > 1 ? pageHref(page - 1) : undefined}
          total={pageCount}
        />
      )}
    </Card>
  )
}

/**
 * The card of the page Tegenstanders with every club we played, A to Z, each name a link to
 * the page of that club, with the flag of the country of the club before it (a decoration in
 * the link, so the link is named by the club, and the country in words for a screen reader
 * after the link, once) and an empty place of the same width for a club without a
 * country, so the names stay under each other. `address` is the base address of the pages of
 * the clubs; `query` is the part of the address that holds the choice, which every link keeps.
 * The columns are the played, won, drawn and lost matches, the points and the goal difference,
 * with its sign, as "+18". They are icons, which fit a phone, and the legend under the table
 * explains them. The visitor can sort on every column, with JavaScript; the table of the
 * server is A to Z. The goal difference sorts on the number, so the club we did best against
 * is on top. There is no pagination: the list is one page. It is the main content of the page,
 * so it has the white surface.
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
  return (
    <Card aria-labelledby="alle-tegenstanders">
      <Heading id="alle-tegenstanders" level={2}>
        Alle tegenstanders
      </Heading>
      {records.length === 0 ? (
        <Text>We hebben nog geen uitslagen. Kijk straks nog eens.</Text>
      ) : (
        <>
          <DataTable.More>
            <DataTable
              caption={`De tegenstanders van sc Heerenveen, van A tot Z, met onze uitslagen tegen elk${choice === 'all' ? '' : ` in ${competitionWords(choice)}`}`}
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
                display: (
                  <>
                    <PlayerName
                      country={record.country}
                      givenName={record.name}
                      href={`${address}/${record.slug}${query}`}
                      surname=""
                    />
                    {record.country === null || countryName(record.country) === undefined ? null : (
                      <Text as="span" className="hf-visually-hidden">{`, ${countryName(record.country)}`}</Text>
                    )}
                  </>
                ),
                header: record.name,
              }))}
            />
            <Text appearance="meta">{clubLegend}</Text>
          </DataTable.More>
          <BasedOnSince choice={choice} since={since} />
        </>
      )}
    </Card>
  )
}

/** An average of points as the Dutch write it, with two decimals and a comma: `2,43`. */
const averageFormat = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2, minimumFractionDigits: 2 })

/** The legend of the card: the icons and words of its two columns. The place has no line. */
const topPointsLegend = tableLegend([tableColumns.pointsPerMatch, tableColumns.played])

/** The line under the heading of Het makkelijkst and Het moeilijkst: what the figure is. */
const pointsIntro = 'Gemiddeld aantal punten per wedstrijd'

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
 * The card "De plek van <club> en de onze" of the page of a club: a table with, for every
 * season in which both clubs were in the same table, the place each of us ended in, the newest
 * season first (see `clubPlacesOf`). A season in the Eerste divisie says so next to the place.
 * It is a competition table, so it doesn't follow the switch between all the matches and the
 * Eredivisie, and a line says so. It is figures, so it has the soft surface, in the sidebar
 * under "Hoe vaak welke uitslag". Without a season in which both were in the table there is no
 * card.
 */
export function ClubPlacesCard({ name, places }: { name: string; places: readonly ClubPlace[] }) {
  if (places.length === 0) {
    return null
  }

  return (
    <Card aria-labelledby={clubPlacesId} surface="soft">
      <Heading anchor id={clubPlacesId} level={2}>
        {`De plek van ${name} en de onze`}
      </Heading>
      <DataTable
        caption={`De plek in de competitie waarin ${name} en sc Heerenveen eindigden, per seizoen`}
        columns={['Seizoen', 'Onze plek', 'Hun plek']}
        rows={places.map(({ competition, ours, season, theirs }) => ({
          cells: [
            figureCell(ours, placeInLeague(ours, competition)),
            figureCell(theirs, placeInLeague(theirs, competition)),
          ],
          header: season,
        }))}
      />
      {places.every(({ competition }) => competition === 'Eredivisie') ? (
        <EredivisieOnly />
      ) : (
        <Text appearance="meta">
          De plekken zijn die in de Eredivisie, tenzij de competitie erbij staat. Ze volgen niet de keuze tussen alle
          wedstrijden en de Eredivisie.
        </Text>
      )}
    </Card>
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
      source={sourceOf(meetings)}
    >
      <DataTable
        caption="De competities van deze wedstrijden en hoeveel wedstrijden er in elke werden gespeeld"
        columns={['Competitie', tableColumns.played]}
        rows={competitionCounts(meetings).map(({ competition, count }) => ({ cells: [count], header: competition }))}
      />
      <Text appearance="meta">{tableLegend([tableColumns.played])}</Text>
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
  source,
  summary,
}: {
  choice: CompetitionChoice
  name: string
  now: Date
  since: string
  /** Where the matches of the summary come from, for the credit under the image. */
  source?: MatchSource | undefined
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
    <Card aria-labelledby="onze-uitslagen" shareable={imageCredit(true, undefined, source)} surface="soft">
      <Heading id="onze-uitslagen" level={2}>
        {`Onze uitslagen tegen ${name}`}
      </Heading>
      <RecordTable
        caption={`De uitslagen van sc Heerenveen tegen ${name}${choice === 'all' ? '' : ` in ${competitionWords(choice)}`}, thuis, uit en in totaal`}
        rows={[row('Thuis', summary.home), row('Uit', summary.away)]}
        total={row('Totaal', summary.total)}
      />
      {lines.length > 0 && (
        <DescriptionList stacked>
          {lines.map(({ label, match }) => (
            <DescriptionList.Item key={label} term={label}>
              <MeetingLine choice={choice} match={match} now={now} />
            </DescriptionList.Item>
          ))}
        </DescriptionList>
      )}
      <BasedOnSince choice={choice} since={since} />
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
        title="Seizoen"
        window={timelineWindow}
      />
      <EredivisieOnly />
    </Card>
  )
}

const attendanceFormat = new Intl.NumberFormat('nl-NL')

/**
 * The card "Toeschouwers tegen <club>" of the page of a club: the visitors at our home matches
 * against it, a bar for each match from the first season to the last, with the average and the
 * largest number (with its season) in two sentences, and under them a table in an uitklapper
 * with the number of every match, as on Cijfers: a table that repeats a chart is folded away.
 * The chart is hidden from a screen reader, which gets the sentences and the table. Only the
 * matches at home count, because an away audience is the other club's, and the card follows
 * the choice between all the matches and the Eredivisie. An unknown number is an empty place
 * and a match without an audience a stub. The numbers are Wikipedia's estimates. It is soft,
 * with the button for an image, after the places and before Doelpuntenmakers. Without a known
 * number there is no card and no sentence.
 */
export function ClubAttendanceCard({
  attendance,
  choice,
  name,
  source,
}: {
  attendance: ClubAttendance
  choice: CompetitionChoice
  name: string
  /** Where the matches of the figures come from, for the credit under the image. */
  source?: MatchSource | undefined
}) {
  const { average, highest, known, labels, max, slots, ticks } = attendance

  if (known === 0) {
    return null
  }

  // A match without a number sorts last, whichever way the column is sorted.
  const cell = (value: null | number): DataTableCell =>
    value === null
      ? { sortValue: null, text: 'Niet bekend' }
      : { sortValue: value, text: value === 0 ? 'Zonder publiek' : attendanceFormat.format(value) }

  return (
    <Card aria-labelledby={clubAttendanceId} shareable={imageCredit(true, undefined, source)} surface="soft">
      <Heading anchor id={clubAttendanceId} level={2}>
        {`Toeschouwers tegen ${name}`}
      </Heading>
      <BarChart
        axis={{ labels, title: 'Seizoen' }}
        bars={slots.map(({ attendance: value }) => (value === null ? null : { tone: 'neutral', value }))}
        max={max}
        ticks={ticks}
        tickText={attendanceFormat.format}
      />
      <Text>{`Gemiddeld ${attendanceFormat.format(average ?? 0)} toeschouwers per thuiswedstrijd`}</Text>
      {highest && (
        <Text>
          {`Het meest: ${attendanceFormat.format(highest.attendance ?? 0)}, in het seizoen ${highest.match.season}`}
        </Text>
      )}
      <Text appearance="meta">Het aantal toeschouwers is een schatting, volgens Wikipedia.</Text>
      <Disclosure summary="Aantal per thuiswedstrijd">
        <DataTable
          caption={`Het aantal toeschouwers bij elke thuiswedstrijd van sc Heerenveen tegen ${name}`}
          columns={['Wedstrijd', ...(choice === 'all' ? ['Competitie'] : []), 'Aantal']}
          rows={slots.map((slot) => ({
            cells: [...(choice === 'all' ? [slot.match.competition] : []), cell(slot.attendance)],
            header: formatTableDay(slot.match.matchDate),
            // The days sort by the date, not by the words of the day.
            sortHeader: slot.match.matchDate,
          }))}
        />
      </Disclosure>
      <Text appearance="meta">
        {known === slots.length
          ? known === 1
            ? '1 thuiswedstrijd'
            : `Alle ${known} thuiswedstrijden`
          : `${known} van de ${slots.length} thuiswedstrijden`}
      </Text>
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
      shareable={imageCredit(topScorersOf(counted, 'all').length > 0, undefined, counted)}
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
  source = 'wikipedia',
}: {
  edited: boolean
  pages: PublicSeasonWikipediaPage[]
  seasons: readonly string[]
  /** Where the matches on the page come from (see `sourceOf`), as `SourceCredit` has it. */
  source?: MatchSource
}) {
  const credited = pages
    .filter((page) => seasons.includes(page.season))
    .map((page) => ({
      href: wikipediaUrl(page.title, page.language),
      name: creditName(page, page.season),
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
        archive={source !== 'wikipedia'}
        edited={edited}
        pages={[first, ...rest]}
        readAt={formatReadAt(readAt)}
        readAtDateTime={readAt.toISOString()}
      />
    </Card>
  )
}

/** The id of the card "Nieuws over <club>", for the bar "Op deze pagina". */
export const clubNewsId = 'nieuws'

/**
 * The card "Nieuws over <club>" of the page of a club: the newest headlines that name it, as
 * `NewsItem` shows them everywhere: the headline as the link, the source and the time, with no
 * intro and no photo, and a paywall shown. It is a list of links from others, so it has the
 * soft surface and no button for an image, and no link to more: Zoeken cannot filter on a
 * club. It is in the sidebar, after the cards with figures. Without a headline there is no
 * card and no sentence.
 */
export function ClubNewsCard({
  headlines,
  name,
  now,
}: {
  headlines: readonly ClubHeadline[]
  name: string
  now: Date
}) {
  if (headlines.length === 0) {
    return null
  }

  return (
    <Card aria-labelledby={clubNewsId} surface="soft">
      <Heading anchor id={clubNewsId} level={2}>
        {`Nieuws over ${name}`}
      </Heading>
      <List role="list">
        {headlines.map((item, index) => (
          <List.Item key={index}>
            <NewsItem
              dateTime={dateTimeOf(item.publishedAt)}
              headline={item.title}
              href={item.url}
              paywalled={item.paywalled}
              source={item.sourceName}
              time={formatNewsTime(item.publishedAt, now)}
            />
          </List.Item>
        ))}
      </List>
    </Card>
  )
}

/** What a venue adds to a sentence about the matches: nothing for all of them, else where. */
const venueWords = { all: '', away: ', uit', home: ', thuis' } as const

/** The matches a venue counts, for the line "Gebaseerd op": `gespeelde uitwedstrijden`. */
const venueMatches = {
  all: 'gespeelde wedstrijden',
  away: 'gespeelde uitwedstrijden',
  home: 'gespeelde thuiswedstrijden',
} as const

/**
 * The card Het moeilijkst under the top 10: the clubs against which sc Heerenveen took the
 * fewest points per match (see `hardestOf`), on the soft surface, with the first five and a
 * Disclosure for the next five. The heading is followed by a line that says what the figure is
 * and a choice of Alle, Thuis or Uit (`VenueSwitch`); `records` has the records of each. The
 * tables are the same as those of `TopPointsCard`, from low to high. The caption says they are
 * our points, so the card is not read as the average of the opponent.
 */
export function HardestCard({
  address,
  choice,
  query,
  records,
  since,
}: {
  address: string
  choice: CompetitionChoice
  query: string
  records: Record<Venue, PublicClubRecord[]>
  since: string
}) {
  return (
    <Card aria-labelledby="het-moeilijkst" surface="soft">
      <Heading id="het-moeilijkst" level={2}>
        Het moeilijkst
      </Heading>
      <Text>{pointsIntro}</Text>
      <VenueSwitch
        label="Het moeilijkst: waar we speelden"
        panels={rankingPanels(hardestOf, records, { address, choice, low: true, query, since })}
      />
    </Card>
  )
}

/**
 * The card Laatste overwinning under Het moeilijkst, on the soft surface, with a choice of
 * Alle, Thuis or Uit (`VenueSwitch`), of which `places` has the clubs for each. Alle is what
 * the card showed before; Thuis and Uit count only the last win at home or away, each in its
 * own order (see `LastWinPanel`). The card does not follow the switch of the page, which is why
 * the line says the Eredivisie, but its links keep the choice (`address` and `query`). Without
 * `places` there is no card.
 */
export function LastWinCard({
  address,
  places,
  query,
}: {
  address: string
  places: Record<Venue, LastWinPlace[]> | undefined
  query: string
}) {
  if (places === undefined) {
    return null
  }

  return (
    <Card aria-labelledby="laatste-overwinning" surface="soft">
      <Heading id="laatste-overwinning" level={2}>
        Laatste overwinning
      </Heading>
      <VenueSwitch
        label="Laatste overwinning: waar we wonnen"
        panels={
          Object.fromEntries(
            venues.map((venue) => [
              venue,
              <LastWinPanel address={address} key={venue} places={places[venue]} query={query} venue={venue} />,
            ]),
          ) as Record<Venue, ReactNode>
        }
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
 * The card Het makkelijkst of the page Tegenstanders with the clubs against which sc Heerenveen
 * took the most points per match (see `topPointsOf`), in the sidebar on the soft surface: a
 * ranking that belongs to the list of all the opponents. It shows the first five and a
 * Disclosure for the next five, and has a choice of Alle, Thuis or Uit (`VenueSwitch`), of
 * which `records` has the records. It counts the same matches as that list, so it follows the
 * switch of the page, and its links keep the choice (`address` and `query`, as in `ClubsCard`).
 * The line under the table says which clubs count. The table has the place, the club as a
 * link, the average with two decimals and the number of matches. It cannot be sorted: its
 * order is the point. With fewer than ten clubs that count there is a sentence and no table,
 * and the card stays.
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
  records: Record<Venue, PublicClubRecord[]>
  since: string
}) {
  return (
    <Card aria-labelledby="het-makkelijkst" surface="soft">
      <Heading id="het-makkelijkst" level={2}>
        Het makkelijkst
      </Heading>
      <Text>{pointsIntro}</Text>
      <VenueSwitch
        label="Het makkelijkst: waar we speelden"
        panels={rankingPanels(topPointsOf, records, { address, choice, low: false, query, since })}
      />
    </Card>
  )
}

/**
 * What the card Laatste overwinning shows for one choice of Alle, Thuis or Uit: the line that
 * says which matches count, and the table of the clubs of the Eredivisie, the one we have not
 * beaten for the longest time (in that choice) first (see `lastWinsOf`). The table has the club
 * as a link and the calendar days since our last win, aligned to the end, with a `Bar` after
 * the days, as long as the days are of the longest wait of this choice. The bar is decoration:
 * a screen reader reads the days. A club we never beat says so in place of the days, and has
 * no bar. The line and the caption name the choice, so a screen reader knows what the table
 * shows.
 */
function LastWinPanel({
  address,
  places,
  query,
  venue,
}: {
  address: string
  places: LastWinPlace[]
  query: string
  venue: Venue
}) {
  const shares = sharesOf(places.map((place) => place.days ?? 0))
  const only = { all: ', thuis en uit samen', away: ', alleen de uitwedstrijden', home: ', alleen de thuiswedstrijden' }

  return (
    <>
      <Text>{`Alleen wedstrijden in de Eredivisie tellen${only[venue]}.`}</Text>
      <BarPlace>
        <DataTable
          appearance="text"
          caption={`De clubs in de Eredivisie, van de langste tijd sinds onze laatste overwinning tegen hen tot de kortste${only[venue]}`}
          columns={['Club', { bar: true, name: 'Dagen geleden' }]}
          rows={places.map((place, index) => ({
            // A club we never beat has no number, so it stands last in either direction.
            cells:
              place.days === null
                ? [{ content: 'Nog nooit gewonnen', sortValue: null }]
                : [
                    {
                      content: (
                        <>
                          {place.days.toLocaleString('nl-NL')}
                          {shares === null ? null : <Bar share={shares[index] ?? 0} />}
                        </>
                      ),
                      sortValue: place.days,
                    },
                  ],
            header: place.name,
            ...(place.slug === null ? {} : { href: `${address}/${place.slug}${query}` }),
          }))}
        />
      </BarPlace>
    </>
  )
}

/**
 * One played match against the club, for the cards that pick matches out. The competition is
 * on the line only when the choice is all competitions: under one competition it repeats.
 */
function MeetingLine({ choice, match, now }: { choice: CompetitionChoice; match: Meeting; now: Date }) {
  return (
    <Match
      competition={choice === 'all' ? match.competition : undefined}
      {...matchMoment(match, now)}
      goalsAgainst={match.goalsAgainst}
      goalsFor={match.goalsFor}
      {...shootOutOf(match)}
      home={match.home}
      opponent={match.opponent}
      round={match.round}
      status="played"
    />
  )
}

/**
 * What a ranking card shows for one venue: a sentence when fewer than `topPointsPlaces` clubs
 * count, else the table with the first `shownPlaces` places, a Disclosure "Toon 5 meer" with
 * the rest, the legend and the line "Gebaseerd op". The order is the answer, and the caption
 * says which way it runs, so the tables do not sort. `low` is the card Het moeilijkst, which
 * runs from low to high; the caption names the venue and the choice of competition.
 */
function RankingPanel({
  address,
  choice,
  low,
  places,
  query,
  since,
  venue,
}: {
  address: string
  choice: CompetitionChoice
  /** True for the card Het moeilijkst, which runs from low to high. */
  low: boolean
  places: PointsPlace[]
  query: string
  since: string
  venue: Venue
}) {
  if (places.length === 0) {
    return <Text>{`Nog geen ${topPointsPlaces} clubs met minstens ${topPointsMinimum} ${venueMatches[venue]}.`}</Text>
  }

  const caption = (what: string) =>
    `${what}${venueWords[venue]}${choice === 'all' ? '' : `, in ${competitionWords(choice)}`}`
  const lead = low
    ? 'waartegen sc Heerenveen gemiddeld de minste punten per wedstrijd haalt, van laag naar hoog'
    : 'waartegen sc Heerenveen gemiddeld de meeste punten per wedstrijd haalt, van hoog naar laag'
  const table = (rows: PointsPlace[], what: string) => (
    <DataTable
      caption={caption(what)}
      columns={['Club', { ...tableColumns.pointsPerMatch, key: true }, tableColumns.played]}
      rows={rows.map((place) => ({
        cells: [averageFormat.format(place.points / place.played), place.played],
        header: place.name,
        href: `${address}/${place.slug}${query}`,
        position: place.place,
      }))}
      sortable={false}
    />
  )
  const rest = places.slice(shownPlaces)

  return (
    <>
      {table(places.slice(0, shownPlaces), `De vijf clubs ${lead}`)}
      {rest.length === 0 ? null : (
        <Disclosure summary={`Toon ${rest.length} meer`}>{table(rest, `De volgende vijf clubs ${lead}`)}</Disclosure>
      )}
      <Text appearance="meta">{topPointsLegend}</Text>
      <BasedOnSince
        choice={choice}
        condition={`tegen clubs met minstens ${topPointsMinimum} ${venueMatches[venue]}`}
        since={since}
      />
    </>
  )
}

/** The panels of a ranking card, one for each venue, from the records of each. */
function rankingPanels(
  rank: (records: readonly PublicClubRecord[]) => { places: PointsPlace[] },
  records: Record<Venue, PublicClubRecord[]>,
  rest: Omit<Parameters<typeof RankingPanel>[0], 'places' | 'venue'>,
) {
  return Object.fromEntries(
    venues.map((venue) => [
      venue,
      <RankingPanel {...rest} key={venue} places={rank(records[venue]).places} venue={venue} />,
    ]),
  ) as Record<Venue, ReactNode>
}
