import type { Metadata } from 'next'

import { Button, Card, CardColumns, Form, Heading, Link, List, Notice, Page, Tag, Text } from '@fansite/design-system'
import { isFansPartOn, requireFansPart } from '@fansite/shared/fans-env'
import { notFound } from 'next/navigation'

import { fansGames, fansPath, rulesPath } from '#src/fans-paths'
import { logInPaths } from '#src/fans/log-in'
import { currentSupporter } from '#src/fans/require-supporter'
import { pageMetadata } from '#src/metadata'

import { GameCard } from './GameCard'
import { LogInCard } from './inloggen/LogInCard'
import { readFantestCard, readFjouwerCard, readPrognoseCard } from './read-game-cards'
import { readUitblinkerCard } from './uitblinker-card'

// Render on each request: the canonical URL comes from SITE_ENV and the parts of Fans from
// their own settings, which the build doesn't know.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => {
  requireFansPart('accounts', notFound)

  return pageMetadata('/fans', 'Fans')
}

// What each game does, in one sentence, for the card "Wat komt er", which stands only while no
// game is on. Fantest is not in that list.
const coming = [
  { part: 'prognose', sentence: 'Voorspel de rust- en eindstand van de volgende wedstrijd.' },
  { part: 'uitblinker', sentence: 'Geef de spelers en de trainer na elke wedstrijd een cijfer.' },
  { part: 'vier', sentence: 'Kies vier spelers die punten scoren.' },
] as const

// The games in the order of their cards, each with the words of the intro and the reader.
const games = [
  { invitation: 'voorspel de uitslag', part: 'prognose', read: readPrognoseCard },
  { invitation: 'geef de spelers een cijfer', part: 'uitblinker', read: readUitblinkerCard },
  { invitation: 'kies de vier die jij opstelt', part: 'vier', read: readFjouwerCard },
  { invitation: 'doe de Fantest', part: 'fantest', read: readFantestCard },
] as const

/** "Voorspel de uitslag, geef de spelers een cijfer en doe de Fantest." */
function introOf(invitations: readonly string[]) {
  const last = invitations.at(-1) ?? ''
  const first = invitations.slice(0, -1)
  const text = first.length === 0 ? last : `${first.join(', ')} en ${last}`

  return `${text.charAt(0).toUpperCase()}${text.slice(1)}.`
}

/** How long after making the account the welcome can still show. */
const welcomeMinutes = 10

/** Whether the account was made a moment ago: the welcome is for the first visit after it. */
const justCreated = (createdAt: Date) => Date.now() - createdAt.getTime() < welcomeMinutes * 60 * 1000

/**
 * The page Fans, the start of the chapter (issue 1646). While a game is on it shows a card for
 * each game that is on, with what is going on and, for a supporter who is logged in, what is
 * theirs. While no game is on it says what is coming. A visitor without a session first gets
 * the way in: the card with the form to log in (#1660), or, while no game is on, a card to make
 * an account with buttons to the sign-up (#1446) and to logging in (#1448). A supporter who is
 * logged in gets one line of small text with the screen name of the session and a link to Mijn
 * account. After logging out (`?uitgelogd=1`) a Notice says so. After confirming a new account
 * (`?welkom=1`) another welcomes the supporter by the screen name of the session, and only in
 * the minutes after the account was made, so the address of the page doesn't show it again
 * later. The page never comes in a cache.
 */
export default async function FansPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>
}) {
  requireFansPart('accounts', notFound)

  // A visit of a supporter who is logged in counts: the session stays open another 90 days, and
  // the account keeps the day of the visit. The session also decides what the page shows: the
  // way in for a visitor, the line with the screen name for a supporter, and what is theirs on
  // the cards.
  const supporter = await currentSupporter()

  const { uitgelogd, welkom } = await searchParams
  const on = games.filter(({ part }) => isFansPartOn(part))
  const cards = (await Promise.all(on.map(({ read }) => read(supporter)))).filter((card) => card !== undefined)

  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Fans</Heading>
        <Text appearance="intro">
          {on.length === 0
            ? 'Hier komen de spellen voor fans: voorspel de uitslag, geef de spelers een cijfer en kies je eigen vier. Zonder prijzen en zonder reclame.'
            : introOf(on.map(({ invitation }) => invitation))}
        </Text>
        {uitgelogd === '1' ? <Notice>Je bent uitgelogd.</Notice> : null}
        {welkom === '1' && supporter !== undefined && justCreated(supporter.createdAt) ? (
          <Notice>Welkom, {supporter.screenName}. Je account is klaar en je blijft op dit apparaat ingelogd.</Notice>
        ) : null}
        {supporter !== undefined ? (
          <Text appearance="meta">
            Je bent ingelogd als {supporter.screenName}. <Link href={`${fansPath}/mijn-account`}>Mijn account</Link>
          </Text>
        ) : on.length > 0 ? (
          <LogInCard
            level={2}
            message="Log in om mee te doen. Alleen je schermnaam is voor anderen te zien."
            returnTo={logInPaths.home}
          />
        ) : (
          <Card aria-labelledby="doe-mee" surface="strong">
            <Heading id="doe-mee" level={2}>
              Maak alvast een account
            </Heading>
            <Text>
              Dan ben je klaar als het eerste spel begint. Je hebt alleen een schermnaam en een e-mailadres nodig, geen
              wachtwoord. Alleen je schermnaam is voor anderen te zien.
            </Text>
            {/* A form that only goes to the page: the design system has no link button. */}
            <Form action={`${fansPath}/aanmelden`}>
              <Button type="submit">Account maken</Button>
            </Form>
            <Form action={`${fansPath}/inloggen`}>
              <Button appearance="soft" type="submit">
                Inloggen
              </Button>
            </Form>
          </Card>
        )}
        {cards.length === 0 ? null : (
          <CardColumns>
            {cards.map((card) => (
              <GameCard key={card.game} {...card} />
            ))}
          </CardColumns>
        )}
        {on.length === 0 ? (
          <Card aria-labelledby="wat-komt-er">
            <Heading id="wat-komt-er" level={2}>
              Wat komt er
            </Heading>
            <List role="list">
              {coming.map(({ part, sentence }) => (
                <List.Item key={part}>
                  <Heading level={3}>{fansGames.find((game) => game.part === part)?.label}</Heading>
                  <Text>{sentence}</Text>
                  <Tag>komt eraan</Tag>
                </List.Item>
              ))}
            </List>
          </Card>
        ) : null}
        <Text appearance="meta">
          <Link href={rulesPath}>Spelregels van alle spellen</Link> ·{' '}
          <Link href="/privacy#account">Wat we bewaren als je een account hebt</Link>
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}
