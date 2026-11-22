import type { Metadata } from 'next'

import { Heading, Page, Text } from '@fansite/design-system'
import { requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { ratingFigures, yearWinners } from '#src/fans/season-ratings'
import { pageAreas } from '#src/page-areas'
import { YearWinnersCard } from '#src/SupporterRatingsCards'

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
 * The page "Uitblinker van het jaar" (issue 1474): the best player of each season, the newest
 * first, from the season ratings that supporters gave. It is gone, like the rest of the game,
 * when the Uitblinker is switched off.
 */
export default async function YearWinnersPage() {
  requireFansPart('uitblinker', notFound)

  const winners = yearWinners(await ratingFigures(), new Date())

  return (
    <Page.Main areas={areas}>
      <Page.Cell area="head">
        <Heading level={1}>Uitblinker van het jaar</Heading>
        <Text appearance="intro">
          De speler met het hoogste seizoencijfer van supporters, zodra het seizoen voorbij is.
        </Text>
      </Page.Cell>
      <Page.Cell area="winners">
        <YearWinnersCard winners={winners} />
      </Page.Cell>
    </Page.Main>
  )
}
