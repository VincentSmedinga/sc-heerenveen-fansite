import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Heading, Page, SeasonPicker } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { competitionQuery, parseCompetition } from '../../competition'
import { competitionFields, CompetitionSwitch } from '../../CompetitionSwitch'
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
 * the order of the bar "Op deze pagina:". The switch between the matches (see below) is the
 * first cell of the main column, a plain cell without a card, directly under the title row.
 * A season that is over has its cards put the season on the image. A season that has no matches
 * in the database is the page "niet gevonden".
 *
 * The cards count all the matches, the Eredivisie and the KNVB Beker, or the Eredivisie alone
 * with `?competitie=eredivisie` (see CompetitionSwitch). Three cards do not follow the choice:
 * our place in the league, the season and how the matches go rest on the table, the 34 rounds
 * or the score after 90 minutes, so they stay the Eredivisie. A value other than that one is
 * the page "niet gevonden", and so is one given twice.
 */
export async function StatisticsPage({
  searchParams,
  season,
}: {
  searchParams: Promise<SearchParams>
  season: string
}) {
  const { competitie, nul } = await searchParams
  const competition = parseCompetition(competitie)
  const loaded = await loadSeasonPage(season, statisticsPath)

  if (competition === undefined || loaded.kind === 'unknown') {
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
  const address = seasonAddress(statisticsPath, season, seasonOf(now))

  return (
    <>
      <Page.Main
        intro={
          <Page.Title>
            <Heading level={1}>Statistieken</Heading>
            <SeasonPicker
              action={pickerPath}
              fields={competitionFields(competition)}
              options={seasonChoices(seasons)}
              value={seasonSlug(season)}
            />
          </Page.Title>
        }
      >
        <CompetitionSwitch address={address} competition={competition} matches={data.matches} />
        <LeaguePlaceCard season={imageSeason} standings={data.standings} />
        <SeasonCard matches={data.matches} season={imageSeason} />
        <StreaksCard competition={competition} matches={data.matches} now={now} season={imageSeason} />
        <HomeAwayCard competition={competition} matches={data.matches} season={imageSeason} />
      </Page.Main>
      {/* The second column is a sidebar as wide as the main column, so the two are equal. On a
          phone it follows the main: our place in the league, the season, the streaks, home and
          away, the goal scorers, the clean sheets, the goals per quarter, how the matches go
          and the extremes. */}
      <Page.Sidebar aria-label="Meer cijfers over het seizoen" wide>
        <TopScorersCard
          competition={competition}
          matches={data.matches}
          playersHref={`${seasonAddress(playersPath, season, seasonOf(now))}${competitionQuery(competition)}`}
          season={data.season}
          seasonOnImage={imageSeason}
        />
        <CleanSheetsCard
          competition={competition}
          count={parseCleanSheetCount(nul)}
          matches={data.matches}
          now={now}
          path={address}
          season={imageSeason}
        />
        <GoalsPerQuarterCard competition={competition} matches={data.matches} season={imageSeason} />
        <MatchFlowCard matches={data.matches} season={imageSeason} />
        <ExtremesCard competition={competition} matches={data.matches} now={now} season={imageSeason} />
        {(data.matches.length > 0 || data.standings.length > 0) && (
          <SourceCredit pages={data.pages} season={data.season} />
        )}
      </Page.Sidebar>
    </>
  )
}
