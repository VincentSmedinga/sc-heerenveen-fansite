import type { Metadata } from 'next'

import { Card, Heading, Page, StandingsTable, Text } from '@fansite/design-system'
import { cache } from 'react'

import { reviewBranch } from '../../env'
import { reasonOf } from '../../errors'
import { getMatchData, overviewOf, parseCleanSheetCount, topScorersOf } from '../../matches'
import {
  CleanSheetsCard,
  GoalsPerQuarterCard,
  imageCredit,
  LeaguePlaceCard,
  MatchFlowCard,
  MatchLines,
  SeasonCard,
  SourceCredit,
  standingsCaption,
  StreaksCard,
  TopScorers,
} from '../../MatchViews'
import { pageMetadata } from '../../metadata'
import { ServerError, serverErrorTitle } from '../../ServerError'
import { withBranch } from '../../title'

type SearchParams = Record<string, string | string[] | undefined>

// Render on each request, so the build never reads the database. getMatchData caches the data
// itself.
export const dynamic = 'force-dynamic'

/**
 * The matches, the table and the Wikipedia pages of the current season, or undefined when the
 * database can't give them. A page that throws gets an empty page with a 500 from Next.js, and
 * the text only after JavaScript runs. So this page catches the error and shows the error page
 * itself, in the HTML. `cache` makes the page and its metadata share one call per request.
 */
const loadData = cache(async () => {
  try {
    return await getMatchData()
  } catch (error) {
    console.error(`Could not read the matches and the table for /wedstrijden: ${reasonOf(error)}`)

    return undefined
  }
})

export async function generateMetadata(): Promise<Metadata> {
  // A page that failed answers 200, so noindex keeps search engines from keeping it.
  return (await loadData()) === undefined
    ? { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
    : pageMetadata('/wedstrijden', 'Wedstrijden')
}

export default async function MatchesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { nul } = await searchParams
  const data = await loadData()

  if (data === undefined) {
    return <ServerError retryHref="/wedstrijden" />
  }

  const { programme, results } = overviewOf(data.matches)
  const now = new Date()

  return (
    <>
      <Page.Main
        intro={
          <>
            <Heading level={1}>Wedstrijden</Heading>
            <Text appearance="intro">Het programma, de uitslagen en de stand van sc Heerenveen 1 dit seizoen.</Text>
          </>
        }
      >
        <Card aria-labelledby="programma">
          <Heading anchor id="programma" level={2}>
            Programma
          </Heading>
          {programme.length === 0 ? (
            <Text>
              {data.matches.length === 0
                ? 'We hebben het programma nog niet gevonden. Kijk straks nog eens.'
                : 'Er staan dit seizoen geen wedstrijden meer op het programma.'}
            </Text>
          ) : (
            <MatchLines matches={programme} now={now} />
          )}
        </Card>
        <Card aria-labelledby="uitslagen">
          <Heading anchor id="uitslagen" level={2}>
            Uitslagen
          </Heading>
          {results.length === 0 ? (
            <Text>We hebben nog geen uitslagen van dit seizoen.</Text>
          ) : (
            <MatchLines matches={results} now={now} />
          )}
        </Card>
      </Page.Main>
      {/* The table is wide, so the sidebar is too. On a phone it follows the programme and the
          results: the table, our place in the league, the season, the streaks, the goal
          scorers, the clean sheets, the goals per quarter, then how the matches go. */}
      <Page.Sidebar aria-label="De stand, de ranglijsten en de doelpunten per kwartier" wide>
        <Card aria-labelledby="stand" shareable={imageCredit(data.standings.length > 0)} surface="soft">
          <Heading anchor id="stand" level={2}>
            Stand
          </Heading>
          {data.standings.length === 0 ? (
            <Text>We hebben de stand nog niet gevonden. Kijk straks nog eens.</Text>
          ) : (
            <StandingsTable caption={standingsCaption(data.standings)} rows={data.standings} />
          )}
        </Card>
        <LeaguePlaceCard standings={data.standings} />
        <SeasonCard matches={data.matches} />
        <StreaksCard matches={data.matches} now={now} />
        <Card
          aria-labelledby="doelpuntenmakers"
          shareable={imageCredit(topScorersOf(data.matches).length > 0)}
          surface="soft"
        >
          <Heading aliases={['topscorers']} anchor id="doelpuntenmakers" level={2}>
            Doelpuntenmakers
          </Heading>
          <TopScorers matches={data.matches} season={data.season} />
        </Card>
        <CleanSheetsCard count={parseCleanSheetCount(nul)} matches={data.matches} now={now} />
        <GoalsPerQuarterCard matches={data.matches} />
        <MatchFlowCard matches={data.matches} />
        {(data.matches.length > 0 || data.standings.length > 0) && (
          <SourceCredit pages={data.pages} season={data.season} />
        )}
      </Page.Sidebar>
    </>
  )
}
