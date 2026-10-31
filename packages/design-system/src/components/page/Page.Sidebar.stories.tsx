import preview from '#.storybook/preview'

import { ExampleMain, ExampleSidebar } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De zijbalk van de pagina: een `aside`.',
          'Een pagina zonder zijbalk laat hem weg.',
          '',
          '- Hij staat in de `Page.Body`, na de `Page.Main`.',
          '- Op een breed scherm staat hij naast de hoofdkolom, op een smal scherm eronder.',
          '- Net als de hoofdkolom bestaat hij uit cellen die onder elkaar staan, op elk scherm, ook onder de hoofdkolom.',
          '- Met `split` staan de cellen naast elkaar, in twee kolommen, zodra er twee passen. Dat is onder de hoofdkolom op een middelbaar scherm. Kies het voor een zijbalk met kleine cellen, zoals een paar korte kaarten. Cellen met een lijst worden er smal en krap van.',
          '- Geef hem een naam met `aria-label` of `aria-labelledby`.',
          '- Met `wide` is hij even breed als de hoofdkolom, voor een zijbalk met een tabel, of om twee even brede kolommen met kaarten te maken. De hoofdkolom wordt er smaller van, zodat samen de kolommen even breed blijven als zonder. De `Page.Body` hoef je er niets voor te geven: de zijbalk zegt het zelf.',
          "- Met `narrow` is hij smaller dan op andere pagina's en is de hoofdkolom breder. Kies het voor een zijbalk met iets kleins, zoals een filter, naast een lange lijst. Samen blijven de kolommen even breed als zonder. Kies er niet `wide` bij.",
        ].join('\n'),
      },
      source: exampleSource,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Page.Sidebar',
})

const render = () => (
  <Page.Body>
    <ExampleMain />
    <ExampleSidebar />
  </Page.Body>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

// Only on the canvas, with Storybook's viewport setting: the breakpoints follow the window, and
// the docs page can't resize it.
const middle = {
  globals: { viewport: { value: 'tablet' } },
  parameters: { layout: 'fullscreen' as const },
  tags: ['!autodocs'],
}

export const MiddleLight = meta.story({
  ...middle,
  globals: { theme: 'light', ...middle.globals },
  name: 'Middelbaar scherm, licht',
  parameters: {
    ...middle.parameters,
    docs: {
      description: {
        story: 'Op een middelbaar scherm staan de cellen van de zijbalk onder elkaar, onder de hoofdkolom.',
      },
    },
  },
  render,
})

export const MiddleDark = meta.story({
  ...middle,
  globals: { theme: 'dark', ...middle.globals },
  name: 'Middelbaar scherm, donker',
  render,
})

const wideRender = () => (
  <Page.Body>
    <ExampleMain />
    <ExampleSidebar wide />
  </Page.Body>
)

// Only on the canvas, with Storybook's viewport setting: the breakpoints follow the window.
const screen = { parameters: { layout: 'fullscreen' as const }, tags: ['!autodocs'] }

export const WideLight = meta.story({
  ...screen,
  globals: { theme: 'light', viewport: { value: 'wide' } },
  name: 'Brede zijbalk, breed scherm, licht',
  parameters: {
    ...screen.parameters,
    docs: {
      description: {
        story: 'Met `wide` zijn de zijbalk en de hoofdkolom even breed, en samen vullen ze de pagina net als zonder.',
      },
    },
  },
  render: wideRender,
})

export const WideDark = meta.story({
  ...screen,
  globals: { theme: 'dark', viewport: { value: 'wide' } },
  name: 'Brede zijbalk, breed scherm, donker',
  render: wideRender,
})

export const WideMiddleLight = meta.story({
  ...screen,
  globals: { theme: 'light', viewport: { value: 'tablet' } },
  name: 'Brede zijbalk, middelbaar scherm, licht',
  parameters: {
    ...screen.parameters,
    docs: {
      description: { story: 'Op een middelbaar scherm staan de cellen van een brede zijbalk onder elkaar.' },
    },
  },
  render: wideRender,
})

const narrowRender = () => (
  <Page.Body>
    <ExampleMain />
    <ExampleSidebar narrow />
  </Page.Body>
)

export const NarrowLight = meta.story({
  ...screen,
  globals: { theme: 'light', viewport: { value: 'wide' } },
  name: 'Smalle zijbalk, breed scherm, licht',
  parameters: {
    ...screen.parameters,
    docs: {
      description: {
        story:
          "Met `narrow` is de hoofdkolom breder en de zijbalk smaller dan op andere pagina's, en samen vullen ze de pagina net als zonder. Op een smaller scherm staat de zijbalk onder de hoofdkolom, zoals altijd.",
      },
    },
  },
  render: narrowRender,
})

export const NarrowDark = meta.story({
  ...screen,
  globals: { theme: 'dark', viewport: { value: 'wide' } },
  name: 'Smalle zijbalk, breed scherm, donker',
  render: narrowRender,
})

const splitRender = () => (
  <Page.Body>
    <ExampleMain />
    <ExampleSidebar split />
  </Page.Body>
)

export const SplitMiddleLight = meta.story({
  ...screen,
  globals: { theme: 'light', viewport: { value: 'tablet' } },
  name: 'Naast elkaar, middelbaar scherm, licht',
  parameters: {
    ...screen.parameters,
    docs: {
      description: {
        story:
          'Met `split` staan de cellen van de zijbalk op een middelbaar scherm in twee gelijke kolommen onder de hoofdkolom.',
      },
    },
  },
  render: splitRender,
})

export const SplitMiddleDark = meta.story({
  ...screen,
  globals: { theme: 'dark', viewport: { value: 'tablet' } },
  name: 'Naast elkaar, middelbaar scherm, donker',
  render: splitRender,
})

export const SplitWideLight = meta.story({
  ...screen,
  globals: { theme: 'light', viewport: { value: 'wide' } },
  name: 'Naast elkaar, breed scherm, licht',
  parameters: {
    ...screen.parameters,
    docs: {
      description: {
        story:
          'Op een breed scherm is de zijbalk te smal voor twee kolommen, ook met `split`: de cellen staan onder elkaar.',
      },
    },
  },
  render: splitRender,
})
