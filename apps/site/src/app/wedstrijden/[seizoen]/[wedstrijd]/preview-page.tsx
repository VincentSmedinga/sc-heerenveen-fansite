import type { ScheduledMatch } from '@fansite/db/match-reports'
import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Link, type MatchHeaderFact, Page, Text, Time } from '@fansite/design-system'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import { leagueResultsOfAllClubs } from '#src/last-five'
import { getLeagueResults, getMatchData } from '#src/matches'
import {
  PreviewFormCard,
  PreviewHeader,
  PreviewHeadToHeadCard,
  PreviewNewsCard,
  PreviewScorersCard,
  PreviewStandingCard,
} from '#src/MatchPreviewViews'
import { SourceCredit } from '#src/MatchViews'
import { seasonPageMetadata } from '#src/metadata'
import { getClubNews, getClubPage, getSquadPersonIds, getStadiumPlace } from '#src/opponents'
import { pageAreas } from '#src/page-areas'
import { PredictionCrowdCard, readPredictionCrowd } from '#src/PredictionCrowdCard'
import { headToHeadOf } from '#src/preview-head-to-head'
import { scorersOf } from '#src/preview-scorers'
import { formsOf, standingSentenceOf, standingSliceOf } from '#src/preview-standing'
import { getMatchPages, getPreviewMatch, reportAddress } from '#src/report-data'
import { matchesPath } from '#src/season-page'
import { seasonAddress, seasonFromSlug } from '#src/seasons'
import { ServerError, serverErrorTitle } from '#src/ServerError'
import { withBranch } from '#src/title'

// The page of a match that is still `scheduled` and has no report: the Voorbeschouwing. It has
// the address of the match, so once there is a report it is the page of the match (see
// `ReportPage`); until then it stays, also after the kick-off. Each part that comes after the
// header is a card of its own.

/** How many headlines the card Nieuws shows at most. */
const newsLimit = 3

/**
 * The match of the address and what the cards need, or what went wrong. A page that throws gets
 * an empty page with a 500 from Next.js, so the page catches the error and shows the error page
 * itself. `cache` makes the page and its metadata share one call per request.
 */
const loadPreview = cache(async (seizoen: string, wedstrijd: string) => {
  const season = seasonFromSlug(seizoen)

  if (season === undefined) {
    return { kind: 'unknown' } as const
  }

  try {
    const found = await getPreviewMatch(season, wedstrijd)

    if (found === undefined) {
      return { kind: 'unknown' } as const
    }

    const [data, club, leagueResults] = await Promise.all([
      getMatchData(season),
      getClubPage(found.clubSlug),
      getLeagueResults(season),
    ])
    const headlines = club === undefined ? [] : await getClubNews(club)
    const { opponent } = found.match
    // The table is for a league match only: a cup match against a club of the league has none.
    const slice = found.match.competition === 'Eredivisie' ? standingSliceOf(data.standings, opponent) : undefined
    const forms = formsOf(leagueResultsOfAllClubs(data.matches, leagueResults), opponent)
    // The head-to-head counts the matches on the side of this match only (#1315). "Daar" is the
    // place of the ground of the opponent, which only an away match needs.
    const headToHead = club === undefined ? undefined : headToHeadOf(club.matches, found.match.home)
    const pages = headToHead === undefined ? undefined : await getMatchPages(headToHead.last)
    const scorers =
      club === undefined ? undefined : scorersOf(club.matches, found.match.home, new Set(await getSquadPersonIds()))
    const { stadiumId } = found.match
    const place =
      (headToHead === undefined && scorers === undefined) || found.match.home || stadiumId === null
        ? undefined
        : await getStadiumPlace(String(stadiumId))

    return {
      data,
      forms,
      found,
      headlines: headlines.slice(0, newsLimit),
      headToHead,
      kind: 'found',
      pages,
      place,
      scorers,
      season,
      slice,
    } as const
  } catch (error) {
    console.error(`Could not read the match preview for ${matchesPath}/${seizoen}/${wedstrijd}: ${reasonOf(error)}`)

    return { kind: 'error' } as const
  }
})

const longDay = new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'UTC' })

