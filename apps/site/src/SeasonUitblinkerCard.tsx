import { Card, CardLink, Heading, Text, Winner } from '@fansite/design-system'

import type { SeasonUitblinker } from './fans/season-uitblinker'

import { yearWinnersPath } from './fans-paths'
import { ratingPath } from './fans/rating'

/**
 * The card "Uitblinker" at the top of the sidebar of the page Spelers (issue 1647): the seal of
 * the season, soft and with the watermark of the game. The running season shows the last match
 * with a result and, while the window is open, the way to give grades, named by the match. A
 * season that is over shows its Uitblinker of the year, with both on an equal rating.
 */
export function SeasonUitblinkerCard({ uitblinker }: { uitblinker: SeasonUitblinker }) {
  return (
    <Card aria-labelledby="uitblinker" game="uitblinker" surface="soft">
      <Heading id="uitblinker" level={2}>
        Uitblinker
      </Heading>
      {uitblinker.kind === 'year' ? (
        <>
          {uitblinker.seals.map((seal) => (
            <Winner key={seal.name} {...seal} />
          ))}
          {uitblinker.source === undefined ? null : <Text appearance="meta">{uitblinker.source}</Text>}
          <CardLink href={yearWinnersPath}>Uitblinker van het jaar</CardLink>
        </>
      ) : (
        <>
          {uitblinker.result === undefined ? (
            <Text>Geef de spelers van de laatste wedstrijd een cijfer.</Text>
          ) : (
            <>
              <Winner {...uitblinker.result.seal} />
              <Text appearance="meta">{uitblinker.result.supporters}</Text>
            </>
          )}
          {uitblinker.openMatch === undefined ? null : (
            <CardLink aria-label={`Geef cijfers voor ${uitblinker.openMatch}`} href={ratingPath}>
              Geef cijfers
            </CardLink>
          )}
        </>
      )}
    </Card>
  )
}
