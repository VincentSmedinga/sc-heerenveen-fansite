import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Heading, Page, SeasonPicker } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { coachResultsOf, firstSeasonOf } from '#src/coachResults'
import { CoachResultsCard } from '#src/CoachResultsCard'
import { type CompetitionChoice, parseCompetition } from '#src/competition'
import { competitionFields, CompetitionSwitch } from '#src/CompetitionSwitch'
import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import { FinalPlacesCard } from '#src/FinalPlacesCard'
import { seasonSourceOf, sourceName, sourceOf } from '#src/match-sources'
import { choiceFor, getCoachResultData, getFinalPlaces, parseCleanSheetCount } from '#src/matches'
import {
  AttendanceCard,
  CleanSheetsCard,
  ExtremesCard,
  GoalsPerQuarterCard,
  HomeAwayCard,
  LeaguePlaceCard,
  MatchFlowCard,
  ScoreCountsCard,
  SeasonCard,
  SourceCredit,
  StreaksCard,
} from '#src/MatchViews'
import { pageMetadata, seasonPageMetadata } from '#src/metadata'
import { noteworthy, parseNoteworthyNumber } from '#src/noteworthy'
import { NoteworthyCard } from '#src/NoteworthyCard'
import { loadSeasonPage, pickerPathOf, type SearchParams, statisticsPath } from '#src/season-page'
import { seasonAddress, seasonChoices, seasonSlug } from '#src/seasons'
import { ServerError, serverErrorTitle } from '#src/ServerError'
import { withBranch } from '#src/title'

/** The route that sends the season picker on to its season (app/wedstrijden/cijfers/kies). */
export const pickerPath = pickerPathOf(statisticsPath)

/**
 * The title, description and canonical address of the page of a season. The current season is
 * the page `/wedstrijden/cijfers`; another season has an address of its own, which is its
 * canonical
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
    ? pageMetadata(statisticsPath, 'Cijfers')
    : seasonPageMetadata(statisticsPath, seasonAddress(statisticsPath, season, current), {
        description: `De cijfers van sc Heerenveen 1 in het seizoen ${season}, zoals de plek in de competitie, de reeksen en de doelpuntenmakers, met de bron erbij: ${sourceName(seasonSourceOf(loaded.data))}.`,
        title: `Cijfers ${season}`,
      })
}

/**
 * The page of a season: `/wedstrijden/cijfers` for the current season and
 * `/wedstrijden/cijfers/2025-26` for
 * another, which is what the two routes render. The title row has the season picker beside the
 * heading. The twelve cards with figures sit in two equal columns on a wide screen, and under
 * each other on a narrow one, in the order of the bar "Op deze pagina:". The page is the
 * exception to the rule of the columns (see Page.Main): both hold cards with figures. The three
 * cards that stay the Eredivisie come first in the main column, together, and under them is the
 * switch between the matches (see below), a plain cell without a card, directly above the first
 * card that follows it. The card Opmerkelijk is the last of the main column and is not in the
 * bar: it is one fact that changes with the day (see NoteworthyCard).
 * A season that is over has its cards put the season on the image. A season that has no matches
 * in the database is the page "niet gevonden".
 *
 * The cards count all the matches, the Eredivisie and the KNVB Beker, or the Eredivisie alone
 * with `?competitie=eredivisie` (see CompetitionSwitch). Three cards do not follow the choice:
 * our place in the league, the season and how the matches go rest on the table, the 34 rounds
 * or the score after 90 minutes, so they stay the Eredivisie, and say so on their last line.
 * The card Hoe vaak welke uitslag follows the choice, and so does the last card, Resultaten per
 * hoofdtrainer, which counts every season we have matches of and not the season of the page
 * (see CoachResultsCard). It is left out when its data can't be read. A value other than that
 * one is the page "niet gevonden", and so is one given twice.
 */
