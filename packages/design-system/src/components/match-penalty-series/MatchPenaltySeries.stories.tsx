import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { type MatchPenaltyKick, type MatchPenaltyRound, MatchPenaltySeries } from './MatchPenaltySeries'

const meta = preview.meta({
  argTypes: {
    headingLevel: { description: 'Het niveau van de kop "Strafschoppenserie" in de opbouw van de pagina.' },
    opponent: { description: 'De naam van de tegenstander, voluit.' },
    rounds: {
      description:
        'De rondes in de volgorde waarin ze zijn genomen, met per ronde het schot van beide teams: de speler als die bekend is en de uitkomst raak, naast of gestopt.',
    },
  },
  component: MatchPenaltySeries,
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
          'De strafschoppenserie van een wedstrijd, twee keer: als rij schoten per team met het totaal, voor een snelle blik, en als tabel met een regel per ronde, met de nemers van beide teams en de stand na de ronde.',
          'De tabel is wat een schermlezer leest: elke cel begint met "Raak:", "Naast:" of "Gestopt:", en de totalen noemen hun team.',
          'Bij een schot dat niet raak was, staat het woord ook naast de speler, dus een doorgekruiste ring is nooit het enige teken.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/MatchPenaltySeries',
})

// Made-up players of made-up teams.
const scored = (givenName: string, surname: string): MatchPenaltyKick => ({
  player: { givenName, surname },
  result: 'scored',
})
const missed = (givenName: string, surname: string): MatchPenaltyKick => ({
  player: { givenName, surname },
  result: 'missed',
})
const saved = (givenName: string, surname: string): MatchPenaltyKick => ({
  player: { givenName, surname },
  result: 'saved',
})

// sc Heerenveen wins 4–3 after five rounds.
const fiveRounds: MatchPenaltyRound[] = [
  { ours: scored('Joost', 'Haverkamp'), theirs: scored('Ruud', 'Maas') },
  { ours: scored('Gerrit', 'Stellingwerf'), theirs: scored('Marco', 'Smeets') },
  { ours: missed('Mees', 'Hoekstra'), theirs: scored('Bas', 'Meijer') },
  { ours: scored('Okke', 'Terpstra'), theirs: saved('Joris', 'Kok') },
  { ours: scored('Thijs', 'Zijlstra'), theirs: missed('Stijn', 'Peters') },
]

// Level after five rounds, so the teams kick on: sc Heerenveen wins 5–4 in the sixth.
const decidingRounds: MatchPenaltyRound[] = [
  { ours: scored('Joost', 'Haverkamp'), theirs: scored('Ruud', 'Maas') },
  { ours: scored('Gerrit', 'Stellingwerf'), theirs: scored('Marco', 'Smeets') },
  { ours: missed('Mees', 'Hoekstra'), theirs: scored('Bas', 'Meijer') },
  { ours: scored('Okke', 'Terpstra'), theirs: saved('Joris', 'Kok') },
  { ours: scored('Thijs', 'Zijlstra'), theirs: scored('Stijn', 'Peters') },
  { ours: scored('Sven', 'Kuipers'), theirs: saved('Arjen', 'Dekker') },
]

// A kicker of the opponent whom the report does not name.
const unknownPlayer: MatchPenaltyRound[] = [
  { ours: scored('Joost', 'Haverkamp'), theirs: { result: 'scored' } },
  { ours: scored('Gerrit', 'Stellingwerf'), theirs: { result: 'saved' } },
  { ours: missed('Mees', 'Hoekstra'), theirs: scored('Bas', 'Meijer') },
  { ours: scored('Okke', 'Terpstra'), theirs: { result: 'missed' } },
  { ours: scored('Thijs', 'Zijlstra'), theirs: scored('Stijn', 'Peters') },
]

export const Default = meta.story({
  args: { headingLevel: 2, opponent: 'Testdorp FC', rounds: fiveRounds },
  name: 'Een serie van vijf rondes',
})

export const DecidingRounds = meta.story({
  args: { headingLevel: 2, opponent: 'Testdorp FC', rounds: decidingRounds },
  name: 'Een serie met beslissende rondes',
})

export const UnknownPlayer = meta.story({
  args: { headingLevel: 2, opponent: 'Testdorp FC', rounds: unknownPlayer },
  name: 'Een schot van een onbekende speler',
})
