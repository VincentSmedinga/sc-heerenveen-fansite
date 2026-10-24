import preview from '#.storybook/preview'

import { Text } from '../text/Text'
import { Time } from './Time'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een datum of een tijd.',
          'Je zet in `dateTime` de waarde voor machines, zoals `2026-10-24`, en als tekst de datum of tijd zoals een lezer hem wil zien.',
          'Een `Time` heeft geen eigen stijl: hij neemt de stijl van de tekst eromheen.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Time',
})

const render = () => (
  <Text style={{ maxInlineSize: '40rem' }}>
    We stelden deze verklaring op <Time dateTime="2026-10-24">24 oktober 2026</Time>.
  </Text>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })
