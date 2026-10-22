import preview from '#.storybook/preview'

import { ExampleMain } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De hoofdkolom van de pagina: een `main`.',
          'Elke pagina heeft er één en zet haar inhoud erin.',
          '',
          '- Elk kind van de kolom is een cel, zoals een kop, een tekst of een kaart. De cellen staan onder elkaar.',
          '- Zet wat bij elkaar hoort, zoals een kop met een inleiding, in een `Page.Cell`.',
          '- De ruimte tussen de cellen komt van de `Page.Body`.',
        ].join('\n'),
      },
      source: exampleSource,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Page.Main',
})

const render = () => (
  <Page.Body>
    <ExampleMain />
  </Page.Body>
)

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Licht',
  parameters: {
    docs: {
      description: {
        story: 'Drie cellen: een kop met een inleiding, een tekst, en een lijst onder een kop.',
      },
    },
  },
  render,
})

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })
