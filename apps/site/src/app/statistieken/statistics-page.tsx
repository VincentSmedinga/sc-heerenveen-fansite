import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Heading, Page, SeasonPicker } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { reviewBranch } from '../../env'
import { parseCleanSheetCount } from '../../matches'
import {
  CleanSheetsCard,
  ExtremesCard,
  GoalsPerQuarterCard,
  HomeAwayCard,
  LeaguePlaceCard,
  MatchFlowCard,
  SeasonCard,
  SourceCredit,
  StreaksCard,
  TopScorersCard,
} from '../../MatchViews'
import { pageMetadata, seasonPageMetadata } from '../../metadata'
import { loadSeasonPage, pickerPathOf, playersPath, type SearchParams, statisticsPath } from '../../season-page'
import { seasonAddress, seasonChoices, seasonSlug } from '../../seasons'
import { ServerError, serverErrorTitle } from '../../ServerError'
import { withBranch } from '../../title'

/** The route that sends the season picker on to its season (app/statistieken/kies). */
export const pickerPath = pickerPathOf(statisticsPath)

/**
 * The title, description and canonical address of the page of a season. The current season is
 * the page `/statistieken`; another season has an address of its own, which is its canonical
 * address, and a title that names the season.
 */
export async function statisticsMetadata(season: string): Promise<Metadata> {
  const loaded = await loadSeasonPage(season, statisticsPath)

  // A page that failed answers 200, so noindex keeps search engines from keeping it.
  if (loaded.kind === 'error') {
    return { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
  }

  const current = seasonOf(new Date())

  return season === current
    ? pageMetadata(statisticsPath, 'Statistieken')
    : seasonPageMetadata(statisticsPath, seasonAddress(statisticsPath, season, current), {
        description: `De cijfers van sc Heerenveen 1 in het seizoen ${season}, zoals de plek in de competitie, de reeksen en de doelpuntenmakers, met de bron erbij: de Nederlandse Wikipedia.`,
        title: `Statistieken ${season}`,
      })
}

/**
 * The page of a season: `/statistieken` for the current season and `/statistieken/2025-26` for
 * another, which is what the two routes render. The title row has the season picker beside the
 * heading. The nine cards with figures sit in two equal columns on a wide screen, the first
 * four on the left and the other five on the right, and under each other on a narrow one, in
 * the order of the bar "Op deze pagina:". A season that is over has its cards put the season
 * on the image. A season that has no matches in the database is the page "niet gevonden".
 */
export async function StatisticsPage({
  searchParams,
  season,
}: {
  searchParams: Promise<SearchParams>
  season: string
}) {
  const { nul } = await searchParams
  const loaded = await loadSeasonPage(season, statisticsPath)

  if (loaded.kind === 'unknown') {
    notFound()
  }

  if (loaded.kind === 'error') {
    return <ServerError retryHref={seasonAddress(statisticsPath, season, seasonOf(new Date()))} />
  }

  const { data, seasons } = loaded
  const now = new Date()
  const current = season === seasonOf(now)
  // The cards of a season that is over say which one on their image. The current season is the
  // one the image has always been of.
  const imageSeason = current ? undefined : season

  return (
    <>
      <Page.Main
        intro={
          <Page.Title>
            <Heading level={1}>Statistieken</Heading>
            <SeasonPicker action={pickerPath} options={seasonChoices(seasons)} value={seasonSlug(season)} />
          </Page.Title>
        }
      >
        <LeaguePlaceCard season={imageSeason} standings={data.standings} />
        <SeasonCard matches={data.matches} season={imageSeason} />
        <StreaksCard matches={data.matches} now={now} season={imageSeason} />
        <HomeAwayCard matches={data.matches} season={imageSeason} />
      </Page.Main>
      {/* The second column is a sidebar as wide as the main column, so the two are equal. On a
          phone it follows the main: our place in the league, the season, the streaks, home and
          away, the goal scorers, the clean sheets, the goals per quarter, how the matches go
          and the extremes. */}
      <Page.Sidebar aria-label="Meer cijfers over het seizoen" wide>
        <TopScorersCard
          matches={data.matches}
          playersHref={seasonAddress(playersPath, season, seasonOf(now))}
          season={data.season}
          seasonOnImage={imageSeason}
        />
        <CleanSheetsCard
          count={parseCleanSheetCount(nul)}
          matches={data.matches}
          now={now}
          path={seasonAddress(statisticsPath, season, seasonOf(now))}
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
