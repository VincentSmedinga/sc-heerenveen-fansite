import type { PublicMatch, PublicStaff, PublicStandingsRow, PublicWikipediaPage } from '@fansite/db/queries'
import type { FormResult, MarkRowMark } from '@fansite/design-system'
import type { ReactNode } from 'react'

import {
  averagesOf,
  BarChart,
  Button,
  Card,
  DataTable,
  Disclosure,
  DonutChart,
  Form,
  formatAverage,
  FormChart,
  Heading,
  Input,
  Link,
  List,
  MarkRow,
  Match,
  pointsOf,
  ShortMatch,
  ShortStaff,
  StandingsTable,
  tableColumns,
  tableLegend,
  Text,
  TopScorersTable,
  WikipediaCredit,
} from '@fansite/design-system'

import type { FlowRow, HomeAwayTally, MatchData } from './matches'

import { type CompetitionChoice, competitionParam, leagueValue } from './competition'
import { moreCleanSheets } from './items-per-card'
import { coachPeriods, creditName, formatReadAt, formatTableDay, matchMoment, wikipediaUrl } from './match-format'
import {
  attendanceOf,
  cleanSheetsOf,
  competitionNames,
  type ExtremeGoal,
  extremesOf,
  goalsPerQuarter,
  goalsWithInitials,
  homeAwayOf,
  lacksResult,
  type LeagueMeasure,
  type LeaguePlace,
  leaguePlaceOf,
  leagueResultsOf,
  matchFlowOf,
  overviewOf,
  quarterLabels,
  type ScoreCount,
  scoreCountsOf,
  type ScoredMatch,
  type ScorerPlace,
  scorersByPlace,
  scorersCoverage,
  standingsAround,
  standingsLag,
  streaksOf,
  topFiveOf,
  type TopScorer,
  topScorersOf,
  topScorersPlaces,
} from './matches'
import { coachesCardOf, scoreCountsCard } from './matchShortcuts'
import { splitStaffName } from './player-name'
import { isEnglishPage, squadPageName } from './season-squad'

/**
 * What the button for an image of a statistics card puts under the image: the credit of
 * Wikipedia, where the facts come from, as the cards of the homepage give it. It is a function,
 * so a card that has no facts yet has no button. A card of a season that is over also gets the
 * season (`2025/26`), which goes under the image and into the name of the file.
 */
export const imageCredit = (hasFacts: boolean, season?: string) =>
  hasFacts ? { season, source: <WikipediaCredit compact lead="Gegevens van" /> } : undefined

/**
 * The line under a card with statistics that says how many matches it is based on: all the
 * played matches, or `known` of the `played` ones when only some have what the card counts.
 */
export function BasedOn({ known, played }: { known: number; played: number }) {
  return (
    <Text appearance="meta">
      {known === played
        ? `Gebaseerd op ${known === 1 ? '1 gespeelde wedstrijd' : `alle ${known} gespeelde wedstrijden`}`
        : `Gebaseerd op ${known} van de ${played} gespeelde wedstrijden`}
    </Text>
  )
}

/**
 * The card of the statistics page with the matches in which sc Heerenveen kept a clean sheet,
 * as short lines with the newest first, and above them how many there are in how many matches.
 * It starts with `count` lines, and the button under them loads the next ones, as on the
 * homepage: it works without JavaScript, because the form loads the page again with a larger
 * number in the address, and the part after the hash brings the visitor to the first new line.
 * `path` is the address of the page the card is on, which differs per season.
 */
export function CleanSheetsCard({
  competition,
  count,
  matches,
  now,
  path = '/cijfers',
  season,
}: {
  competition: CompetitionChoice
  count: number
  matches: PublicMatch[]
  now: Date
  path?: string
  season?: string | undefined
}) {
  const { matches: sheets, played } = cleanSheetsOf(matches, competition)
  const shown = sheets.slice(0, count)

  return (
    <Card aria-labelledby="de-nul-gehouden" shareable={imageCredit(played > 0, season)} surface="soft">
      <Heading aliases={['nul-gehouden']} anchor id="de-nul-gehouden" level={2}>
        De nul gehouden
      </Heading>
      {played === 0 ? (
        <Text>We hebben nog geen gespeelde wedstrijden van dit seizoen.</Text>
      ) : sheets.length === 0 ? (
        <Text>Nog niet de nul gehouden dit seizoen.</Text>
      ) : (
        <>
          <Text>{`${sheets.length} keer de nul gehouden in ${played} ${played === 1 ? 'wedstrijd' : 'wedstrijden'}`}</Text>
          <List role="list">
            {shown.map((match, index) => (
              <List.Item id={`nul-${index + 1}`} key={`${match.competition}-${match.round}`}>
                <ShortMatch
                  // Only played matches with both scores are in the list, so these are numbers.
                  {...matchMoment(match, now)}
                  goalsAgainst={match.goalsAgainst ?? 0}
                  goalsFor={match.goalsFor ?? 0}
                  home={match.home}
                  opponent={match.opponent}
                />
              </List.Item>
            ))}
          </List>
          {sheets.length > shown.length && (
            <Form action={`${path}#nul-${shown.length + 1}`} method="get">
              {/* The form replaces the query of the address, so it carries the choice. */}
              {competition === 'league' && <Input name={competitionParam} type="hidden" value={leagueValue} />}
              <Button appearance="soft" icon="plus" name="nul" type="submit" value={String(count + moreCleanSheets)}>
                {`Laad ${moreCleanSheets} meer`}
              </Button>
            </Form>
          )}
        </>
      )}
    </Card>
  )
}

/**
 * The card of the statistics page with the extremes of the matches that are counted: the
 * biggest win and loss, the match with the most goals, and our earliest and our last goal. Each
 * is a short match with its name above it, as the heading of the line, in the same item as the
 * match. The list draws its line above the name (see short-match.css), so it stays between the
 * items. A line without a match is left out, and the card doesn't say so. Under the list stand
 * how many matches the lines are based on: the first three on every played match, the two goals
 * on the matches whose goals are known. Without a played match it is a sentence for visitors
 * and no list.
 */
export function ExtremesCard({
  competition,
  matches,
  now,
  season,
}: {
  competition: CompetitionChoice
  matches: PublicMatch[]
  now: Date
  season?: string | undefined
}) {
  const { biggestLoss, biggestWin, earliestGoal, known, latestGoal, mostGoals, played } = extremesOf(
    matches,
    competition,
  )
  const lines = [
    { match: biggestWin, name: 'Grootste overwinning' },
    { match: biggestLoss, name: 'Grootste nederlaag' },
    { match: mostGoals, name: 'Meeste doelpunten' },
    { goal: earliestGoal, match: earliestGoal?.match, name: 'Vroegste doelpunt' },
    { goal: latestGoal, match: latestGoal?.match, name: 'Laatste doelpunt' },
  ]
  const shown = lines.flatMap(({ goal, match, name }) => (match === undefined ? [] : [{ goal, match, name }]))

  return (
    <Card aria-labelledby="uitersten" shareable={imageCredit(played > 0, season)} surface="soft">
      <Heading anchor id="uitersten" level={2}>
        Uitersten
      </Heading>
      {played === 0 ? (
        <Text>We hebben nog geen uitslagen van dit seizoen.</Text>
      ) : (
        <>
          <List role="list">
            {shown.map(({ goal, match, name }) => (
              <List.Item key={name}>
                <Text appearance="meta">
                  {name}
                  {goal !== undefined && goalLine(goal)}
                </Text>
                <ShortMatch
                  // Only played matches with both scores count, so these are numbers.
                  {...matchMoment(match, now)}
                  goalsAgainst={match.goalsAgainst ?? 0}
                  goalsFor={match.goalsFor ?? 0}
                  home={match.home}
                  opponent={match.opponent}
                />
              </List.Item>
            ))}
          </List>
          <BasedOn known={played} played={played} />
          {known > 0 && known < played && (
            <Text appearance="meta">{`Vroegste en laatste doelpunt: gebaseerd op ${known} van de ${played} gespeelde wedstrijden`}</Text>
          )}
        </>
      )}
    </Card>
  )
}

/**
 * The card of the statistics page with the goals of sc Heerenveen and of its opponents per
 * quarter of an hour: two donut charts, for and against, with the same numbers in a table under
 * them, which is what a screen reader gets, because the charts are hidden from it. Under the
 * table stand how many matches the count is based on, because a match without known goals has
 * no minutes, and, when one of those matches went to extra time, a line that extra time is left
 * out. Without a goal in the matches we know, it is a sentence for visitors and no empty
 * charts.
 */
export function GoalsPerQuarterCard({
  competition,
  matches,
  season,
}: {
  competition: CompetitionChoice
  matches: PublicMatch[]
  season?: string | undefined
}) {
  const { conceded, extraTime, known, played, scored } = goalsPerQuarter(matches, competition)
  const slices = (counts: number[]) => quarterLabels.map((label, index) => ({ label, value: counts[index] ?? 0 }))

  return (
    <Card
      aria-labelledby="doelpunten-per-kwartier"
      shareable={imageCredit(
        [...scored, ...conceded].some((count) => count > 0),
        season,
      )}
      surface="warm"
    >
      <Heading anchor id="doelpunten-per-kwartier" level={2}>
        Doelpunten per kwartier
      </Heading>
      {[...scored, ...conceded].every((count) => count === 0) ? (
        <Text>We hebben nog geen doelpunten met een minuut van dit seizoen. Kijk straks nog eens.</Text>
      ) : (
        <>
          <DonutChart.Group>
            <DonutChart slices={slices(scored)} title="Voor" tone="positive" />
            <DonutChart slices={slices(conceded)} title="Tegen" tone="negative" />
          </DonutChart.Group>
          <DataTable
            caption="Doelpunten van sc Heerenveen en van de tegenstanders per kwartier van de wedstrijd"
            columns={['Kwartier', 'Voor', 'Tegen']}
            rows={quarterLabels.map((label, index) => ({
              cells: [scored[index] ?? 0, conceded[index] ?? 0],
              header: label,
            }))}
          />
          <BasedOn known={known} played={played} />
          {extraTime && <Text appearance="meta">Doelpunten in de verlenging tellen niet mee.</Text>}
        </>
      )}
    </Card>
  )
}

/** The cells of a row of the tables of the card on how the matches go. */
const flowCells = (row: FlowRow) => [row.matches, row.won, row.drawn, row.lost, row.points]

/**
 * The columns are abbreviations, because five columns with whole words are wider than a phone
 * and than the sidebar of a small desktop. The line under the two sentences explains them, with
 * the same letters and words as every other table (`tableColumns`).
 */
export const flowColumns = [
  tableColumns.played,
  tableColumns.won,
  tableColumns.drawn,
  tableColumns.lost,
  tableColumns.points,
] as const

const measureNames: Record<LeagueMeasure, string> = {
  goalDifference: 'Doelsaldo',
  goalsAgainst: 'Beste verdediging, doelpunten tegen',
  goalsFor: 'Beste aanval, doelpunten voor',
  pointsPerMatch: 'Punten per wedstrijd',
  won: 'Gewonnen wedstrijden',
}

const pointsPerMatchFormat = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 2, minimumFractionDigits: 2 })

/** The value of a measure as the table writes it: the goal difference with its sign. */
function measureValue(measure: LeagueMeasure, value: number): number | string {
  if (measure === 'pointsPerMatch') {
    return pointsPerMatchFormat.format(value)
  }

  return measure === 'goalDifference' ? (value > 0 ? `+${value}` : value < 0 ? `\u2212${-value}` : '0') : value
}

const pointsWord = (points: number) => `${points} ${points === 1 ? 'punt' : 'punten'}`

/**
 * The card of the statistics page with the place of sc Heerenveen in the Eredivisie on five
 * measures, in a table, and under it two sentences on the points to the leader and to the last.
 * The places come from the table of the whole league, in which the clubs have not all played
 * the same number of matches, and the line under the card says after how many matches of ours
 * it holds. Without a table it is a sentence for visitors, like the card Stand.
 */
