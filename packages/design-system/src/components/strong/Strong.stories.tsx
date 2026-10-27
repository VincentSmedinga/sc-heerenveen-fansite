import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Text } from '../text/Text'
import { Strong } from './Strong'

const meta = preview.meta({
  component: Strong,
  parameters: {
    docs: {
      description: {
        component: [
          'Tekst die zwaarder weegt dan de tekst eromheen, in vet.',
          'Gebruik hem voor wat belangrijk is, niet voor de opmaak alleen.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Tekst/Strong',
})

export const Default = meta.story({
  name: 'Belangrijk',
  render: () => (
    <Text>
      We tonen alleen de kop, de link en de naam van de bron. <Strong>Nooit</Strong> de tekst van het bericht.
    </Text>
  ),
})
