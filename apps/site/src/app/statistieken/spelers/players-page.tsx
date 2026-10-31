import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Heading, Page, SeasonPicker } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { parseCompetition } from '../../../competition'
import { competitionFields, CompetitionSwitch } from '../../../CompetitionSwitch'
import { reviewBranch } from '../../../env'
import { SourceCredit, TopScorersCard } from '../../../MatchViews'
import { pageMetadata, seasonPageMetadata } from '../../../metadata'
import { loadSeasonPage, pickerPathOf, playersPath, type SearchParams } from '../../../season-page'
import { seasonAddress, seasonChoices, seasonSlug } from '../../../seasons'
import { ServerError, serverErrorTitle } from '../../../ServerError'
import { SpecialGoalsCard } from '../../../SpecialGoalsCard'
import { withBranch } from '../../../title'

/** The route that sends the season picker on to its season (app/statistieken/spelers/kies). */
export const pickerPath = pickerPathOf(playersPath)

/**
 * The title, description and canonical address of the page Spelers of a season. The current
 * season is the page `/statistieken/spelers`; another season has an address of its own, which
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
        description: `Alle spelers van sc Heerenveen 1 die scoorden in het seizoen ${season}, met hun doelpunten en de bron erbij: de Nederlandse Wikipedia.`,
        title: `Spelers ${season}`,
      })
}

/**
 * The page Spelers of a season: `/statistieken/spelers` for the current season and
 * `/statistieken/spelers/2025-26` for another, which is what the two routes render. It has the
 * title row and the season picker of Statistieken, the card Doelpuntenmakers with every
 * player who scored, which is the card that stood on Statistieken before it got the top 5, and
 * under it the card Bijzondere doelpunten (hattricks, penalties and own goals). A
 * season that is over has the card put the season on its image. A season that has no matches in
 * the database is the page "niet gevonden". The cards count all the matches or, with
 * `?competitie=eredivisie`, the Eredivisie alone, as on Statistieken, and so does the switch.
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

  const { data, seasons } = loaded
  const current = season === seasonOf(new Date())

  return (
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
      <CompetitionSwitch
        address={seasonAddress(playersPath, season, seasonOf(new Date()))}
        competition={competition}
        matches={data.matches}
      />
      <TopScorersCard
        competition={competition}
        matches={data.matches}
        season={data.season}
        seasonOnImage={current ? undefined : season}
      />
      <SpecialGoalsCard competition={competition} matches={data.matches} seasonOnImage={current ? undefined : season} />
      {(data.matches.length > 0 || data.standings.length > 0) && (
        <SourceCredit pages={data.pages} season={data.season} />
      )}
    </Page.Main>
  )
}
