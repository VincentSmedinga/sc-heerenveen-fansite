import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { CardGroup, Heading, KeyFigures, Page, SeasonPicker } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { competitionFields, parseCompetition } from '#src/competition'
import { CompetitionSwitch } from '#src/CompetitionSwitch'
import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import { formationsOf } from '#src/formations'
import { FormationsCard } from '#src/FormationsCard'
import { seasonSourceOf, sourceName, sourceOf } from '#src/match-sources'
import { choiceFor, getSeasonFormations, homeAwayOf, parseCleanSheetCount } from '#src/matches'
import {
  AttendanceCard,
  CleanSheetsCard,
  ExtremesCard,
  GoalsPerQuarterCard,
  HomeAwayCard,
  MatchFlowCard,
  ScoreCountsCard,
  SeasonCard,
  SourceCredit,
  StreaksCard,
} from '#src/MatchViews'
import { pageMetadata, seasonPageMetadata } from '#src/metadata'
import { loadSeasonPage, pickerPathOf, type SearchParams, statisticsPath } from '#src/season-page'
import { seasonAddress, seasonChoices, seasonSlug } from '#src/seasons'
import { ServerError, serverErrorTitle } from '#src/ServerError'
import { statisticsKeyFigures } from '#src/statistics-key-figures'
import { withBranch } from '#src/title'

/** The route that sends the season picker on to its season (app/wedstrijden/cijfers/kies). */
export const pickerPath = pickerPathOf(statisticsPath)

/**
 * The title, description and canonical address of the page of a season. The current season is
 * the page `/wedstrijden/cijfers`; another season has an address of its own, which is its
 * canonical address, and a title that names the season.
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
 * `/wedstrijden/cijfers/2025-26` for another, which is what the two routes render. Under the
 * heading is the toolbar, with the season picker and the choice of competition, then a row of
 * key figures (our place in the Eredivisie, the matches, won, drawn and lost, and the goals),
 * and then the cards in four groups, each under a heading of its own (see CardGroup):
 * Competitie, Uitslagen, Doelpunten and Rondom de wedstrijd. The bar "Op deze pagina:" links
 * to the four groups. A card is a level 3 heading in its group, and the order of the source is
 * the order of reading, also in a browser with grid lanes. A season that is over has its cards
 * put the season on the image. A season that has no matches in the database is the page "niet
 * gevonden".
 *
 * The cards count all the matches, or the matches of one choice of competition (see
 * CompetitionSwitch). Three cards do not follow the choice: the figures of our place in the
 * league, the season and how the matches go rest on the table, the 34 rounds or the score after
 * 90 minutes, so they stay the Eredivisie, and say so on their last line. A value other than
 * those of the switch is the page "niet gevonden", and so is one given twice.
 */
export async function StatisticsPage({
  searchParams,
  season,
}: {
  searchParams: Promise<SearchParams>
  season: string
}) {
  const { competitie, nul } = await searchParams
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
  const formations = formationsOf(data.matches, await readFormations(season), competition)
  const keyFigures = statisticsKeyFigures(data.standings, homeAwayOf(data.matches, competition).total, competition)

  return (
    <Page.Main
      areas={{
        narrow: ['head', 'toolbar', 'figures', 'competition', 'results', 'goals', 'around', 'credit'],
        wide: [
          'head head',
          'toolbar toolbar',
          'figures figures',
          'competition competition',
          'results results',
          'goals goals',
          'around around',
          'credit credit',
        ],
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
      {keyFigures.length === 0 ? null : (
        <Page.Cell area="figures">
          <KeyFigures across aria-label="Kerngetallen" figures={keyFigures} />
        </Page.Cell>
      )}
      {/* The source order is the reading order, and the bar's (statisticsShortcuts). */}
      <CardGroup area="competition" id="competitie" title="Competitie">
        <SeasonCard level={3} matches={data.matches} season={imageSeason} />
        <MatchFlowCard level={3} matches={data.matches} season={imageSeason} />
      </CardGroup>
      <CardGroup area="results" id="uitslagen" title="Uitslagen">
        <HomeAwayCard competition={competition} level={3} matches={data.matches} season={imageSeason} />
        <StreaksCard competition={competition} level={3} matches={data.matches} now={now} season={imageSeason} />
        <ScoreCountsCard competition={competition} level={3} matches={data.matches} season={imageSeason} />
        <ExtremesCard competition={competition} level={3} matches={data.matches} now={now} season={imageSeason} />
      </CardGroup>
      <CardGroup area="goals" id="doelpunten" title="Doelpunten">
        <GoalsPerQuarterCard competition={competition} level={3} matches={data.matches} season={imageSeason} />
        <CleanSheetsCard
          competition={competition}
          count={parseCleanSheetCount(nul)}
          level={3}
          matches={data.matches}
          now={now}
          path={address}
          season={imageSeason}
        />
      </CardGroup>
      <CardGroup area="around" id="rondom-de-wedstrijd" title="Rondom de wedstrijd">
        <AttendanceCard competition={competition} level={3} matches={data.matches} season={imageSeason} />
        <FormationsCard level={3} {...formations} />
      </CardGroup>
      {(data.matches.length > 0 || data.standings.length > 0) && (
        <Page.Cell area="credit">
          <SourceCredit edited={data.edited} pages={data.pages} season={data.season} source={sourceOf(data.matches)} />
        </Page.Cell>
      )}
    </Page.Main>
  )
}

/**
 * Our formations in the matches of a season. The card Formaties is a bonus: when they can't be
 * read, the page shows without it.
 */
async function readFormations(season: string) {
  try {
    return await getSeasonFormations(season)
  } catch (error) {
    console.error(`Could not read the formations for ${statisticsPath}: ${reasonOf(error)}`)

    return []
  }
}