export function LeaguePlaceCard({
  season,
  standings,
}: {
  season?: string | undefined
  standings: PublicStandingsRow[]
}) {
  const place = leaguePlaceOf(standings)
  // The card of a season that is over has a season, and calls its table the final one.
  const table = season === undefined ? 'de stand' : 'de eindstand'

  return (
    <Card aria-labelledby="onze-plek-in-de-competitie" shareable={imageCredit(place !== undefined, season)}>
      <Heading anchor id="onze-plek-in-de-competitie" level={2}>
        Onze plek in de competitie
      </Heading>
      {place === undefined ? (
        <Text>
          {standings.length === 0
            ? `We hebben ${table} nog niet gevonden. Kijk straks nog eens.`
            : `We hebben de plek van sc Heerenveen in ${table} nog niet. Kijk straks nog eens.`}
        </Text>
      ) : (
        <>
          <DataTable
            caption="De plek van sc Heerenveen in de Eredivisie, per onderdeel"
            columns={['Onderdeel', 'Plaats', 'Waarde']}
            rows={place.measures.map(({ measure, place: rank, shared, value }) => ({
              cells: [`${shared ? 'gedeeld ' : ''}${rank}e`, measureValue(measure, value)],
              header: measureNames[measure],
            }))}
          />
          {placeSentences(place).map((sentence) => (
            <Text key={sentence}>{sentence}</Text>
          ))}
          <Text appearance="meta">
            {`Gebaseerd op de stand na ${place.played} ${place.played === 1 ? 'wedstrijd' : 'wedstrijden'} van sc Heerenveen`}
          </Text>
        </>
      )}
    </Card>
  )
}

/** A number with a comma and two decimals, as in 1,83, or a dash when there is no match. */
const perMatch = (value: number | undefined) =>
  value === undefined ? '–' : value.toLocaleString('nl-NL', { maximumFractionDigits: 2, minimumFractionDigits: 2 })

/**
 * The card of the statistics page with how sc Heerenveen does at home and away: a table with a
 * column for home, away and both, and a row for the matches, the points and the goals. The
 * numbers come from the score of the played matches that are counted. The rows with the points
 * are only there when every one of them is a match of the Eredivisie, because the cup gives no
 * points. A side with no match yet has a dash where a number is divided and a 0 where it is
 * counted. Without a result it is a sentence for visitors and no table.
 */
export function HomeAwayCard({
  competition,
  matches,
  season,
}: {
  competition: CompetitionChoice
  matches: PublicMatch[]
  season?: string | undefined
}) {
  const { away, home, leagueOnly, total } = homeAwayOf(matches, competition)
  const sides: HomeAwayTally[] = [home, away, total]
  const row = (header: string, cell: (side: HomeAwayTally) => number | string) => ({
    cells: sides.map(cell),
    header,
  })

  return (
    <Card aria-labelledby="thuis-en-uit" shareable={imageCredit(total.played > 0, season)}>
      <Heading anchor id="thuis-en-uit" level={2}>
        Thuis en uit
      </Heading>
      {total.played === 0 ? (
        <Text>We hebben nog geen uitslagen van dit seizoen.</Text>
      ) : (
        <>
          <DataTable
            caption="De uitslagen van sc Heerenveen thuis en uit dit seizoen"
            columns={['Onderdeel', 'Thuis', 'Uit', 'Totaal']}
            rows={[
              row('Gespeeld', (side) => side.played),
              row('Gewonnen', (side) => side.won),
              row('Gelijk', (side) => side.drawn),
              row('Verloren', (side) => side.lost),
              // The cup gives no points, so these rows need a league match for every match.
              ...(leagueOnly
                ? [
                    row('Punten', (side) => side.points),
                    row('Punten per wedstrijd', (side) => perMatch(side.pointsPerMatch)),
                  ]
                : []),
              row('Doelpunten voor', (side) => side.goalsFor),
              row('Doelpunten tegen', (side) => side.goalsAgainst),
              row('Doelpunten per wedstrijd', (side) => perMatch(side.goalsPerMatch)),
              row('Zonder tegendoelpunt', (side) => side.cleanSheets),
            ]}
          />
          <BasedOn known={total.played} played={total.played} />
        </>
      )}
    </Card>
  )
}

const numberFormat = new Intl.NumberFormat('nl-NL')

/**
 * The card of the statistics page with the visitors at the home matches of the season: a bar
 * for each home match, in the order of the days, and under it two sentences with the average
 * and the largest number, and a table with every match. The chart is hidden from a screen
 * reader, which gets the sentences and the table. A match still to be played is an empty
 * place, so the chart shows the whole season. A match with an unknown number is an empty place
 * too, and one without an audience a stub. The numbers are Wikipedia's estimates.
 */
export function AttendanceCard({
  competition,
  matches,
  season,
}: {
  competition: CompetitionChoice
  matches: PublicMatch[]
  season?: string | undefined
}) {
  const { average, highest, known, max, slots, ticks } = attendanceOf(matches, competition)
  const withNumbers = slots.some((slot) => slot.attendance !== null)
  const played = slots.filter((slot) => slot.match.status === 'played').length
  const heading = (
    <Heading anchor id="toeschouwers" level={2}>
      Toeschouwers
    </Heading>
  )
  const card = (children: ReactNode, shareable = false) => (
    <Card aria-labelledby="toeschouwers" shareable={imageCredit(shareable, season)}>
      {heading}
      {children}
    </Card>
  )

  if (slots.length === 0) {
    return card(<Text>We hebben nog geen thuiswedstrijden van dit seizoen.</Text>)
  }

  if (known === 0) {
    return card(
      <Text>
        {withNumbers
          ? 'Alle thuiswedstrijden waarvan we het aantal kennen, waren zonder publiek.'
          : 'We hebben van dit seizoen nog geen toeschouwersaantallen.'}
      </Text>,
    )
  }

  const cell = ({ attendance, match }: (typeof slots)[number]) =>
    match.status !== 'played'
      ? 'Nog niet gespeeld'
      : attendance === null
        ? 'Niet bekend'
        : attendance === 0
          ? 'Zonder publiek'
          : numberFormat.format(attendance)

  return card(
    <>
      <BarChart
        axis={{ title: 'Thuiswedstrijd' }}
        bars={slots.map(({ attendance }) => (attendance === null ? null : { tone: 'neutral', value: attendance }))}
        max={max}
        ticks={ticks}
        tickText={numberFormat.format}
      />
      <Text>{`Gemiddeld ${numberFormat.format(average ?? 0)} toeschouwers per thuiswedstrijd`}</Text>
      {highest && (
        <Text>
          {`Het meest: ${numberFormat.format(highest.attendance ?? 0)}, tegen ${highest.match.opponent} op ${formatTableDay(highest.match.matchDate)}`}
        </Text>
      )}
      <Text appearance="meta">Het aantal toeschouwers is een schatting, volgens Wikipedia.</Text>
      <DataTable
        caption="Het aantal toeschouwers bij elke thuiswedstrijd van sc Heerenveen dit seizoen"
        columns={['Wedstrijd', ...(competition === 'all' ? ['Competitie'] : []), 'Aantal']}
        rows={slots.map((slot) => ({
          cells: [...(competition === 'all' ? [slot.match.competition] : []), cell(slot)],
          header: `${formatTableDay(slot.match.matchDate)}, ${slot.match.opponent}`,
        }))}
      />
      <BasedOn known={known} played={played} />
    </>,
    true,
  )
}

