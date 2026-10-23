import type { ReactNode } from 'react'

import { Heading } from '../components/heading/Heading'
import { Link } from '../components/link/Link'
import { List } from '../components/list/List'
import { Logo } from '../components/logo/Logo'
import { Navigation } from '../components/navigation/Navigation'
import { Page } from '../components/page/Page'
import { Text } from '../components/text/Text'

/** The menu of the example pages in the docs. */
export const exampleMenu = [
  { current: true, href: '#nieuws', label: 'Nieuws' },
  { href: '#forum', label: 'Forum' },
  { href: '#wedstrijden', label: 'Wedstrijden' },
  { href: '#over', label: 'Over de site' },
]

/** The logo as a link to the home page, with the menu beside it. This is what a header holds. */
export const ExampleHeader = () => (
  <Page.Header>
    <Link href="#home">
      <Logo />
    </Link>
    <Navigation items={exampleMenu} label="Hoofdmenu" />
  </Page.Header>
)

/** The links about the site itself, in the footer of the example pages, as on the site. */
export const exampleFooterMenu = [
  { href: '#over-ons', label: 'Over ons' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#wat-is-er-nieuw', label: 'Wat is er nieuw' },
]

/**
 * The footer with "Alle koppen en links op één plek." and "Voor supporters, door supporters.", a paragraph each, and the
 * links about the site, as on the site.
 */
export const ExampleFooter = () => (
  <Page.Footer>
    <Text appearance="meta">Alle koppen en links op één plek.</Text>
    <Text appearance="meta">Voor supporters, door supporters.</Text>
    <Navigation items={exampleFooterMenu} label="Over de site" />
  </Page.Footer>
)

/** Content for the main column of an example page, as the pages of the site have it: all in one cell. */
export const ExampleContent = (): ReactNode => (
  <>
    <Heading level={1}>Nieuws over sc Heerenveen</Heading>
    <Text>
      Hier komen de koppen van de media die over de club schrijven. Elke kop is een link naar de journalist zelf, met de
      naam van de bron erbij.
    </Text>
    <Text>Op een breed scherm staat deze tekst in de hoofdkolom. Rechts ervan is plaats voor een zijbalk.</Text>
    <Heading appearance={3} level={2}>
      Zo lees je de site
    </Heading>
    <List>
      <List.Item>Kies een kop om naar het bericht bij de bron te gaan.</List.Item>
      <List.Item>
        Meer over wat we tonen staat bij <Link href="#over">Over de site</Link>.
      </List.Item>
    </List>
  </>
)

/** The main column with three cells: a heading with its introduction in one cell, a text, and a list under a heading. */
export const ExampleMain = () => (
  <Page.Main>
    <Page.Cell>
      <Heading level={1}>Nieuws over sc Heerenveen</Heading>
      <Text>
        Hier komen de koppen van de media die over de club schrijven. Elke kop is een link naar de journalist zelf, met
        de naam van de bron erbij.
      </Text>
    </Page.Cell>
    <Text>
      Op een breed scherm staat deze kolom naast de zijbalk. Op een smal scherm staat de zijbalk eronder, over de hele
      breedte.
    </Text>
    <Page.Cell>
      <Heading appearance={3} level={2}>
        Zo lees je de site
      </Heading>
      <List>
        <List.Item>Kies een kop om naar het bericht bij de bron te gaan.</List.Item>
        <List.Item>
          Meer over wat we tonen staat bij <Link href="#over">Over de site</Link>.
        </List.Item>
      </List>
    </Page.Cell>
  </Page.Main>
)

/** The sidebar with two cells of different heights. They stack on their own, not on the rows of the main column. */
export const ExampleSidebar = () => (
  <Page.Sidebar aria-label="Naast het nieuws">
    <Page.Cell>
      <Heading appearance={3} level={2}>
        Volgende wedstrijd
      </Heading>
      <Text appearance="meta">Hier komt een blok met de volgende wedstrijd.</Text>
    </Page.Cell>
    <Page.Cell>
      <Heading appearance={3} level={2}>
        Nieuwste discussies
      </Heading>
      <List>
        <List.Item>Hier komt een lijst uit het forum.</List.Item>
        <List.Item>Met een paar onderwerpen onder elkaar.</List.Item>
        <List.Item>Zodat deze cel hoger is dan de cel erboven.</List.Item>
        <List.Item>En hoger of lager dan de cellen in de hoofdkolom.</List.Item>
      </List>
    </Page.Cell>
  </Page.Sidebar>
)

/** A whole page, built from the components. */
export const ExamplePage = () => (
  <Page>
    <ExampleHeader />
    <Page.Body>
      <Page.Main>
        <Page.Cell>
          <ExampleContent />
        </Page.Cell>
      </Page.Main>
    </Page.Body>
    <ExampleFooter />
  </Page>
)

/** A whole page with a sidebar beside the main column. */
export const ExamplePageWithSidebar = () => (
  <Page>
    <ExampleHeader />
    <Page.Body>
      <ExampleMain />
      <ExampleSidebar />
    </Page.Body>
    <ExampleFooter />
  </Page>
)
