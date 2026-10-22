import preview from '#.storybook/preview'

import { ExampleMain, ExampleSidebar } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De zijbalk van de pagina: een `aside`, dus de complementary-landmark.',
          'Een pagina heeft er een als ze iets heeft naast de hoofdinhoud; zonder zijbalk laat je hem weg.',
          'Hij staat in de `Page.Body`, na de `Page.Main`.',
          '',
          'Op een breed scherm is de zijbalk 20 rem breed en staat hij naast de hoofdkolom.',
          'Is het scherm te smal voor beide, dan staat hij onder de hoofdkolom, over de hele breedte.',
          'In beide gevallen komt hij in de HTML na de hoofdkolom, dus ook in de leesvolgorde en bij het tabben.',
          '',
          'Net als de hoofdkolom bestaat hij uit cellen, die onder elkaar staan, elk zo hoog als zijn inhoud.',
          'Ze sluiten niet aan op de cellen van de hoofdkolom.',
          '',
          'Geef de zijbalk een naam met `aria-label` of `aria-labelledby`, zodat een lezer van een schermlezer hem in de lijst van landmarks herkent.',
          'Dat is zeker nodig als een pagina meer dan één `aside` heeft.',
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