/**
 * The block of the homepage with the previous and the next match in one list, and a link to the
 * page with them all. Without matches it says so in a sentence for visitors.
 */
export function MatchesCard({ data, now }: { data: MatchData; now: Date }) {
  const { next, previous } = overviewOf(data.matches, now)
  const shown = [previous, next].filter((match) => match !== undefined)

  return (
    <Card aria-labelledby="matches-heading">
      <Heading id="matches-heading" level={2}>
        Wedstrijden
      </Heading>
      {shown.length === 0 ? (
        <Text>We hebben het programma nog niet gevonden. Kijk straks nog eens.</Text>
      ) : (
        <MatchLines matches={shown} now={now} />
      )}
      <Text>
        <Link href="/wedstrijden" icon="arrow-right">
          Alle wedstrijden
        </Link>
      </Text>
      {shown.length > 0 && <WikipediaCredit compact />}
    </Card>
  )
}

/**
 * The card of the statistics page on how the matches of the Eredivisie go: what happens after
 * the first goal and after the score at half-time, each as a table of results and points, and
 * under them in how many matches sc Heerenveen won after trailing and did not win after
 * leading. Under those stand how many matches it is based on, and how many of them could not
 * show the first goal, because both clubs scored in the same minute. Without a match with known
 * goals it is a sentence for visitors and no tables.
 */
export function MatchFlowCard({ matches, season }: { matches: PublicMatch[]; season?: string | undefined }) {
  const { atHalfTime, firstGoal, known, notWonAfterLead, played, unknownFirstGoal, wonAfterTrailing } =
    matchFlowOf(matches)

  return (
    <Card aria-labelledby="hoe-de-wedstrijden-verlopen" shareable={imageCredit(known > 0, season)} surface="soft">
      <Heading anchor id="hoe-de-wedstrijden-verlopen" level={2}>
        Hoe de wedstrijden verlopen
      </Heading>
      {known === 0 ? (
        <Text>We hebben nog geen doelpunten met een minuut van dit seizoen. Kijk straks nog eens.</Text>
      ) : (
        <>
          <DataTable
            caption="Wat er gebeurt na het eerste doelpunt"
            columns={['Eerste doelpunt', ...flowColumns]}
            rows={[
              { cells: flowCells(firstGoal.ours), header: 'Wij scoren eerst' },
              { cells: flowCells(firstGoal.opponent), header: 'De tegenstander scoort eerst' },
            ]}
          />
          <DataTable
            caption="Wat er gebeurt na de stand bij de rust"
            columns={['Stand bij de rust', ...flowColumns]}
            rows={[
              { cells: flowCells(atHalfTime.ahead), header: 'Voor' },
              { cells: flowCells(atHalfTime.level), header: 'Gelijk' },
              { cells: flowCells(atHalfTime.behind), header: 'Achter' },
            ]}
          />
          <Text>
            {wonAfterTrailing === 0
              ? 'Na een achterstand won sc Heerenveen nog geen wedstrijd.'
              : `Na een achterstand won sc Heerenveen ${wonAfterTrailing === 1 ? '1 wedstrijd' : `${wonAfterTrailing} wedstrijden`}.`}
          </Text>
          <Text>
            {notWonAfterLead === 0
              ? 'Na een voorsprong liet sc Heerenveen nog geen winst liggen.'
              : `Na een voorsprong haalde sc Heerenveen in ${notWonAfterLead === 1 ? '1 wedstrijd' : `${notWonAfterLead} wedstrijden`} geen winst.`}
          </Text>
          <Text appearance="meta">{tableLegend(flowColumns)}</Text>
          <BasedOn known={known} played={played} />
          {unknownFirstGoal > 0 && (
            <Text appearance="meta">
              {`Bij ${unknownFirstGoal === 1 ? '1 wedstrijd' : `${unknownFirstGoal} wedstrijden`} is niet te zien wie het eerst scoorde.`}
            </Text>
          )}
        </>
      )}
    </Card>
  )
}

/**
 * The legend under a list of `MatchLine`s: the full words of the abbreviations in use, and
 * nothing when there are none. A title only shows under a mouse, so the words are text.
 */
export function MatchLegend({ matches }: { matches: readonly MatchLineMatch[] }) {
  const shootOut = matches.some(hasShootOut)
  // A shoot-out is written without "n.v.", unless the score after 90 minutes follows it.
  const extraTime = matches.some((match) => match.extraTime && (!hasShootOut(match) || hasAfterNinety(match)))
  const goals = matches.flatMap((match) => match.goals)
  const legend = [
    extraTime && 'n.v. na verlenging',
    shootOut && 'n.s. na strafschoppen',
    goals.some((goal) => goal.ownGoal) && 'e.d. eigen doelpunt',
    goals.some((goal) => goal.penalty) && 'pen. penalty',
  ].filter((part) => part !== false)

  return legend.length > 0 ? <Text appearance="meta">{legend.join(', ')}</Text> : null
}

/**
 * A list of matches, each as a line with its own day or time. A line names its competition,
 * unless `withCompetition` is false, for a list under a heading that names it already. The
 * legend under the list holds only the abbreviations of these matches.
 */
export function MatchLines({
  matches,
  now,
  withCompetition = true,
}: {
  matches: PublicMatch[]
  now: Date
  withCompetition?: boolean
}) {
  return (
    <>
      <List role="list">
        {matches.map((match) => (
          <List.Item key={`${match.competition}-${match.round}`}>
            <MatchLine match={match} now={now} withCompetition={withCompetition} />
          </List.Item>
        ))}
      </List>
      <MatchLegend matches={matches} />
    </>
  )
}

/** The words of the totals table, which the table per round uses too. */
const outcomeWord: Record<FormResult, string> = { G: 'Gelijk', V: 'Verlies', W: 'Winst' }

/**
 * The card of the statistics page with the season of the Eredivisie as a chart of bars, one for
 * each match played, and under it the same numbers in tables, which is what a screen reader
 * gets, because the chart is hidden from it: the totals, and in a fold the points and the
 * average of each round, which are the numbers the tooltip of the line gives. The cup ties
 * don't count. Without a result it is a sentence for visitors and no chart.
 */
export function SeasonCard({ matches, season }: { matches: PublicMatch[]; season?: string | undefined }) {
  const results = leagueResultsOf(matches)
  // The same function as the line of the chart, so the table and the tooltip agree.
  const averages = averagesOf(results)
  const count = (result: FormResult) => results.filter((item) => item === result).length
  const [won, drawn, lost] = [count('W'), count('G'), count('V')]

  return (
    <Card aria-labelledby="verloop-van-het-seizoen" shareable={imageCredit(results.length > 0, season)} surface="warm">
      <Heading anchor id="verloop-van-het-seizoen" level={2}>
        Verloop van het seizoen
      </Heading>
      {results.length === 0 ? (
        <Text>We hebben nog geen uitslagen van dit seizoen.</Text>
      ) : (
        <>
          <FormChart results={results} />
          <DataTable
            caption="Uitslagen van sc Heerenveen dit seizoen, met de punten"
            columns={['Uitslag', 'Wedstrijden', 'Punten']}
            rows={[
              { cells: [won, won * 3], header: 'Winst' },
              { cells: [drawn, drawn], header: 'Gelijk' },
              { cells: [lost, 0], header: 'Verlies' },
              { cells: [results.length, won * 3 + drawn], header: 'Totaal' },
            ]}
          />
          <Disclosure summary="Uitslag en gemiddelde per speelronde">
            <DataTable
              caption="Uitslagen van sc Heerenveen per speelronde, met de punten en het gemiddelde aantal punten per wedstrijd over de laatste 5 wedstrijden"
              columns={['Ronde', 'Uitslag', 'Punten', { abbreviation: 'Gem.', name: 'Gemiddelde' }]}
              rows={results.map((result, index) => ({
                cells: [outcomeWord[result], pointsOf(result), formatAverage(averages[index] ?? 0)],
                header: String(index + 1),
              }))}
            />
            <Text appearance="meta">
              Gem. is het gemiddelde aantal punten per wedstrijd over de laatste 5 wedstrijden, zoals de lijn.
            </Text>
          </Disclosure>
        </>
      )}
    </Card>
  )
}

/** The letter, the word a screen reader says and the tone of a result, for a `MarkRow`. */
export const markOf: Record<FormResult, MarkRowMark> = {
  G: { label: 'gelijk', mark: 'G', tone: 'neutral' },
  V: { label: 'verlies', mark: 'V', tone: 'negative' },
  W: { label: 'winst', mark: 'W', tone: 'positive' },
}

/**
 * The head coach or coaches of a season as a card with the strong blue surface and a list, in
 * the order they began. The title is "Hoofdtrainer" for one and "Hoofdtrainers" for more. A
 * season with one coach has his name only; with more, each line has "tot" and the day he
 * stopped, and the last has "vanaf" and the day he began (see `coachPeriods`). The name is
 * shown as a player's is, with "(interim)" behind it where that is so. The source of the data
 * is the credit under the page. A season with no coach in the table has no card.
 */
export function CoachesCard({ coaches }: { coaches: PublicStaff[] }) {
  if (coaches.length === 0) {
    return null
  }

  const { id, name } = coachesCardOf(coaches.length)
  const periods = coachPeriods(coaches)

  return (
    <Card aria-labelledby={id} surface="strong">
      <Heading anchor id={id} level={2}>
        {name}
      </Heading>
      <List role="list">
        {coaches.map((coach, index) => (
          <List.Item key={`${coach.name}-${coach.startDate}`}>
            <ShortStaff interim={coach.interim} period={periods[index]} {...splitStaffName(coach.name)} />
          </List.Item>
        ))}
      </List>
    </Card>
  )
}

const outcomeTones = { draw: 'neutral', loss: 'negative', win: 'positive' } as const

const outcomeWords = { draw: 'gelijk', loss: 'verlies', win: 'winst' } as const

/** The three tables of the card, in the order of the chart: a table for each outcome. */
const outcomes = [
  {
    caption: 'Uitslagen van gewonnen wedstrijden en hoe vaak ze voorkwamen, met onze doelpunten eerst',
    heading: 'Winst',
    outcome: 'win',
  },
  { caption: 'Uitslagen van gelijke spelen en hoe vaak ze voorkwamen', heading: 'Gelijk', outcome: 'draw' },
  {
    caption: 'Uitslagen van verloren wedstrijden en hoe vaak ze voorkwamen, met onze doelpunten eerst',
    heading: 'Verlies',
    outcome: 'loss',
  },
] as const

/**
 * The caption of the table over the latest five matches, which only a screen reader gets: what
 * it is, and the day of the last result in our data, which can be before the day of the table.
 */
export function lastFiveCaption(lastResultOn: string) {
  return `Stand over de laatste vijf wedstrijden op ${formatTableDay(lastResultOn)}`
}

/**
 * The card of the page Wedstrijden with how often each score was played this season, from the
 * side of sc Heerenveen: a donut chart with a slice for every score, green for a win, grey for
 * a draw and red for a loss, best first, and under it the table that is its key and its
 * numbers. The chart has no text round the ring and is hidden from a screen reader, which gets
 * the table: each row names the score and the outcome in words. The `matches` are the results
 * the page lists, and only the played ones with a score count. Without one it is a sentence
 * and no chart. The page of a club shows the same card (see `ScoreCountsView`).
 */
export function ScoreCountsCard({ matches, season }: { matches: PublicMatch[]; season?: string | undefined }) {
  const counts = scoreCountsOf(matches)

  return (
    <ScoreCountsView anchored counts={counts} empty="We hebben nog geen uitslagen van dit seizoen." season={season} />
  )
}

/** How many matches the scores in `counts` come to. */
export const playedOfCounts = (counts: ScoreCount[]) => counts.reduce((sum, count) => sum + count.count, 0)

/**
 * The words in the header of the table of an outcome: what the eye reads, such as `Winst 12×`,
 * and what a screen reader says, `Winst, 12 keer`, both made from the same count here.
 */
const outcomeColumn = (heading: string, count: number) => ({
  name: `${heading}, ${count} keer`,
  shown: `${heading} ${count}×`,
})

