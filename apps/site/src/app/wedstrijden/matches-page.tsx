import type { PublicLeagueResult } from '@fansite/db/queries'
import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Card, Heading, Link, Page, SeasonPicker, StandingsTable, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import { lastFiveOf } from '#src/last-five'
import { seasonSourceOf, sourceName, sourceOf } from '#src/match-sources'
import {
  getLeagueResults,
  type MatchData,
  overviewOf,
  placePerRoundOf,
  resultsOfSeason,
  resultsPerCompetition,
} from '#src/matches'
import { coachesCardOf, lastMatchCard, resultsCardOf, standingsCardOf } from '#src/matchShortcuts'
import {
  CoachesCard,
  imageCredit,
  lastFiveCaption,
  MatchLines,
  SourceCredit,
  StandingsBehind,
  standingsCaption,
} from '#src/MatchViews'
import { pageMetadata, seasonPageMetadata } from '#src/metadata'
import { PlacePerRoundCard } from '#src/PlacePerRoundCard'
import { getLiveReports, getReportAddresses } from '#src/report-data'
import { loadSeasonPage, matchesPath, pickerPathOf, type SearchParams, statisticsPath } from '#src/season-page'
import { seasonAddress, seasonChoices, seasonSlug } from '#src/seasons'
import { ServerError, serverErrorTitle } from '#src/ServerError'
import { parseStandingsView, standingsViewParam } from '#src/standings-view'
import { StandingsSwitch } from '#src/StandingsSwitch'
import { withBranch } from '#src/title'

/** The route that sends the season picker on to its season (app/wedstrijden/kies). */
export const pickerPath = pickerPathOf(matchesPath)

/**
 * The title, description and canonical address of the page of a season. The current season is
 * the page `/wedstrijden`; another season has an address of its own, which is its canonical
 * address, and a title that names the season.
 */
