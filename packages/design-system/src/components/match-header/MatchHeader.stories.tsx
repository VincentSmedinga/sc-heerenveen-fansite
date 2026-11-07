import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { Time } from '../time/Time'
import { MatchHeader, type MatchHeaderProps } from './MatchHeader'

const meta = preview.meta({
  argTypes: {
    goalsAgainst: { description: 'De doelpunten van de tegenstander, ook bij een uitwedstrijd.' },
    goalsFor: { description: 'De doelpunten van sc Heerenveen.' },
    home: { description: 'Of sc Heerenveen thuis speelt. De thuisclub staat vooraan.' },
  },
  component: MatchHeader,
  parameters: {
    docs: {
      description: {
        component: [
          'De kop van de pagina van een wedstrijd: de twee clubs met de uitslag ertussen en daaronder de feiten van de wedstrijd, zoals de competitie, de dag, het stadion en de scheidsrechter.',
          'Kies hem alleen voor de pagina van één wedstrijd; een regel in een lijst is een `Match`.',
          'De uitslag heeft de kleur van de uitkomst voor sc Heerenveen, en de cijfers zijn het teken: een schermlezer hoort "6 tegen 0".',
          'Na een verlenging of strafschoppen staat dat in woorden onder de uitslag.',
          'De `h1` van de pagina staat erboven en hoort er niet bij.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/MatchHeader',
})

// Made-up club, stadium and referee, like the data of the seed.
const facts: MatchHeaderProps['facts'] = [
  { label: 'Competitie', value: 'Eredivisie, Speelronde 1' },
  {
    label: 'Aftrap',
    value: <Time dateTime="2026-10-24T14:30:00Z">za 24 okt 2026 16:30</Time>,
  },
  { label: 'Stadion', value: 'Stadion Proeflaan' },
  { label: 'Toeschouwers', value: '21.022' },
  { label: 'Scheidsrechter', value: 'Pieter Maquette' },
]

export const Default = meta.story({
  args: { facts, goalsAgainst: 0, goalsFor: 6, home: true, opponent: 'Testdorp FC' },
  name: 'Kop van een wedstrijd',
  render: (args) => (
    <Card aria-labelledby="kop-van-de-wedstrijd">
      <Heading id="kop-van-de-wedstrijd" level={1}>
        sc Heerenveen – Testdorp FC
      </Heading>
      <MatchHeader {...args} />
    </Card>
  ),
})

export const AfterExtraTime = meta.story({
  args: {
    afterNinetyAgainst: 1,
    afterNinetyFor: 1,
    extraTime: true,
    facts: [
      { label: 'Competitie', value: 'KNVB Beker, Achtste finale' },
      { label: 'Stadion', value: 'Stadion Proeflaan' },
    ],
    goalsAgainst: 1,
    goalsFor: 1,
    home: true,
    opponent: 'Oefenstad FC',
    penaltiesAgainst: 3,
    penaltiesFor: 4,
  },
  name: 'Na verlenging en strafschoppen',
  render: (args) => (
    <Card>
      <MatchHeader {...args} />
    </Card>
  ),
})

export const Away = meta.story({
  args: {
    facts: [{ label: 'Competitie', value: 'Eredivisie, Speelronde 2' }],
    goalsAgainst: 2,
    goalsFor: 0,
    home: false,
    opponent: 'Voorbeeld United',
  },
  name: 'Uit, met een verlies',
  render: (args) => (
    <Card>
      <MatchHeader {...args} />
    </Card>
  ),
})
