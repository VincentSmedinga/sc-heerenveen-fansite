import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'
import { ShortPlayer } from './ShortPlayer'

const meta = preview.meta({
  argTypes: {
    givenName: { description: 'De voornaam, in het normale gewicht. Laat hem weg bij een speler met één naam.' },
    shirtNumber: {
      description:
        'Het rugnummer. `null` is een speler zonder nummer in een lijst waar anderen er wel een hebben: de kolom blijft leeg. Laat hem weg in een lijst waar niemand een nummer heeft.',
    },
    surname: { description: 'De achternaam, in het sterkere gewicht.' },
  },
  component: ShortPlayer,
  parameters: {
    docs: {
      description: {
        component: [
          'Een speler als korte regel in een lijst: het rugnummer en de naam.',
          'Het is de korte regel van `ShortMatch` voor een speler, met hetzelfde uiterlijk, voor de selectie van een seizoen.',
          'Zet de regel in een `List.Item`, de lijst in een `Card` onder een kop van niveau 3 per positie, en geef de `List` `role="list"`: Safari noemt een lijst zonder opsommingstekens anders geen lijst meer.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/ShortPlayer',
})

const inCard = (children: React.ReactNode) => (
  <div style={{ maxInlineSize: '20rem' }}>
    <Card aria-labelledby="speler-kaart">
      <Heading id="speler-kaart" level={3}>
        Verdedigers
      </Heading>
      <List role="list">{children}</List>
    </Card>
  </div>
)

export const Default = meta.story({
  args: { givenName: 'Testspeler', shirtNumber: 4, surname: 'Een' },
  name: 'Een regel met een rugnummer',
  render: (args) =>
    inCard(
      <List.Item>
        <ShortPlayer {...args} />
      </List.Item>,
    ),
})

export const MixedNumbers = meta.story({
  name: 'Een lijst waar niet elke speler een nummer heeft',
  render: () =>
    inCard(
      <>
        <List.Item>
          <ShortPlayer givenName="Testspeler" shirtNumber={4} surname="Een" />
        </List.Item>
        <List.Item>
          <ShortPlayer givenName="Testspeler" shirtNumber={12} surname="van Twee" />
        </List.Item>
        <List.Item>
          <ShortPlayer givenName="Testspeler" shirtNumber={null} surname="Drie" />
        </List.Item>
      </>,
    ),
})

export const WithoutNumbers = meta.story({
  name: 'Een lijst zonder rugnummers',
  render: () =>
    inCard(
      <>
        <List.Item>
          <ShortPlayer givenName="Testspeler" surname="Een" />
        </List.Item>
        <List.Item>
          <ShortPlayer surname="Twee" />
        </List.Item>
      </>,
    ),
})
