import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Heading, Page, SeasonPicker } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { parseCompetition } from '#src/competition'
import { competitionFields, CompetitionSwitch } from '#src/CompetitionSwitch'
import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import { SourceCredit, TopScorersCard } from '#src/MatchViews'
import { pageMetadata, seasonPageMetadata } from '#src/metadata'
import { loadSeasonPage, pickerPathOf, playersPath, type SearchParams } from '#src/season-page'
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

  return season === current
    ? pageMetadata(playersPath, 'Spelers')
    : seasonPageMetadata(playersPath, seasonAddress(playersPath, season, current), {
        description: `De selectie van sc Heerenveen 1 in het seizoen ${season} en alle spelers die scoorden, met hun doelpunten en de bron erbij: Wikipedia.`,
        title: `Spelers ${season}`,
      })
}

/**
 * The page Spelers of a season: `/spelers` for the current season and
 * `/spelers/2025-26` for another, which is what the two routes render. It has the
 * title row and the season picker of Statistieken, and the card Selectie with every player of
 * the season in parts by position and, under the heading, how complete that list is. That card
 * is white: the squad is what the page is for. The sidebar follows the main column on a phone,
 * so the squad comes first there. It starts with the switch between all matches and the
 * Eredivisie, because the switch changes only the cards with goals, and then has the card
 * Doelpuntenmakers (every player who scored) and the card Bijzondere doelpunten (hattricks,
 * penalties and own goals), both soft, and ends with the credit, as on Statistieken. A season
 * that is over has the cards with goals put the season on their image. A season that has no
 * matches in the database is the page "niet gevonden". The cards with goals count all the
 * matches or, with `?competitie=eredivisie`, the Eredivisie alone, as on Statistieken, and so
 * does the switch.
 */
export async function PlayersPage({ searchParams, season }: { searchParams: Promise<SearchParams>; season: string }) {
  const { competitie } = await searchParams
  const competition = parseCompetition(competitie)
  const loaded = await loadSeasonPage(season, playersPath)

  if (competition === undefined || loaded.kind === 'unknown') {
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
          </Page.Title>
        }
      >
        <SeasonSquadCard squad={squad} />
      </Page.Main>
      <Page.Sidebar aria-label="Meer cijfers over de spelers">
        <CompetitionSwitch
          address={seasonAddress(playersPath, season, seasonOf(new Date()))}
          competition={competition}
          matches={data.matches}
          place="spelers"
        />
        <TopScorersCard
          competition={competition}
          matches={data.matches}
          season={data.season}
          seasonOnImage={current ? undefined : season}
        />
        <SpecialGoalsCard
          competition={competition}
          matches={data.matches}
          seasonOnImage={current ? undefined : season}
        />
        {(data.matches.length > 0 || data.standings.length > 0 || squad.pages.length > 0) && (
          <SourceCredit edited={data.edited} pages={data.pages} season={data.season} squad={squadSource} />
        )}
      </Page.Sidebar>
    </>
  )
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
