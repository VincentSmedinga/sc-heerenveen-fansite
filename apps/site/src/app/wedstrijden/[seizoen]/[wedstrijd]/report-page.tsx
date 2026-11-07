import type { ReportedMatch } from '@fansite/db/match-reports'
import type { Metadata } from 'next'

import { seasonOf } from '@fansite/db/season'
import { Card, Link, type MatchHeaderFact, Page, Text, Time } from '@fansite/design-system'
import { notFound } from 'next/navigation'
import { cache } from 'react'

import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import { matchMoment } from '#src/match-format'
import { getMatchData, type MatchData } from '#src/matches'
import { MatchPageCards, MatchPageHeader } from '#src/MatchPageView'
import { SourceCredit } from '#src/MatchViews'
import { seasonPageMetadata } from '#src/metadata'
import { getPublicReport, isCompleteReport, reportAddress } from '#src/report-data'
import { matchPageDataOf, ourClub } from '#src/report-view'
import { matchesPath } from '#src/season-page'
import { seasonAddress, seasonFromSlug } from '#src/seasons'
import { ServerError, serverErrorTitle } from '#src/ServerError'
import { withBranch } from '#src/title'

/**
 * The match of the address and what the credit needs, or what went wrong. A page that throws
 * gets an empty page with a 500 from Next.js, so the page catches the error and shows the error
 * page itself. `cache` makes the page and its metadata share one call per request.
 */
const loadReport = cache(async (seizoen: string, wedstrijd: string) => {
  const season = seasonFromSlug(seizoen)

  if (season === undefined) {
    return { kind: 'unknown' } as const
  }

  try {
    const reported = await getPublicReport(season, wedstrijd)

    if (reported === undefined) {
      return { kind: 'unknown' } as const
    }

    return { data: await getMatchData(season), kind: 'found', reported, season } as const
  } catch (error) {
    console.error(`Could not read the match report for ${matchesPath}/${seizoen}/${wedstrijd}: ${reasonOf(error)}`)

    return { kind: 'error' } as const
  }
})

const longDay = new Intl.DateTimeFormat('nl-NL', { dateStyle: 'long', timeZone: 'UTC' })

/** The score from the side of the home club, with the en dash: `6–0`. */
const scoreOf = ({ match }: ReportedMatch) =>
  match.home ? `${match.goalsFor}–${match.goalsAgainst}` : `${match.goalsAgainst}–${match.goalsFor}`

/** The two clubs in the order they are announced, the home club first. */
const clubsOf = ({ match }: ReportedMatch) => (match.home ? [ourClub, match.opponent] : [match.opponent, ourClub])

/**
 * The title, the description and the canonical address of the page of a match. The title and
 * the description name the clubs, the result and the day. A match without a page has none.
 */
export async function reportMetadata(seizoen: string, wedstrijd: string): Promise<Metadata> {
  const loaded = await loadReport(seizoen, wedstrijd)

  // A page that failed answers 200, so noindex keeps search engines from keeping it.
  if (loaded.kind === 'error') {
    return { robots: { index: false }, title: withBranch(serverErrorTitle, reviewBranch()) }
  }

  if (loaded.kind === 'unknown') {
    return {}
  }

  const { reported, season } = loaded
  const [first, second] = clubsOf(reported)
  const { day, title } = titleOf(reported)

  const complete = isCompleteReport(reported)
  const metadata = seasonPageMetadata(matchesPath, reportAddress(season, reported.match.matchDate, reported.clubSlug), {
    // A report that is not complete claims nothing about what is missing, and is not indexed.
    description: complete
      ? `Het verslag van ${first} – ${second} op ${day}, ${reported.match.competition}: de uitslag was ${scoreOf(reported)}, met het verloop, de wissels, de kaarten en de opstellingen.`
      : `Wat we tot nu toe hebben van het verslag van ${first} – ${second} op ${day}, ${reported.match.competition}: de uitslag was ${scoreOf(reported)}. We vullen het verslag nog in.`,
    title,
  })

  return complete ? metadata : { ...metadata, robots: { index: false } }
}

/** The title of the page: the clubs and the result, and the day. */
function titleOf(reported: ReportedMatch) {
  const [first, second] = clubsOf(reported)
  const day = longDay.format(new Date(`${reported.match.matchDate}T00:00:00Z`))

  return { day, title: `${first} ${scoreOf(reported)} ${second}, ${day}` }
}

const numberFormat = new Intl.NumberFormat('nl-NL')

/**
 * The page of one match, built by `MatchPageView` from the data of the report: the clubs with
 * the result, the scorers and the facts, the score bar, the line-up on the pitch with the
 * substitutes, the course of the match in the halves and, after a shoot-out, its series. The
 * line-up of the opponent is there when its side of the report is complete, and otherwise one
 * sentence says so. The credit follows, in the sidebar: Wikipedia for the result and the goals,
 * and our own records for the rest. A match without a page, and an address that is not one, are
 * the page "niet gevonden".
 */
export async function ReportPage({ season: seizoen, slug }: { season: string; slug: string }) {
  const loaded = await loadReport(seizoen, slug)

  if (loaded.kind === 'unknown') {
    notFound()
  }

  if (loaded.kind === 'error') {
    return <ServerError retryHref={`${matchesPath}/${seizoen}/${slug}`} />
  }

  const { data, reported, season } = loaded
  const now = new Date()
  const page = matchPageDataOf(reported, factsOf(reported, now), isCompleteReport(reported))

  return (
    <>
      <Page.Main
        intro={
          <Page.Cell>
            <Text>
              <Link href={seasonAddress(matchesPath, season, seasonOf(now))} icon="arrow-left">
                {`Wedstrijden ${season}`}
              </Link>
            </Text>
            <MatchPageHeader data={page} />
          </Page.Cell>
        }
      >
        <MatchPageCards data={page} />
      </Page.Main>
      <Page.Sidebar aria-label="De bron">
        <ReportCredit data={data} reported={reported} />
      </Page.Sidebar>
    </>
  )
}

/**
 * The facts under the result: the competition and round, the day, the stadium, and what is
 * known.
 */
function factsOf({ match }: ReportedMatch, now: Date): MatchHeaderFact[] {
  const day = matchMoment({ ...match, status: 'played' }, now, { withYear: true })
  const facts: MatchHeaderFact[] = [
    { label: 'Competitie', value: match.competition },
    { label: 'Ronde', value: match.round },
    { label: 'Datum', value: <Time dateTime={day.dateTime}>{day.time}</Time> },
  ]

  if (match.stadium !== null) {
    facts.push({ label: 'Stadion', value: match.stadium })
  }

  if (match.attendance !== null) {
    facts.push({
      label: 'Toeschouwers',
      value: match.attendance === 0 ? 'Zonder publiek' : numberFormat.format(match.attendance),
    })
  }

  if (match.referee !== null) {
    facts.push({ label: 'Scheidsrechter', value: match.referee })
  }

  return facts
}

/** The credit under the page: Wikipedia for what it has, and our own records for the rest. */
function ReportCredit({ data, reported }: { data: MatchData; reported: ReportedMatch }) {
  const { source } = reported.stored.report

  return (
    <>
      <Card as="div" surface="transparent">
        <Text appearance="meta">
          {`De opstelling, de wissels, de kaarten en de assists komen uit onze eigen administratie${source === null ? '' : `, naar ${source}`}.`}
        </Text>
      </Card>
      <SourceCredit edited={data.edited} pages={data.pages} season={data.season} />
    </>
  )
}
