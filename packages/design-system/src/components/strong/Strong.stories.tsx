import preview from '#.storybook/preview'

import { Text } from '../text/Text'
import { Strong } from './Strong'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Tekst die zwaarder weegt dan de tekst eromheen, in vet.',
          'Een `Strong` heeft geen eigen stijl: het gewicht komt uit de basisstijlen, en de rest neemt hij van de tekst eromheen.',
          'Gebruik hem voor wat belangrijk is, niet voor de opmaak alleen.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Strong',
})

const render = () => (
  <Text style={{ maxInlineSize: '40rem' }}>
    We tonen alleen de kop, de link en de naam van de bron. <Strong>Nooit</Strong> de tekst van het bericht.
  </Text>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })
