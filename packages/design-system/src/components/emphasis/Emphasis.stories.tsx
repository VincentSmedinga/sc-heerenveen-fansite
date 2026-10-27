import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Text } from '../text/Text'
import { Emphasis } from './Emphasis'

const meta = preview.meta({
  component: Emphasis,
  parameters: {
    docs: {
      description: {
        component: [
          'Nadruk op een woord, in cursief: het woord dat je met nadruk zou uitspreken.',
          'Een `Emphasis` heeft geen eigen stijl en neemt de stijl van de tekst eromheen.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Tekst/Emphasis',
})

export const Default = meta.story({
  name: 'Nadruk',
  render: () => (
    <Text>
      We schrijven niet over wat anderen schreven, we <Emphasis>wijzen</Emphasis> je de weg naar hun verhaal.
    </Text>
  ),
})
