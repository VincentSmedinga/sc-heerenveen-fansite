import preview from '#.storybook/preview'

import { ExampleMain } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De hoofdkolom van de pagina: de `main`, dus de main-landmark.',
          'Elke pagina heeft er precies één, en zet haar inhoud erin.',
          'Een `Page.Main` staat in de `Page.Body`, voor een eventuele `Page.Sidebar`.',
          '',
          'Op een breed scherm is de kolom hoogstens 48 rem breed (`--hf-content-max-width`).',
          'Op een smaller scherm is hij zo breed als het scherm tussen de marges.',
          '',
          'Elk kind van de kolom is een cel, zoals een kop, een tekst of een kaart.',
          'De cellen staan onder elkaar, elk zo hoog als zijn inhoud.',
          'De ruimte ertussen komt van de `Page.Body`, en een cel heeft geen marge naar buiten.',
          'Zet wat bij elkaar hoort, zoals een kop met een inleiding, in een `Page.Cell`.',
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
        story:
          'Drie cellen: een kop met een inleiding in een `Page.Cell`, een tekst, en een lijst onder een kop in een `Page.Cell`.',
      },
    },
  },
  render,
})

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })
