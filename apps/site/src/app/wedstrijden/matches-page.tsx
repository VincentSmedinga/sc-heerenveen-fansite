import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Card, Heading, Link, Page, SeasonPicker, StandingsTable, Text } from '@fansite/design-system'
import { notFound } from 'next/navigation'

import { reviewBranch } from '../../env'
import { overviewOf, resultsOfSeason } from '../../matches'
import { coachesCardOf, standingsCardOf } from '../../matchShortcuts'
import { CoachesCard, imageCredit, MatchLines, SourceCredit, StandingsBehind, standingsCaption } from '../../MatchViews'
import { pageMetadata, seasonPageMetadata } from '../../metadata'
import { loadSeasonPage, matchesPath, pickerPathOf, statisticsPath } from '../../season-page'
import { seasonAddress, seasonChoices, seasonSlug } from '../../seasons'
import { ServerError, serverErrorTitle } from '../../ServerError'
import { withBranch } from '../../title'

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
        description: `De uitslagen en de eindstand van sc Heerenveen 1 in het seizoen ${season}, met de bron erbij: de Nederlandse Wikipedia.`,
        title: `Wedstrijden ${season}`,
      })
}

/**
 * The page of a season: `/wedstrijden` for the current season and `/wedstrijden/2025-26` for
 * another, which is what the two routes render. The title row has the season picker beside the
 * heading. A season that is over has no Programma, shows its results from the first match to
 * the last, and calls its table Eindstand. Under the table and the results is a link to the
 * card with figures that belongs to it on the page Statistieken, of the same season. A season
 * that has no matches in the database is the page "niet gevonden".
 */
export async function MatchesPage({ season }: { season: string }) {
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
  const { programme, results: newestFirst } = overviewOf(data.matches, now)
  const results = resultsOfSeason(newestFirst, season, now)
  const standingsCard = standingsCardOf(current)
  const coachesCard = coachesCardOf(data.coaches.length)
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
        <Card aria-labelledby="uitslagen">
          <Heading anchor id="uitslagen" level={2}>
            Uitslagen
          </Heading>
          {results.length === 0 ? (
            <Text>We hebben nog geen uitslagen van dit seizoen.</Text>
          ) : (
            <MatchLines matches={results} now={now} />
          )}
          {results.length > 0 && (
            <Text>
              <Link href={statistics('verloop-van-het-seizoen')} icon="arrow-right">
                Het verloop van het seizoen
              </Link>
            </Text>
          )}
        </Card>
      </Page.Main>
      {/* The table is wide, so the sidebar is too. On a phone it follows the programme and
          the results: the table and the head coaches. */}
      <Page.Sidebar
        aria-label={`${current ? 'De stand' : 'De eindstand'}${data.coaches.length > 0 ? ` en de ${coachesCard.name.toLowerCase()}` : ''}`}
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
              <StandingsTable caption={standingsCaption(data.standings, standingsCard.name)} rows={data.standings} />
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
        <CoachesCard coaches={data.coaches} />
        {(data.matches.length > 0 || data.standings.length > 0) && (
          <SourceCredit edited={data.edited} pages={data.pages} season={data.season} />
        )}
      </Page.Sidebar>
    </>
  )
}
