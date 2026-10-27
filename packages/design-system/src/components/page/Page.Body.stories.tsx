import preview from '#.storybook/preview'

import { ExampleContent, ExampleMain, ExampleMainWithIntro, ExampleSidebar } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Het raster van de pagina, tussen de header en de footer.',
          'Het is een `div` met een `Page.Main` en, als de pagina er een heeft, een `Page.Sidebar`.',
          '',
          '- Op een breed scherm staan de kolommen naast elkaar, op een smal scherm onder elkaar, de hoofdkolom eerst.',
          '- De `Page.Body` regelt alle witruimte: tussen de kolommen en tussen de cellen. Kolommen en cellen hebben zelf geen marge naar buiten.',
          '- Elke kolom stapelt haar eigen cellen. Een cel in de zijbalk staat dus niet op dezelfde hoogte als een cel in de hoofdkolom.',
          '- Heeft de `Page.Main` een `intro`, dan begint de zijbalk op een breed scherm onder die inleiding, op dezelfde hoogte als de eerste cel eronder. De inleiding is zo breed als de hoofdkolom.',
          '- Een pagina kan een bredere zijbalk kiezen, met `wide` op de `Page.Sidebar`. De hoofdkolom en de zijbalk zijn dan even breed, en samen net zo breed als zonder.',
          '- Het groeit mee met het scherm, zodat de footer onderaan blijft staan.',
        ].join('\n'),
      },
      source: exampleSource,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Page.Body',
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
      description: { story: 'Alleen een hoofdkolom, met de hele inhoud in één cel.' },
    },
  },
  render: onlyMain,
})

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render: onlyMain })

const sidebarDescription =
  'Een hoofdkolom met een zijbalk. De cellen van elke kolom staan los van die van de andere kolom.'

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

const withIntro = () => (
  <Page.Body>
    <ExampleMainWithIntro />
    <ExampleSidebar />
  </Page.Body>
)

// Only on the canvas, with Storybook's viewport setting: on the docs page they would show the
// same as the stories above, because the docs page can't resize the window. The window is what
// the breakpoint follows, so the story fills it.
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
    docs: { description: { story: 'Op een smal scherm staat de zijbalk onder de hoofdkolom.' } },
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
        story: 'Op een breed scherm staan de hoofdkolom en de zijbalk naast elkaar.',
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

export const WithIntroNarrowLight = meta.story({
  ...screens,
  globals: { theme: 'light', viewport: narrow },
  name: 'Met inleiding en zijbalk, smal scherm, licht',
  parameters: {
    ...screens.parameters,
    docs: { description: { story: 'Op een smal scherm staan de inleiding, de cellen en de zijbalk onder elkaar.' } },
  },
  render: withIntro,
})

export const WithIntroNarrowDark = meta.story({
  ...screens,
  globals: { theme: 'dark', viewport: narrow },
  name: 'Met inleiding en zijbalk, smal scherm, donker',
  render: withIntro,
})

export const WithIntroWideLight = meta.story({
  ...screens,
  globals: { theme: 'light', viewport: wide },
  name: 'Met inleiding en zijbalk, breed scherm, licht',
  parameters: {
    ...screens.parameters,
    docs: {
      description: {
        story:
          'Op een breed scherm begint de zijbalk onder de inleiding, op dezelfde hoogte als de eerste cel eronder. Naast de inleiding blijft de kolom van de zijbalk leeg.',
      },
    },
  },
  render: withIntro,
})

export const WithIntroWideDark = meta.story({
  ...screens,
  globals: { theme: 'dark', viewport: wide },
  name: 'Met inleiding en zijbalk, breed scherm, donker',
  render: withIntro,
})
