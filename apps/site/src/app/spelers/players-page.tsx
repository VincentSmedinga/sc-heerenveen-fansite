import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Heading, Page, SeasonPicker } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import { readSeasonUitblinker } from '#src/fans/season-uitblinker'
import { seasonSourceOf, sourceName, sourceOf } from '#src/match-sources'
import { SourceCredit } from '#src/MatchViews'
import { pageMetadata, seasonPageMetadata } from '#src/metadata'
import { pageAreas } from '#src/page-areas'
import { CleanSheetsShortCard, ReportShortCard, TopScorersShortCard } from '#src/PlayersTopCards'
import { loadSeasonPage, pickerPathOf, playerFiguresPath, playersPath, statisticsPath } from '#src/season-page'
import { getSeasonReportFigures } from '#src/season-report-figures'
import { getSeasonSquad, type SeasonSquad } from '#src/season-squad'
import { seasonAddress, seasonChoices, seasonSlug } from '#src/seasons'
import { SeasonSquadCard } from '#src/SeasonSquadCard'
import { SeasonUitblinkerCard } from '#src/SeasonUitblinkerCard'
import { ServerError, serverErrorTitle } from '#src/ServerError'
import { getSquadChanges } from '#src/squad-changes'
import { getSquadSummary } from '#src/squad-summary'
import { SquadChangesCard } from '#src/SquadChangesCard'
import { SquadSummaryCard } from '#src/SquadSummaryCard'
import { withBranch } from '#src/title'

/** The route that sends the season picker on to its season (app/spelers/kies). */
export const pickerPath = pickerPathOf(playersPath)

/**
 * The title, description and canonical address of the page Spelers of a season. The current
 * season is the page `/spelers`; another season has an address of its own, which
 * is its canonical address, and a title that names the season.
 */
