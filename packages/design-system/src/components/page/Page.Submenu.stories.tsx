import preview from '#.storybook/preview'

import { ExampleHeader, ExampleMain } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een balk direct onder het hoofdmenu met de subpagina’s van een onderdeel van de site, zoals Programma, Uitslagen en Stand bij Wedstrijden.',
          'Hij heeft een tint van de header, zodat je ziet dat hij bij het menu hoort, en geen zichtbaar label: de pagina noemt het onderdeel al in het menu en in de titel.',
          'Het `label` is de naam voor schermlezers.',
          'Zet de balk tussen de `Page.Header` en de `Page.Shortcuts` of de `Page.Body`, buiten de `main`.',
          'Een pagina met subpagina’s en met ankers geeft elke balk een eigen naam.',
          '',
          '- `items` is de lijst met links: een `href`, een `label` en `current` voor de pagina waar de bezoeker is.',
          '- De huidige pagina is vetter en heeft de rode streep van het menu, dus niet alleen een andere kleur.',
          '- De balk is er op elke breedte en plakt niet. Alleen de balk met ankers plakt.',
          '- Een lange rij scrolt zijwaarts en begint zo gescrold dat de huidige pagina in beeld is.',
          '',
          'De letters zijn lichter dan die van het menu erboven: het menu is vet, de balk gewoon, zodat het niveau te zien is, ook als de maten bijna gelijk zijn.',
        ].join('\n'),
      },
      source: exampleSource,
    },
    layout: 'fullscreen',
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Page.Submenu',
})

const menu = [
  { href: '#nieuws', label: 'Nieuws' },
  { current: true, href: '#wedstrijden', label: 'Wedstrijden' },
  { external: true, href: '#forum', label: 'Forum' },
]

const pages = [
  { href: '#programma', label: 'Programma' },
  { href: '#uitslagen', label: 'Uitslagen' },
  { href: '#stand', label: 'Stand' },
  { href: '#doelpuntenmakers', label: 'Doelpuntenmakers' },
  { href: '#de-nul-gehouden', label: 'De nul gehouden' },
  { href: '#doelpunten-per-kwartier', label: 'Doelpunten per kwartier' },
]

const withCurrent = (items: readonly { href: string; label: string }[], current: string) =>
  items.map((item) => ({ ...item, current: item.label === current }))

const renderWith =
  (items: readonly { current?: boolean; href: string; label: string }[]) =>
  (_args: unknown, { globals }: { globals: Record<string, unknown> }) => (
    <>
      <ExampleHeader dark={globals['theme'] === 'dark'} menu={menu} />
      <Page.Submenu items={items} label="Wedstrijden" />
      <Page.Body>
        <ExampleMain />
      </Page.Body>
    </>
  )

const render = renderWith(withCurrent(pages.slice(0, 3), 'Programma'))

// Only on the canvas, with Storybook's viewport setting: on the docs page they would show the
// same as the stories above.
const phone = { tags: ['!autodocs'] }

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Licht',
  parameters: {
    docs: {
      description: {
        story:
          'De balk onder het hoofdmenu. De huidige pagina, Programma, is vet met een rode streep; het menu erboven is vet, en Wedstrijden is er nog vetter.',
      },
    },
  },
  render,
})

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

export const Scrolls = meta.story({
  ...phone,
  globals: { theme: 'light', viewport: { value: 'mobile2' } },
  name: 'Zes links: de rij scrolt',
  parameters: {
    docs: {
      description: {
        story:
          'Zes subpagina’s passen niet op een telefoon. De rij scrolt zijwaarts, zonder schuifbalk, met een vervaging aan de rand. De huidige pagina, Doelpuntenmakers, staat in beeld.',
      },
    },
  },
  render: renderWith(withCurrent(pages, 'Doelpuntenmakers')),
})

export const Wrapped = meta.story({
  ...phone,
  globals: { theme: 'light', viewport: { value: 'mobile1' } },
  name: 'Smal scherm: de rij loopt om',
  parameters: {
    docs: {
      description: {
        story:
          'Op een heel smal scherm, of bij sterk inzoomen, scrolt de rij niet meer maar loopt om. Zo scrolt de pagina niet zijwaarts.',
      },
    },
  },
  render: renderWith(withCurrent(pages, 'Stand')),
})

const statesParameters = {
  docs: {
    description: {
      story:
        'De toestanden van een link, nagebootst met de add-on Pseudo States: de eerste onder de muis, de tweede ingedrukt, de derde met de focus. De huidige pagina behoudt zijn streep onder de muis.',
    },
  },
  pseudo: {
    active: ['.hf-page-submenu li:nth-child(2) a'],
    focusVisible: ['.hf-page-submenu li:nth-child(3) a'],
    hover: ['.hf-page-submenu li:nth-child(1) a'],
  },
}

export const StatesLight = meta.story({
  globals: { theme: 'light' },
  name: 'Toestanden',
  parameters: statesParameters,
  render,
})

export const StatesDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Toestanden, donker',
  parameters: statesParameters,
  render,
})

const sections = [
  { id: 'programma', title: 'Programma' },
  { id: 'uitslagen', title: 'Uitslagen' },
  { id: 'stand', title: 'Stand' },
]

const threeBarsParameters = {
  docs: {
    description: {
      story:
        'Een pagina met subpagina’s en ankers heeft drie balken: de header met het menu, de subpagina’s en de ankers. Alleen de balk met ankers plakt.',
    },
  },
}

const renderThreeBars = (_args: unknown, { globals }: { globals: Record<string, unknown> }) => (
  <>
    <ExampleHeader dark={globals['theme'] === 'dark'} menu={menu} />
    <Page.Submenu items={withCurrent(pages, 'Programma')} label="Wedstrijden" />
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
              Boven deze kaart staan drie balken. Als je scrolt, gaan de header en de subpagina’s weg, en blijft alleen
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
  </>
)

export const ThreeBars = meta.story({
  ...phone,
  globals: { theme: 'light', viewport: { value: 'mobile2' } },
  name: 'Drie balken',
  parameters: threeBarsParameters,
  render: renderThreeBars,
})

export const ThreeBarsDark = meta.story({
  ...phone,
  globals: { theme: 'dark', viewport: { value: 'mobile2' } },
  name: 'Drie balken, donker',
  parameters: threeBarsParameters,
  render: renderThreeBars,
})

// The page scrolls to a heading, as after a click on its link: only the anchors are left.
const scrollToStand = () => {
  document.getElementById('stand')?.scrollIntoView({ behavior: 'instant', block: 'start' })
}

export const ThreeBarsScrolled = meta.story({
  ...phone,
  globals: { theme: 'light', viewport: { value: 'mobile2' } },
  name: 'Drie balken, gescrold',
  parameters: {
    docs: {
      description: {
        story:
          'De pagina is tot de kop van Stand gescrold. De header en de subpagina’s zijn weg, de balk met ankers blijft, en de kop komt er niet onder.',
      },
    },
  },
  play: scrollToStand,
  render: renderThreeBars,
})
