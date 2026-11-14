import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { CardGroup } from './CardGroup'

const meta = preview.meta({
  argTypes: {
    id: { description: 'Het anker van de kop, zoals `uitslagen`. De balk "Op deze pagina" linkt ernaartoe.' },
    title: { description: 'De kop van de groep, een kop van niveau 2.' },
  },
  component: CardGroup,
  parameters: {
    docs: {
      description: {
        component: [
          'Een groep kaarten onder een eigen kop, voor een pagina met veel kaarten, zoals Cijfers: de pagina leest in delen in plaats van als één stapel.',
          'De kop staat onder een lijn, en de kaarten staan in twee kolommen als er plaats voor is (zie `CardColumns`). De kop van een kaart in de groep is een kop van niveau 3.',
          'In een browser die CSS Grid Lanes kent, sluiten de kaarten in een kolom op elkaar aan; elders staan ze in een raster. De volgorde van de bron blijft de leesvolgorde.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/CardGroup',
})

const lengths = [6, 2, 3, 2]

export const Standaard = meta.story({
  args: { id: 'uitslagen', title: 'Uitslagen' },
  render: (args) => (
    <div className="hf-flow">
      <Heading level={1}>Cijfers</Heading>
      <CardGroup {...args}>
        {lengths.map((length, index) => (
          <Card key={index}>
            <Heading level={3}>Kaart {index + 1}</Heading>
            {Array.from({ length }, (_, line) => (
              <Text key={line}>Regel {line + 1}</Text>
            ))}
          </Card>
        ))}
      </CardGroup>
    </div>
  ),
})
