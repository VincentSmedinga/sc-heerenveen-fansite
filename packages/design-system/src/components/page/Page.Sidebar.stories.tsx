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
          '- Op een middelbaar scherm staan zijn cellen in twee kolommen naast elkaar, onder de hoofdkolom.',
          '- Net als de hoofdkolom bestaat hij uit cellen die onder elkaar staan.',
          '- Geef hem een naam met `aria-label` of `aria-labelledby`.',
          '- Met `wide` is hij even breed als de hoofdkolom, voor een zijbalk met een tabel. De hoofdkolom wordt er smaller van, zodat samen de kolommen even breed blijven als zonder. Zijn cellen staan dan altijd onder elkaar. De `Page.Body` hoef je er niets voor te geven: de zijbalk zegt het zelf.',
        ].join('\n'),
      },
      source: exampleSource,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Page.Sidebar',
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
        story: 'Op een middelbaar scherm staan de cellen van de zijbalk in twee gelijke kolommen onder de hoofdkolom.',
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
      description: { story: 'Op een middelbaar scherm staan de cellen van een brede zijbalk toch onder elkaar.' },
    },
  },
  render: wideRender,
})
