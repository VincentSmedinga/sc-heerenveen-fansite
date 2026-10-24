import type { Metadata } from 'next'

import { Heading, Link, List, Page, Text, Time } from '@fansite/design-system'

import { email } from '../../contact'
import { pageMetadata } from '../../metadata'
import { dateOf } from '../../whats-new'

// Render on each request: the canonical URL and the Open Graph address come from SITE_ENV, which the build doesn't know.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => pageMetadata('/toegankelijkheid', 'Toegankelijkheid')

// The day the statement was drawn up or last updated, as YYYY-MM-DD. Change it here whenever the text changes.
const statementDate = '2026-10-24'

// A short, voluntary statement that promises only what has been checked. When a person has checked the site (#25) or a
// problem turns up, this text changes with it, in the same pull request.
export default function AccessibilityPage() {
  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Toegankelijkheid</Heading>
        <Heading level={2}>Wat we beloven</Heading>
        <Text>
          We streven naar WCAG 2.2, niveau AA. Deze verklaring is vrijwillig. Bij elke wijziging controleert een
          programma elke pagina, in licht en donker. De sites waar onze koppen naartoe linken, de artikelen van de
          bronnen en het forum zijn niet van ons. Ze vallen niet onder deze verklaring.
        </Text>
        <Heading level={2}>Wat nog niet goed is</Heading>
        <Text>Een mens heeft dit nog niet nagekeken:</Text>
        <List>
          <List.Item>het toetsenbord en de focus;</List.Item>
          <List.Item>de schermlezer;</List.Item>
          <List.Item>inzoomen tot 400%;</List.Item>
          <List.Item>de afstand tussen tekst.</List.Item>
        </List>
        <Text>Zodra we een probleem vinden, zetten we het hier.</Text>
        <Heading level={2}>Hoe je ons bereikt</Heading>
        <Text>
          Heb je last van iets op de site? Mail naar <Link href={`mailto:${email}`}>{email}</Link>. Zeg erbij om welke
          pagina het gaat en welke browser of welk hulpmiddel je gebruikt. We pakken een melding zo snel mogelijk op.
        </Text>
        <Heading level={2}>Wanneer we het nakeken</Heading>
        <Text>
          We stelden deze verklaring op <Time dateTime={statementDate}>{dateOf({ date: statementDate })}</Time>. We
          werken haar bij zodra een mens de site heeft nagekeken of we een probleem vinden.
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}
