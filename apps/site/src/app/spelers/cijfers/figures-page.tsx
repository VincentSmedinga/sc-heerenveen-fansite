import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Heading, Page, SeasonPicker } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { type CompetitionChoice, competitionFields, parseCompetition } from '#src/competition'
import { CompetitionSwitch } from '#src/CompetitionSwitch'
import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import { seasonSourceOf, sourceName, sourceOf } from '#src/match-sources'
import { choiceFor } from '#src/matches'
import { SourceCredit, TopScorersCard } from '#src/MatchViews'
import { pageMetadata, seasonPageMetadata } from '#src/metadata'
import { pageAreas } from '#src/page-areas'
import { AllPlayersCard, RankingCard } from '#src/ReportFiguresCards'
import { loadSeasonPage, pickerPathOf, playerFiguresPath, type SearchParams } from '#src/season-page'
import { getSeasonPlayerStats } from '#src/season-player-stats'
import { getSeasonReportFigures } from '#src/season-report-figures'
import { seasonAddress, seasonChoices, seasonSlug } from '#src/seasons'
import { ServerError, serverErrorTitle } from '#src/ServerError'
import { SpecialGoalsCard } from '#src/SpecialGoalsCard'
import { withBranch } from '#src/title'

/** The route that sends the season picker on to its season (app/spelers/cijfers/kies). */
export const pickerPath = pickerPathOf(playerFiguresPath)

/**
 * The title, description and canonical address of the figures of the players of a season. The
 * current season is the page `/spelers/cijfers`; another season has an address of its own,
 * which is its canonical address, and a title that names the season.
 */
export async function playerFiguresMetadata(season: string): Promise<Metadata> {
  const loaded = await loadSeasonPage(season, playerFiguresPath)

  // A page that failed answers 200, so noindex keeps search engines from keeping it.
  if (loaded.kind === 'error') {
    return { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
  }

  const current = seasonOf(new Date())
  const source = seasonSourceOf(loaded.data)

  return season === current
    ? pageMetadata(playerFiguresPath, 'Cijfers van de spelers')
    : seasonPageMetadata(playerFiguresPath, seasonAddress(playerFiguresPath, season, current), {
        description: `De cijfers van de spelers van sc Heerenveen 1 in het seizoen ${season}, zoals de doelpuntenmakers en de bijzondere doelpunten, met de bron erbij: ${source === 'wikipedia' ? 'Wikipedia' : sourceName(source)}.`,
        title: `Cijfers van de spelers ${season}`,
      })
}

/**
 * The figures of the players of a season: `/spelers/cijfers` for the current season and
 * `/spelers/cijfers/2025-26` for another, which is what the two routes render. It has the
 * title row and the toolbar with the season picker and the choice of competition. The main
 * column is white and has the card Doelpuntenmakers (every player who scored, with the column
 * W where we know the matches) and, for a season with match reports, the table Alle spelers.
 * The sidebar has soft cards: Assists and Minuten (for a season with reports), Bijzondere
 * doelpunten, and the credit as the last. The sidebar follows the main column on a phone. The
 * name of a player links to his page when he has one. A season that is over has the cards put
 * the season on their image. A season that has no matches in the database is the page "niet
 * gevonden", and so is a choice of competition that is not known. The cards count all the
 * matches or, with `?competitie=eredivisie`, the Eredivisie alone.
 */
export async function PlayerFiguresPage({
  searchParams,
  season,
}: {
  searchParams: Promise<SearchParams>
  season: string
}) {
  const { competitie } = await searchParams
  const chosen = parseCompetition(competitie)
  const loaded = await loadSeasonPage(season, playerFiguresPath)

  if (chosen === undefined || loaded.kind === 'unknown') {
    notFound()
  }

  if (loaded.kind === 'error') {
    return <ServerError retryHref={seasonAddress(playerFiguresPath, season, seasonOf(new Date()))} />
  }

  const competition = choiceFor(loaded.data.matches, chosen)
  const stats = await loadStats(season)
  const figures = await loadFigures(season, competition)
  const { data, seasons } = loaded
  const onImage = season === seasonOf(new Date()) ? undefined : season

  return (
    <Page.Main areas={pageAreas({ after: ['side'], toolbar: true })}>
      <Page.Cell area="head">
        <Heading level={1}>Cijfers van de spelers</Heading>
      </Page.Cell>
      <Page.Toolbar>
        <SeasonPicker
          action={pickerPath}
          fields={competitionFields(competition)}
          options={seasonChoices(seasons)}
          value={seasonSlug(season)}
        />
        <CompetitionSwitch
          address={seasonAddress(playerFiguresPath, season, seasonOf(new Date()))}
          competition={competition}
          matches={data.matches}
        />
      </Page.Toolbar>
      <Page.Section area="main" aria-label="De doelpuntenmakers en de spelers van het seizoen">
        <TopScorersCard
          competition={competition}
          matches={data.matches}
          season={data.season}
          seasonOnImage={onImage}
          stats={stats}
          surface="default"
        />
        {figures?.seasonHasReports === true && (
          <AllPlayersCard competition={competition} figures={figures} season={season} seasonOnImage={onImage} />
        )}
      </Page.Section>
      <Page.Section area="side" aria-label="Meer cijfers over de spelers">
        {figures?.seasonHasReports === true && (
          <>
            <RankingCard
              competition={competition}
              figure="assists"
              figures={figures}
              season={season}
              seasonOnImage={onImage}
            />
            <RankingCard
              competition={competition}
              figure="minutes"
              figures={figures}
              season={season}
              seasonOnImage={onImage}
            />
          </>
        )}
        <SpecialGoalsCard competition={competition} matches={data.matches} seasonOnImage={onImage} />
        {data.matches.length > 0 && (
          <SourceCredit edited={data.edited} pages={data.pages} season={data.season} source={sourceOf(data.matches)} />
        )}
      </Page.Section>
    </Page.Main>
  )
}

/**
 * The figures from the match reports for the cards Alle spelers, Assists and Minuten, or
 * undefined when they could not be read (the error is logged). The cards are an extra: the page
 * is as it was without them.
 */
async function loadFigures(season: string, competition: CompetitionChoice) {
  try {
    return await getSeasonReportFigures(season, competition)
  } catch (error) {
    console.error(`Could not read the match reports for ${playerFiguresPath}: ${reasonOf(error)}`)

    return undefined
  }
}

/**
 * The figures of the players of the season for the column D/W, or undefined when they could not
 * be read (the error is logged). The column is an extra: the card shows the goals without it.
 */
async function loadStats(season: string) {
  try {
    return await getSeasonPlayerStats(season)
  } catch (error) {
    console.error(`Could not read the appearances of the players for ${playerFiguresPath}: ${reasonOf(error)}`)

    return undefined
  }
}
