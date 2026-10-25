import preview from '#.storybook/preview'

import { Text } from '../text/Text'
import { Emphasis } from './Emphasis'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Tekst met nadruk, in cursief.',
          'Een `Emphasis` heeft geen eigen stijl: hij neemt de stijl van de tekst eromheen.',
          'Gebruik hem voor een woord dat je met nadruk zou uitspreken.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Emphasis',
})

const render = () => (
  <Text style={{ maxInlineSize: '40rem' }}>
    We schrijven niet over wat anderen schreven, we <Emphasis>wijzen</Emphasis> je de weg naar hun verhaal.
  </Text>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })
