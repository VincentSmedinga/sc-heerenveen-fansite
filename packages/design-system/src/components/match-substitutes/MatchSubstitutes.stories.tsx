import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { type MatchSubstitute, MatchSubstitutes } from './MatchSubstitutes'

const meta = preview.meta({
  argTypes: {
    extraTime: { description: 'Of de wedstrijd in verlenging ging. De ringen lopen dan tot 120 minuten.' },
    headingLevel: { description: 'Het niveau van de kop "Wissels <team>" in de opbouw van de pagina.' },
    ours: { description: 'Of het team sc Heerenveen is: het vlak is dan gevuld, bij de tegenstander open.' },
    substitutes: {
      description: 'De spelers die erin kwamen, met de minuut, voor wie, de minuten die ze speelden en hun doelpunten.',
    },
    team: { description: 'De naam van het team, in de kop.' },
  },
  component: MatchSubstitutes,
  decorators: [
    (Story) => (
      <Card>
        <Story />
      </Card>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'De wissels van één team: wie erin kwam, in welke minuut en voor wie, en een doelpunt als hij scoorde.',
          'Elke speler heeft een stip met het rugnummer en een boog die begint bij de minuut van invallen, zoals op het veld.',
          'De spelers op de bank die niet inviellen staan er niet bij: het verslag legt ze niet vast.',
          'Een schermlezer hoort per wissel één zin, en de tekens zijn verborgen.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/MatchSubstitutes',
})

const name = (surname: string, givenName?: string) => ({ givenName, surname })

// Made-up players and a made-up club, like the data of the seed.
const ours: MatchSubstitute[] = [
  {
    minute: 62,
    minutesPlayed: 28,
    name: name('Nepper', 'Gerrit'),
    playerOut: name('Idzenga', 'Thijs'),
    shirtNumber: 14,
  },
  {
    goals: [{ minute: 85 }],
    minute: 70,
    minutesPlayed: 20,
    name: name('Maquette', 'Wim'),
    playerOut: name('Voorbeeld', 'Jelle'),
    shirtNumber: 15,
  },
  { minute: 82, minutesPlayed: 8, name: name('Proefveld', 'Ties'), playerOut: name('Schijn', 'Luuk'), shirtNumber: 16 },
]

const theirs: MatchSubstitute[] = [
  {
    minute: 55,
    minutesPlayed: 35,
    name: name('Dummy', 'Wim'),
    playerOut: name('Consectetur', 'Teun'),
    shirtNumber: 14,
  },
  { minute: 68, minutesPlayed: 22, name: name('Lorem', 'Yannick'), playerOut: name('Sit', 'Dylan'), shirtNumber: 15 },
]

export const Default = meta.story({
  args: {
    extraTime: false,
    headingLevel: 3,
    ours: true,
    substitutes: ours,
    team: 'sc Heerenveen',
  },
  name: 'Een team met drie wissels',
})

export const WithoutSubstitutes = meta.story({
  args: { headingLevel: 3, ours: false, substitutes: [], team: 'Testdorp FC' },
  name: 'Een team zonder wissels',
})

export const WithGoal = meta.story({
  args: {
    headingLevel: 3,
    ours: true,
    substitutes: [
      {
        goals: [{ minute: 74 }, { minute: 88, ownGoal: true }],
        minute: 60,
        minutesPlayed: 30,
        name: name('Maquette', 'Wim'),
        playerOut: name('Voorbeeld', 'Jelle'),
        shirtNumber: 15,
      },
    ],
    team: 'sc Heerenveen',
  },
  name: 'Een wissel met een doelpunt',
})

export const WithoutShirtNumber = meta.story({
  args: {
    headingLevel: 3,
    ours: true,
    substitutes: ours.map((substitute) => ({ ...substitute, shirtNumber: null })),
    team: 'sc Heerenveen',
  },
  name: 'Wissels zonder rugnummer: de schijf blijft leeg',
})

export const AddedTime = meta.story({
  args: {
    headingLevel: 3,
    ours: true,
    substitutes: [
      {
        minute: 45,
        minutesPlayed: 46,
        name: name('Nepper', 'Gerrit'),
        playerOut: name('Idzenga', 'Thijs'),
        shirtNumber: 14,
        stoppageMinutes: 2,
      },
      {
        minute: 90,
        minutesPlayed: 4,
        name: name('Proefveld', 'Ties'),
        playerOut: name('Schijn', 'Luuk'),
        shirtNumber: 16,
        stoppageMinutes: 2,
      },
    ],
    team: 'sc Heerenveen',
  },
  name: 'Een wissel in de blessuretijd',
})

export const BothTeams = meta.story({
  args: { headingLevel: 3, ours: true, substitutes: ours, team: 'sc Heerenveen' },
  name: 'De twee teams naast elkaar',
  render: (args) => (
    <MatchSubstitutes.Group>
      <MatchSubstitutes {...args} />
      <MatchSubstitutes {...args} ours={false} substitutes={theirs} team="Testdorp FC" />
    </MatchSubstitutes.Group>
  ),
})
