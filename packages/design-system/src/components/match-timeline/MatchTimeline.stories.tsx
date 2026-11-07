import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { MatchTimeline, type MatchTimelineEvent } from './MatchTimeline'

const meta = preview.meta({
  argTypes: {
    events: { description: 'De gebeurtenissen op volgorde van de klok, van alle soorten door elkaar.' },
    extraTime: { description: 'Of de wedstrijd in verlenging ging. Er komt dan een derde blok, Verlenging.' },
    headingLevel: { description: 'Het niveau van de koppen van de blokken in de opbouw van de pagina.' },
  },
  component: MatchTimeline,
  decorators: [
    (Story) => (
      <Card aria-labelledby="verloop-kop">
        <Heading id="verloop-kop" level={2}>
          Verloop
        </Heading>
        <Story />
      </Card>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'Het verloop van een gespeelde wedstrijd in twee helften naast elkaar, en na een verlenging een derde blok eronder.',
          'Elke gebeurtenis is één regel: de minuut in een pil, gevuld voor sc Heerenveen en open voor de tegenstander, en daarna het pictogram en de naam.',
          'Een woord naast een pictogram dat hetzelfde zegt, blijft weg; een schermlezer hoort het team, de minuut en de soort gebeurtenis vooraan.',
          'De blokken zijn genummerde lijsten met een naam, onder een kop van het niveau dat de pagina kiest.',
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
const ours = 'sc Heerenveen'
const theirs = 'Testdorp FC'

const regularTime: MatchTimelineEvent[] = [
  {
    assist: name('Idzenga', 'Thijs'),
    kind: 'goal',
    minute: 12,
    ours: true,
    player: name('Demo', 'Rick'),
    team: ours,
  },
  { kind: 'yellow-card', minute: 34, ours: false, player: name('Proefveld', 'Ronald'), team: theirs },
  { kind: 'goal', minute: 45, ours: false, player: name('Dummydijk', 'Frank'), stoppageMinutes: 2, team: theirs },
  {
    kind: 'substitution',
    minute: 60,
    ours: true,
    playerIn: name('Nepper', 'Gerrit'),
    playerOut: name('Idzenga', 'Thijs'),
    team: ours,
  },
  { kind: 'goal', minute: 77, ours: true, penalty: true, player: name('Voorbeeld', 'Pieter'), team: ours },
  { kind: 'red-card', minute: 90, ours: false, player: name('Dummydijk', 'Frank'), stoppageMinutes: 3, team: theirs },
]

export const Default = meta.story({
  args: { events: regularTime, extraTime: false, headingLevel: 3 },
  name: 'Een wedstrijd van 90 minuten',
})

export const ExtraTime = meta.story({
  args: {
    events: [
      ...regularTime.slice(0, 3),
      { kind: 'goal', minute: 88, ours: true, player: name('Voorbeeld', 'Pieter'), team: ours },
      {
        kind: 'substitution',
        minute: 95,
        ours: true,
        playerIn: name('Boerema', 'Daan'),
        playerOut: name('Nepper', 'Gerrit'),
        team: ours,
      },
      { kind: 'yellow-card', minute: 104, ours: true, player: name('Boerema', 'Daan'), team: ours },
      { kind: 'goal', minute: 118, ours: true, player: name('Demo', 'Rick'), stoppageMinutes: 1, team: ours },
    ],
    extraTime: true,
    headingLevel: 3,
  },
  name: 'Met verlenging',
})

export const Penalties = meta.story({
  args: {
    events: [
      { kind: 'penalty-saved', minute: 22, ours: false, player: name('Proefveld', 'Ronald'), team: theirs },
      { kind: 'goal', minute: 41, ours: true, penalty: true, player: name('Voorbeeld', 'Pieter'), team: ours },
      { kind: 'penalty-missed', minute: 67, ours: true, player: name('Reitsma', 'Milan'), team: ours },
      { kind: 'goal', minute: 84, ours: false, penalty: true, player: name('Dummydijk', 'Frank'), team: theirs },
      { kind: 'goal', minute: 109, ours: false, player: name('Oefenhoek', 'Sjoerd'), team: theirs },
      { kind: 'goal', minute: 117, ours: true, player: name('Demo', 'Rick'), team: ours },
    ],
    extraTime: true,
    headingLevel: 3,
  },
  name: 'Een wedstrijd die op strafschoppen eindigt',
})

export const OwnGoalAndYellowRedCard = meta.story({
  args: {
    events: [
      { kind: 'yellow-card', minute: 18, ours: true, player: name('Boerema', 'Daan'), team: ours },
      {
        kind: 'goal',
        minute: 39,
        ours: true,
        ownGoal: true,
        player: name('Demostad', 'Ties'),
        team: ours,
      },
      { kind: 'yellow-red-card', minute: 70, ours: true, player: name('Boerema', 'Daan'), team: ours },
      { kind: 'goal', minute: 90, ours: false, player: name('Dummydijk', 'Frank'), stoppageMinutes: 4, team: theirs },
    ],
    extraTime: false,
    headingLevel: 3,
  },
  name: 'Een eigen doelpunt en een geel-rode kaart',
})

export const WithHighlightedLine = meta.story({
  args: {
    events: [
      { kind: 'goal', minute: 12, ours: true, player: name('Demo', 'Rick'), team: ours },
      {
        assist: name('Idzenga', 'Thijs'),
        highlighted: true,
        kind: 'goal',
        minute: 58,
        ours: true,
        player: name('Voorbeeld', 'Jelle'),
        team: ours,
      },
      { kind: 'yellow-card', minute: 63, ours: false, player: name('Dummydijk', 'Frank'), team: theirs },
    ],
    extraTime: false,
    headingLevel: 3,
  },
  name: 'Een regel met een kader',
  parameters: {
    docs: {
      description: {
        story:
          'Het kader laat zien welke regel een beheerder net veranderde, zoals in een voorbeeld naast een formulier.',
      },
    },
  },
})
