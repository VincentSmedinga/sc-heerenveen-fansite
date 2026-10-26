import type { Metadata } from 'next'

import { Heading, Page, Text } from '@fansite/design-system'
import { cache } from 'react'

import { reviewBranch } from '../../env'
import { reasonOf } from '../../errors'
import { getSquad, parseResultCount, parseSearch, searchHref, searchSite, type Squad } from '../../search'
import { SearchForm, SearchResults, SquadCard } from '../../SearchViews'
import { ServerError, serverErrorTitle } from '../../ServerError'
import { withBranch } from '../../title'

type SearchParams = Record<string, string | string[] | undefined>

// Render on each request, so the build never reads the database. The squad is cached by
// getSquad; a search never is, because every search is the visitor's own.
export const dynamic = 'force-dynamic'

/**
 * The squad for the list of players, or undefined when the database can't give it. The list is
 * an extra: the page searches without it, and the log says why it is missing.
 */
async function loadSquad(): Promise<Squad | undefined> {
  try {
    return await getSquad()
  } catch (error) {
    console.error(`Could not read the squad for /zoeken: ${reasonOf(error)}`)

    return undefined
  }
}

/**
 * The results for the text of a valid search (an empty text for no search, which asks nothing
 * of the database) and the squad, or undefined when the database can't give the results. A
 * page that throws gets an empty page with a 500 from Next.js, and the text only after
 * JavaScript runs. So this page catches the error and shows the error page itself, in the
 * HTML. The log says what failed and never what was searched for. `cache` makes the page and
 * its metadata share one call per request; its arguments are plain values, because `cache`
 * compares objects by identity.
 */
const loadContent = cache(async (text: string, count: number) => {
  try {
    const [results, squad] = await Promise.all([
      text === '' ? undefined : searchSite(text.split(' '), count),
      loadSquad(),
    ])

    return { results, squad }
  } catch (error) {
    console.error(`Could not search for /zoeken: ${reasonOf(error)}`)

    return undefined
  }
})

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchParams> }): Promise<Metadata> {
  const { aantal, q } = await searchParams
  const search = parseSearch(q)
  const content = await loadContent(search.kind === 'valid' ? search.text : '', parseResultCount(aantal))

  // The page is noindex with a search too: a search engine has no use for a page of results,
  // and following the links of the players would make it ask for every surname. A page that
  // failed answers 200, so its title is the title of the error page.
  return {
    robots: { follow: false, index: false },
    title:
      content === undefined
        ? withBranch(serverErrorTitle, reviewBranch())
        : search.kind === 'valid'
          ? `Zoeken: ${search.text}`
          : 'Zoeken',
  }
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const { aantal, q } = await searchParams
  const search = parseSearch(q)
  const count = parseResultCount(aantal)
  const content = await loadContent(search.kind === 'valid' ? search.text : '', count)

  if (content === undefined) {
    return <ServerError retryHref={search.kind === 'valid' ? searchHref(search.text) : '/zoeken'} />
  }

  const { results, squad } = content
  const hasSquad = squad !== undefined && squad.players.length > 0
  const now = new Date()

  return (
    <>
      <Page.Main
        intro={
          <>
            <Heading level={1}>Zoeken</Heading>
            <Text appearance="intro">
              Zoek in de koppen van het nieuws, de podcasts en de artikelen van de redactie.
            </Text>
            <SearchForm
              error={search.kind === 'invalid' ? search.message : undefined}
              text={search.kind === 'none' ? '' : search.text}
            />
          </>
        }
      >
        {results !== undefined && search.kind === 'valid' && (
          <SearchResults
            count={count}
            hasSquad={hasSquad}
            hits={results.hits}
            now={now}
            text={search.text}
            total={results.total}
          />
        )}
      </Page.Main>
      {/* After the results in the source, so on a phone the players are under the results, and
          under the form on a first visit. */}
      {hasSquad && (
        <Page.Sidebar aria-label="De spelers van sc Heerenveen">
          <SquadCard squad={squad} />
        </Page.Sidebar>
      )}
    </>
  )
}
