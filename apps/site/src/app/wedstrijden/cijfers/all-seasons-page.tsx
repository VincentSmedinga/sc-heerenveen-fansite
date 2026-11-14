import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { CardGroup, Heading, KeyFigures, Page, SeasonPicker } from '@fansite/design-system'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { AttendanceRecordsCard, RecordsCard } from '#src/AllSeasonsCards'
import { coachResultsOf, firstSeasonOf } from '#src/coachResults'
import { CoachResultsCard } from '#src/CoachResultsCard'
import { type CompetitionChoice, competitionFields, parseCompetition } from '#src/competition'
import { CompetitionSwitch } from '#src/CompetitionSwitch'
import { competitionTalliesOf } from '#src/competitionTally'
import { CompetitionTallyCard } from '#src/CompetitionTallyCard'
import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import { sourceOf } from '#src/match-sources'
import {
  choiceFor,
  getAllMatches,
  getCoachResultData,
  getEditedMatches,
  getFinalPlaces,
  getMatchSeasons,
  homeAwayOf,
  parseCleanSheetCount,
} from '#src/matches'
import { CleanSheetsCard, GoalsPerQuarterCard, HomeAwayCard, ScoreCountsCard } from '#src/MatchViews'
import { pageMetadata } from '#src/metadata'
import { getSourcePages } from '#src/opponents'
import { OpponentsCredit } from '#src/OpponentViews'
import { refereesOf, topRefereeCount } from '#src/referees'
import { RefereesCard } from '#src/RefereesCard'
import { pickerPathOf, type SearchParams, statisticsPath } from '#src/season-page'
import { SeasonBySeasonCard } from '#src/SeasonBySeasonCard'
import { allSeasonsSlug, seasonChoicesWithAll } from '#src/seasons'
import { seasonTalliesOf } from '#src/seasonTally'
import { ServerError, serverErrorTitle } from '#src/ServerError'
import { allSeasonsKeyFigures } from '#src/statistics-key-figures'
import { withBranch } from '#src/title'

/** The address of the page with all seasons, `/wedstrijden/cijfers/alle`. */
export const allSeasonsPath = '/wedstrijden/cijfers/alle'

/**
 * What the page with all seasons reads, or that it went wrong. A page that throws gets an empty
 * page with a 500 from Next.js, so the page catches the error and shows the error page itself,
 * in the HTML (as `loadSeasonPage` does). Every match of every season is one reading, kept for
 * five minutes (`getAllMatches`), and `cache` makes the page and its metadata share it per
 * request.
 */
const loadAllSeasons = cache(async () => {
  try {
    const [matches, seasons, pages, edited] = await Promise.all([
      getAllMatches(),
      getMatchSeasons(),
      getSourcePages(),
      getEditedMatches(),
    ])

    return { edited, kind: 'found', matches, pages, seasons } as const
  } catch (error) {
    console.error(`Could not read the matches of all seasons for ${allSeasonsPath}: ${reasonOf(error)}`)

    return { kind: 'error' } as const
  }
})

