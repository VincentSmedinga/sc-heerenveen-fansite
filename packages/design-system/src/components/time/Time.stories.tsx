import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Text } from '../text/Text'
import { Time } from './Time'

const meta = preview.meta({
  component: Time,
  parameters: {
    docs: {
      description: {
        component: [
          'Een datum of een tijd, zodat een browser of zoekmachine hem ook als datum leest.',
          'Je zet in `dateTime` de waarde voor machines, zoals `2026-10-24`, en als tekst de datum of tijd zoals een lezer hem wil zien.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Tekst/Time',
})

export const Default = meta.story({
  args: { dateTime: '2026-10-24' },
  name: 'Datum',
  render: (args) => (
    <Text>
      We stelden deze verklaring op <Time {...args}>24 oktober 2026</Time>.
    </Text>
  ),
})
