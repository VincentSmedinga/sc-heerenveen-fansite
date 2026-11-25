import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { Rule } from './Rule'

const meta = preview.meta({
  component: Rule,
  parameters: {
    docs: {
      description: {
        component:
          'Een dunne lijn tussen twee onderwerpen die onder dezelfde kop staan, zoals in een kaart van een spel de wedstrijd en het formulier om in te loggen. Heeft een onderwerp een eigen kop, dan is de lijn niet nodig.',
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/Rule',
})

export const Default = meta.story({
  name: 'Lijn in een kaart',
  render: (args) => (
    <Card aria-labelledby="kop">
      <Heading id="kop" level={2}>
        Volgende wedstrijd
      </Heading>
      <Text>sc Heerenveen – Excelsior, zaterdag 28 november, 19.45 uur.</Text>
      <Rule {...args} />
      <Text>Log in om te voorspellen.</Text>
    </Card>
  ),
})
