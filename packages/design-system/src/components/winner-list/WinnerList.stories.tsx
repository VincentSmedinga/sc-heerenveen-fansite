import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { WinnerList } from './WinnerList'

const meta = preview.meta({
  args: {
    items: [
      { average: '7,8', line: 'Thuis tegen Sparta Rotterdam, 3–1', name: 'Dylan Vente' },
      { average: '7,4', line: 'Uit tegen Ajax, 2–2', name: 'Andries Noppert' },
      { average: '7,1', line: 'Thuis tegen NEC, 2–0', name: 'Dirk Proper' },
    ],
  },
  argTypes: {
    items: { description: 'Een rij per wedstrijd: de uitblinker, zijn gemiddelde en de wedstrijd.' },
  },
  component: WinnerList,
  decorators: [
    (Story) => (
      <Card aria-labelledby="kop" surface="soft">
        <Heading id="kop" level={2}>
          Uitblinkers 2026/27
        </Heading>
        <Story />
      </Card>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'De uitblinkers van het seizoen onder elkaar, voor een zachte kaart naast het hoofdvlak: de naam groot, de wedstrijd klein eronder en het gemiddelde groot aan de rechterkant. Boven elke rij staat een dunne lijn, ook boven de eerste, met de krappe maat van de meeste lijsten.',
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/WinnerList',
})

export const Default = meta.story({ name: 'Drie uitblinkers' })

export const One = meta.story({
  args: { items: [{ average: '7,8', line: 'Thuis tegen Sparta Rotterdam, 3–1', name: 'Dylan Vente' }] },
  name: 'Eén uitblinker',
})
