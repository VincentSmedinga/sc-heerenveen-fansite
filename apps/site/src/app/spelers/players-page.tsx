import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Card, Heading, Link, Page, SeasonPicker, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import { seasonSourceOf, sourceName, sourceOf } from '#src/match-sources'
import { SourceCredit } from '#src/MatchViews'
import { pageMetadata, seasonPageMetadata } from '#src/metadata'
import { pageAreas } from '#src/page-areas'
import { loadSeasonPage, pickerPathOf, playerFiguresPath, playersPath } from '#src/season-page'
import { getSeasonSquad } from '#src/season-squad'
import { seasonAddress, seasonChoices, seasonSlug } from '#src/seasons'
import { SeasonSquadCard } from '#src/SeasonSquadCard'
import { ServerError, serverErrorTitle } from '#src/ServerError'
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
 * what the page is for. The figures of the players are on their own page (Cijfers, see
 * `PlayerFiguresPage`), so the toolbar has no choice of competition, and the sidebar has a
 * strong card that links to the figures of the same season, and ends with the credit. The
 * sidebar follows the main column on a phone, so the squad comes first there. A season that has
 * no matches in the database is the page "niet gevonden".
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
  const squadSource = { pages: squad.pages, wikidata: squad.players.some((player) => player.source === 'wikidata') }

  return (
    <Page.Main areas={pageAreas({ after: ['side'], toolbar: true })}>
      <Page.Cell area="head">
        <Heading level={1}>Spelers</Heading>
      </Page.Cell>
      <Page.Toolbar>
        <SeasonPicker action={pickerPath} options={seasonChoices(seasons)} value={seasonSlug(season)} />
      </Page.Toolbar>
      <Page.Section area="main" aria-label="De selectie van het seizoen">
        <SeasonSquadCard squad={squad} />
      </Page.Section>
      <Page.Section area="side" aria-label="Meer over de spelers">
        <Card aria-labelledby="cijfers-van-dit-seizoen" surface="strong">
          <Heading id="cijfers-van-dit-seizoen" level={2}>
            Cijfers van dit seizoen
          </Heading>
          <Text>Wie scoorde het vaakst, en wie gaf de meeste assists? De cijfers van de spelers staan bij elkaar.</Text>
          <Link href={seasonAddress(playerFiguresPath, season, seasonOf(new Date()))} icon="arrow-right">
            Naar de cijfers van de spelers
          </Link>
        </Card>
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

/** The squad of the season, or undefined when it could not be read (the error is logged). */
async function loadSquad(season: string) {
  try {
    return await getSeasonSquad(season)
  } catch (error) {
    console.error(`Could not read the squad for ${playersPath}: ${reasonOf(error)}`)

    return undefined
  }
}