export async function matchesMetadata(season: string): Promise<Metadata> {
  const loaded = await loadSeasonPage(season, matchesPath)

  // A page that failed answers 200, so noindex keeps search engines from keeping it.
  if (loaded.kind === 'error') {
    return { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
  }

  const current = seasonOf(new Date())

  return season === current
    ? pageMetadata(matchesPath, 'Wedstrijden')
    : seasonPageMetadata(matchesPath, seasonAddress(matchesPath, season, current), {
        description: `De uitslagen en de eindstand van sc Heerenveen 1 in het seizoen ${season}, met de bron erbij: ${sourceName(seasonSourceOf(loaded.data))}.`,
        title: `Wedstrijden ${season}`,
      })
}

/**
 * The page of a season: `/wedstrijden` for the current season and `/wedstrijden/2025-26` for
 * another, which is what the two routes render. The title row has the season picker beside the
 * heading. The results are in a card for each competition with a result (Eredivisie, KNVB
 * Beker and so on, the link to the course of the season in the first): the newest first in the
 * current season, which also has the card Laatste wedstrijd above Programma (the newest match
 * that has begun, which stays in Uitslagen too) and the card Programma with every competition
 * on one list, and from the first match to the last in a season that is over, which has no
 * Programma and calls its table Eindstand. Under the table and the results is a link to the
 * card with figures that belongs to it on the page Cijfers, of the same season. A season that
 * has no matches in the database is the page "niet gevonden".
 *
 * The card Verloop op de ranglijst, under the table, shows our place after each round of the
 * season as a line. A season whose results are not of all clubs, or in which points were taken
 * off, has no such card (see `placePerRoundOf`). Our place in every season, the card Onze plek
 * door de jaren, is on Cijfers (see FinalPlacesCard).
 *
 * The card with the table of the current season has a switch between the whole season and the
 * latest five matches of each club, `?stand=laatste-5` (see StandingsSwitch). It is there only
 * when the results of every club are complete enough (see `lastFiveOf`). An Eindstand has no
 * switch, and any other value is the whole season.
 */
export async function MatchesPage({ searchParams, season }: { searchParams: Promise<SearchParams>; season: string }) {
  const { [standingsViewParam]: standingsChoice } = await searchParams
  const loaded = await loadSeasonPage(season, matchesPath)

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
  const { previous, programme, results: newestFirst } = overviewOf(data.matches, now)
  const results = resultsOfSeason(newestFirst, season, now)
  // A card for each competition with a result, the newest first in the current season. A season
  // without a result has the one card Uitslagen.
  const resultCards = resultsPerCompetition(results)
  const standingsCard = standingsCardOf(current)
  // The results of every club, for the switch of the table and for the line of our place.
  const leagueResults = await leagueResultsOfSeason(data)
  const lastFive = current ? lastFiveOfSeason(data, leagueResults) : undefined
  const lastFiveShown = lastFive !== undefined && parseStandingsView(standingsChoice) === 'last-five'
  const placePerRound = leagueResults === undefined ? undefined : placePerRoundOf(leagueResults, data.standings)
  // The card of our place per round lists the head coaches, so Hoofdtrainer is left out.
  const coachesCard = coachesCardOf(data.coaches.length)
  // The matches that have a page of their own: their line links to it.
  const reportAddresses = await reportAddressesOf(season)
  const liveReports = reportAddresses === undefined ? undefined : await getLiveReports(season, now)
  // The cards with figures are on the statistics page of the same season.
  const statistics = (id: string) => `${seasonAddress(statisticsPath, season, seasonOf(now))}#${id}`

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
        {/* The latest match that has begun, current season only. Uitslagen has it too. */}
        {current && previous !== undefined && (
          <Card aria-labelledby={lastMatchCard.id}>
            <Heading anchor id={lastMatchCard.id} level={2}>
              {lastMatchCard.name}
            </Heading>
            <MatchLines liveReports={liveReports} matches={[previous]} now={now} reportAddresses={reportAddresses} />
          </Card>
        )}
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
        {resultCards.length === 0 ? (
          <Card aria-labelledby="uitslagen">
            <Heading anchor id="uitslagen" level={2}>
              Uitslagen
            </Heading>
            <Text>We hebben nog geen uitslagen van dit seizoen.</Text>
          </Card>
        ) : (
          resultCards.map(({ competition, matches }) => {
            const { id, name } = resultsCardOf(competition)

            return (
              <Card aria-labelledby={id} key={competition}>
                <Heading anchor id={id} level={2}>
                  {name}
                </Heading>
                <MatchLines
                  liveReports={liveReports}
                  matches={matches}
                  now={now}
                  reportAddresses={reportAddresses}
                  withCompetition={false}
                />
                {competition === 'Eredivisie' && <SeasonCourseLink href={statistics('verloop-van-het-seizoen')} />}
              </Card>
            )
          })
        )}
      </Page.Main>
      {/* The table is wide, so the sidebar is too. On a phone it follows the programme and
          the results: the table and the head coaches. */}
      <Page.Sidebar
        aria-label={`${current ? 'De stand' : 'De eindstand'}${data.coaches.length > 0 && placePerRound === undefined ? ` en de ${coachesCard.name.toLowerCase()}` : ''}`}
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
            <>
              {lastFive !== undefined && (
                <StandingsSwitch
                  address={seasonAddress(matchesPath, season, seasonOf(now))}
                  anchor={standingsCard.id}
                  view={lastFiveShown ? 'last-five' : 'season'}
                />
              )}
              <StandingsTable
                caption={
                  lastFiveShown
                    ? lastFiveCaption(lastFive.lastResultOn)
                    : standingsCaption(data.standings, standingsCard.name)
                }
                rows={lastFiveShown ? lastFive.rows : data.standings}
              />
              {/* An Eindstand no longer changes, so only the current season can be behind. */}
              {current && <StandingsBehind matches={data.matches} now={now} />}
              <Text>
                <Link href={statistics('onze-plek-in-de-competitie')} icon="arrow-right">
                  Onze plek in de competitie
                </Link>
              </Text>
            </>
          )}
        </Card>
        {placePerRound !== undefined && (
          <PlacePerRoundCard coaches={data.coaches} matches={data.matches} places={placePerRound} />
        )}
        {placePerRound === undefined && <CoachesCard coaches={data.coaches} />}
        {(data.matches.length > 0 || data.standings.length > 0) && (
          <SourceCredit edited={data.edited} pages={data.pages} season={data.season} source={sourceOf(data.matches)} />
        )}
      </Page.Sidebar>
    </>
  )
}

/**
 * The table over the latest five matches of the season, or undefined when the card has no
 * switch: the results of every club are not complete enough (see `lastFiveOf`), or they could
 * not be read, which leaves the card as it is without them.
 */
function lastFiveOfSeason(data: MatchData, results: PublicLeagueResult[] | undefined) {
  if (data.standings.length === 0 || results === undefined) {
    return undefined
  }

  return lastFiveOf(data.matches, results, data.standings)
}

/**
 * The results of the league for every club in the season of the page, or undefined when they
 * could not be read, which leaves the table without a switch and the page without the line of
 * our place per round: the error is logged.
 */
async function leagueResultsOfSeason(data: MatchData) {
  try {
    return await getLeagueResults(data.season)
  } catch (error) {
    console.error(`Could not read the league results for ${matchesPath}: ${reasonOf(error)}`)

    return undefined
  }
}

/**
 * The addresses of the pages of the matches of a season, for the links in the results. A page
 * is more than a link: when they can't be read, the results are shown without links and the
 * error is logged.
 */
async function reportAddressesOf(season: string) {
  try {
    return await getReportAddresses(season)
  } catch (error) {
    console.error(`Could not read the match reports for ${matchesPath}: ${reasonOf(error)}`)

    return undefined
  }
}

/** The link under the results to the card with the course of the season, on Cijfers. */
function SeasonCourseLink({ href }: { href: string }) {
  return (
    <Text>
      <Link href={href} icon="arrow-right">
        Het verloop van het seizoen
      </Link>
    </Text>
  )
}
