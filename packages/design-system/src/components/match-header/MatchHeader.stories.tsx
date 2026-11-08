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
    scorersAgainst: { description: 'De doelpuntenmakers van de tegenstander, onder zijn naam.' },
    scorersFor: { description: 'De doelpuntenmakers van sc Heerenveen, onder onze naam.' },
  },
  component: MatchHeader,
  decorators: [
    (Story) => (
      <Card aria-labelledby="kop-van-de-wedstrijd">
        <Heading className="hf-visually-hidden" id="kop-van-de-wedstrijd" level={1}>
          sc Heerenveen – Testdorp FC
        </Heading>
        <Story />
      </Card>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'De kop van de pagina van een wedstrijd: de twee clubs met de uitslag, de uitkomst in een pil en onder elke club zijn doelpuntenmakers.',
          'Op een smal scherm staan de naam en de doelpunten van een club op één regel; op een breed scherm staan de namen links en rechts en de uitslag groot in het midden.',
          'Kies hem alleen voor de pagina van één wedstrijd; een regel in een lijst is een `Match`.',
          'De uitslag heeft de kleur van de uitkomst voor sc Heerenveen, en het woord in de pil is het teken: een schermlezer hoort "6 tegen 0".',
          'Na een verlenging of strafschoppen staat dat in woorden onder de uitslag.',
          'De `h1` van de pagina hoort er niet bij: de pagina mag hem visueel verbergen, want de namen en de uitslag zijn wat de ogen zien.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/MatchHeader',
})

// Made-up club, players, stadium and referee, like the data of the seed.
const facts: MatchHeaderProps['facts'] = [
  { label: 'Competitie', value: 'Eredivisie' },
  { label: 'Ronde', value: 'Speelronde 12' },
  { label: 'Datum', value: <Time dateTime="2026-11-14T17:45:00Z">14 nov 2026 18:45</Time> },
  { label: 'Stadion', value: 'Stadion Proeflaan' },
  { label: 'Toeschouwers', value: '21.022' },
  { label: 'Scheidsrechter', value: 'Pieter Maquette' },
]

export const Default = meta.story({
  args: {
    facts,
    goalsAgainst: 1,
    goalsFor: 3,
    home: true,
    opponent: 'Testdorp FC',
    scorersAgainst: [{ minute: 80, player: 'Dummydijk' }],
    scorersFor: [
      { minute: 12, player: 'Hoekstra' },
      { minute: 58, penalty: true, player: 'Wiersma' },
      { minute: 71, player: 'Demo' },
    ],
  },
  name: 'Een wedstrijd van 90 minuten',
})

export const AfterExtraTime = meta.story({
  args: {
    afterNinetyAgainst: 1,
    afterNinetyFor: 1,
    extraTime: true,
    facts: [
      { label: 'Competitie', value: 'KNVB Beker' },
      { label: 'Ronde', value: 'Achtste finale' },
      { label: 'Stadion', value: 'Stadion Proeflaan' },
    ],
    goalsAgainst: 1,
    goalsFor: 2,
    home: true,
    opponent: 'Oefenstad FC',
    scorersAgainst: [{ minute: 33, player: 'Oefenhoek' }],
    scorersFor: [
      { minute: 60, player: 'Hoekstra' },
      { minute: 105, player: 'Demo' },
    ],
  },
  name: 'Na verlenging',
})

export const AfterPenalties = meta.story({
  args: {
    afterNinetyAgainst: 1,
    afterNinetyFor: 1,
    extraTime: true,
    facts: [
      { label: 'Competitie', value: 'KNVB Beker' },
      { label: 'Ronde', value: 'Halve finale' },
      { label: 'Stadion', value: 'Stadion Proeflaan' },
    ],
    goalsAgainst: 1,
    goalsFor: 1,
    home: true,
    opponent: 'Oefenstad FC',
    penaltiesAgainst: 4,
    penaltiesFor: 5,
    scorersAgainst: [{ minute: 33, player: 'Oefenhoek' }],
    scorersFor: [{ minute: 76, player: 'Hoekstra' }],
  },
  name: 'Na strafschoppen',
})

export const OwnGoalAway = meta.story({
  args: {
    facts: [
      { label: 'Competitie', value: 'Eredivisie' },
      { label: 'Ronde', value: 'Speelronde 2' },
    ],
    goalsAgainst: 2,
    goalsFor: 0,
    home: false,
    opponent: 'Voorbeeld United',
    scorersAgainst: [
      { minute: 24, player: 'Dummydijk' },
      { minute: 39, ownGoal: true, player: 'Demostad' },
    ],
  },
  name: 'Uit, met een eigen doelpunt',
})

export const ScorerWithoutMinute = meta.story({
  args: {
    facts: [
      { label: 'Competitie', value: 'Eredivisie' },
      { label: 'Ronde', value: 'Speelronde 12' },
    ],
    goalsAgainst: 1,
    goalsFor: 2,
    home: true,
    opponent: 'Voorbeeld United',
    scorersAgainst: [{ minute: null, player: 'Dummydijk' }],
    scorersFor: [
      { minute: 12, player: 'Demo' },
      { minute: null, player: 'Monster' },
    ],
  },
  name: 'Een doelpunt zonder minuut: de naam staat zonder minuut',
})
