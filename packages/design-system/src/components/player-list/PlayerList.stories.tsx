import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { PlayerList } from './PlayerList'

const meta = preview.meta({
  argTypes: {
    players: { description: 'De spelers in de volgorde waarin ze gelezen worden.' },
  },
  component: PlayerList,
  parameters: {
    docs: {
      description: {
        component: [
          'Een lijst met spelers voor een lange pagina: de achternaam vet, dan de voornaam (of met `order` de voornaam eerst, voor zoekresultaten), en eronder in kleine letters wat we van zijn tijd bij ons weten.',
          'Een speler zonder pagina is gewone tekst. Zet de lijst onder een kop van niveau 2 die zegt wat de lijst groepeert.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/PlayerList',
})

export const Default = meta.story({
  args: {
    players: [
      { facts: 'Verdediger · 2013–2017, 2021–2023', href: '#', key: 'a', rest: 'Joost van', surname: 'Aken' },
      { facts: 'Aanvaller · 2024/25', href: '#', key: 'b', rest: 'Alfreð', surname: 'Finnbogason' },
      { facts: 'Middenvelder · sinds 2024', href: '#', key: 'c', rest: 'Luka', surname: 'Ødegaard' },
      { facts: '2009/10', key: 'd', surname: 'Dinho' },
    ],
  },
  name: 'Spelers in een kaart',
  render: (args) => (
    <Card aria-labelledby="spelers-lijst">
      <Heading id="spelers-lijst" level={2}>
        A
      </Heading>
      <PlayerList {...args} />
    </Card>
  ),
})

export const GivenNameFirst = meta.story({
  args: {
    order: 'given-first',
    players: [
      { facts: 'Verdediger · 2013/14 – 2022/23', href: '#', key: 'a', rest: 'Joost', surname: 'van Aken' },
      { facts: 'Aanvaller · 2024/25', href: '#', key: 'b', rest: 'Alfreð', surname: 'Finnbogason' },
      { facts: '2009/10', key: 'c', surname: 'Dinho' },
    ],
  },
  name: 'Voornaam eerst, voor zoekresultaten',
  render: (args) => (
    <Card aria-labelledby="spelers-resultaten">
      <Heading id="spelers-resultaten" level={2}>
        3 spelers voor „an”
      </Heading>
      <PlayerList {...args} />
    </Card>
  ),
})
