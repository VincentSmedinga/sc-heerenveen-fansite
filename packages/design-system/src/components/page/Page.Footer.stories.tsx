import preview from '#.storybook/preview'

import { ExampleFooter } from '../../docs/ExamplePage'
import { exampleSource } from '../../docs/exampleSource'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De onderkant van de pagina: een `footer`, dus de contentinfo van de pagina.',
          'Bovenaan staat een dunne lijn, en de tekst heeft de kleur van secundaire tekst.',
          'Links in de footer hebben de gewone kleuren van links.',
          '',
          'De inhoud zet je zelf neer.',
          'Zet er bijvoorbeeld "Alle koppen en links op één plek. Voor supporters, door supporters." in.',
          'Daaronder staat op de site een `Navigation` met de naam "Over de site", met links naar Over ons en Privacy.',
        ].join('\n'),
      },
      source: exampleSource,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Page.Footer',
})

const render = () => <ExampleFooter />

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })
