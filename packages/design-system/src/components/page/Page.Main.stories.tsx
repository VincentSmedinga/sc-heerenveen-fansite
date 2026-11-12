import preview from '#.storybook/preview'

import { ExampleMain } from '../../docs/ExamplePage'
import { Page } from './Page'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De hoofdkolom van de pagina: een `main`.',
          'Elke pagina heeft er één en zet haar inhoud erin.',
          '',
          '- De hoofdkolom heeft de lijst of tabel waar de pagina voor bestaat, op een wit vlak. Staat er een schakelaar die cijfers kiest, dan is dat de eerste cel. Cijfers is de uitzondering: daar hebben twee even brede kolommen allebei cijfers.',
          '- Elk kind van de kolom is een cel, zoals een kop, een tekst of een kaart. De cellen staan onder elkaar, in een kolom van de breedte van de inhoud.',
          '- Zet wat bij elkaar hoort, zoals een kop met een inleiding, in een `Page.Cell`.',
          '- De ruimte tussen de cellen komt van de `Page.Main`.',
          '- Met `areas` is de hoofdkolom een raster met benoemde gebieden: de pagina zegt welke gebieden ze heeft op een smal en op een breed scherm, en elke cel noemt zijn gebied. Een cel kan zo op een telefoon vóór de hoofdinhoud staan zonder dat de volgorde van de code verandert. De kop staat bovenaan over de hele breedte, daaronder de `Page.Toolbar`, dan de inhoud. Zie Page.Main met gebieden.',
        ].join('\n'),
      },
      source: {
        code: `<Page.Main>
  <Page.Cell>…</Page.Cell>
  <Text>Een cel in de hoofdkolom.</Text>
</Page.Main>`,
        language: 'tsx',
        type: 'code',
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Pagina/Page.Main',
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
