import { Page, type PageShortcutsItem } from '@fansite/design-system'

import type { SearchParams } from '#src/season-page'

import { competitionParam, parseCompetition } from '#src/competition'
import { getMatchSeasons } from '#src/matches'
import {
  clubShortcutsOf,
  getClubNews,
  getClubPage,
  getClubPlaces,
  meetingsOf,
  stadiumViewsOf,
  upcomingOf,
} from '#src/opponents'

// Render on each request, like the page it belongs to, so the build never reads the database.
export const dynamic = 'force-dynamic'

/**
 * The bar of the page of a club: a link to each card the page has (see `clubShortcutsOf`).
 * A club that doesn't exist and a choice of competition that the page doesn't know are the
 * page "niet gevonden", and a page that can't read its data shows the error page, which has no
 * cards to jump to, so then there is no bar. The readings are cached, so asking again costs
 * nothing; the page logs the error. The links stay on the page, so they keep the choice.
 */
export default async function ClubShortcuts({
  params,
  searchParams,
}: {
  params: Promise<{ club: string }>
  searchParams: Promise<SearchParams>
}) {
  const competition = parseCompetition((await searchParams)[competitionParam])

  if (competition === undefined) {
    return null
  }

  let items: PageShortcutsItem[]

  try {
    const page = await getClubPage((await params).club)

    if (page === undefined) {
      return null
    }

    const { matches } = page

    items = clubShortcutsOf({
      hasNews: (await getClubNews(page)).length > 0,
      hasPlaces: (await getClubPlaces(page)).length > 0,
      hasStadium: stadiumViewsOf(page.stadiums, matches).length > 0,
      matches,
      played: meetingsOf(matches, competition).length,
      since: (await getMatchSeasons()).at(-1) ?? '',
      upcoming: upcomingOf(matches, competition, new Date()).length,
    })
  } catch {
    return null
  }

  return items.length === 0 ? null : <Page.Shortcuts items={items} label="Op deze pagina:" />
}