/** The line that closes the card: how many matches its figures count. */
export const playedLine = (played: number) =>
  played === 1 ? '1 gespeelde wedstrijd' : `Alle ${played} gespeelde wedstrijden`

/**
 * The card "Hoe vaak welke uitslag" for the `counts` it is given, which the page of the
 * matches and the page of a club share: the chart and a table for each outcome, with the
 * count of the outcome in its header, and under them the line with the number of matches.
 * `empty` is the sentence for no played match. The page of a club gives the `goals` of the
 * same matches, which get a second, smaller chart beside the first, and `children`, which
 * stand under the tables and above the line. The heading is an anchor (`anchored`) where the
 * page links to it, as Wedstrijden does; the anchors of a page are a promise, see
 * `src/anchors.ts`.
 */
export function ScoreCountsView({
  anchored = false,
  children,
  counts,
  empty,
  goals,
  season,
}: {
  anchored?: boolean
  children?: ReactNode
  counts: ScoreCount[]
  empty: string
  goals?: undefined | { against: number; for: number }
  season?: string | undefined
}) {
  const played = playedOfCounts(counts)
  const slices = counts.map(({ count, goalsAgainst, goalsFor, outcome }) => ({
    label: `${goalsFor}–${goalsAgainst}`,
    tone: outcomeTones[outcome],
    value: count,
  }))

  return (
    <Card aria-labelledby={scoreCountsCard.id} shareable={imageCredit(played > 0, season)} surface="warm">
      {anchored ? (
        <Heading anchor id={scoreCountsCard.id} level={2}>
          {scoreCountsCard.name}
        </Heading>
      ) : (
        <Heading id={scoreCountsCard.id} level={2}>
          {scoreCountsCard.name}
        </Heading>
      )}
      {played === 0 ? (
        <Text>{empty}</Text>
      ) : (
        <>
          {goals === undefined ? (
            <DonutChart labels={false} ranked slices={slices} />
          ) : (
            <>
              <DonutChart.Group>
                <DonutChart labels={false} ranked slices={slices} />
                <DonutChart
                  centre={`${goals.for}–${goals.against}`}
                  labels={false}
                  size="small"
                  slices={[
                    // The ring goes clockwise from the top: the goals against first, so the
                    // goals for come after them and sit at the left, as in "45–31".
                    { label: 'Tegen', tone: 'negative', value: goals.against },
                    { label: 'Gemaakt', tone: 'positive', value: goals.for },
                  ]}
                  title="Doelsaldo"
                />
              </DonutChart.Group>
              <Text className="hf-visually-hidden">{`Doelpunten: ${goals.for} gemaakt, ${goals.against} tegen.`}</Text>
            </>
          )}
          <DataTable.Group>
            {outcomes.map(({ caption, heading, outcome }) => {
              const rows = counts.flatMap((count, index) => (count.outcome === outcome ? [{ count, index }] : []))
              const total = rows.reduce((sum, { count }) => sum + count.count, 0)

              return rows.length === 0 ? null : (
                <DataTable
                  caption={caption}
                  columns={[outcomeColumn(heading, total), { hidden: true, name: 'Keer' }]}
                  key={outcome}
                  rows={rows.map(({ count, index }) => ({
                    cells: [`${count.count}×`],
                    header: slices[index]!.label,
                    marker: <DonutChart.Swatch index={index} ranked slices={slices} />,
                    note: outcomeWords[outcome],
                  }))}
                />
              )
            })}
          </DataTable.Group>
          {children}
          <Text appearance="meta">{playedLine(played)}</Text>
        </>
      )}
    </Card>
  )
}

/**
 * The full credit for the page of the matches: the pages of Wikipedia the importer read, and
 * the last time it read them, in a card without a border or background to see, so its text
 * lines up with the text in the cards above. It is nothing when the importer has read none,
 * which can't be so with data that came from the importer.
 */
export function SourceCredit({
  edited,
  pages,
  season,
  squad,
}: {
  edited: boolean
  pages: PublicWikipediaPage[]
  season: string
  /**
   * The pages the squad of the season was read from, for the page Spelers, and whether a player
   * comes from Wikidata, which the credit then names with its licence (CC0).
   */
  squad?: undefined | { pages: { readAt: Date; title: string }[]; wikidata: boolean }
}) {
  const squadPages = squad?.pages ?? []
  const dutchPages = squadPages.filter((page) => !isEnglishPage(page.title)).length
  const credited = [
    ...pages.map((page) => ({
      href: wikipediaUrl(page.title, page.kind),
      name: creditName(page.kind, season),
      readAt: page.readAt,
    })),
    ...squadPages.map((page) => ({
      href: `https://${isEnglishPage(page.title) ? 'en' : 'nl'}.wikipedia.org/wiki/${encodeURI(page.title.replaceAll(' ', '_'))}`,
      name: squadPageName(page.title, season, dutchPages),
      readAt: page.readAt,
    })),
  ]
  const [first, ...rest] = credited

  if (first === undefined) {
    return null
  }

  const readAt = new Date(Math.max(...credited.map((page) => page.readAt.getTime())))

  return (
    <Card as="div" surface="transparent">
      <WikipediaCredit
        {...(squadPages.length > 0 ? { data: 'gegevens' } : {})}
        edited={edited}
        pages={[first, ...rest]}
        readAt={formatReadAt(readAt)}
        readAtDateTime={readAt.toISOString()}
      />
      {squad?.wikidata === true && (
        <Text appearance="meta">
          Enkele spelers komen van <Link href="https://www.wikidata.org/">Wikidata</Link> (CC0).
        </Text>
      )}
    </Card>
  )
}

/**
 * The line under the table of the current season when it may be behind (see `standingsLag`):
 * the matches of the season say whether a result is missing. It has the red of "Gegevens nog
 * niet beschikbaar" at a match. It is a temporary state, so the card's image leaves it out.
 * The sentence is here for both cards Stand.
 */
export function StandingsBehind({ matches, now }: { matches: PublicMatch[]; now: Date }) {
  return standingsLag(matches, now) ? (
    <Text appearance="meta" className="hf-text-missing" data-hf-card-share-skip="">
      Gegevens nog niet bijgewerkt
    </Text>
  ) : null
}

/**
 * The caption of the table, which only a screen reader gets: what it is, and the day it holds
 * for. `name` is what the card calls the table: `Eindstand` for a season that is over.
 */
