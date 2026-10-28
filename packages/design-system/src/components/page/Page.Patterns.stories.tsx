import preview from '#.storybook/preview'

import {
  ExampleFooter,
  ExampleMain,
  exampleMenu,
  exampleMenuWithSubpages,
  ExampleSidebar,
} from '../../docs/ExamplePage'
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
          '- **Met zijbalk:** een `Page.Sidebar` naast de hoofdkolom in de `Page.Body`.',
          '- **Met subpagina’s:** een onderdeel van het hoofdmenu met `subitems`. De balk met subpagina’s hoort bij het menu en staat in dezelfde `nav`.',
          '- **Met subpagina’s en ankers:** daaronder een `Page.Shortcuts` met links naar de kaarten van de pagina, voor een smal scherm. Alleen die balk plakt.',
          '',
          'De verhalen voor een smal scherm staan alleen in het canvas, met de instelling Viewport van de werkbalk.',
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
      <ExampleMain />
      <ExampleSidebar />
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

const phone = { tags: ['!autodocs'] }
const mobile = { theme: 'light', viewport: { value: 'mobile2' } }

export const PlainLight = meta.story({
  globals: { theme: 'light' },
  name: 'Gewone pagina, licht',
  render: renderPlain,
})

export const PlainDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Gewone pagina, donker',
  render: renderPlain,
})

export const WithSidebarLight = meta.story({
  globals: { theme: 'light' },
  name: 'Met zijbalk, licht',
  render: renderWithSidebar,
})

export const WithSidebarDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Met zijbalk, donker',
  render: renderWithSidebar,
})

export const WithSubpagesLight = meta.story({
  globals: { theme: 'light' },
  name: 'Met subpagina’s, licht',
  render: renderWithSubpages,
})

export const WithSubpagesDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Met subpagina’s, donker',
  render: renderWithSubpages,
})

export const WithSubpagesAndShortcuts = meta.story({
  ...phone,
  globals: mobile,
  name: 'Met subpagina’s en ankers, telefoon',
  render: renderWithSubpagesAndShortcuts,
})

export const WithSubpagesAndShortcutsDark = meta.story({
  ...phone,
  globals: { ...mobile, theme: 'dark' },
  name: 'Met subpagina’s en ankers, telefoon, donker',
  render: renderWithSubpagesAndShortcuts,
})

// The page scrolls to a heading, as after a click on its link: only the anchors are left.
export const WithSubpagesAndShortcutsScrolled = meta.story({
  ...phone,
  globals: mobile,
  name: 'Met subpagina’s en ankers, gescrold',
  parameters: {
    docs: {
      description: {
        story:
          'De pagina is tot de kop van Stand gescrold. Het menu met de subpagina’s is weg, de balk met ankers blijft, en de kop komt er niet onder.',
      },
    },
  },
  play: () => {
    document.getElementById('stand')?.scrollIntoView({ behavior: 'instant', block: 'start' })
  },
  render: renderWithSubpagesAndShortcuts,
})
