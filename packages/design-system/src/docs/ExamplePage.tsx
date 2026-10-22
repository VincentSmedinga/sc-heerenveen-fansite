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

/** The links in the footer of the example pages, to the page about the site and its privacy section. */
export const exampleFooterMenu = [
  { href: '#over-ons', label: 'Over ons' },
  { href: '#privacy', label: 'Privacy' },
]

/**
 * The footer with "Alle koppen en links op één plek. Voor supporters, door supporters.", and below it the links to Over
 * ons and Privacy, as on the site.
 */
export const ExampleFooter = () => (
  <Page.Footer>
    <Text appearance="meta">Alle koppen en links op één plek. Voor supporters, door supporters.</Text>
    <Navigation items={exampleFooterMenu} label="Over de site" />
  </Page.Footer>
)

/** Content for the body of an example page. */
export const ExampleContent = (): ReactNode => (
  <>
    <Heading level={1}>Nieuws over sc Heerenveen</Heading>
    <Text>
      Hier komen de koppen van de media die over de club schrijven. Elke kop is een link naar de journalist zelf, met de
      naam van de bron erbij.
    </Text>
    <Text>
      Op een breed scherm staat deze tekst in een smallere kolom dan de pagina: een regel telt er hoogstens 80 tekens.
      Rechts ervan blijft ruimte over, voor een zijbalk later.
    </Text>
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

/** A whole page, built from the components. */
export const ExamplePage = () => (
  <Page>
    <ExampleHeader />
    <Page.Body>
      <ExampleContent />
    </Page.Body>
    <ExampleFooter />
  </Page>
)
