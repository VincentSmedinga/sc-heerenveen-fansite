import preview from '#.storybook/preview'

import {
  ExampleFooter,
  ExampleMain,
  ExampleMainWithSide,
  exampleMenu,
  exampleMenuWithSubpages,
} from '../../docs/ExamplePage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { Link } from '../link/Link'
import { Logo } from '../logo/Logo'
import { Navigation } from '../navigation/Navigation'
import { Text } from '../text/Text'
import { ThemeButton } from '../theme-button/ThemeButton'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Hoe je de onderdelen van een pagina samenstelt: `Page.Header`, het hoofdmenu (een `Navigation` met `appearance="header"`), eventueel een `Page.Shortcuts`, de `Page.Body` en de `Page.Footer`, in die volgorde.',
          'De volgorde in de code is ook die van het scherm en van de focus.',
          'Elk verhaal is een hele pagina, in een eigen venster dat de hoogte van het scherm nabootst; de code erbij laat de samenstelling zien.',
          'De onderdelen zelf staan bij Componenten › Pagina en Componenten › Navigatie.',
          '',
          '- **Gewone pagina:** header, hoofdmenu, een hoofdkolom en de footer.',
          '- **Met zijkolom:** een `Page.Main` met `areas`, en een `Page.Section` naast de hoofdinhoud.',
          '- **Met twee gelijke kolommen:** een `Page.Main` met `areas` en `columns="equal"`. Op een breed scherm staan de twee kolommen naast elkaar, even breed. Op een smal scherm staan alle kaarten onder elkaar, in de volgorde van de code.',
          '- **Met subpagina’s:** een onderdeel van het hoofdmenu met `subitems`. De balk met subpagina’s hoort bij het menu en staat in dezelfde `nav`.',
          '- **Met subpagina’s en ankers:** daaronder een `Page.Shortcuts` met links naar de kaarten van de pagina, voor een smal scherm. Alleen die balk plakt.',
          '',
          'Het verhaal met ankers is voor een smal scherm en staat alleen in het canvas; de andere breedtes kies je met de instelling Viewport van de werkbalk.',
          'Een pagina is gebouwd uit `Page`, `Navigation`, `Card`, `Heading` en `Text`.',
        ].join('\n'),
      },
      story: { iframeHeight: '30rem', inline: false },
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Patronen/Pagina',
})

type Globals = { globals: Record<string, unknown> }

const isDark = ({ globals }: Globals) => globals['theme'] === 'dark'

const renderPlain = (_args: unknown, context: Globals) => (
  <Page>
    <Page.Header>
      <Link href="#home">
        <Logo />
      </Link>
      <ThemeButton dark={isDark(context)} label="Donker" />
    </Page.Header>
    <Navigation appearance="header" items={exampleMenu} label="Hoofdmenu" />
    <Page.Body>
      <ExampleMain />
    </Page.Body>
    <ExampleFooter />
  </Page>
)

const renderWithSidebar = (_args: unknown, context: Globals) => (
  <Page>
    <Page.Header>
      <Link href="#home">
        <Logo />
      </Link>
      <ThemeButton dark={isDark(context)} label="Donker" />
    </Page.Header>
    <Navigation appearance="header" items={exampleMenu} label="Hoofdmenu" />
    <Page.Body>
      <ExampleMainWithSide />
    </Page.Body>
    <ExampleFooter />
  </Page>
)

const renderWithSubpages = (_args: unknown, context: Globals) => (
  <Page>
    <Page.Header>
      <Link href="#home">
        <Logo />
      </Link>
      <ThemeButton dark={isDark(context)} label="Donker" />
    </Page.Header>
    <Navigation appearance="header" items={exampleMenuWithSubpages('Uitslagen')} label="Hoofdmenu" />
    <Page.Body>
      <ExampleMain />
    </Page.Body>
    <ExampleFooter />
  </Page>
)

const sections = [
  { id: 'programma', title: 'Programma' },
  { id: 'uitslagen', title: 'Uitslagen' },
  { id: 'stand', title: 'Stand' },
]

