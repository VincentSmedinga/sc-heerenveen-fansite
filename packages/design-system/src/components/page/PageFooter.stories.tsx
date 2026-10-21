import preview from '#.storybook/preview'

import { ExampleFooter } from '../../docs/ExamplePage'

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
          'Zet erin dat de Fansite geen officieel onderdeel van sc Heerenveen is.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/PageFooter',
})

const render = () => <ExampleFooter />

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })
