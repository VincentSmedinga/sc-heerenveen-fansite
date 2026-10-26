import type { PublicMatch, PublicStandingsRow, PublicWikipediaPage } from '@fansite/db/queries'

import {
  Button,
  Card,
  Form,
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
import { cleanSheetsOf, overviewOf, scorersCoverage, standingsAround, topScorersOf, topScorersShown } from './matches'

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
    <Card aria-labelledby="de-nul-gehouden">
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
 * The top scorers of the season in a table with a bar, with a line under it when not every
 * played match has its scorers, so nobody takes an incomplete list for a complete one. Without
 * a goal it is a sentence for visitors and no table.
 */
export function TopScorers({ matches, season }: { matches: PublicMatch[]; season: string }) {
  const scorers = topScorersShown(topScorersOf(matches))
  const { known, played } = scorersCoverage(matches)

  if (scorers.length === 0) {
    return <Text>We hebben nog geen doelpuntenmakers van dit seizoen. Kijk straks nog eens.</Text>
  }

  return (
    <>
      <TopScorersTable
        caption={`Topscorers van sc Heerenveen in het seizoen ${season}, in de Eredivisie en de KNVB Beker`}
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
      goals: match.goals,
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