/** The title and the description of the page, and its canonical address. Never indexed. */
export async function previewMetadata(seizoen: string, wedstrijd: string): Promise<Metadata> {
  const loaded = await loadPreview(seizoen, wedstrijd)

  if (loaded.kind === 'error') {
    return { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
  }

  if (loaded.kind === 'unknown') {
    return {}
  }

  const { clubSlug, match } = loaded.found
  const [first, second] = clubsOf(match)
  const day = longDay.format(new Date(`${match.matchDate}T00:00:00Z`))

  return {
    ...seasonPageMetadata(matchesPath, reportAddress(loaded.season, match.matchDate, clubSlug), {
      // The description says nothing about a result: there is none.
      description: `De voorbeschouwing van ${first} – ${second} op ${day}, ${match.competition}.`,
      title: `Voorbeschouwing ${first} – ${second}, ${day}`,
    }),
    // Never indexed: the page has no result, and the report has its own page.
    robots: { index: false },
  }
}

/** The two clubs in the order they are announced, the home club first. */
const clubsOf = (match: ScheduledMatch['match']) =>
  match.home ? ['sc Heerenveen', match.opponent] : [match.opponent, 'sc Heerenveen']

/**
 * The page of the Voorbeschouwing: the header, the table, the form, our scorers against the
 * opponent on this side, the prediction, the earlier matches, the news about the opponent and
 * the credit. On a phone the cards stand under each other in that order, and on a wide screen
 * the section with Stand, Vorm, Onze schutters and Prognose is the narrow column beside
 * Onderling, Nieuws and the credit. Any other address is "niet gevonden".
 */
export async function PreviewPage({ season: seizoen, slug }: { season: string; slug: string }) {
  const loaded = await loadPreview(seizoen, slug)

  if (loaded.kind === 'unknown') {
    notFound()
  }

  if (loaded.kind === 'error') {
    return <ServerError retryHref={`${matchesPath}/${seizoen}/${slug}`} />
  }

  const { data, forms, found, headlines, headToHead, pages, place, scorers, season, slice } = loaded
  const { match } = found
  const now = new Date()
  const prediction = await readPredictionCrowd(match)
  const [first, second] = clubsOf(match)
  const news = headlines.length > 0
  const standing = slice !== undefined && standingSentenceOf(data.standings, match.opponent) !== undefined
  const form = forms.length > 0
  const together = headToHead !== undefined
  const shooters = scorers !== undefined
  // The cards of the narrow column are one section, so they stack by their own height. The
  // source order is the order on a phone: that section, Onderling, Nieuws and the credit.
  const side = standing || form || shooters || prediction !== undefined
  const areas = pageAreas({
    before: side ? ['side'] : [],
    main: [...(together ? ['headToHead'] : []), ...(news ? ['news'] : []), 'source'],
  })

  return (
    <Page.Main areas={areas}>
      <Page.Cell area="head">
        <Text>
          <Link href={seasonAddress(matchesPath, season, seasonOf(now))} icon="arrow-left">
            Wedstrijden
          </Link>
        </Text>
        <PreviewHeader
          facts={factsOf(match)}
          home={match.home}
          opponent={match.opponent}
          title={`${first} – ${second}`}
        />
      </Page.Cell>
      {side && (
        <Page.Section area="side" aria-label="Stand, vorm en prognose">
          {standing && <PreviewStandingCard opponent={match.opponent} slice={slice} standings={data.standings} />}
          {form && <PreviewFormCard forms={forms} />}
          {shooters && <PreviewScorersCard home={match.home} name={match.opponent} place={place} scorers={scorers} />}
          {prediction === undefined ? null : (
            <PredictionCrowdCard data={prediction} matchId={match.id} played={false} />
          )}
        </Page.Section>
      )}
      {together && (
        <Page.Cell area="headToHead">
          <PreviewHeadToHeadCard
            headToHead={headToHead}
            home={match.home}
            name={match.opponent}
            now={now}
            pages={pages}
            place={place}
            slug={found.clubSlug}
          />
        </Page.Cell>
      )}
      {news && (
        <Page.Cell area="news">
          <PreviewNewsCard headlines={headlines} name={match.opponent} now={now} />
        </Page.Cell>
      )}
      <Page.Section area="source" aria-label="De bron">
        <SourceCredit edited={data.edited} pages={data.pages} season={data.season} source="both" />
      </Page.Section>
    </Page.Main>
  )
}

const dayFormat = new Intl.DateTimeFormat('nl-NL', {
  day: 'numeric',
  month: 'long',
  timeZone: 'Europe/Amsterdam',
  weekday: 'long',
})
const timeFormat = new Intl.DateTimeFormat('nl-NL', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'Europe/Amsterdam',
})

const capitalised = (text: string) => `${text.charAt(0).toUpperCase()}${text.slice(1)}`

/**
 * The day and the kick-off: "Zaterdag 21 november, 20.00 uur", and for a match without a
 * kick-off the day and "aftrap volgt".
 */
export function dayOf({ kickoffAt, matchDate }: Pick<ScheduledMatch['match'], 'kickoffAt' | 'matchDate'>) {
  const day = capitalised(dayFormat.format(kickoffAt ?? new Date(`${matchDate}T12:00:00Z`)))

  return {
    dateTime: kickoffAt === null ? matchDate : kickoffAt.toISOString(),
    text: kickoffAt === null ? `${day}, aftrap volgt` : `${day}, ${timeFormat.format(kickoffAt).replace(':', '.')} uur`,
  }
}

/**
 * The facts under the clubs: the competition, the round, the day with the kick-off, the
 * stadium and the referee, the last two when we have them.
 */
function factsOf(match: ScheduledMatch['match']): MatchHeaderFact[] {
  const day = dayOf(match)
  const facts: MatchHeaderFact[] = [
    { label: 'Competitie', value: match.competition },
    { label: 'Ronde', value: match.round },
    { label: 'Datum', value: <Time dateTime={day.dateTime}>{day.text}</Time> },
  ]

  if (match.stadium !== null) {
    facts.push({ label: 'Stadion', value: match.stadium })
  }

  if (match.referee !== null) {
    facts.push({ label: 'Scheidsrechter', value: match.referee })
  }

  return facts
}
