import type { PublicMatch, PublicStandingsRow, PublicWikipediaPage } from '@fansite/db/queries'
import type { FormResult } from '@fansite/design-system'

import {
  Button,
  Card,
  DataTable,
  DonutChart,
  Form,
  FormChart,
  Heading,
  Link,
  List,
  Match,
  ShortMatch,
  StandingsTable,
  Text,
  TopScorersTable,
  WikipediaCredit,
} from '@fansite/design-system'

import type { MatchData } from './matches'

import { moreCleanSheets } from './items-per-card'
import { creditName, formatReadAt, formatTableDay, matchMoment, wikipediaUrl } from './match-format'
import {
  cleanSheetsOf,
  goalsPerQuarter,
  goalsWithInitials,
  type LeagueMeasure,
  type LeaguePlace,
  leaguePlaceOf,
  leagueResultsOf,
  overviewOf,
  quarterLabels,
  scorersCoverage,
  standingsAround,
  topScorersOf,
} from './matches'

/**
 * What the button for an image of a statistics card puts under the image: the credit of
 * Wikipedia, where the facts come from, as the cards of the homepage give it. It is a function,
 * so a card that has no facts yet has no button.
 */
export const imageCredit = (hasFacts: boolean) =>
  hasFacts ? { source: <WikipediaCredit compact lead="Gegevens van" /> } : undefined

/**
 * The card of the matches page with the matches in which sc Heerenveen kept a clean sheet, as
 * short lines with the newest first, and above them how many there are in how many matches.
 * It starts with `count` lines, and the button under them loads the next ones, as on the
 * homepage: it works without JavaScript, because the form loads the page again with a larger
 * number in the address, and the part after the hash brings the visitor to the first new line.
 */
export function CleanSheetsCard({ count, matches, now }: { count: number; matches: PublicMatch[]; now: Date }) {
  const { matches: sheets, played } = cleanSheetsOf(matches)
  const shown = sheets.slice(0, count)

  return (
    <Card aria-labelledby="de-nul-gehouden" shareable={imageCredit(played > 0)} surface="soft">
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
            <Form action={`/wedstrijden#nul-${shown.length + 1}`} method="get">
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
 * The card of the matches page with the goals of sc Heerenveen and of its opponents per quarter
 * of an hour: two donut charts, for and against, with the same numbers in a table under them,
 * which is what a screen reader gets, because the charts are hidden from it. Under the table
 * stand how many matches the count is based on, because a match without known goals has no
 * minutes, and, when one of those matches went to extra time, a line that extra time is left
 * out. Without a goal in the matches we know, it is a sentence for visitors and no empty
 * charts.
 */
export function GoalsPerQuarterCard({ matches }: { matches: PublicMatch[] }) {
  const { conceded, extraTime, known, played, scored } = goalsPerQuarter(matches)
  const slices = (counts: number[]) => quarterLabels.map((label, index) => ({ label, value: counts[index] ?? 0 }))

  return (
    <Card
      aria-labelledby="doelpunten-per-kwartier"
      shareable={imageCredit([...scored, ...conceded].some((count) => count > 0))}
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
          <Text appearance="meta">
            {known === played
              ? `Gebaseerd op ${known === 1 ? '1 gespeelde wedstrijd' : `alle ${known} gespeelde wedstrijden`}`
              : `Gebaseerd op ${known} van de ${played} gespeelde wedstrijden`}
          </Text>
          {extraTime && <Text appearance="meta">Doelpunten in de verlenging tellen niet mee.</Text>}
        </>
      )}
    </Card>
  )
}

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
 * The card of the matches page with the place of sc Heerenveen in the Eredivisie on five
 * measures, in a table, and under it two sentences on the points to the leader and to the last.
 * The places come from the table of the whole league, in which the clubs have not all played
 * the same number of matches, and the line under the card says after how many matches of ours
 * it holds. Without a table it is a sentence for visitors, like the card Stand.
 */
export function LeaguePlaceCard({ standings }: { standings: PublicStandingsRow[] }) {
  const place = leaguePlaceOf(standings)

  return (
    <Card aria-labelledby="onze-plek-in-de-competitie" shareable={imageCredit(place !== undefined)}>
      <Heading anchor id="onze-plek-in-de-competitie" level={2}>
        Onze plek in de competitie
      </Heading>
      {place === undefined ? (
        <Text>
          {standings.length === 0
            ? 'We hebben de stand nog niet gevonden. Kijk straks nog eens.'
            : 'We hebben de plek van sc Heerenveen in de stand nog niet. Kijk straks nog eens.'}
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

/**
 * The block of the homepage with the previous and the next match in one list, and a link to the
 * page with them all. Without matches it says so in a sentence for visitors.
 */
export function MatchesCard({ data, now }: { data: MatchData; now: Date }) {
  const { next, previous } = overviewOf(data.matches)
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

/** A list of matches, each as a line with its own day or time. */
export function MatchLines({ matches, now }: { matches: PublicMatch[]; now: Date }) {
  const shootOut = matches.some(hasShootOut)
  const extraTime = matches.some((match) => match.extraTime && !hasShootOut(match))
  const goals = matches.flatMap((match) => match.goals)
  const legend = [
    extraTime && 'n.v. na verlenging',
    shootOut && 'n.s. na strafschoppen',
    goals.some((goal) => goal.ownGoal) && 'e.d. eigen doelpunt',
    goals.some((goal) => goal.penalty) && 'pen. penalty',
  ].filter((part) => part !== false)

  return (
    <>
      <List role="list">
        {matches.map((match) => (
          <List.Item key={`${match.competition}-${match.round}`}>
            <MatchLine match={match} now={now} />
          </List.Item>
        ))}
      </List>
      {/* The full words of the abbreviations in use: a title only shows under a mouse. */}
      {legend.length > 0 && <Text appearance="meta">{legend.join(', ')}</Text>}
    </>
  )
}

/**
 * The card of the matches page with the season of the Eredivisie as a chart of bars, one for
 * each match played, and under it the same numbers in a table, which is what a screen reader
 * gets, because the chart is hidden from it. The cup ties don't count. Without a result it is
 * a sentence for visitors and no chart.
 */
export function SeasonCard({ matches }: { matches: PublicMatch[] }) {
  const results = leagueResultsOf(matches)
  const count = (result: FormResult) => results.filter((item) => item === result).length
  const [won, drawn, lost] = [count('W'), count('G'), count('V')]

  return (
    <Card aria-labelledby="verloop-van-het-seizoen" shareable={imageCredit(results.length > 0)} surface="warm">
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
export function SourceCredit({ pages, season }: { pages: PublicWikipediaPage[]; season: string }) {
  const credited = pages.map((page) => ({
    href: wikipediaUrl(page.title),
    name: creditName(page.kind, season),
    readAt: page.readAt,
  }))
  const [first, ...rest] = credited

  if (first === undefined) {
    return null
  }

  const readAt = new Date(Math.max(...credited.map((page) => page.readAt.getTime())))

  return (
    <Card as="div" surface="transparent">
      <WikipediaCredit pages={[first, ...rest]} readAt={formatReadAt(readAt)} readAtDateTime={readAt.toISOString()} />
    </Card>
  )
}

/**
 * The caption of the table, which only a screen reader gets: what it is, and the day it holds
 * for.
 */
export function standingsCaption(rows: PublicStandingsRow[]) {
  const [first] = rows

  return first === undefined ? 'Stand' : `Stand op ${formatTableDay(first.validOn)}`
}

/**
 * The block of the homepage with three clubs of the league table in its short form, with sc
 * Heerenveen in the middle if possible, and a link to the full table on the matches page.
 */
export function StandingsCard({ data }: { data: MatchData }) {
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
 * Everybody who scored this season: a line under the heading for how many players scored, as on
 * the card of the clean sheets, then a table with a bar (its caption is for a screen reader
 * only), and a line when not every played match has its scorers, so nobody takes an incomplete
 * list for a complete one. Without a goal it is a sentence for visitors and no table.
 */
export function TopScorers({ matches, season }: { matches: PublicMatch[]; season: string }) {
  const scorers = topScorersOf(matches)
  const { known, played } = scorersCoverage(matches)

  if (scorers.length === 0) {
    return <Text>We hebben nog geen doelpuntenmakers van dit seizoen. Kijk straks nog eens.</Text>
  }

  return (
    <>
      <Text>{scorers.length === 1 ? '1 speler heeft gescoord' : `${scorers.length} spelers hebben gescoord`}</Text>
      <TopScorersTable
        caption={`Doelpuntenmakers van sc Heerenveen in het seizoen ${season}, in de Eredivisie en de KNVB Beker`}
        rows={scorers}
      />
      {known < played && (
        <Text appearance="meta">
          Gebaseerd op de doelpuntenmakers van {known} van de {played} gespeelde wedstrijden
        </Text>
      )}
    </>
  )
}

/** Whether a played match was decided in a shoot-out, which has both scores. */
function hasShootOut(match: PublicMatch): boolean {
  return match.penaltiesFor !== null && match.penaltiesAgainst !== null
}

/** A match as the design system shows it, with the time in Dutch time. */
function MatchLine({ match, now }: { match: PublicMatch; now: Date }) {
  const common = {
    competition: match.competition,
    home: match.home,
    opponent: match.opponent,
    round: match.round,
    stadium: match.stadium,
  }

  if (match.status === 'postponed') {
    return <Match {...common} status="postponed" />
  }
  if (match.status === 'played' && match.goalsFor !== null && match.goalsAgainst !== null) {
    const result = {
      ...common,
      ...matchMoment(match, now),
      extraTime: match.extraTime,
      goals: goalsWithInitials(match.goals),
      goalsAgainst: match.goalsAgainst,
      goalsFor: match.goalsFor,
      status: 'played',
    } as const

    return match.penaltiesFor !== null && match.penaltiesAgainst !== null ? (
      <Match {...result} penaltiesAgainst={match.penaltiesAgainst} penaltiesFor={match.penaltiesFor} />
    ) : (
      <Match {...result} />
    )
  }

  return <Match {...common} {...matchMoment(match, now)} status="scheduled" />
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
