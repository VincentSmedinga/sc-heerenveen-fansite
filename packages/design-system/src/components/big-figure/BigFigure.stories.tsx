import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { BigFigure } from './BigFigure'

const meta = preview.meta({
  argTypes: {
    figure: { description: 'Het getal zoals het staat, met zijn woord, zoals `9 keer`.' },
    label: { description: 'Wat het getal telt. Een schermlezer leest het na het getal, het is niet te zien.' },
  },
  component: BigFigure,
  parameters: {
    docs: {
      description: {
        component: [
          'Eén groot getal in een kaart, zonder kaart eromheen, zoals het aantal keren dat we de nul hielden.',
          'Zet het in een `Card` onder een kop van niveau 2, met één regel `Text` eronder die zegt waarop het rust. Het getal is gewone tekst, geen kop.',
          'Het heeft het lettertype en het gewicht van de getallen van `KeyFigures`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/BigFigure',
})

export const Default = meta.story({
  args: { figure: '9 keer', label: 'de nul gehouden' },
  name: 'Een getal met een regel eronder',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <Card aria-labelledby="groot-getal-een" surface="soft">
        <Heading id="groot-getal-een" level={2}>
          De nul gehouden
        </Heading>
        <BigFigure {...args} />
        <Text appearance="meta">In 39 wedstrijden. De laatste keer: 0–0 thuis tegen Testclub, zo 18 okt.</Text>
      </Card>
    </div>
  ),
})
