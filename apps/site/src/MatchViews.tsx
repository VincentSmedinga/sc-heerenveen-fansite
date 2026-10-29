import type { PublicMatch, PublicStandingsRow, PublicWikipediaPage } from '@fansite/db/queries'
import type { FormResult, MarkRowMark } from '@fansite/design-system'

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
  MarkRow,
  Match,
  ShortMatch,
  StandingsTable,
  Text,
  TopScorersTable,
  WikipediaCredit,
} from '@fansite/design-system'

import type { FlowRow, MatchData } from './matches'

import { moreCleanSheets } from './items-per-card'
import { creditName, formatReadAt, formatTableDay, matchMoment, wikipediaUrl } from './match-format'
import {
  cleanSheetsOf,
  goalsPerQuarter,
  goalsWithInitials,
  leagueResultsOf,
  matchFlowOf,
  overviewOf,
  quarterLabels,
  scorersCoverage,
  standingsAround,
  streaksOf,
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
 * and than the sidebar of a small desktop. The line under the second table explains them, with
 * `G gespeeld` as the table of the standings has it.
 */
const flowColumns = [
  { abbreviation: 'G', name: 'gespeeld' },
  { abbreviation: 'W', name: 'winst' },
  { abbreviation: 'GL', name: 'gelijk' },
  { abbreviation: 'V', name: 'verlies' },
  { abbreviation: 'P', name: 'punten' },
] as const

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

/**
 * The card of the matches page on how the matches of the Eredivisie go: what happens after the
 * first goal and after the score at half-time, each as a table of results and points, and under
 * them in how many matches sc Heerenveen won after trailing and did not win after leading.
 * Under those stand how many matches it is based on, and how many of them could not show the
 * first goal, because both clubs scored in the same minute. Without a match with known goals it
 * is a sentence for visitors and no tables.
 */
export function MatchFlowCard({ matches }: { matches: PublicMatch[] }) {
  const { atHalfTime, firstGoal, known, notWonAfterLead, played, unknownFirstGoal, wonAfterTrailing } =
    matchFlowOf(matches)

  return (
    <Card aria-labelledby="hoe-de-wedstrijden-verlopen" shareable={imageCredit(known > 0)} surface="soft">
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
          <Text appearance="meta">G gespeeld, W winst, GL gelijk, V verlies, P punten</Text>
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

const markOf: Record<FormResult, MarkRowMark> = {
  G: { label: 'gelijk', mark: 'G', tone: 'neutral' },
  V: { label: 'verlies', mark: 'V', tone: 'negative' },
  W: { label: 'winst', mark: 'W', tone: 'positive' },
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
 * The card of the matches page with the streaks of sc Heerenveen in the Eredivisie: a table
 * with the six streaks, as they stand now and the longest of the season, and under it the
 * latest five matches, the oldest first like the form in the card of the season. They are
 * letters in colour and, as well, short lines with the opponent and the score, so no colour
 * stands alone. The streaks come from the score of every played match of the league (see
 * `streaksOf`). Without a played match it is a sentence for visitors and no table.
 */
export function StreaksCard({ matches, now }: { matches: PublicMatch[]; now: Date }) {
  const { last, played, streaks } = streaksOf(matches)

  return (
    <Card aria-labelledby="reeksen" shareable={imageCredit(played > 0)} surface="soft">
      <Heading anchor id="reeksen" level={2}>
        Reeksen
      </Heading>
      {played === 0 ? (
        <Text>We hebben nog geen uitslagen van dit seizoen.</Text>
      ) : (
        <>
          <Text appearance="meta">Aantal wedstrijden achter elkaar</Text>
          <DataTable
            caption="De reeksen van sc Heerenveen in de Eredivisie dit seizoen"
            columns={['Reeks', 'Nu', 'Langste']}
            rows={streaks.map(({ current, label, longest }) => ({ cells: [current, longest], header: label }))}
          />
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
          <BasedOn known={played} played={played} />
        </>
      )}
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
