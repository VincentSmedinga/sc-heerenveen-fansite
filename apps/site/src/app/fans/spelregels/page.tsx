import type { Metadata } from 'next'

import { Heading, Page, Text } from '@fansite/design-system'
import { isFansPartOn, requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { rulesPath } from '#src/fans-paths'
import { pageMetadata } from '#src/metadata'

import { AccountRulesCard, FjouwerRulesCard, PredictionRulesCard, RatingRulesCard } from './RulesCards'

// Render on each request: the canonical URL comes from SITE_ENV and the parts of Fans from
// their own settings, which the build doesn't know.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => {
  requireFansPart('accounts', notFound)

  return pageMetadata(rulesPath, 'Spelregels')
}

/**
 * The rules of all games on one page (issue 1455): a card for each game that is on, in the
 * order of the bar of Fans, and the card Account. The page is public and the same for
 * everybody, and it holds nothing personal. A game that is off has no card, and the bar "Op
 * deze pagina" (see `@shortcuts/fans/spelregels`) leaves it out too. With accounts off the page
 * is "niet gevonden", like the rest of Fans.
 */
export default function RulesPage() {
  requireFansPart('accounts', notFound)

  return (
    <Page.Main>
      <Page.Cell area="head">
        <Heading level={1}>Spelregels</Heading>
        <Text appearance="intro">De regels van de spellen op Fans, met voorbeelden. Zonder prijzen.</Text>
      </Page.Cell>
      <Page.Cell area="main">
        {isFansPartOn('prognose') ? <PredictionRulesCard /> : null}
        {isFansPartOn('uitblinker') ? <RatingRulesCard /> : null}
        {isFansPartOn('vier') ? <FjouwerRulesCard /> : null}
        <AccountRulesCard />
      </Page.Cell>
    </Page.Main>
  )
}
