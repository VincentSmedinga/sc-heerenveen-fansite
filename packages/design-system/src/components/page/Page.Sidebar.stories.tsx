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
