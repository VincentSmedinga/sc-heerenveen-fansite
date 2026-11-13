import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { PitchPlayer } from './PitchPlayer'

const meta = preview.meta({
  argTypes: {
    captain: { description: 'Of de speler de aanvoerder is: een "A" linksonder en het woord in de zin.' },
    card: { description: 'De zwaarste kaart die hij kreeg, met de minuut.' },
    extraTime: { description: 'Of de wedstrijd in verlenging ging. De ring loopt dan tot 120 minuten.' },
    goals: { description: 'Zijn doelpunten. Het merk is rood als ze allemaal eigen doelpunten zijn.' },
    minutesFrom: { description: 'De minuut waarop hij inviel. Een basisspeler laat het weg.' },
    minutesPlayed: { description: 'De minuten die hij speelde. De ring toont ze als een boog.' },
    name: { description: 'De naam. De achternaam staat onder de speler.' },
    ours: { description: 'Of hij voor sc Heerenveen speelt: het vlak is gevuld, bij de tegenstander open.' },
    shirtNumber: { description: 'Het rugnummer, in het vlak. Een speler zonder rugnummer laat het vlak leeg (null).' },
    substitutedOffAt: { description: 'De minuut waarop hij eruit ging. Een speler die bleef staan laat het weg.' },
  },
  component: PitchPlayer,
  decorators: [
    (Story) => (
      <ol
        style={{
          background: 'var(--hf-colour-background-pitch)',
          borderRadius: '0.5rem',
          display: 'grid',
          inlineSize: '8rem',
          listStyle: 'none',
          margin: 0,
          padding: '1.5rem 1rem 1rem',
        }}
      >
        <Story />
      </ol>
    ),
  ],
  parameters: {
    docs: {
      description: {
        component: [
          'Eén speler op het veld: een rond vlak met het rugnummer, een ring met de minuten die hij speelde, merken voor een doelpunt, een kaart, een wissel en de aanvoerder, en de achternaam eronder.',
          'Het veld (`MatchPitch`) zet de spelers op hun plek. Een schermlezer hoort één zin per speler en slaat de tekening over.',
          'Hij is gebouwd uit `PlayerDisc`, `MatchEventIcon` en `PlayerName`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/PitchPlayer',
})

export const Default = meta.story({
  args: {
    captain: true,
    card: { kind: 'yellow-card', minute: 27 },
    extraTime: false,
    goals: [{ minute: 12 }],
    minutesPlayed: 62,
    name: { givenName: 'Rick', surname: 'Demo' },
    ours: true,
    shirtNumber: 9,
    substitutedOffAt: 62,
  },
  name: 'Een speler met alle merken',
})

export const Opponent = meta.story({
  args: {
    minutesPlayed: 90,
    name: { givenName: 'Hein', surname: 'Testma' },
    ours: false,
    shirtNumber: 1,
  },
  name: 'Een speler van de tegenstander',
})

export const CameOn = meta.story({
  args: {
    minutesFrom: 62,
    minutesPlayed: 28,
    name: { givenName: 'Gerrit', surname: 'Nepper' },
    ours: true,
    shirtNumber: 14,
  },
  name: 'Ingevallen: de ring begint bij zijn minuut',
})

export const SentOff = meta.story({
  args: {
    card: { kind: 'red-card', minute: 45 },
    minutesPlayed: 45,
    name: { givenName: 'Wim', surname: 'Dummy' },
    ours: true,
    shirtNumber: 4,
  },
  name: 'Rode kaart: de ring stopt',
})

export const OwnGoal = meta.story({
  args: {
    goals: [{ minute: 77, ownGoal: true }],
    minutesPlayed: 90,
    name: { givenName: 'Teun', surname: 'Consectetur' },
    ours: false,
    shirtNumber: 10,
  },
  name: 'Eigen doelpunt',
})

export const WithoutShirtNumber = meta.story({
  args: {
    captain: true,
    minutesPlayed: 90,
    name: { givenName: 'Sieb', surname: 'Zonderman' },
    ours: true,
    shirtNumber: null,
  },
  name: 'Zonder rugnummer: het vlak blijft leeg',
})
