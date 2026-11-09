import type { Competition } from '@fansite/db/schema'

import { seasonOf } from '@fansite/db/season'
import { Page } from '@fansite/design-system'

import { getMatchData, getMatchSeasons, getPlacePerRound, overviewOf, resultsPerCompetition } from '#src/matches'
import { matchShortcutsOf } from '#src/matchShortcuts'

/**
 * The bar of the page of a season: a link to each card the page has, in the order of a narrow
 * screen, which is the screen the bar is for (the bar is gone where the cards sit side by
 * side). A season that is over has no Programma, so no link to it, and a link for each card
 * with results instead of the one to Uitslagen. A season without a head coach in the table has
 * no card with coaches, so no link to it. When the page can't read its data it shows the error
 * page, which has no cards to jump to, and a season the page doesn't have is the page "niet
 * gevonden", so then there is no bar either. `getMatchData` keeps its answer for a few
 * minutes, so asking again costs nothing; the page logs the error. The season is only asked
 * for after it is found among the seasons that have matches, as the page does.
 */
export async function SeasonShortcuts({ season }: { season: string }) {
  const current = season === seasonOf(new Date())

  let coachCount: number
  let withResults: Competition[]
  let withPlacePerRound: boolean
  let withLastMatch: boolean

  try {
    if (!current && !(await getMatchSeasons()).includes(season)) {
      return null
    }

    const data = await getMatchData(season)

    coachCount = data.coaches.length

    const overview = overviewOf(data.matches, new Date())

    withLastMatch = overview.previous !== undefined
    withResults = resultsPerCompetition(overview.results).map(({ competition }) => competition)
  } catch {
    return null
  }

  try {
    // The card is no more than a card: when it can't be read the page leaves it out, and so
    // does the bar.
    withPlacePerRound = (await getPlacePerRound(season)) !== undefined
  } catch {
    withPlacePerRound = false
  }

  return (
    <Page.Shortcuts
      items={matchShortcutsOf(current, coachCount, withResults, withPlacePerRound, withLastMatch)}
      label="Op deze pagina:"
    />
  )
}