export async function playersMetadata(season: string): Promise<Metadata> {
  const loaded = await loadSeasonPage(season, playersPath)

  // A page that failed answers 200, so noindex keeps search engines from keeping it.
  if (loaded.kind === 'error') {
    return { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
  }

  const current = seasonOf(new Date())
  const source = seasonSourceOf(loaded.data)

  return season === current
    ? pageMetadata(playersPath, 'Spelers')
    : seasonPageMetadata(playersPath, seasonAddress(playersPath, season, current), {
        description: `De selectie van sc Heerenveen 1 in het seizoen ${season}, met de spelers per positie en de bron erbij: ${source === 'wikipedia' ? 'Wikipedia' : sourceName(source)}.`,
        title: `Spelers ${season}`,
      })
}

/**
 * The page Spelers of a season: `/spelers` for the current season and
 * `/spelers/2025-26` for another, which is what the two routes render. It has the title row
 * and the season picker, and the card Selectie with every player of the season in parts by
 * position and, under the heading, how complete that list is. That card is white: the squad is
 * what the page is for. Under it stands the white card "Mutaties" (`SquadChangesCard`, when
 * this season and the one before say enough). The figures of the players are on their own page
 * (Cijfers, see `PlayerFiguresPage`), so the toolbar has no choice of competition. The sidebar
 * has the soft card "In het kort" (`SquadSummaryCard`, when the squad is known), the card
 * "Uitblinker" (`SeasonUitblinkerCard`, when the season has one or the window is open), the
 * four small soft cards Topscorers, Assists, Minuten and De nul
 * gehouden (`PlayersTopCards`), each with the first three places of its figure and a link to
 * its large card for the same season, and ends with the credit, which also names the pages of
 * the squad of the season before while the changes are shown. A card without figures is left
 * out, and so are Assists and Minuten when the season has no match report that is `klaar`. The
 * sidebar follows the main column on a phone, so the squad comes first there. The page has no
 * bar "Op deze pagina:". A season that has no matches in the database is the page "niet
 * gevonden".
 */
export async function PlayersPage({ season }: { season: string }) {
  const loaded = await loadSeasonPage(season, playersPath)

  if (loaded.kind === 'unknown') {
    notFound()
  }

  if (loaded.kind === 'error') {
    return <ServerError retryHref={seasonAddress(playersPath, season, seasonOf(new Date()))} />
  }

  const squad = await loadSquad(season)

  if (squad === undefined) {
    return <ServerError retryHref={seasonAddress(playersPath, season, seasonOf(new Date()))} />
  }

  const { data, seasons } = loaded
  const summary = await loadSummary(squad, season)
  const changes = await loadChanges(squad, season, seasons)
  const figures = await loadFigures(season)
  const uitblinker = await readSeasonUitblinker(season)
  const current = seasonOf(new Date())
  const playerFigures = seasonAddress(playerFiguresPath, season, current)
  const showsReports = figures?.seasonHasReports === true
  const squadSource = {
    pages: [...squad.pages, ...(changes?.source.pages.map((page) => ({ ...page, season: changes.previous })) ?? [])],
    wikidata: squad.players.some((player) => player.source === 'wikidata') || changes?.source.wikidata === true,
  }

  return (
    <Page.Main areas={pageAreas({ after: ['side'], toolbar: true })}>
      <Page.Cell area="head">
        <Heading level={1}>Spelers</Heading>
      </Page.Cell>
      <Page.Toolbar>
        <SeasonPicker action={pickerPath} options={seasonChoices(seasons)} size="small" value={seasonSlug(season)} />
      </Page.Toolbar>
      <Page.Section area="main" aria-label="De selectie van het seizoen">
        <SeasonSquadCard squad={squad} />
        {changes === undefined ? null : <SquadChangesCard changes={changes} />}
      </Page.Section>
      <Page.Section area="side" aria-label="Meer over de spelers">
        {summary === undefined ? null : <SquadSummaryCard summary={summary} />}
        {uitblinker === undefined ? null : <SeasonUitblinkerCard uitblinker={uitblinker} />}
        <TopScorersShortCard href={`${playerFigures}#doelpuntenmakers`} matches={data.matches} />
        {showsReports && <ReportShortCard figure="assists" figures={figures} href={`${playerFigures}#assists`} />}
        {showsReports && <ReportShortCard figure="minutes" figures={figures} href={`${playerFigures}#minuten`} />}
        <CleanSheetsShortCard
          href={`${seasonAddress(statisticsPath, season, current)}#de-nul-gehouden`}
          matches={data.matches}
          now={new Date()}
          when={season === current ? 'dit seizoen' : `in ${season}`}
        />
        {(data.matches.length > 0 || data.standings.length > 0 || squad.pages.length > 0) && (
          <SourceCredit
            edited={data.edited}
            pages={data.pages}
            season={data.season}
            source={sourceOf(data.matches)}
            squad={squadSource}
          />
        )}
      </Page.Section>
    </Page.Main>
  )
}

/**
 * The changes compared with the season before, or undefined: no card, also when they could not
 * be read (the error is logged).
 */
async function loadChanges(squad: SeasonSquad, season: string, seasons: readonly string[]) {
  try {
    return await getSquadChanges(squad, season, seasons)
  } catch (error) {
    console.error(`Could not read the changes of the squad for ${playersPath}: ${reasonOf(error)}`)

    return undefined
  }
}

/**
 * The figures of the match reports for the cards Assists and Minuten, or undefined when they
 * could not be read (the error is logged): the two cards are left out and the page stays.
 */
async function loadFigures(season: string) {
  try {
    return await getSeasonReportFigures(season, 'all')
  } catch (error) {
    console.error(`Could not read the match reports for ${playersPath}: ${reasonOf(error)}`)

    return undefined
  }
}

/** The squad of the season, or undefined when it could not be read (the error is logged). */
async function loadSquad(season: string) {
  try {
    return await getSeasonSquad(season)
  } catch (error) {
    console.error(`Could not read the squad for ${playersPath}: ${reasonOf(error)}`)

    return undefined
  }
}

/** The figures of the card "In het kort", or undefined: no card (error logged). */
async function loadSummary(squad: SeasonSquad, season: string) {
  try {
    return await getSquadSummary(squad, season, new Date())
  } catch (error) {
    console.error(`Could not read the figures of the squad for ${playersPath}: ${reasonOf(error)}`)

    return undefined
  }
}
