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
