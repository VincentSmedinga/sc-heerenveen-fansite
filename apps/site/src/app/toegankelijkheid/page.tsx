import type { Metadata } from 'next'

import { Heading, Link, Page, Text, Time } from '@fansite/design-system'

import { email } from '../../contact'
import { pageMetadata } from '../../metadata'
import { dateOf } from '../../whats-new'

// Render on each request: the canonical URL and the Open Graph address come from SITE_ENV, which the build doesn't know.
export const dynamic = 'force-dynamic'

export const generateMetadata = (): Metadata => pageMetadata('/toegankelijkheid', 'Toegankelijkheid')

// The day the statement was drawn up or last updated, as YYYY-MM-DD. Change it here whenever the text changes.
const statementDate = '2026-10-24'

// A short statement that promises only what has been checked. When what we check or find changes, this text
// changes with it, in the same pull request.
export default function AccessibilityPage() {
  return (
    <Page.Main>
      <Page.Cell>
        <Heading level={1}>Toegankelijkheid</Heading>
        <Heading level={2}>Wat we beloven</Heading>
        <Text appearance="intro">
          We streven naar WCAG 2.2, niveau AA. De sites waar onze koppen naartoe linken, de artikelen van de bronnen en
          het forum zijn niet van ons. Ze vallen niet onder deze verklaring.
        </Text>
        <Heading level={2}>Wat we al doen</Heading>
        <Text>
          We vinden toegankelijkheid belangrijk. Alles wat we toevoegen, maken we vanaf het begin toegankelijk. Een
          programma controleert elke pagina, in licht en donker. We lopen een checklist langs, en een mens heeft de site
          nagekeken. Lopende tekst haalt een contrast van 7:1, je ziet altijd waar de focus staat en knoppen zijn
          minstens 44 pixels hoog. De pagina's lopen door zonder zijwaarts scrollen, ook op 320 pixels breed.
        </Text>
        <Heading level={2}>Hoe je ons bereikt</Heading>
        <Text>
          Heb je last van iets op de site? Mail naar <Link href={`mailto:${email}`}>{email}</Link>. Zeg erbij om welke
          pagina het gaat en welke browser of welk hulpmiddel je gebruikt. We pakken een melding zo snel mogelijk op.
        </Text>
        <Heading level={2}>Wanneer we het nakeken</Heading>
        <Text>
          We stelden deze verklaring op <Time dateTime={statementDate}>{dateOf({ date: statementDate })}</Time>. We
          werken haar bij als er iets verandert.
        </Text>
      </Page.Cell>
    </Page.Main>
  )
}
