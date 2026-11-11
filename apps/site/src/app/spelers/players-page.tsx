import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Heading, Link, Page, SeasonPicker } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { type CompetitionChoice, parseCompetition } from '#src/competition'
import { competitionFields, CompetitionSwitch } from '#src/CompetitionSwitch'
import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import { seasonSourceOf, sourceName, sourceOf } from '#src/match-sources'
import { choiceFor, getAllTimeMatches } from '#src/matches'
import { AllTimeScorersCard, SourceCredit, TopScorersCard } from '#src/MatchViews'
import { pageMetadata, seasonPageMetadata } from '#src/metadata'
import { overviewPath } from '#src/players-overview'
import { AllPlayersCard, RankingCard } from '#src/ReportFiguresCards'
import { loadSeasonPage, pickerPathOf, playersPath, type SearchParams } from '#src/season-page'
import { getSeasonPlayerStats } from '#src/season-player-stats'
import { getSeasonReportFigures } from '#src/season-report-figures'
import { getSeasonSquad } from '#src/season-squad'
import { seasonAddress, seasonChoices, seasonSlug } from '#src/seasons'
import { SeasonSquadCard } from '#src/SeasonSquadCard'
import { ServerError, serverErrorTitle } from '#src/ServerError'
import { SpecialGoalsCard } from '#src/SpecialGoalsCard'
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
        description: `De selectie van sc Heerenveen 1 in het seizoen ${season} en alle spelers die scoorden, met hun doelpunten en de bron erbij: ${source === 'wikipedia' ? 'Wikipedia' : sourceName(source)}.`,
        title: `Spelers ${season}`,
      })
}

/**
 * The page Spelers of a season: `/spelers` for the current season and
 * `/spelers/2025-26` for another, which is what the two routes render. It has the
 * title row and the season picker of Cijfers, and the card Selectie with every player of
 * the season in parts by position and, under the heading, how complete that list is. That card
 * is white: the squad is what the page is for. The sidebar follows the main column on a phone,
 * so the squad comes first there. The switch between all matches and the Eredivisie is the
 * first cell of the main column, as on every page that has it, and changes only the cards with
 * goals. The sidebar has the card
 * Doelpuntenmakers (every player who scored), the card Sinds 1990/91 (the first ten places of
 * the scorers of every season, which does not change with the season of the picker) and the
 * card Bijzondere doelpunten (hattricks, penalties and own goals), all soft, and ends with the
 * credit, as on Cijfers. A season that is over has the cards with goals put the season on their
 * image. A season that has no matches in the database is the page "niet gevonden". The cards
 * with goals count all the matches or, with `?competitie=eredivisie`, the Eredivisie alone, as
 * on Cijfers, and so does the switch.
 */
export async function PlayersPage({ searchParams, season }: { searchParams: Promise<SearchParams>; season: string }) {
  const { competitie } = await searchParams
  const chosen = parseCompetition(competitie)
  const loaded = await loadSeasonPage(season, playersPath)

  if (chosen === undefined || loaded.kind === 'unknown') {
    notFound()
  }

  if (loaded.kind === 'error') {
    return <ServerError retryHref={seasonAddress(playersPath, season, seasonOf(new Date()))} />
  }

  const competition = choiceFor(loaded.data.matches, chosen)
  const squad = await loadSquad(season)

  if (squad === undefined) {
    return <ServerError retryHref={seasonAddress(playersPath, season, seasonOf(new Date()))} />
  }

  const allTime = await loadAllTime()
  const stats = await loadStats(season)
  const figures = await loadFigures(season, competition)
  const { seasons } = loaded
  // Only the card Selectie and the card Sinds 1990/91 link to a player: the others name him.
  const data = { ...loaded.data, matches: loaded.data.matches.map(withoutLinks) }
  const current = season === seasonOf(new Date())
  const squadSource = { pages: squad.pages, wikidata: squad.players.some((player) => player.source === 'wikidata') }

  return (
    <>
      <Page.Main
        intro={
          <Page.Title>
            <Heading level={1}>Spelers</Heading>
            <SeasonPicker
              action={pickerPath}
              fields={competitionFields(competition)}
              options={seasonChoices(seasons)}
              value={seasonSlug(season)}
            />
            <Link href={overviewPath} icon="arrow-right">
              Alle spelers
            </Link>
          </Page.Title>
        }
      >
        <CompetitionSwitch
          address={seasonAddress(playersPath, season, seasonOf(new Date()))}
          competition={competition}
          matches={data.matches}
        />
        <SeasonSquadCard squad={squad} />
        {figures?.seasonHasReports === true && (
          <AllPlayersCard
            competition={competition}
            figures={unlinked(figures)}
            season={season}
            seasonOnImage={current ? undefined : season}
          />
        )}
      </Page.Main>
      <Page.Sidebar aria-label="Meer cijfers over de spelers">
        <TopScorersCard
          competition={competition}
          matches={data.matches}
          season={data.season}
          seasonOnImage={current ? undefined : season}
          stats={stats}
        />
        {allTime !== undefined && <AllTimeScorersCard competition={competition} matches={allTime} />}
        <SpecialGoalsCard
          competition={competition}
          matches={data.matches}
          seasonOnImage={current ? undefined : season}
        />
        {figures?.seasonHasReports === true && (
          <>
            <RankingCard
              competition={competition}
              figure="assists"
              figures={unlinked(figures)}
              season={season}
              seasonOnImage={current ? undefined : season}
            />
            <RankingCard
              competition={competition}
              figure="minutes"
              figures={unlinked(figures)}
              season={season}
              seasonOnImage={current ? undefined : season}
            />
          </>
        )}
        {(data.matches.length > 0 || data.standings.length > 0 || squad.pages.length > 0) && (
          <SourceCredit
            edited={data.edited}
            pages={data.pages}
            season={data.season}
            source={sourceOf([...data.matches, ...(allTime ?? [])])}
            squad={squadSource}
          />
        )}
      </Page.Sidebar>
    </>
  )
}

/**
 * Every match of every season with its goals, for the card Sinds 1990/91, or undefined when it
 * could not be read (the error is logged). The card is left out then: the rest of the page
 * doesn't need it.
 */
async function loadAllTime() {
  try {
    return await getAllTimeMatches()
  } catch (error) {
    console.error(`Could not read the goals of all seasons for ${playersPath}: ${reasonOf(error)}`)

    return undefined
  }
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

/**
 * The figures of the players of the season for the column D/W, or undefined when they could not
 * be read (the error is logged). The column is an extra: the card shows the goals without it.
 */
async function loadStats(season: string) {
  try {
    return await getSeasonPlayerStats(season)
  } catch (error) {
    console.error(`Could not read the appearances of the players for ${playersPath}: ${reasonOf(error)}`)

    return undefined
  }
}

/** A match with its goals as names only: no goal has the page of a player behind it. */
const withoutLinks = <T extends { goals: { personSlug: null | string }[] }>(match: T): T => ({
  ...match,
  goals: match.goals.map((goal) => ({ ...goal, personSlug: null })),
})

/** The figures of the reports with the players as names only. */
const unlinked = <T extends undefined | { players: { personSlug: null | string }[] }>(figures: T): T =>
  figures === undefined ? figures : { ...figures, players: figures.players.map((p) => ({ ...p, personSlug: null })) }
