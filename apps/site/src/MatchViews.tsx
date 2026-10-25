import type { PublicMatch, PublicStandingsRow, PublicWikipediaPage } from '@fansite/db/queries'

import { Card, Heading, Link, List, Match, StandingsTable, Text, WikipediaCredit } from '@fansite/design-system'

import type { MatchData } from './matches'

import {
  creditName,
  formatReadAt,
  formatTableDay,
  matchMoment,
  wikipediaHistoryUrl,
  wikipediaUrl,
} from './match-format'
import { overviewOf, standingsAround } from './matches'

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
  return (
    <List role="list">
      {matches.map((match) => (
        <List.Item key={`${match.competition}-${match.round}`}>
          <MatchLine match={match} now={now} />
        </List.Item>
      ))}
    </List>
  )
}

/**
 * The full credit for the page of the matches: the pages of Wikipedia the importer read, and
 * the last time it read them. It is nothing when the importer has read none, which can't be so
 * with data that came from the importer.
 */
export function SourceCredit({ pages, season }: { pages: PublicWikipediaPage[]; season: string }) {
  const credited = pages.map((page) => ({
    historyHref: wikipediaHistoryUrl(page.title),
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
    <WikipediaCredit pages={[first, ...rest]} readAt={formatReadAt(readAt)} readAtDateTime={readAt.toISOString()} />
  )
}

/** The caption of the table: what it is, and the day it holds for. */
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
          label="De stand"
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
    return (
      <Match
        {...common}
        {...matchMoment(match, now)}
        goalsAgainst={match.goalsAgainst}
        goalsFor={match.goalsFor}
        status="played"
      />
    )
  }

  return <Match {...common} {...matchMoment(match, now)} status="scheduled" />
}
