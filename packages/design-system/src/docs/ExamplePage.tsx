import type { ReactNode } from 'react'

import { Heading } from '../components/heading/Heading'
import { Link } from '../components/link/Link'
import { List } from '../components/list/List'
import { Logo } from '../components/logo/Logo'
import { Navigation } from '../components/navigation/Navigation'
import { Page } from '../components/page/Page'
import { PageBody } from '../components/page/PageBody'
import { PageFooter } from '../components/page/PageFooter'
import { PageHeader } from '../components/page/PageHeader'
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
  <PageHeader>
    <Link href="#home">
      <Logo />
    </Link>
    <Navigation items={exampleMenu} label="Hoofdmenu" />
  </PageHeader>
)

/** The footer with the sentence that the Fansite is not part of the club. */
export const ExampleFooter = () => (
  <PageFooter>
    <Text appearance="meta">De sc Heerenveen Fansite is geen officieel onderdeel van sc Heerenveen.</Text>
  </PageFooter>
)

/** Content for the body of an example page. */
export const ExampleContent = (): ReactNode => (
  <>
    <Heading level={1}>Nieuws over sc Heerenveen</Heading>
    <Text>
      Hier komen de koppen van de media die over de club schrijven. Elke kop is een link naar de journalist zelf, met de
      naam van de bron erbij.
    </Text>
    <Heading appearance={3} level={2}>
      Zo lees je de site
    </Heading>
    <List>
      <li>Kies een kop om naar het bericht bij de bron te gaan.</li>
      <li>
        Meer over wat we tonen staat bij <Link href="#over">Over de site</Link>.
      </li>
    </List>
  </>
)

/** A whole page, built from the components. */
export const ExamplePage = () => (
  <Page>
    <ExampleHeader />
    <PageBody>
      <ExampleContent />
    </PageBody>
    <ExampleFooter />
  </Page>
)
