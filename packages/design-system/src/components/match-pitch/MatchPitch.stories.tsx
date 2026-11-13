import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { MatchSubstitutes } from '../match-substitutes/MatchSubstitutes'
import { MatchPitch, type MatchPitchTeam } from './MatchPitch'
import { type PitchPlayerData } from './PitchPlayer'

const meta = preview.meta({
  argTypes: {
    extraTime: { description: 'Of de wedstrijd in verlenging ging. De ringen lopen dan tot 120 minuten.' },
    headingLevel: { description: 'Het niveau van de koppen met de teams in de lijst onder het veld.' },
    opponent: {
      description:
        'De tegenstander: bovenaan op een rechtop veld, rechts op een liggend veld. Laat je hem weg, dan staat alleen sc Heerenveen op het veld, en zegt het onderdeel niets over hem.',
    },
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
          'De opstelling van beide teams op een veld, getekend uit de formatie en de volgorde van de spelers: de keeper staat vooraan, daarna komt de formatie rij voor rij, en elke rij loopt van links naar rechts, gezien in de richting van de aanval van het team.',
          'Een ring om elke speler toont de minuten die hij speelde, en merken tonen doelpunten, kaarten, wissels en de aanvoerder.',
          'Een schermlezer hoort per team een lijst met één zin per speler, en onder het veld staat dezelfde opstelling als lijst.',
          'Het veld is zo groot als er teams op staan. Staan beide teams erop, dan is het het hele veld. Is er van één team geen bruikbare formatie, dan staat alleen de helft van het andere team op het veld, op dezelfde schaal. Is er van geen van beide een formatie, dan is er geen veld en staat de lijst open, met een zin over elk team.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/MatchPitch',
})

const player = (
  shirtNumber: null | number,
  surname: string,
  givenName: string,
  rest: Partial<PitchPlayerData> = {},
): PitchPlayerData => ({ minutesPlayed: 90, name: { givenName, surname }, shirtNumber, ...rest })

// Made-up players and a made-up club, like the data of the seed.
// The numbers of a 4-2-3-1, from the keeper to the attack, each row from left to right: 1, then
// 5 4 3 2, then 6 8, then 11 10 7, then 9.
const ourPlayers = (formationRest: Record<number, Partial<PitchPlayerData>> = {}): PitchPlayerData[] =>
  [
    player(1, 'Demo', 'Rick', { captain: true }),
    player(5, 'Idzenga', 'Thijs', { minutesPlayed: 62, substitutedOffAt: 62 }),
    player(4, 'Nepper', 'Gerrit'),
    player(3, 'Maquette', 'Wim'),
    player(2, 'Proefveld', 'Ties'),
    player(6, 'Boerema', 'Daan', { card: { kind: 'yellow-card', minute: 27 } }),
    player(8, 'Reitsma', 'Milan'),
    player(11, 'Monster', 'Sven'),
    player(10, 'Voorbeeld', 'Jelle', { goals: [{ minute: 12 }] }),
    player(7, 'Schijn', 'Luuk', { minutesPlayed: 78, substitutedOffAt: 78 }),
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

// The players are named after the place they have in the formation, so a story shows that the
// first player of a row stands on the left hand of the team, on both pitches.
const byPlace = (): PitchPlayerData[] =>
  [
    ['Keeper', 'Doel'],
    ['Linksback', 'Achter'],
    ['Midvoor links', 'Achter'],
    ['Midvoor rechts', 'Achter'],
    ['Rechtsback', 'Achter'],
    ['Linksmidden', 'Midden'],
    ['Centraal links', 'Midden'],
    ['Centraal rechts', 'Midden'],
    ['Rechtsmidden', 'Midden'],
    ['Spits links', 'Voor'],
    ['Spits rechts', 'Voor'],
  ].map(([surname, givenName], index) => player(index + 1, surname ?? '', givenName ?? ''))

export const LeftToRight = meta.story({
  args: {
    headingLevel: 3,
    opponent: opponent('4-4-2', byPlace()),
    ours: ours('4-4-2', byPlace()),
  },
  decorators: [phone],
  name: 'Een rij loopt van links naar rechts',
})

export const LeftToRightLyingDown = meta.story({
  args: {
    headingLevel: 3,
    opponent: opponent('4-4-2', byPlace()),
    ours: ours('4-4-2', byPlace()),
  },
  name: 'Een rij loopt van links naar rechts, liggend',
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

export const HalfPitch = meta.story({
  args: {
    headingLevel: 3,
    opponent: opponent(null),
    ours: ours('4-3-3'),
  },
  decorators: [phone],
  name: 'Het halve veld van sc Heerenveen',
})

export const HalfPitchOpponent = meta.story({
  args: {
    headingLevel: 3,
    opponent: opponent('4-4-2'),
    ours: ours(null),
  },
  decorators: [phone],
  name: 'Het halve veld van alleen de tegenstander',
})

export const HalfPitchLyingDown = meta.story({
  args: {
    headingLevel: 3,
    opponent: opponent('4-4-2', theirPlayers().slice(0, 10)),
    ours: ours('4-2-3-1'),
  },
  name: 'Het halve veld liggend',
})

export const HalfPitchOpponentLyingDown = meta.story({
  args: {
    headingLevel: 3,
    opponent: opponent('4-4-2'),
    ours: ours(null),
  },
  name: 'Het halve veld van alleen de tegenstander liggend',
})

export const NoPitch = meta.story({
  args: {
    headingLevel: 3,
    opponent: opponent(null),
    ours: ours(null),
  },
  decorators: [phone],
  name: 'Geen enkel team',
})

export const WithSubstitutes = meta.story({
  args: {
    headingLevel: 3,
    opponent: opponent('4-4-2'),
    ours: ours('4-3-3'),
  },
  decorators: [phone],
  name: 'Met de wissels onder het veld',
  render: (args) => (
    <MatchPitch {...args}>
      <MatchSubstitutes.Group>
        <MatchSubstitutes
          headingLevel={3}
          ours
          substitutes={[
            {
              minute: 62,
              minutesPlayed: 28,
              name: { givenName: 'Gerrit', surname: 'Nepper' },
              playerOut: { givenName: 'Thijs', surname: 'Idzenga' },
              shirtNumber: 12,
            },
          ]}
          team="sc Heerenveen"
        />
        <MatchSubstitutes
          headingLevel={3}
          ours={false}
          substitutes={[
            {
              minute: 55,
              minutesPlayed: 35,
              name: { givenName: 'Kai', surname: 'Banklaan' },
              playerOut: { givenName: 'Teun', surname: 'Consectetur' },
              shirtNumber: 14,
            },
          ]}
          team="Testdorp FC"
        />
      </MatchSubstitutes.Group>
    </MatchPitch>
  ),
})

export const WithoutShirtNumbers = meta.story({
  args: {
    headingLevel: 3,
    opponent: opponent(
      '4-4-2',
      theirPlayers().map((one) => ({ ...one, shirtNumber: null })),
    ),
    ours: ours(
      '4-3-3',
      ourPlayers().map((one) => ({ ...one, shirtNumber: null })),
    ),
  },
  decorators: [phone],
  name: 'Zonder rugnummers, zoals in de oude opstellingen',
  render: (args) => (
    <MatchPitch {...args}>
      <MatchSubstitutes.Group>
        <MatchSubstitutes
          headingLevel={3}
          ours
          substitutes={[
            {
              minute: 62,
              minutesPlayed: 28,
              name: { givenName: 'Gerrit', surname: 'Nepper' },
              playerOut: { givenName: 'Thijs', surname: 'Idzenga' },
              shirtNumber: null,
            },
            {
              minute: 80,
              minutesPlayed: 10,
              name: { givenName: 'Ties', surname: 'Proefveld' },
              playerOut: { givenName: 'Luuk', surname: 'Schijn' },
              shirtNumber: null,
            },
          ]}
          team="sc Heerenveen"
        />
      </MatchSubstitutes.Group>
    </MatchPitch>
  ),
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
