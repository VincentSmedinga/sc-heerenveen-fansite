import type { ScheduledMatch } from '@fansite/db/match-reports'
import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Card, Link, type MatchHeaderFact, MatchNeighbours, Page, Text, Time } from '@fansite/design-system'
import { cache } from 'react'

import { getMatchNeighbours } from '#src/match-neighbours'
import { PreviewHeader } from '#src/MatchPreviewViews'
import { seasonPageMetadata } from '#src/metadata'
import { pageAreas } from '#src/page-areas'
import { getUnknownResultMatch, reportAddress } from '#src/report-data'
import { matchesPath } from '#src/season-page'
import { seasonAddress, seasonFromSlug } from '#src/seasons'

// The page of a match that was played and has no known result (`result_unknown`, #1622): the
// clubs, the day and the words "Uitslag onbekend", with the match before and after it. It has
// no report, so it has no score, no half-time, no goals and no line-up. It stays at the address
// of the match, so a report or a result that comes later takes the address over (see
// `ReportPage`).

const longDay = new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'UTC' })

/** The match of the address, or undefined when it is not one without a result. */
const loadUnknown = cache(async (seizoen: string, wedstrijd: string) => {
  const season = seasonFromSlug(seizoen)
  const found = season === undefined ? undefined : await getUnknownResultMatch(season, wedstrijd)

  return season === undefined || found === undefined ? undefined : { found, season }
})

/** The two clubs in the order they are announced, the home club first. */
const clubsOf = (match: ScheduledMatch['match']) =>
  match.home ? ['sc Heerenveen', match.opponent] : [match.opponent, 'sc Heerenveen']

/** The title and the description of the page, never indexed, or undefined for another match. */
export async function unknownResultMetadata(seizoen: string, wedstrijd: string): Promise<Metadata | undefined> {
  const loaded = await loadUnknown(seizoen, wedstrijd)

  if (loaded === undefined) {
    return undefined
  }

  const { clubSlug, match } = loaded.found
  const [first, second] = clubsOf(match)
  const day = longDay.format(new Date(`${match.matchDate}T00:00:00Z`))

  return {
    ...seasonPageMetadata(matchesPath, reportAddress(loaded.season, match.matchDate, clubSlug), {
      description: `${first} – ${second} op ${day}, ${match.competition}: de uitslag is onbekend.`,
      title: `${first} – ${second}, ${day}: uitslag onbekend`,
    }),
    // Never indexed: the page has nothing but the day and the clubs.
    robots: { index: false },
  }
}

/**
 * The page of a match without a result: the header with "Uitslag onbekend", one sentence that
 * says what we miss, and the match before and after it. Returns undefined when the address is
 * not the one of such a match.
 */
export async function UnknownResultPage({ season: seizoen, slug }: { season: string; slug: string }) {
  const loaded = await loadUnknown(seizoen, slug)

  if (loaded === undefined) {
    return undefined
  }

  const { match } = loaded.found
  const now = new Date()
  const neighbours = await getMatchNeighbours(match.id, now)
  const [first, second] = clubsOf(match)

  return (
    <Page.Main areas={pageAreas({ main: ['text', 'neighbours'] })}>
      <Page.Cell area="head">
        <Text>
          <Link href={seasonAddress(matchesPath, loaded.season, seasonOf(now))} icon="arrow-left">
            {`Wedstrijden ${loaded.season}`}
          </Link>
        </Text>
        <PreviewHeader
          facts={factsOf(match)}
          home={match.home}
          opponent={match.opponent}
          pill="Uitslag onbekend"
          title={`${first} – ${second}`}
        />
      </Page.Cell>
      <Page.Cell area="text">
        <Card aria-label="Uitslag onbekend">
          <Text>Van deze wedstrijd kennen we de datum en de tegenstander, maar niet de uitslag.</Text>
        </Card>
      </Page.Cell>
      <Page.Cell area="neighbours">
        <MatchNeighbours next={neighbours.next} previous={neighbours.previous} />
      </Page.Cell>
    </Page.Main>
  )
}

/** The facts under the clubs: the competition, the round and the day. */
function factsOf(match: ScheduledMatch['match']): MatchHeaderFact[] {
  return [
    { label: 'Competitie', value: match.competition },
    { label: 'Ronde', value: match.round },
    {
      label: 'Datum',
      value: <Time dateTime={match.matchDate}>{longDay.format(new Date(`${match.matchDate}T12:00:00Z`))}</Time>,
    },
  ]
}