export function standingsCaption(rows: PublicStandingsRow[], name = 'Stand') {
  const [first] = rows

  return first === undefined ? name : `${name} op ${formatTableDay(first.validOn)}`
}

/**
 * The block of the homepage with three clubs of the league table in its short form, with sc
 * Heerenveen in the middle if possible, and a link to the full table on the matches page.
 */
export function StandingsCard({ data, now }: { data: MatchData; now: Date }) {
  return (
    <Card aria-labelledby="standings-heading">
      <Heading id="standings-heading" level={2}>
        Stand
      </Heading>
      {data.standings.length === 0 ? (
        <Text>We hebben de stand nog niet gevonden. Kijk straks nog eens.</Text>
      ) : (
        <StandingsTable
          caption={standingsCaption(data.standings)}
          columns="compact"
          rows={standingsAround(data.standings)}
        />
      )}
      {data.standings.length > 0 && <StandingsBehind matches={data.matches} now={now} />}
      <Text>
        <Link href="/wedstrijden#stand" icon="arrow-right">
          De volledige stand
        </Link>
      </Text>
      {data.standings.length > 0 && <WikipediaCredit compact />}
    </Card>
  )
}

/**
 * The card of the statistics page with the streaks of sc Heerenveen in the matches that are
 * counted: a table with the six streaks, as they stand now and the longest of the season, and
 * under it the latest five matches, the oldest first like the form in the card of the season.
 * They are letters in colour and, as well, short lines with the opponent and the score, so no
 * colour stands alone. The streaks come from the score of every played match that is counted
 * (see `streaksOf`). Without a played match it is a sentence for visitors and no table.
 *
 * A season that is over (it has a `season`) has no column for how the streaks stand now: the
 * streak it ended with doesn't change any more and says little. It has no latest five matches
 * either, which are no more special at the end of a season than any other five. Its texts name
 * the season, not "this season".
 */
export function StreaksCard({
  competition,
  matches,
  now,
  season,
}: {
  competition: CompetitionChoice
  matches: PublicMatch[]
  now: Date
  season?: string | undefined
}) {
  const { last, played, streaks } = streaksOf(matches, competition)
  const over = season !== undefined
  const when = over ? `in ${season}` : 'dit seizoen'

  return (
    <Card aria-labelledby="reeksen" shareable={imageCredit(played > 0, season)} surface="soft">
      <Heading anchor id="reeksen" level={2}>
        Reeksen
      </Heading>
      {played === 0 ? (
        <Text>{over ? `We hebben geen uitslagen ${when}.` : `We hebben nog geen uitslagen van ${when}.`}</Text>
      ) : (
        <>
          <Text appearance="meta">Aantal wedstrijden achter elkaar</Text>
          <DataTable
            caption={`De reeksen van sc Heerenveen in ${competitionNames(matches, competition)} ${when}`}
            columns={over ? ['Reeks', 'Langste'] : ['Reeks', 'Nu', 'Langste']}
            rows={streaks.map(({ current, label, longest }) => ({
              cells: over ? [longest] : [current, longest],
              header: label,
            }))}
          />
          {!over && (
            <>
              <MarkRow marks={last.map(({ result }) => markOf[result])} title="Laatste wedstrijden" />
              <List role="list">
                {last.map(({ match }) => (
                  <List.Item key={`${match.competition}-${match.round}`}>
                    <ShortMatch
                      {...matchMoment(match, now)}
                      goalsAgainst={match.goalsAgainst}
                      goalsFor={match.goalsFor}
                      home={match.home}
                      opponent={match.opponent}
                    />
                  </List.Item>
                ))}
              </List>
            </>
          )}
          <BasedOn known={played} played={played} />
        </>
      )}
    </Card>
  )
}

/**
 * The goal scorers of this season: a line under the heading for how many players scored, as on
 * the card of the clean sheets, then a table with a bar (its caption is for a screen reader
 * only), and a line when not every played match has its scorers, so nobody takes an incomplete
 * list for a complete one. Without a goal it is a sentence for visitors and no table.
 *
 * Without `playersHref` it is everybody who scored, as on the page Spelers. With it, it is the
 * short form of the page Cijfers: the first five places (see topFiveOf), the line says "De
 * top 5 van 17 spelers die scoorden", and the link "Alle doelpuntenmakers" under the list goes
 * to `playersHref`, the page with the whole list. The line only says "top 5" when the list was
 * cut: if nobody is left out, it counts the players, as the full list does.
 *
 * The page of a club has the short form too, for the matches against that club (see
 * `ClubTopScorersCard`, with `topOnly` and no link), but its texts are about a club and not
 * about a season: `scope` ends the caption ("van sc Heerenveen tegen FC Twente, in de
 * Eredivisie") and `empty` is the sentence for no goal. A season gets `season` and no `scope`,
 * a club the other way round, so the caption never says "undefined".
 */
export function TopScorers({
  competition,
  empty = 'We hebben nog geen doelpuntenmakers van dit seizoen. Kijk straks nog eens.',
  matches,
  playersHref,
  scope,
  season,
  topOnly = playersHref !== undefined,
}: {
  competition: CompetitionChoice
  empty?: string
  matches: ScoredMatch[]
  playersHref?: string | undefined
  /** Only the first five places; on by default when there is a link to the full list. */
  topOnly?: boolean
} & ({ scope: string; season?: undefined } | { scope?: undefined; season: string })) {
  const scorers = topScorersOf(matches, competition)
  const shown = topOnly ? topFiveOf(scorers) : scorers
  const cut = shown.length < scorers.length
  const { known, played } = scorersCoverage(matches, competition)

  if (scorers.length === 0) {
    return <Text>{empty}</Text>
  }

  return (
    <>
      <Text>
        {cut
          ? `De top ${topScorersPlaces} van ${scorers.length} spelers die scoorden`
          : scorers.length === 1
            ? '1 speler heeft gescoord'
            : `${scorers.length} spelers hebben gescoord`}
      </Text>
      <TopScorersTable
        caption={`${cut ? `De top ${topScorersPlaces} van de doelpuntenmakers` : 'Doelpuntenmakers'} ${scope ?? `van sc Heerenveen in het seizoen ${season}, in ${competitionNames(matches, competition)}`}`}
        rows={topOnly ? scorersByPlace(shown) : shown.map(onePlayerPlace)}
      />
      {known < played && (
        <Text appearance="meta">
          Gebaseerd op de doelpuntenmakers van {known} van de {played} gespeelde wedstrijden
        </Text>
      )}
      {playersHref !== undefined && (
        <Text>
          <Link href={playersHref} icon="arrow-right">
            Alle doelpuntenmakers
          </Link>
        </Text>
      )}
    </>
  )
}

