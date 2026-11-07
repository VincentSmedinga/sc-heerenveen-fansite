import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { MatchLineup, type MatchLineupPlayer } from './MatchLineup'

const meta = preview.meta({
  argTypes: {
    formation: { description: 'De formatie van het team, zoals 4-3-3. Zonder formatie staat er niets.' },
    headingLevel: {
      control: 'radio',
      description: 'Het niveau van de kop met de naam van het team.',
      options: [2, 3, 4],
    },
    team: { description: 'De naam van het team, als kop.' },
  },
  component: MatchLineup,
  parameters: {
    docs: {
      description: {
        component: [
          'De opstelling van één team: de naam van het team als kop, daaronder de basis en de bank als lijsten, een speler per regel met het rugnummer voor de naam.',
          'Met een formatie staat er een korte regel onder de naam van het team, zoals "Formatie: 4-3-3".',
          'De aanvoerder heeft het woord erachter, en wat een speler in de wedstrijd overkwam, zoals een wissel of een kaart, staat in een zin onder zijn naam.',
          'Schrijf die zinnen uit: een pijl of een kleur zegt een schermlezer niets.',
          'Zet de twee teams van een wedstrijd naast elkaar in dezelfde kaart, onder één kop.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/MatchLineup',
})

const player = (shirtNumber: number, surname: string, givenName: string, extra: Partial<MatchLineupPlayer> = {}) => ({
  name: { givenName, surname },
  shirtNumber,
  ...extra,
})

// Made-up players, like the data of the seed.
const starters: MatchLineupPlayer[] = [
  player(1, 'Brandsma', 'Tjerk'),
  player(2, 'Boerema', 'Daan', { notes: ['Gele kaart in de 34e minuut', 'Geel-rode kaart in de 70e minuut'] }),
  player(6, 'Reitsma', 'Milan', { captain: true, notes: ['Gewisseld in de 75e minuut voor Altena'] }),
  player(8, 'Idzenga', 'Thijs', { notes: ['Gewisseld in de 60e minuut voor Nepper'] }),
  player(30, 'Demo', 'Rick'),
]

const bench: MatchLineupPlayer[] = [
  player(16, 'Oosting', 'Wessel'),
  player(34, 'Nepper', 'Gerrit', { notes: ['Ingevallen in de 60e minuut voor Idzenga'] }),
]

export const Default = meta.story({
  args: { bench, headingLevel: 3, starters, team: 'sc Heerenveen' },
  name: 'De opstelling van een team',
  render: (args) => (
    <Card aria-labelledby="opstelling-kop">
      <Heading id="opstelling-kop" level={2}>
        Opstelling
      </Heading>
      <MatchLineup {...args} />
    </Card>
  ),
})

export const WithFormation = meta.story({
  args: { bench, formation: '4-3-3', headingLevel: 3, starters, team: 'sc Heerenveen' },
  name: 'Met een formatie',
  render: (args) => (
    <Card>
      <MatchLineup {...args} />
    </Card>
  ),
})

export const WithoutBench = meta.story({
  args: { bench: [], headingLevel: 3, starters: starters.slice(0, 2), team: 'Testdorp FC' },
  name: 'Zonder bank',
  render: (args) => (
    <Card>
      <MatchLineup {...args} />
    </Card>
  ),
})
