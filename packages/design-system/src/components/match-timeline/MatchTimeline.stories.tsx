import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { MatchTimeline, type MatchTimelineEvent } from './MatchTimeline'

const meta = preview.meta({
  argTypes: {
    events: { description: 'De gebeurtenissen op volgorde van de klok, van alle soorten door elkaar.' },
  },
  component: MatchTimeline,
  parameters: {
    docs: {
      description: {
        component: [
          'Het verloop van een gespeelde wedstrijd als geordende lijst: bij elke gebeurtenis de minuut, de naam van de gebeurtenis in woorden, de spelers en het team.',
          'Doelpunten (met de assist, een strafschop of een eigen doelpunt), wissels, kaarten en gemiste strafschoppen staan op volgorde van de klok door elkaar, zodat de lijst leest zoals de wedstrijd ging.',
          'De naam van de gebeurtenis is het teken, nooit een kleur of een pictogram; een schermlezer hoort ook de minuut in woorden.',
          'Geef de lijst een kop erboven en wijs ernaar met `aria-labelledby`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/MatchTimeline',
})

const name = (surname: string, givenName?: string) => ({ givenName, surname })

// Made-up players and a made-up club, like the data of the seed.
const events: MatchTimelineEvent[] = [
  {
    assist: name('Idzenga', 'Thijs'),
    kind: 'goal',
    minute: 12,
    ours: true,
    player: name('Demo', 'Rick'),
    team: 'sc Heerenveen',
  },
  { kind: 'penalty-saved', minute: 22, ours: false, player: name('Proefveld', 'Ronald'), team: 'Testdorp FC' },
  { kind: 'yellow-card', minute: 34, ours: true, player: name('Boerema', 'Daan'), team: 'sc Heerenveen' },
  {
    kind: 'goal',
    minute: 41,
    ours: true,
    ownGoal: true,
    player: name('Demostad', 'Ties'),
    team: 'sc Heerenveen',
  },
  { kind: 'penalty-missed', minute: 50, ours: true, player: name('Reitsma', 'Milan'), team: 'sc Heerenveen' },
  {
    kind: 'substitution',
    minute: 60,
    ours: true,
    playerIn: name('Nepper', 'Gerrit'),
    playerOut: name('Idzenga', 'Thijs'),
    team: 'sc Heerenveen',
  },
  { kind: 'yellow-red-card', minute: 70, ours: true, player: name('Boerema', 'Daan'), team: 'sc Heerenveen' },
  { kind: 'goal', minute: 77, ours: true, penalty: true, player: name('Voorbeeld', 'Pieter'), team: 'sc Heerenveen' },
  {
    kind: 'red-card',
    minute: 90,
    ours: false,
    player: name('Dummydijk', 'Frank'),
    stoppageMinutes: 3,
    team: 'Testdorp FC',
  },
]

export const Default = meta.story({
  args: { events },
  name: 'Het verloop van een wedstrijd',
  render: (args) => (
    <Card aria-labelledby="verloop-kop">
      <Heading id="verloop-kop" level={2}>
        Verloop
      </Heading>
      <MatchTimeline {...args} aria-labelledby="verloop-kop" />
    </Card>
  ),
})
