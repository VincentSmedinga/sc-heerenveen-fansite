import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { MatchPitch, type MatchPitchTeam } from './MatchPitch'
import { type PitchPlayerData } from './PitchPlayer'

const meta = preview.meta({
  argTypes: {
    extraTime: { description: 'Of de wedstrijd in verlenging ging. De ringen lopen dan tot 120 minuten.' },
    headingLevel: { description: 'Het niveau van de koppen met de teams in de lijst onder het veld.' },
    opponent: { description: 'De tegenstander: bovenaan op een rechtop veld, rechts op een liggend veld.' },
    ours: { description: 'sc Heerenveen: onderaan op een rechtop veld, links op een liggend veld.' },
  },
  component: MatchPitch,
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
          'De opstelling van beide teams op een veld, getekend uit de formatie en de volgorde van de spelers: de keeper staat vooraan, daarna komt de formatie rij voor rij.',
          'Een ring om elke speler toont de minuten die hij speelde, en merken tonen doelpunten, kaarten, wissels en de aanvoerder.',
          'Een schermlezer hoort per team een lijst met één zin per speler, en onder het veld staat dezelfde opstelling als lijst.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/MatchPitch',
})

const player = (
  shirtNumber: number,
  surname: string,
  givenName: string,
  rest: Partial<PitchPlayerData> = {},
): PitchPlayerData => ({ minutesPlayed: 90, name: { givenName, surname }, shirtNumber, ...rest })

// Made-up players and a made-up club, like the data of the seed.
const ourPlayers = (formationRest: Record<number, Partial<PitchPlayerData>> = {}): PitchPlayerData[] =>
  [
    player(1, 'Demo', 'Rick', { captain: true }),
    player(2, 'Proefveld', 'Ties'),
    player(3, 'Maquette', 'Wim'),
    player(4, 'Nepper', 'Gerrit'),
    player(5, 'Idzenga', 'Thijs', { minutesPlayed: 62, substitutedOffAt: 62 }),
    player(6, 'Boerema', 'Daan', { card: { kind: 'yellow-card', minute: 27 } }),
    player(8, 'Reitsma', 'Milan'),
    player(10, 'Voorbeeld', 'Jelle', { goals: [{ minute: 12 }] }),
    player(7, 'Schijn', 'Luuk', { minutesPlayed: 78, substitutedOffAt: 78 }),
    player(11, 'Monster', 'Sven'),
    player(9, 'Sjabloon', 'Okke', { goals: [{ minute: 58 }, { minute: 90, stoppageMinutes: 2 }] }),
  ].map((one, index) => ({ ...one, ...formationRest[index] }))

const theirPlayers = (): PitchPlayerData[] => [
  player(1, 'Testma', 'Hein'),
  player(3, 'Pilot', 'Arjen'),
  player(5, 'Model', 'Stijn'),
  player(4, 'Dummy', 'Wim', { card: { kind: 'yellow-red-card', minute: 63 }, minutesPlayed: 63 }),
  player(2, 'Mock', 'Joris'),
  player(7, 'Lorem', 'Yannick', { minutesPlayed: 79, substitutedOffAt: 79 }),
  player(6, 'Ipsum', 'Marco'),
  player(8, 'Dolor', 'Ruud'),
  player(11, 'Amet', 'Bas'),
  player(9, 'Sit', 'Dylan', { goals: [{ minute: 34 }], minutesPlayed: 68, substitutedOffAt: 68 }),
  player(10, 'Consectetur', 'Teun', {
    goals: [{ minute: 77, ownGoal: true }],
    minutesPlayed: 55,
    substitutedOffAt: 55,
  }),
]

const ours = (formation: null | string, players = ourPlayers()): MatchPitchTeam => ({
  formation,
  name: 'sc Heerenveen',
  players,
})

const opponent = (formation: null | string, players = theirPlayers()): MatchPitchTeam => ({
  formation,
  name: 'Testdorp FC',
  players,
})

// The pitch lies down from 40 rem and stands upright below it: the stories hold it at the
// width of a phone, unless they are about the pitch that lies down.
const phone = (Story: () => React.JSX.Element) => (
  <div style={{ inlineSize: '24rem', maxInlineSize: '100%' }}>
    <Story />
  </div>
)

export const Default = meta.story({
  args: {
    extraTime: false,
    headingLevel: 3,
    opponent: opponent('4-4-2'),
    ours: ours('4-2-3-1'),
  },
  decorators: [phone],
  name: 'Een gewone wedstrijd',
})

export const FiveInARow = meta.story({
  args: {
    headingLevel: 3,
    opponent: opponent('4-4-2'),
    ours: ours('3-5-2'),
  },
  decorators: [phone],
  name: 'Vijf spelers in een rij',
})

export const FiveRows = meta.story({
  args: {
    headingLevel: 3,
    opponent: opponent('3-1-4-2'),
    ours: ours('4-1-2-1-2'),
  },
  decorators: [phone],
  name: 'Vijf rijen',
})

export const LongNames = meta.story({
  args: {
    headingLevel: 3,
    opponent: opponent('4-4-2'),
    ours: ours(
      '4-3-3',
      ourPlayers({
        2: { name: { givenName: 'Ties', surname: 'Proefveld-Voorbeeldstra' } },
        4: { name: { givenName: 'Gerrit', surname: 'Onwaarschijnlijkheidsveldman' } },
        7: { name: { givenName: 'Jelle', surname: 'van der Meulen-Voorbeeld' } },
      }),
    ),
  },
  decorators: [phone],
  name: 'Lange namen',
})

export const WithoutFormation = meta.story({
  args: {
    headingLevel: 3,
    opponent: opponent(null),
    ours: ours('4-3-3'),
  },
  decorators: [phone],
  name: 'Een team zonder formatie',
})

export const ExtraTime = meta.story({
  args: {
    extraTime: true,
    headingLevel: 3,
    opponent: opponent('4-4-2'),
    ours: ours(
      '4-3-3',
      ourPlayers({
        4: { minutesPlayed: 105, substitutedOffAt: 105 },
        8: { minutesPlayed: 120, substitutedOffAt: undefined },
      }),
    ),
  },
  decorators: [phone],
  name: 'Met verlenging',
})

export const LyingDown = meta.story({
  args: {
    headingLevel: 3,
    opponent: opponent('4-4-2'),
    ours: ours('4-2-3-1'),
  },
  name: 'Het veld liggend',
})
