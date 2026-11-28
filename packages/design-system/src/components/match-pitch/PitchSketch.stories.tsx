import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { PitchSketch, type PitchSketchPlayer } from './PitchSketch'

const meta = preview.meta({
  argTypes: {
    label: { description: 'De naam van de lijst met spelers, zoals "Jouw vier".' },
    places: {
      description:
        'De plekken, in volgorde. Een plek zonder speler is `null`. Een speler heeft een linie, zijn hele naam, de naam in de lijst, een rugnummer of `null`, en zo nodig een tekst die zegt dat hij niet meetelt.',
    },
  },
  component: PitchSketch,
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
          'Een paar spelers op een klein half veld, met dezelfde spelers als genummerde lijst ernaast of eronder, zoals je vier in Fjouwer.',
          'Kies hem om een kleine selectie in één keer als ploeg te laten zien; voor de opstelling van een wedstrijd is er de `MatchPitch`. Het veld is alleen een tekening: een schermlezer hoort de lijst, met één zin per plek.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/PitchSketch',
})

// Made-up players, like the data of the seed.
const player = (
  line: PitchSketchPlayer['line'],
  givenName: string,
  surname: string,
  shirtNumber: null | number,
  rest: Partial<PitchSketchPlayer> = {},
): PitchSketchPlayer => ({
  line,
  name: `${givenName} ${surname}`,
  shirtNumber,
  shortName: surname,
  ...rest,
})

const keeper = player('keeper', 'Rick', 'Demo', 1)
const defender = player('verdediger', 'Thijs', 'Idzenga', 4)
const midfielder = player('middenvelder', 'Daan', 'Boerema', 8)
const attacker = player('aanvaller', 'Okke', 'Sjabloon', 9)

export const Default = meta.story({
  args: { label: 'Jouw vier', places: [keeper, defender, midfielder, attacker] },
  name: 'Vier spelers',
})

export const TwoOnALine = meta.story({
  args: {
    label: 'Jouw vier',
    places: [defender, player('verdediger', 'Gerrit', 'Nepper', 21), midfielder, attacker],
  },
  name: 'Twee op een linie',
})

export const WithoutShirtNumber = meta.story({
  args: { label: 'Jouw vier', places: [keeper, { ...defender, shirtNumber: null }, midfielder, attacker] },
  name: 'Speler zonder rugnummer',
})

export const NotCounting = meta.story({
  args: { label: 'Jouw vier', places: [keeper, { ...defender, note: 'telt niet mee' }, midfielder, attacker] },
  name: 'Speler die niet meetelt',
})

export const EmptyPlaces = meta.story({
  args: { label: 'Jouw vier', places: [midfielder, null, null, null] },
  name: 'Lege plekken',
})

export const LongNames = meta.story({
  args: {
    label: 'Jouw vier',
    places: [
      player('keeper', 'Maximiliaan', 'Voorbeeldhuizenga', 23),
      player('verdediger', 'Bartholomeus', 'Van der Proefveldstra', 33),
      { ...player('verdediger', 'Thom', 'Van Testmakerij', 5), shortName: 'Thom van Testmakerij' },
      player('aanvaller', 'Sam', 'Sjabloonsma-Maquette', 99, { note: 'telt niet mee' }),
    ],
  },
  name: 'Lange namen',
})