/** A row of the table for one player, as on the page Spelers, which has a row per player. */
const onePlayerPlace = (scorer: TopScorer): ScorerPlace => ({
  goals: scorer.goals,
  players: [scorer],
  position: scorer.position,
})

/**
 * The card Doelpuntenmakers, on the page Cijfers as the short form (the top 5, with the
 * link to the page Spelers) and on the page Spelers as the whole list. Both have the same
 * heading, anchor and button for an image, so a link to `#doelpuntenmakers` works on both.
 * `playersHref` is the page Spelers of the season the card is about; the page Spelers leaves it
 * out. The card is soft and in the sidebar on both pages.
 */
export function TopScorersCard({
  competition,
  matches,
  playersHref,
  season,
  seasonOnImage,
}: {
  competition: CompetitionChoice
  matches: PublicMatch[]
  playersHref?: string | undefined
  season: string
  seasonOnImage?: string | undefined
}) {
  return (
    <Card
      aria-labelledby="doelpuntenmakers"
      shareable={imageCredit(topScorersOf(matches, competition).length > 0, seasonOnImage)}
      surface="soft"
    >
      <Heading aliases={['topscorers']} anchor id="doelpuntenmakers" level={2}>
        Doelpuntenmakers
      </Heading>
      <TopScorers competition={competition} matches={matches} playersHref={playersHref} season={season} />
    </Card>
  )
}

// Between the parts of a line of meta text. The dot is only for the eye and is hidden from a
// screen reader, as in a short match. The spaces stay outside the hidden span, so the parts
// don't run together in the accessibility tree.
export const metaSeparator = (
  <>
    {' '}
    <Text aria-hidden="true" as="span">
      ·
    </Text>{' '}
  </>
)

/**
 * What a line of a match needs, which a match of a season has and so has a match against a
 * club: the number of spectators and the referee are the only fields that a line leaves out.
 */
export type MatchLineMatch = Omit<PublicMatch, 'attendance' | 'referee'>

/**
 * A match as the design system shows it (`Match`), with the time in Dutch time. This is the one
 * line for a list of matches: Programma, Uitslagen and the matches against a club all use it,
 * so a match looks the same wherever it stands. A list that runs over seasons asks for
 * `withYear`, which gives the day of a played match its year (see `matchMoment`).
 */
export function MatchLine({
  match,
  now,
  withCompetition = true,
  withYear = false,
}: {
  match: MatchLineMatch
  now: Date
  withCompetition?: boolean
  withYear?: boolean
}) {
  const common = {
    competition: withCompetition ? match.competition : undefined,
    home: match.home,
    note: match.note,
    opponent: match.opponent,
    round: match.round,
    stadium: match.stadium,
  }

  if (match.status === 'postponed' || match.status === 'cancelled') {
    return <Match {...common} status={match.status} />
  }
  if (match.status === 'played' && match.goalsFor !== null && match.goalsAgainst !== null) {
    const result = {
      ...common,
      ...matchMoment(match, now, { withYear }),
      extraTime: match.extraTime,
      goals: goalsWithInitials(match.goals),
      goalsAgainst: match.goalsAgainst,
      goalsFor: match.goalsFor,
      status: 'played',
    } as const

    const afterNinety =
      match.afterNinetyFor !== null && match.afterNinetyAgainst !== null
        ? { afterNinetyAgainst: match.afterNinetyAgainst, afterNinetyFor: match.afterNinetyFor }
        : {}

    return match.penaltiesFor !== null && match.penaltiesAgainst !== null ? (
      <Match {...result} {...afterNinety} penaltiesAgainst={match.penaltiesAgainst} penaltiesFor={match.penaltiesFor} />
    ) : (
      <Match {...result} {...afterNinety} />
    )
  }

  // A match that has begun and has no result keeps its time, and says after two hours that the
  // result isn't known yet.
  return <Match {...common} {...matchMoment(match, now)} resultMissing={lacksResult(match, now)} status="scheduled" />
}

/** A goal for the name above a short match: the minute with stoppage time, and the player. */
function goalLine({ goal }: ExtremeGoal) {
  const minute = goal.stoppageMinutes === null ? `${goal.minute}` : `${goal.minute}+${goal.stoppageMinutes}`

  return (
    <>
      {metaSeparator}
      {`minuut ${minute}`}
      {metaSeparator}
      {`${goal.player}${goal.ownGoal ? ' (eigen doelpunt)' : ''}`}
    </>
  )
}

/** Whether the score after 90 minutes of a match is known, which has both scores. */
function hasAfterNinety(match: MatchLineMatch): boolean {
  return match.afterNinetyFor !== null && match.afterNinetyAgainst !== null
}

/** Whether a played match was decided in a shoot-out, which has both scores. */
function hasShootOut(match: MatchLineMatch): boolean {
  return match.penaltiesFor !== null && match.penaltiesAgainst !== null
}

/**
 * The two sentences under the table: where sc Heerenveen stands to the leader and to the last.
 * A club that is itself the leader (no leader is given) or the last says so. The sentences are
 * left out when it is the only club that has played, and there is nothing to compare.
 */
function placeSentences({ last, leader }: LeaguePlace): string[] {
  const sentences: string[] = []

  if (leader !== undefined) {
    sentences.push(
      leader.points === 0
        ? `sc Heerenveen heeft evenveel punten als de koploper, ${leader.club}.`
        : `sc Heerenveen staat ${pointsWord(leader.points)} achter de koploper, ${leader.club}.`,
    )
  } else if (last !== undefined) {
    sentences.push('sc Heerenveen staat bovenaan.')
  }
  if (last !== undefined) {
    sentences.push(
      last.points === 0
        ? `sc Heerenveen heeft evenveel punten als de laatste, ${last.club}.`
        : `sc Heerenveen staat ${pointsWord(last.points)} voor op de laatste, ${last.club}.`,
    )
  } else if (leader !== undefined) {
    sentences.push('sc Heerenveen staat onderaan.')
  }

  return sentences
}
