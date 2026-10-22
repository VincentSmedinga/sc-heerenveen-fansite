import preview from '#.storybook/preview'

import { ExampleContent, ExampleMain, ExampleSidebar } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Het raster van de pagina, tussen de header en de footer.',
          'Het is altijd een `div` en heeft twee kolommen: de `Page.Main` en, op een pagina die er een heeft, de `Page.Sidebar`.',
          'Het groeit mee met de hoogte van het scherm, zodat de footer onderaan blijft staan.',
          '',
          'Op een breed scherm is de `Page.Main` hoogstens 36 rem breed en de `Page.Sidebar` 20 rem.',
          'Een regel lopende tekst telt in de hoofdkolom hoogstens 80 tekens, en een kop van een bericht ook.',
          'De breedte van de hoofdkolom komt uit het token `--hf-content-max-width`, gemeten in de lettertypes van de site.',
          'De kolommen beginnen in lijn met het logo, en de rest van de kolom van de pagina blijft leeg.',
          'De header en de footer lopen over de hele kolom van de pagina.',
          '',
          'De `Page.Body` regelt alle witruimte: tussen de kolommen, tussen de cellen in een kolom, en boven en onder de kolommen.',
          'Dat is overal even veel, 2 rem.',
          'Een cel en wat erin staat, hebben geen marge naar buiten.',
          'Elke kolom stapelt haar eigen cellen, elk zo hoog als zijn inhoud, dus los van de cellen in de andere kolom.',
          '',
          'Is het venster te smal voor beide kolommen naast elkaar, dan staan ze onder elkaar met dezelfde witruimte, de hoofdkolom eerst.',
          'Dat is onder de 60 rem: 36 rem en 20 rem voor de kolommen, 2 rem ertussen en een marge van 1 rem aan beide kanten.',
          'Beide kolommen zijn dan zo breed als de hoofdkolom.',
          'De volgorde in de HTML blijft die van de bron, op elke breedte: de hoofdkolom komt eerst, ook voor de lezer van een schermlezer en bij het tabben.',
          'Daarom is er geen `order` en kun je een zijbalk niet vóór de hoofdkolom zetten.',
          '',
          'Er is geen raster van 12 kolommen en geen `start` of `span` per cel.',
        ].join('\n'),
      },
      source: exampleSource,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Page.Body',
})

const onlyMain = () => (
  <Page.Body>
    <Page.Main>
      <Page.Cell>
        <ExampleContent />
      </Page.Cell>
    </Page.Main>
  </Page.Body>
)

const withSidebar = () => (
  <Page.Body>
    <ExampleMain />
    <ExampleSidebar />
  </Page.Body>
)

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Licht',
  parameters: {
    docs: {
      description: { story: "Alleen een hoofdkolom, zoals de pagina's van de site nu zijn. De cel is de hele inhoud." },
    },
  },
  render: onlyMain,
})

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render: onlyMain })

const sidebarDescription =
  'Een hoofdkolom met een zijbalk. De cellen in de zijbalk zijn hoger of lager dan die in de hoofdkolom, en elke kolom stapelt haar eigen cellen: er is geen ruimte om de cellen van de ene kolom op die van de andere te laten aansluiten.'

export const WithSidebarLight = meta.story({
  globals: { theme: 'light' },
  name: 'Met zijbalk, licht',
  parameters: { docs: { description: { story: sidebarDescription } } },
  render: withSidebar,
})

export const WithSidebarDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Met zijbalk, donker',
  render: withSidebar,
})

// Only on the canvas, with Storybook's viewport setting: on the docs page they would show the same as the stories above,
// because the docs page can't resize the window. The window is what the breakpoint follows, so the story fills it.
const screens = { parameters: { layout: 'fullscreen' as const }, tags: ['!autodocs'] }

const narrow = { value: 'mobile1' }
const wide = { value: 'wide' }

export const OnlyMainNarrowLight = meta.story({
  ...screens,
  globals: { theme: 'light', viewport: narrow },
  name: 'Alleen een hoofdkolom, smal scherm, licht',
  render: onlyMain,
})

export const OnlyMainNarrowDark = meta.story({
  ...screens,
  globals: { theme: 'dark', viewport: narrow },
  name: 'Alleen een hoofdkolom, smal scherm, donker',
  render: onlyMain,
})

export const OnlyMainWideLight = meta.story({
  ...screens,
  globals: { theme: 'light', viewport: wide },
  name: 'Alleen een hoofdkolom, breed scherm, licht',
  render: onlyMain,
})

export const OnlyMainWideDark = meta.story({
  ...screens,
  globals: { theme: 'dark', viewport: wide },
  name: 'Alleen een hoofdkolom, breed scherm, donker',
  render: onlyMain,
})

export const WithSidebarNarrowLight = meta.story({
  ...screens,
  globals: { theme: 'light', viewport: narrow },
  name: 'Met zijbalk, smal scherm, licht',
  parameters: {
    ...screens.parameters,
    docs: { description: { story: 'Op een smal scherm staat de zijbalk onder de hoofdkolom, over de hele breedte.' } },
  },
  render: withSidebar,
})

export const WithSidebarNarrowDark = meta.story({
  ...screens,
  globals: { theme: 'dark', viewport: narrow },
  name: 'Met zijbalk, smal scherm, donker',
  render: withSidebar,
})

export const WithSidebarWideLight = meta.story({
  ...screens,
  globals: { theme: 'light', viewport: wide },
  name: 'Met zijbalk, breed scherm, licht',
  parameters: {
    ...screens.parameters,
    docs: {
      description: {
        story: 'Op een breed scherm staan de hoofdkolom en de zijbalk naast elkaar, in lijn met het logo.',
      },
    },
  },
  render: withSidebar,
})

export const WithSidebarWideDark = meta.story({
  ...screens,
  globals: { theme: 'dark', viewport: wide },
  name: 'Met zijbalk, breed scherm, donker',
  render: withSidebar,
})
