import type { Metadata } from 'next'

import { Heading, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { ratingFigures, yearWinners } from '#src/fans/season-ratings'
import { pageAreas } from '#src/page-areas'
import { YearWinnerCards, yearWinnersSource } from '#src/SupporterRatingsCards'

const areas = pageAreas({ main: ['winners'] })

// The settings of the parts are read when a request comes in, and the list is read from the
// database, so the build never does. The data is kept for a minute (`ratingFigures`), and the
// page is the same for every visitor.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => {
  requireFansPart('uitblinker', notFound)

  return { robots: { follow: false, index: false }, title: 'Uitblinker van het jaar' }
}

/**
 * The page "Uitblinker van het jaar" (issues 1474, 1613 and 1667): a card for each season with
 * its best player, the newest first, in two columns, from the season ratings that supporters
 * gave. The best of all seasons stands out in its card. It is gone, like the rest of the game,
 * when the Uitblinker is switched off.
 */
export default async function YearWinnersPage() {
  requireFansPart('uitblinker', notFound)

  const winners = yearWinners(await ratingFigures(), new Date())

  return (
    <Page.Main areas={areas}>
      <Page.Cell area="head">
        <Heading level={1}>Uitblinker van het jaar</Heading>
        <Text appearance="intro">Deze spelers kregen van jullie de hoogste gemiddelde cijfers:</Text>
      </Page.Cell>
      <Page.Cell area="winners">
        <YearWinnerCards winners={winners} />
        {winners.length === 0 ? null : <Text appearance="meta">{yearWinnersSource}</Text>}
      </Page.Cell>
    </Page.Main>
  )
}