export async function StatisticsPage({
  searchParams,
  season,
}: {
  searchParams: Promise<SearchParams>
  season: string
}) {
  const { competitie, [noteworthy.param]: factNumber, nul } = await searchParams
  const chosen = parseCompetition(competitie)
  const loaded = await loadSeasonPage(season, statisticsPath)

  if (chosen === undefined || loaded.kind === 'unknown') {
    notFound()
  }

  if (loaded.kind === 'error') {
    return <ServerError retryHref={seasonAddress(statisticsPath, season, seasonOf(new Date()))} />
  }

  const { data, seasons } = loaded
  const competition = choiceFor(data.matches, chosen)
  const now = new Date()
  const current = season === seasonOf(now)
  // The cards of a season that is over say which one on their image. The current season is the
  // one the image has always been of.
  const imageSeason = current ? undefined : season
  const address = seasonAddress(statisticsPath, season, seasonOf(now))
  const coachResults = await loadCoachResults(competition)
  // Our place in every season: the same on every page, so it does not depend on `season`.
  const finalPlaces = await loadFinalPlaces()

  return (
    <>
      <Page.Main
        areas={{
          narrow: ['head', 'toolbar', 'first', 'second'],
          wide: ['head head', 'toolbar toolbar', 'first second'],
        }}
        columns="equal"
      >
        <Page.Cell area="head">
          <Heading level={1}>Cijfers</Heading>
        </Page.Cell>
        <Page.Toolbar>
          <SeasonPicker
            action={pickerPath}
            fields={competitionFields(competition)}
            options={seasonChoices(seasons)}
            value={seasonSlug(season)}
          />
          <CompetitionSwitch address={address} competition={competition} matches={data.matches} />
        </Page.Toolbar>
        <Page.Section area="first" aria-label="Het seizoen in cijfers">
          <LeaguePlaceCard season={imageSeason} standings={data.standings} />
          <FinalPlacesCard current={seasonOf(now)} linkable={seasons} places={finalPlaces} />
          <SeasonCard matches={data.matches} season={imageSeason} />
          <MatchFlowCard matches={data.matches} season={imageSeason} />
          <StreaksCard competition={competition} matches={data.matches} now={now} season={imageSeason} />
          <HomeAwayCard competition={competition} matches={data.matches} season={imageSeason} />
          <NoteworthyCard
            coaches={data.coaches}
            competition={competition}
            matches={data.matches}
            now={now}
            number={parseNoteworthyNumber(factNumber)}
            path={address}
          />
        </Page.Section>
        {/* The two columns are equal. On a phone the second follows the first: our place in the
            league, the season, how the matches go, the streaks, home and away, the attendance,
            how often each score was played, the clean sheets, the goals per quarter and the
            extremes. */}
        <Page.Section area="second" aria-label="Meer cijfers over het seizoen">
          <AttendanceCard competition={competition} matches={data.matches} season={imageSeason} />
          <ScoreCountsCard competition={competition} matches={data.matches} season={imageSeason} />
          <CleanSheetsCard
            competition={competition}
            count={parseCleanSheetCount(nul)}
            matches={data.matches}
            now={now}
            path={address}
            season={imageSeason}
          />
          <GoalsPerQuarterCard competition={competition} matches={data.matches} season={imageSeason} />
          <ExtremesCard competition={competition} matches={data.matches} now={now} season={imageSeason} />
          {coachResults}
          {(data.matches.length > 0 || data.standings.length > 0) && (
            <SourceCredit
              edited={data.edited}
              pages={data.pages}
              season={data.season}
              source={sourceOf(data.matches)}
            />
          )}
        </Page.Section>
      </Page.Main>
    </>
  )
}

/**
 * The card "Resultaten per hoofdtrainer", or nothing when the head coaches or the matches of
 * all seasons could not be read (the error is logged): the rest of the page doesn't need it.
 */
async function loadCoachResults(competition: CompetitionChoice) {
  try {
    const { coaches, matchDays } = await getCoachResultData()
    const since = firstSeasonOf(matchDays)

    return since === undefined ? null : (
      <CoachResultsCard choice={competition} results={coachResultsOf(coaches, matchDays, competition)} since={since} />
    )
  } catch (error) {
    console.error(`Could not read the results per head coach for ${statisticsPath}: ${reasonOf(error)}`)

    return null
  }
}

/**
 * Our place in every season, for the card "Onze plek door de jaren". It is no more than a card:
 * when it can't be read, the page is shown without it and the error is logged.
 */
async function loadFinalPlaces() {
  try {
    return await getFinalPlaces()
  } catch (error) {
    console.error(`Could not read our place in the seasons for ${statisticsPath}: ${reasonOf(error)}`)

    return []
  }
}
