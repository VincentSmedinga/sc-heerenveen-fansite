import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Card, Heading, Page, SeasonPicker, StandingsTable, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { reviewBranch } from '../../env'
import { reasonOf } from '../../errors'
import {
  getMatchData,
  getMatchSeasons,
  overviewOf,
  parseCleanSheetCount,
  resultsOfSeason,
  topScorersOf,
} from '../../matches'
import { standingsCardOf } from '../../matchShortcuts'
import {
  CleanSheetsCard,
  CoachesCard,
  ExtremesCard,
  GoalsPerQuarterCard,
  HomeAwayCard,
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
import { pageMetadata, seasonPageMetadata } from '../../metadata'
import { seasonAddress, seasonChoices, seasonSlug } from '../../seasons'
import { ServerError, serverErrorTitle } from '../../ServerError'
import { withBranch } from '../../title'

export type SearchParams = Record<string, string | string[] | undefined>

/** The address of the matches page of the current season, and the base of the others. */
export const matchesPath = '/wedstrijden'

/** The route that sends the season picker on to its season (app/wedstrijden/kies). */
export const pickerPath = `${matchesPath}/kies`

/**
 * The matches, the table and the Wikipedia pages of a season, and the seasons to choose from,
 * or what went wrong. A page that throws gets an empty page with a 500 from Next.js, and the
 * text only after JavaScript runs. So this page catches the error and shows the error page
 * itself, in the HTML. The season is checked against the seasons that have matches before its
 * data is asked for, because the data is cached for each season that is asked for and a visitor
 * can make up any address. `cache` makes the page and its metadata share one call per request.
 */
const loadPage = cache(async (season: string) => {
  try {
    const seasons = await getMatchSeasons()

    if (!seasons.includes(season)) {
      return { kind: 'unknown' } as const
    }

    return { data: await getMatchData(season), kind: 'found', seasons } as const
  } catch (error) {
    console.error(`Could not read the matches and the table for ${matchesPath}: ${reasonOf(error)}`)

    return { kind: 'error' } as const
  }
})

/**
 * The title, description and canonical address of the page of a season. The current season is
 * the page `/wedstrijden`; another season has an address of its own, which is its canonical
 * address, and a title that names the season.
 */
export async function matchesMetadata(season: string): Promise<Metadata> {
  const loaded = await loadPage(season)

  // A page that failed answers 200, so noindex keeps search engines from keeping it.
  if (loaded.kind === 'error') {
    return { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
  }

  const current = seasonOf(new Date())

  return season === current
    ? pageMetadata(matchesPath, 'Wedstrijden')
    : seasonPageMetadata(matchesPath, seasonAddress(matchesPath, season, current), {
        description: `De uitslagen en de eindstand van sc Heerenveen 1 in het seizoen ${season}, met de bron erbij: de Nederlandse Wikipedia.`,
        title: `Wedstrijden ${season}`,
      })
}

/**
 * The page of a season: `/wedstrijden` for the current season and `/wedstrijden/2025-26` for
 * another, which is what the two routes render. The title row has the season picker beside the
 * heading. A season that is over has no Programma, shows its results from the first match to
 * the last, calls its table Eindstand, and its cards put the season on the image.
 * A season that has no matches in the database is the page "niet gevonden".
 */
export async function MatchesPage({ searchParams, season }: { searchParams: Promise<SearchParams>; season: string }) {
  const { nul } = await searchParams
  const loaded = await loadPage(season)

  if (loaded.kind === 'unknown') {
    notFound()
  }

  if (loaded.kind === 'error') {
    return <ServerError retryHref={seasonAddress(matchesPath, season, seasonOf(new Date()))} />
  }

  const { data, seasons } = loaded
  const now = new Date()
  const current = season === seasonOf(now)
  // The cards of a season that is over say which one on their image. The current season is the
  // one the image has always been of.
  const imageSeason = current ? undefined : season
  const { programme, results: newestFirst } = overviewOf(data.matches, now)
  const results = resultsOfSeason(newestFirst, season, now)
  const standingsCard = standingsCardOf(current)

  return (
    <>
      <Page.Main
        intro={
          <Page.Title>
            <Heading level={1}>Wedstrijden</Heading>
            <SeasonPicker action={pickerPath} options={seasonChoices(seasons)} value={seasonSlug(season)} />
          </Page.Title>
        }
      >
        {current && (
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
        )}
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
      {/* The table is wide, so the sidebar is too. On a phone it follows the programme and
          the results: the table, the head coaches, our place in the league, the season, the
          streaks, home and away, the goal scorers, the clean sheets, the goals per quarter,
          then how the matches go. */}
      <Page.Sidebar
        aria-label={`${current ? 'De stand' : 'De eindstand'}, de ranglijsten en de doelpunten per kwartier`}
        wide
      >
        <Card
          aria-labelledby={standingsCard.id}
          shareable={imageCredit(data.standings.length > 0, imageSeason)}
          surface="soft"
        >
          <Heading anchor id={standingsCard.id} level={2}>
            {standingsCard.name}
          </Heading>
          {data.standings.length === 0 ? (
            <Text>{`We hebben ${current ? 'de stand' : 'de eindstand'} nog niet gevonden. Kijk straks nog eens.`}</Text>
          ) : (
            <StandingsTable caption={standingsCaption(data.standings, standingsCard.name)} rows={data.standings} />
          )}
        </Card>
        <CoachesCard coaches={data.coaches} season={data.season} />
        <LeaguePlaceCard season={imageSeason} standings={data.standings} />
        <SeasonCard matches={data.matches} season={imageSeason} />
        <StreaksCard matches={data.matches} now={now} season={imageSeason} />
        <HomeAwayCard matches={data.matches} season={imageSeason} />
        <Card
          aria-labelledby="doelpuntenmakers"
          shareable={imageCredit(topScorersOf(data.matches).length > 0, imageSeason)}
          surface="soft"
        >
          <Heading aliases={['topscorers']} anchor id="doelpuntenmakers" level={2}>
            Doelpuntenmakers
          </Heading>
          <TopScorers matches={data.matches} season={data.season} />
        </Card>
        <CleanSheetsCard
          count={parseCleanSheetCount(nul)}
          matches={data.matches}
          now={now}
          path={seasonAddress(matchesPath, season, seasonOf(now))}
          season={imageSeason}
        />
        <GoalsPerQuarterCard matches={data.matches} season={imageSeason} />
        <MatchFlowCard matches={data.matches} season={imageSeason} />
        <ExtremesCard matches={data.matches} now={now} season={imageSeason} />
        {(data.matches.length > 0 || data.standings.length > 0) && (
          <SourceCredit pages={data.pages} season={data.season} />
        )}
      </Page.Sidebar>
    </>
  )
}
