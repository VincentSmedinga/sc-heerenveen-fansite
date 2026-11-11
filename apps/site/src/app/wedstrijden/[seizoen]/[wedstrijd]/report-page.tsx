import type { ReportedMatch } from '@fansite/db/match-reports'
import type { Metadata } from 'next'

import { phaseOf } from '@fansite/db/match-reports'
import { oldSiteReportSource } from '@fansite/db/schema'
import { seasonOf } from '@fansite/db/season'
import { Card, Contents, Link, type MatchHeaderFact, MatchNeighbours, Page, Text, Time } from '@fansite/design-system'
import { notFound } from 'next/navigation'
import { cache, type ReactNode } from 'react'

import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import { LiveRefresh, LiveState } from '#src/LiveRefresh'
import { matchMoment } from '#src/match-format'
import { getMatchNeighbours } from '#src/match-neighbours'
import { sourceOf } from '#src/match-sources'
import { getEditorSources, getMatchData, type MatchData } from '#src/matches'
import { MatchPageCards, MatchPageHeader } from '#src/MatchPageView'
import { EditorSources, SourceCredit } from '#src/MatchViews'
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

    const [data, neighbours, editorSources] = await Promise.all([
      getMatchData(season),
      getMatchNeighbours(reported.match.id, new Date()),
      getEditorSources(season),
    ])

    return { data, editorSources, kind: 'found', neighbours, reported, season } as const
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
  // A match that is being played has no result and its stand changes, so neither the title nor
  // the description names a stand (the page is not indexed either).
  const phase = phaseOf(reported.match, new Date())
  const description =
    phase === 'live'
      ? `Het verslag van ${first} – ${second} op ${day}, ${reported.match.competition}, terwijl de wedstrijd wordt gespeeld: de opstelling en de gebeurtenissen tot nu toe. We vullen het verslag nog in.`
      : phase === 'upcoming'
        ? `De opstelling van ${first} – ${second} op ${day}, ${reported.match.competition}, voor de wedstrijd begint. We vullen het verslag nog in.`
        : complete
          ? `Het verslag van ${first} – ${second} op ${day}, ${reported.match.competition}: de uitslag was ${scoreOf(reported)}, met het verloop, de wissels, de kaarten en de opstellingen.`
          : `Wat we tot nu toe hebben van het verslag van ${first} – ${second} op ${day}, ${reported.match.competition}: de uitslag was ${scoreOf(reported)}. We vullen het verslag nog in.`
  const metadata = seasonPageMetadata(matchesPath, reportAddress(season, reported.match.matchDate, reported.clubSlug), {
    // A report that is not complete claims nothing about what is missing, and is not indexed.
    description,
    title,
  })

  return complete ? metadata : { ...metadata, robots: { index: false } }
}

/**
 * The title of the page: the clubs and the result, and the day. A match that is being played
 * has no result yet: its title has the clubs and the day alone.
 */
function titleOf(reported: ReportedMatch) {
  const [first, second] = clubsOf(reported)
  const day = longDay.format(new Date(`${reported.match.matchDate}T00:00:00Z`))

  return {
    day,
    title:
      reported.match.status === 'played'
        ? `${first} ${scoreOf(reported)} ${second}, ${day}`
        : `${first} – ${second}, ${day}`,
  }
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

  const { data, editorSources, neighbours, reported, season } = loaded
  const now = new Date()
  const phase = phaseOf(reported.match, now)
  const page = matchPageDataOf(reported, factsOf(reported, now, phase), isCompleteReport(reported), phase)

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
            <LiveRegion name="header" on={phase === 'live'}>
              <MatchPageHeader data={page} />
              <LiveState {...liveStateOf(reported, phase)} />
            </LiveRegion>
            {phase === 'live' && (
              <LiveRefresh
                href={`${matchesPath}/${seizoen}/${slug}`}
                renderedAt={now.getTime()}
                stopAt={liveStopAt(reported.match)}
              />
            )}
          </Page.Cell>
        }
      >
        <LiveRegion name="cards" on={phase === 'live'}>
          <MatchPageCards data={page} />
        </LiveRegion>
        <MatchNeighbours next={neighbours.next} previous={neighbours.previous} />
      </Page.Main>
      <Page.Sidebar aria-label="De bron">
        <ReportCredit data={data} editorSources={editorSources} reported={reported} />
      </Page.Sidebar>
    </>
  )
}

/** How long after the kick-off a page stops refreshing: a match is over by then. */
const liveDuration = 4 * 60 * 60 * 1000

/**
 * The facts under the result: the competition and round, the day, the stadium, and what is
 * known.
 */
function factsOf({ match }: ReportedMatch, now: Date, phase: ReturnType<typeof phaseOf>): MatchHeaderFact[] {
  // A match that is being played shows its kick-off; one that was played, its day alone.
  const day = matchMoment(phase === undefined ? { ...match, status: 'played' } : match, now, { withYear: true })
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

/**
 * The part of the page that a refresh replaces. A page that is not live has no refresh, so it
 * has no wrapper either. `display: contents` keeps the wrapper out of the layout.
 */
function LiveRegion({ children, name, on }: { children: ReactNode; name: string; on: boolean }) {
  return on ? <Contents data-live-region={name}>{children}</Contents> : children
}

/**
 * What a screen reader hears when the page refreshes: the last goal with the stand, and the end
 * of the match with the final score. See `announcementOf`.
 */
function liveStateOf(reported: ReportedMatch, phase: ReturnType<typeof phaseOf>) {
  const { goals } = reported.stored
  const ours = goals.filter((goal) => goal.ours).length
  const stand = reported.match.home ? `${ours}–${goals.length - ours}` : `${goals.length - ours}–${ours}`
  const goal = goals.at(-1)
  const minute =
    goal === undefined
      ? ''
      : `, ${goal.minute}e minuut${goal.stoppageMinutes === null || goal.stoppageMinutes === 0 ? '' : ` plus ${goal.stoppageMinutes}`}`

  return {
    final: `Einde van de wedstrijd. Eindstand ${reported.match.status === 'played' ? scoreOf(reported) : stand}.`,
    goals: goals.length,
    last:
      goal === undefined ? '' : `Doelpunt ${goal.ours ? ourClub : reported.match.opponent}. Stand ${stand}${minute}.`,
    live: phase === 'live',
  }
}

/** When a live page stops refreshing: four hours after the kick-off, or after the day began. */
function liveStopAt({ kickoffAt, matchDate }: ReportedMatch['match']) {
  return (kickoffAt ?? new Date(`${matchDate}T00:00:00Z`)).getTime() + liveDuration
}

/** The credit under the page: the source of the report when it is not ours, and Wikipedia. */
function ReportCredit({
  data,
  editorSources,
  reported,
}: {
  data: MatchData
  editorSources: Awaited<ReturnType<typeof getEditorSources>>
  reported: ReportedMatch
}) {
  const { source } = reported.stored.report

  return (
    <>
      {source === null || source === oldSiteReportSource ? null : (
        <Card as="div" surface="transparent">
          <Text appearance="meta">{`Bron: ${source}.`}</Text>
        </Card>
      )}
      {reported.match.attendance !== null && reported.match.attendance > 0 && (
        <Card as="div" surface="transparent">
          <Text appearance="meta">Het aantal toeschouwers is een schatting, volgens Wikipedia.</Text>
        </Card>
      )}
      <EditorSources sources={editorSources.filter((added) => added.id === reported.match.id)} />
      <SourceCredit edited={data.edited} pages={data.pages} season={data.season} source={sourceOf([reported.match])} />
    </>
  )
}
