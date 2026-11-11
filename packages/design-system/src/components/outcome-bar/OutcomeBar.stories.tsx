import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { OutcomeBar } from './OutcomeBar'

const meta = preview.meta({
  argTypes: {
    draws: { description: 'Het aantal gelijkspelen.' },
    losses: { description: 'Het aantal verloren wedstrijden.' },
    wins: { description: 'Het aantal gewonnen wedstrijden.' },
  },
  component: OutcomeBar,
  parameters: {
    docs: {
      description: {
        component: [
          'Een balk in drie delen: winst, gelijkspel en verlies, in de kleuren van een uitslag.',
          'De balk is versiering en een kleur is nooit het enige teken: zet de drie getallen als zin naast of onder de balk.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/OutcomeBar',
})

export const Default = meta.story({
  args: { draws: 61, losses: 82, wins: 114 },
  name: 'Winst, gelijk en verlies',
  render: (args) => (
    <div style={{ maxInlineSize: '24rem' }}>
      <Card aria-labelledby="uitslag-een">
        <Heading id="uitslag-een" level={2}>
          Uitslagen met hem in het veld
        </Heading>
        <OutcomeBar {...args} />
        <Text>
          {args.wins} gewonnen, {args.draws} gelijk en {args.losses} verloren.
        </Text>
      </Card>
    </div>
  ),
})