/** The title, description and canonical address of the page with all seasons. */
export async function allSeasonsMetadata(): Promise<Metadata> {
  const loaded = await loadAllSeasons()

  // A page that failed answers 200, so noindex keeps search engines from keeping it.
  if (loaded.kind === 'error') {
    return { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
  }

  return pageMetadata(allSeasonsPath, 'Cijfers sinds 1990/91')
}

/**
 * The page with all seasons, `/wedstrijden/cijfers/alle`: the second scope of Cijfers, chosen
 * with "Alle seizoenen", the first choice of the season picker. It is the page of a season with
 * every card counting every match since the first season we have (1990/91), and four groups:
 * Seizoenen (season by season, with our place, our results per kind of competition, and the
 * results per head coach), Uitslagen (home and away, how often each score, and the records),
 * Doelpunten (per quarter, the clean sheets) and Rondom de wedstrijd (the crowds). The cards
 * that rest on one season, the course of the season, how the matches go and the streaks, are
 * not here, and the streaks are in the records. Every card follows the choice of competition,
 * except our place in the card Seizoen voor seizoen, which is the Eredivisie, and the card Per
 * competitie, which counts every kind. A value of `?competitie=` that is not known is the
 * page "niet gevonden", and so is one given twice.
 */
export async function AllSeasonsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { competitie, nul } = await searchParams
  const chosen = parseCompetition(competitie)

  if (chosen === undefined) {
    notFound()
  }

  const loaded = await loadAllSeasons()

  if (loaded.kind === 'error') {
    return <ServerError retryHref={allSeasonsPath} />
  }

  const { edited, matches, pages, seasons } = loaded
  const competition = choiceFor(matches, chosen)
  const since = seasons.at(-1) ?? '1990/91'
  const now = new Date()
  const keyFigures = allSeasonsKeyFigures(homeAwayOf(matches, competition).total, competition, since)
  const [coachResults, finalPlaces] = await Promise.all([loadCoachResults(competition), loadFinalPlaces()])
  const tallies = seasonTalliesOf(matches, competition)
  const referees = refereesOf(matches, competition, { top: topRefereeCount })

  return (
    <Page.Main
      areas={{
        narrow: ['head', 'toolbar', 'figures', 'seasons', 'results', 'goals', 'around', 'credit'],
        wide: [
          'head head',
          'toolbar toolbar',
          'figures figures',
          'seasons seasons',
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
          action={pickerPathOf(statisticsPath)}
          fields={competitionFields(competition)}
          options={seasonChoicesWithAll(seasons)}
          value={allSeasonsSlug}
        />
        <CompetitionSwitch address={allSeasonsPath} competition={competition} matches={matches} />
      </Page.Toolbar>
      {keyFigures.length === 0 ? null : (
        <Page.Cell area="figures">
          <KeyFigures across aria-label="Kerngetallen" figures={keyFigures} />
        </Page.Cell>
      )}
      {/* The source order is the reading order, and the bar's (allSeasonsShortcuts). */}
      {seasons.length > 0 && (
        <CardGroup area="seasons" id="seizoenen" title="Seizoenen">
          <SeasonBySeasonCard
            choice={competition}
            current={seasonOf(now)}
            level={3}
            places={finalPlaces}
            seasons={seasons}
            tallies={tallies}
          />
          <CompetitionTallyCard level={3} tallies={competitionTalliesOf(matches)} />
          {coachResults}
        </CardGroup>
      )}
      <CardGroup area="results" id="uitslagen" title="Uitslagen">
        <HomeAwayCard competition={competition} level={3} matches={matches} since={since} />
        <ScoreCountsCard competition={competition} level={3} matches={matches} since={since} />
        <RecordsCard competition={competition} level={3} matches={matches} now={now} since={since} />
      </CardGroup>
      <CardGroup area="goals" id="doelpunten" title="Doelpunten">
        <GoalsPerQuarterCard competition={competition} level={3} matches={matches} since={since} />
        <CleanSheetsCard
          competition={competition}
          count={parseCleanSheetCount(nul)}
          level={3}
          matches={matches}
          now={now}
          path={allSeasonsPath}
          since={since}
        />
      </CardGroup>
      <CardGroup area="around" id="rondom-de-wedstrijd" title="Rondom de wedstrijd">
        <AttendanceRecordsCard competition={competition} level={3} matches={matches} since={since} />
        <RefereesCard level={3} top {...referees} />
      </CardGroup>
      {matches.length > 0 && (
        <Page.Cell area="credit">
          <OpponentsCredit edited={edited} pages={pages} seasons={seasons} source={sourceOf(matches)} />
        </Page.Cell>
      )}
    </Page.Main>
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
      <CoachResultsCard
        choice={competition}
        level={3}
        results={coachResultsOf(coaches, matchDays, competition)}
        since={since}
      />
    )
  } catch (error) {
    console.error(`Could not read the results per head coach for ${allSeasonsPath}: ${reasonOf(error)}`)

    return null
  }
}

/**
 * Our place in every season, for the card "Seizoen voor seizoen". It is no more than a card:
 * when it can't be read, the page is shown without it and the error is logged.
 */
async function loadFinalPlaces() {
  try {
    return await getFinalPlaces()
  } catch (error) {
    console.error(`Could not read our place in the seasons for ${allSeasonsPath}: ${reasonOf(error)}`)

    return []
  }
}
