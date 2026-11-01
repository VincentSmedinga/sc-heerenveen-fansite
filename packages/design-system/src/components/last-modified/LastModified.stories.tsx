import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { LastModified } from './LastModified'

const meta = preview.meta({
  argTypes: {
    children: { description: 'Het moment zoals een bezoeker het leest, in Nederlandse tijd, zoals "wo 14:05".' },
    dateTime: { description: 'Hetzelfde moment voor machines, zoals `2026-10-21T12:05:00.000Z`.' },
  },
  component: LastModified,
  parameters: {
    docs: {
      description: {
        component: [
          'De laatste regel van een kaart met gegevens uit een import: wanneer de bron van de gegevens voor het laatst veranderde, niet wanneer wij hem lazen.',
          'Een kaart zonder moment krijgt geen regel. Laat het component dan weg.',
          'De afbeelding van een kaart heeft de regel niet, want die heeft al de dag van het maken en de bron.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/LastModified',
})

export const Default = meta.story({
  args: { children: 'wo 14:05', dateTime: '2026-10-21T12:05:00.000Z' },
  name: 'Onderaan een kaart',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <Card aria-labelledby="gewijzigd-kaart" surface="soft">
        <Heading id="gewijzigd-kaart" level={2}>
          Testkaart
        </Heading>
        <Text>Een regel met gegevens van een testbron.</Text>
        <LastModified {...args} />
      </Card>
    </div>
  ),
})

export const OnWarmCard = meta.story({
  args: { children: 'di 14 okt 2025', dateTime: '2025-10-14T12:05:00.000Z' },
  name: 'Met een datum van een ander jaar, op een warme kaart',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <Card aria-labelledby="gewijzigd-warm" surface="warm">
        <Heading id="gewijzigd-warm" level={2}>
          Testkaart
        </Heading>
        <Text>Een regel met gegevens van een testbron.</Text>
        <LastModified {...args} />
      </Card>
    </div>
  ),
})
