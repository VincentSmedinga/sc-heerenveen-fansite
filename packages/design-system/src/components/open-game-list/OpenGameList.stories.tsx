import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { OpenGameList } from './OpenGameList'

const meta = preview.meta({
  args: {
    items: [
      {
        href: '/fans/prognose',
        link: 'Voorspel',
        linkName: 'Voorspel sc Heerenveen – FC Twente',
        name: 'Prognose',
        sentence: 'Voorspel sc Heerenveen – FC Twente. Kan tot zaterdag 16.45 uur.',
      },
    ],
  },
  argTypes: {
    items: { description: 'Een rij per spel dat nu open staat.' },
  },
  component: OpenGameList,
  decorators: [
    (Story) => (
      <Card aria-labelledby="kop" surface="soft">
        <Heading id="kop" level={2}>
          Fans
        </Heading>
        <Story />
      </Card>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component:
          'De spellen die nu open staan, voor de kaart Fans op de voorpagina: de naam van het spel, één zin over wat kan, en de link naar het spel.',
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/OpenGameList',
})

export const Default = meta.story({ name: 'Eén spel' })

export const MoreGames = meta.story({
  args: {
    items: [
      {
        href: '/fans/prognose',
        link: 'Voorspel',
        linkName: 'Voorspel sc Heerenveen – FC Twente',
        name: 'Prognose',
        sentence: 'Voorspel sc Heerenveen – FC Twente. Kan tot zaterdag 16.45 uur.',
      },
      {
        href: '/fans/uitblinker',
        link: 'Geef cijfers',
        name: 'Uitblinker',
        sentence: 'Geef de spelers een cijfer. Kan tot donderdag 20.00 uur.',
      },
    ],
  },
  name: 'Twee spellen',
})
