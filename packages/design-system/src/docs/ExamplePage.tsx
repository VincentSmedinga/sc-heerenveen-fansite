import type { ReactNode } from 'react'

import { Heading } from '../components/heading/Heading'
import { Link } from '../components/link/Link'
import { List } from '../components/list/List'
import { Logo } from '../components/logo/Logo'
import { Navigation, type NavigationItem } from '../components/navigation/Navigation'
import { Page } from '../components/page/Page'
import { Text } from '../components/text/Text'
import { ThemeButton } from '../components/theme-button/ThemeButton'

const menuItems = [
  { href: '#nieuws', label: 'Nieuws' },
  { external: true, href: '#forum', label: 'Forum' },
] as const

export type ExampleMenuPage = (typeof menuItems)[number]['label']

/** The main menu of the site, with one of its pages as the current page. */
export const exampleMenuAt = (current: ExampleMenuPage) =>
  menuItems.map((item) => ({ ...item, current: item.label === current }))

/** The menu of the example pages in the docs: the news is the current page. */
export const exampleMenu = exampleMenuAt('Nieuws')

/**
 * The logo as a link to the home page, the theme button beside it (here a static one, pressed
 * when `dark`) in the Page.Header, and the main menu right after it, on the same blue. This is
 * what the top of a page holds.
 */
export const ExampleHeader = ({
  current = 'Nieuws',
  dark = false,
  menu,
}: {
  current?: ExampleMenuPage
  dark?: boolean
  /** Another menu than the one of the example pages, such as one with sub-pages. */
  menu?: readonly NavigationItem[]
}) => (
  <>
    <Page.Header>
      <Link href="#home">
        <Logo />
      </Link>
      <ThemeButton dark={dark} label="Donker" />
    </Page.Header>
    <Navigation appearance="header" items={menu ?? exampleMenuAt(current)} label="Hoofdmenu" />
  </>
)

/** The links about the site itself, in the footer of the example pages, as on the site. */
export const exampleFooterMenu = [
  { href: '#over-ons', label: 'Over ons' },
  { href: '#contact', label: 'Contact' },
  { href: '#bronnen', label: 'Bronnen' },
  { href: '#privacy', label: 'Privacy' },
  { href: '#toegankelijkheid', label: 'Toegankelijkheid' },
  { href: '#updates', label: 'Updates' },
]

/**
 * The footer with "Alles over onze club op één plek." and "Voor supporters door supporters.", a
 * paragraph each, and the links about the site, as on the site.
 */
export const ExampleFooter = () => (
  <Page.Footer>
    <Text appearance="meta">Alles over onze club op één plek.</Text>
    <Text appearance="meta">Voor supporters door supporters.</Text>
    <Navigation items={exampleFooterMenu} label="Over de site" />
  </Page.Footer>
)

/**
 * Content for the main column of an example page, as the pages of the site have it: all in one
 * cell.
 */
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
        Meer over wat we tonen staat bij <Link href="#over-ons">Over ons</Link>.
      </List.Item>
    </List>
  </>
)

/**
 * The main column with three cells: a heading with its introduction in one cell, a text, and a
 * list under a heading.
 */
export const ExampleMain = () => (
  <Page.Main>
    <Page.Cell>
      <Heading level={1}>Nieuws over sc Heerenveen</Heading>
      <Text>
        Hier komen de koppen van de media die over de club schrijven. Elke kop is een link naar de journalist zelf, met
        de naam van de bron erbij.
      </Text>
    </Page.Cell>
    <Text>Op een breed scherm staat deze kolom naast de zijbalk. Op een smaller scherm staat de zijbalk eronder.</Text>
    <Page.Cell>
      <Heading appearance={3} level={2}>
        Zo lees je de site
      </Heading>
      <List>
        <List.Item>Kies een kop om naar het bericht bij de bron te gaan.</List.Item>
        <List.Item>
          Meer over wat we tonen staat bij <Link href="#over-ons">Over ons</Link>.
        </List.Item>
      </List>
    </Page.Cell>
  </Page.Main>
)

/**
 * The main column with an introduction: the heading with its text is the `intro`, and a text
 * and a list under a heading are the cells under it. On a wide screen a sidebar starts under
 * the intro, level with the first cell.
 */
export const ExampleMainWithIntro = () => (
  <Page.Main
    intro={
      <>
        <Heading level={1}>Nieuws over sc Heerenveen</Heading>
        <Text>
          Hier komen de koppen van de media die over de club schrijven. Elke kop is een link naar de journalist zelf,
          met de naam van de bron erbij.
        </Text>
      </>
    }
  >
    <Text>
      Op een breed scherm begint de zijbalk onder de inleiding, op dezelfde hoogte als deze tekst. Op een smaller scherm
      staan de inleiding, deze cellen en de zijbalk onder elkaar.
    </Text>
    <Page.Cell>
      <Heading appearance={3} level={2}>
        Zo lees je de site
      </Heading>
      <List>
        <List.Item>Kies een kop om naar het bericht bij de bron te gaan.</List.Item>
        <List.Item>
          Meer over wat we tonen staat bij <Link href="#over-ons">Over ons</Link>.
        </List.Item>
      </List>
    </Page.Cell>
  </Page.Main>
)

/**
 * The sidebar with two cells of different heights. They stack on their own, not on the rows of
 * the main column. With `wide` it is the wide sidebar, and with `split` the cells sit side by
 * side where two fit.
 */
export const ExampleSidebar = ({ split = false, wide = false }: { split?: boolean; wide?: boolean }) => (
  <Page.Sidebar aria-label="Naast het nieuws" split={split} wide={wide}>
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