const renderWithSubpagesAndShortcuts = (_args: unknown, context: Globals) => (
  <Page>
    <Page.Header>
      <Link href="#home">
        <Logo />
      </Link>
      <ThemeButton dark={isDark(context)} label="Donker" />
    </Page.Header>
    <Navigation appearance="header" items={exampleMenuWithSubpages('Programma')} label="Hoofdmenu" />
    <Page.Shortcuts
      items={sections.map(({ id, title }) => ({ href: `#${id}`, label: title }))}
      label="Op deze pagina:"
    />
    <Page.Body>
      <Page.Main>
        {sections.map(({ id, title }) => (
          <Page.Cell key={id}>
            <Heading anchor id={id} level={2}>
              {title}
            </Heading>
            <Text>Hier staat wat bij {title.toLowerCase()} hoort. De kaart is lang genoeg om langs te scrollen.</Text>
            <Text>
              Boven deze kaart staan twee balken. Als je scrolt, gaat het menu met de subpagina’s weg, en blijft alleen
              de balk met ankers staan.
            </Text>
            <Text>
              Een kaart kan lang zijn, zodat de kop van de volgende kaart pas na een tijd langs de balk komt. Tot dan
              blijft de link naar deze kaart de huidige.
            </Text>
          </Page.Cell>
        ))}
      </Page.Main>
    </Page.Body>
    <ExampleFooter topLink />
  </Page>
)

const equalColumns = {
  main: ['Onze plek in de competitie', 'Verloop van het seizoen', 'Reeksen'],
  sidebar: ['Doelpuntenmakers', 'Doelpunten per kwartier', 'Uitersten'],
}

const idOf = (title: string) => title.toLowerCase().replaceAll(' ', '-')

const EqualColumnsCard = ({ title }: { title: string }) => (
  <Card aria-labelledby={idOf(title)}>
    <Heading anchor id={idOf(title)} level={2}>
      {title}
    </Heading>
    <Text>Hier staat een kaart met cijfers. Elke kaart is een cel van zijn kolom.</Text>
  </Card>
)

const renderWithEqualColumns = (_args: unknown, context: Globals) => (
  <Page>
    <Page.Header>
      <Link href="#home">
        <Logo />
      </Link>
      <ThemeButton dark={isDark(context)} label="Donker" />
    </Page.Header>
    <Navigation appearance="header" items={exampleMenu} label="Hoofdmenu" />
    <Page.Shortcuts
      items={[...equalColumns.main, ...equalColumns.sidebar].map((title) => ({
        href: `#${idOf(title)}`,
        label: title,
      }))}
      label="Op deze pagina:"
    />
    <Page.Body>
      <Page.Main areas={{ narrow: ['head', 'first', 'second'], wide: ['head head', 'first second'] }} columns="equal">
        <Page.Cell area="head">
          <Heading level={1}>Cijfers</Heading>
        </Page.Cell>
        <Page.Section area="first" aria-label="Onze plek en het verloop">
          {equalColumns.main.map((title) => (
            <EqualColumnsCard key={title} title={title} />
          ))}
        </Page.Section>
        <Page.Section area="second" aria-label="Meer cijfers">
          {equalColumns.sidebar.map((title) => (
            <EqualColumnsCard key={title} title={title} />
          ))}
        </Page.Section>
      </Page.Main>
    </Page.Body>
    <ExampleFooter />
  </Page>
)

const phone = { tags: ['!autodocs'] }
const mobile = { theme: 'light', viewport: { value: 'mobile2' } }

export const Plain = meta.story({
  name: 'Gewone pagina',
  render: renderPlain,
})

export const WithSidebar = meta.story({
  name: 'Met zijbalk',
  render: renderWithSidebar,
})

export const WithEqualColumns = meta.story({
  name: 'Met twee gelijke kolommen',
  parameters: {
    docs: {
      description: {
        story:
          'Op een breed scherm staan de kaarten van de `Page.Main` links en die van de tweede sectie rechts, even breed. De kop staat boven beide kolommen. De balk met ankers verdwijnt waar de kolommen naast elkaar staan.',
      },
    },
  },
  render: renderWithEqualColumns,
})

export const WithSubpages = meta.story({
  name: 'Met subpagina’s',
  render: renderWithSubpages,
})

export const WithSubpagesAndShortcuts = meta.story({
  ...phone,
  globals: mobile,
  name: 'Met subpagina’s en ankers',
  render: renderWithSubpagesAndShortcuts,
})
