import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { CardColumns } from './CardColumns'

const meta = preview.meta({
  argTypes: {},
  component: CardColumns,
  parameters: {
    docs: {
      description: {
        component: [
          'Kaarten in twee kolommen als er plaats voor is, en anders onder elkaar.',
          'De volgorde in de code is de leesvolgorde: de eerste kaart links, de tweede rechts, de derde weer links.',
          'Een browser die grid lanes kent, zet elke kaart in de kortste kolom, zodat er geen gaten onder de kortere kaart van een paar zitten.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/CardColumns',
})

const lengths = [8, 2, 3, 6, 2, 4]
const letters = ['A', 'B', 'C', 'D', 'E', 'F']

export const Standaard = meta.story({
  render: (args) => (
    <CardColumns {...args}>
      {letters.map((letter, index) => (
        <Card key={letter}>
          <Heading level={2}>{letter}</Heading>
          {Array.from({ length: lengths[index] ?? 2 }, (_, line) => (
            <Text key={line}>Regel {line + 1}</Text>
          ))}
        </Card>
      ))}
    </CardColumns>
  ),
})
