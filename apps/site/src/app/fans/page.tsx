import type { Metadata } from 'next'

import { Card, Heading, List, Page, Tag, Text } from '@fansite/design-system'
import { isFansPartOn, requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { fansGames } from '#src/fans-paths'
import { pageMetadata } from '#src/metadata'

// Render on each request: the canonical URL comes from SITE_ENV and the parts of Fans from
// their own settings, which the build doesn't know.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => {
  requireFansPart('accounts', notFound)

  return pageMetadata('/fans', 'Fans')
}

// What each game does, in one sentence, for the card "Wat komt er". Fantest is not here: it is
// an archive of old quizzes, without an account, and comes with an issue of its own.
const coming = [
  { part: 'prognose', sentence: 'Voorspel de rust- en eindstand van de volgende wedstrijd.' },
  { part: 'uitblinker', sentence: 'Geef de spelers na elke wedstrijd een cijfer.' },
  { part: 'vier', sentence: 'Kies vier spelers die punten scoren.' },
] as const

/**
 * The page Fans, as long as no game exists: what is coming, and a card to make an account
 * already. The buttons Account maken and Inloggen come with the pages they lead to (#1446 and
 * #1448); until then the card says what you need and has no button. A game that is on has no
 * link yet either: its own issue gives it one.
 */
export default function FansPage() {
  requireFansPart('accounts', notFound)

  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Fans</Heading>
        <Text appearance="intro">
          Hier komen de spellen voor supporters: voorspel de uitslag, geef de spelers een cijfer en kies je eigen vier.
          Zonder prijzen en zonder reclame.
        </Text>
        <Card aria-labelledby="alvast-een-account" surface="strong">
          <Heading id="alvast-een-account" level={2}>
            Maak alvast een account
          </Heading>
          <Text>
            Dan ben je klaar als het eerste spel begint. Je hebt alleen een schermnaam en een e-mailadres nodig, geen
            wachtwoord. Alleen je schermnaam is voor anderen te zien.
          </Text>
        </Card>
        <Card aria-labelledby="wat-komt-er">
          <Heading id="wat-komt-er" level={2}>
            Wat komt er
          </Heading>
          <List role="list">
            {coming.map(({ part, sentence }) => {
              const game = fansGames.find((candidate) => candidate.part === part)

              return (
                <List.Item key={part}>
                  <Heading level={3}>{game?.label}</Heading>
                  <Text>{sentence}</Text>
                  {!isFansPartOn(part) && <Tag>komt eraan</Tag>}
                </List.Item>
              )
            })}
          </List>
        </Card>
      </Page.Cell>
    </Page.Main>
  )
}
