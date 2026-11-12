import type { Metadata } from 'next'

import { Heading, Page, Text } from '@fansite/design-system'
import { cache } from 'react'

import { reviewBranch } from '#src/env'
import { reasonOf } from '#src/errors'
import { matchSearchPath, parseFilters, viewOf } from '#src/match-search'
import { findScorerMatches, getSearchWorld } from '#src/match-search-data'
import { onThisDayOf, questionsOf } from '#src/match-search-start'
import { formatCount, MatchSearchFilters, MatchSearchResults, MatchSearchStart } from '#src/MatchSearchViews'
import { pageAreas } from '#src/page-areas'
import { getReportAddresses } from '#src/report-data'
import { ServerError, serverErrorTitle } from '#src/ServerError'
import { withBranch } from '#src/title'

type SearchParams = Record<string, string | string[] | undefined>

// Render on each request, so the build never reads the database.
export const dynamic = 'force-dynamic'

/** The query as plain text, so `cache` can compare it and the page shares one load. */
function queryOf(params: SearchParams): string {
  const query = new URLSearchParams()

  for (const [name, value] of Object.entries(params)) {
    for (const item of Array.isArray(value) ? value : value === undefined ? [] : [value]) {
      query.append(name, item)
    }
  }

  return query.toString()
}

const rawOf = (query: string): Record<string, string[]> => {
  const raw: Record<string, string[]> = {}

  for (const [name, value] of new URLSearchParams(query)) {
    raw[name] = [...(raw[name] ?? []), value]
  }

  return raw
}

/**
 * Everything the page needs for the query of the address, or undefined when the database can't
 * give it. A page that throws gets an empty page with a 500, so this page catches the error
 * and shows the error page in the HTML. The log says what failed and never what was searched
 * for.
 */
const loadSearch = cache(async (query: string) => {
  try {
    const { clubs, matches, seasons } = await getSearchWorld()
    const world = { clubs, seasons }
    const filters = parseFilters(rawOf(query), world)
    const scorer = filters.scorer === undefined ? undefined : await findScorerMatches(filters.scorer.words)
    const view = viewOf(matches, filters, scorer, world)
    const shownSeasons = [
      ...new Set(view.result.seasons.flatMap((group) => group.matches.map((match) => match.season))),
    ]
    const reportAddresses = new Map(
      (await Promise.all(shownSeasons.map((season) => getReportAddresses(season)))).flatMap((map) => [...map]),
    )

    // The start page has no results; it shows the questions and the day instead, counted from
    // same list, with the date of now in the Netherlands.
    const start = view.chosen
      ? undefined
      : { onThisDay: onThisDayOf(matches, new Date()), questions: questionsOf(matches, seasons[0] ?? '') }

    return { allClubs: clubs.length, filters, matches: matches.length, reportAddresses, seasons, start, view }
  } catch (error) {
    console.error(`Could not search for ${matchSearchPath}: ${reasonOf(error)}`)

    return undefined
  }
})

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const loaded = await loadSearch(queryOf(await searchParams))

  // noindex with a search too: a search engine has no use for a page of results.
  return {
    robots: { follow: false, index: false },
    title: loaded === undefined ? withBranch(serverErrorTitle, reviewBranch()) : 'Zoeken in wedstrijden',
  }
}

export default async function MatchSearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const query = queryOf(await searchParams)
  const loaded = await loadSearch(query)

  if (loaded === undefined) {
    return <ServerError retryHref={query === '' ? matchSearchPath : `${matchSearchPath}?${query}`} />
  }

  const { allClubs, filters, matches, reportAddresses, seasons, start, view } = loaded
  const first = seasons[0]?.slice(0, 4)

  return (
    <>
      <Page.Main areas={pageAreas({ before: ['filter'], start: true })} columns="start-side">
        <Page.Cell area="head">
          <Page.Title>
            <Heading level={1}>Zoeken in wedstrijden</Heading>
          </Page.Title>
          <Text appearance="intro">{`Alle ${formatCount(matches)} gespeelde wedstrijden sinds ${first ?? ''}, van de Eredivisie tot de Intertoto Cup.`}</Text>
        </Page.Cell>
        <Page.Section area="filter" aria-label="Filters">
          <MatchSearchFilters allClubs={allClubs} filters={filters} seasons={seasons} view={view} />
        </Page.Section>
        <Page.Section area="main" aria-label={start === undefined ? 'Resultaten' : 'Vragen en deze dag'}>
          {start === undefined ? (
            <MatchSearchResults filters={filters} now={new Date()} reportAddresses={reportAddresses} view={view} />
          ) : (
            <MatchSearchStart onThisDay={start.onThisDay} questions={start.questions} />
          )}
          <Text appearance="meta">
            Bron: Wikipedia en het archief van de oude sc Heerenveen Fansite. Van 1990 tot 2006 missen we bij een deel
            van de wedstrijden de doelpuntenmakers.
          </Text>
        </Page.Section>
      </Page.Main>
    </>
  )
}
