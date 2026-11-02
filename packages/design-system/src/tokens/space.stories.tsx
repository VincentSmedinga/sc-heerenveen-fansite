import preview from '#.storybook/preview'

import { Card } from '../components/card/Card'
import { Heading } from '../components/heading/Heading'
import { Text } from '../components/text/Text'
import { SpaceSteps } from '../docs/SpaceDocs'

const meta = preview.meta({
  title: 'Tokens/Ruimte',
})

export const Steps = meta.story({
  name: 'Stappen',
  render: () => <SpaceSteps />,
})

// A small table with made-up numbers: a large building block in the flow of a card.
const ScorersTable = () => (
  <table>
    <caption className="hf-visually-hidden">Doelpuntenmakers</caption>
    <thead>
      <tr>
        <th scope="col">Speler</th>
        <th className="hf-numeric" scope="col">
          <abbr title="Doelpunten">D</abbr>
        </th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <th scope="row">Testspeler</th>
        <td className="hf-numeric">7</td>
      </tr>
      <tr>
        <th scope="row">Voorbeeldspeler</th>
        <td className="hf-numeric">4</td>
      </tr>
    </tbody>
  </table>
)

const narrow = { maxInlineSize: '24rem' }

export const Flow = meta.story({
  name: 'Standaardruimte',
  parameters: {
    docs: {
      description: {
        story:
          'De kaart bepaalt de ruimte tussen wat erin staat. Onder tekst en onder een lijst staat de gemiddelde ruimte, en onder het laatste kind geen.',
      },
    },
  },
  render: () => (
    <Card aria-label="Standaardruimte" style={narrow}>
      <Text>Onder deze alinea staat de gemiddelde ruimte.</Text>
      <Text>Onder deze ook.</Text>
      <Text>Onder de laatste staat geen ruimte: de kaart heeft haar eigen binnenruimte.</Text>
    </Card>
  ),
})

export const FlowBelowHeading = meta.story({
  name: 'Onder een kop',
  parameters: {
    docs: {
      description: {
        story: 'Onder een kop staat de grote ruimte, welk niveau of welke stijl de kop ook heeft.',
      },
    },
  },
  render: () => (
    <Card aria-labelledby="ruimte-kop" style={narrow}>
      <Heading id="ruimte-kop" level={2}>
        Laatste nieuws
      </Heading>
      <Text>Onder de kop staat de grote ruimte.</Text>
      <Heading appearance={4} level={3}>
        Een kop met de stijl van kop 4
      </Heading>
      <Text>Ook onder deze kop staat de grote ruimte.</Text>
    </Card>
  ),
})

export const FlowBelowLargeBlock = meta.story({
  name: 'Onder een groot blok',
  parameters: {
    docs: {
      description: {
        story:
          'Onder een groot blok, zoals een tabel of een grafiek, staat de grote ruimte. Tekst vlak boven een groot blok houdt de gemiddelde ruimte.',
      },
    },
  },
  render: () => (
    <Card aria-label="Onder een groot blok" style={narrow}>
      <Text>Boven de tabel staat de gemiddelde ruimte.</Text>
      <ScorersTable />
      <Text appearance="meta">Onder de tabel staat de grote ruimte.</Text>
    </Card>
  ),
})

export const FlowBeforeHeading = meta.story({
  name: 'Voor een kop',
  parameters: {
    docs: {
      description: {
        story:
          'Wat voor een kop staat, krijgt de grote ruimte onder zich, zodat de kop bij de tekst eronder hoort. In de tekst van een artikel is dat de extra grote ruimte.',
      },
    },
  },
  render: () => (
    <Card aria-labelledby="ruimte-voor-kop" style={narrow}>
      <Heading id="ruimte-voor-kop" level={2}>
        Wedstrijden
      </Heading>
      <Text>Onder deze alinea staat de grote ruimte, want er volgt een kop.</Text>
      <Heading appearance={4} level={3}>
        Programma
      </Heading>
      <Text>Onder deze alinea staat de gemiddelde ruimte.</Text>
      <Text>Het laatste kind heeft geen ruimte onder zich.</Text>
    </Card>
  ),
})

export const FlowUtility = meta.story({
  name: 'Met een hulpklasse',
  parameters: {
    docs: {
      description: {
        story:
          'Een hulpklasse `hf-space-end-0`, `-xs`, `-s`, `-m` of `-l` zet de ruimte onder één element en wint altijd van de stroom. Hier staat de kop met `hf-space-end-xs` dicht op de datum eronder.',
      },
    },
  },
  render: () => (
    <Card aria-labelledby="ruimte-hulpklasse" style={narrow}>
      <Heading className="hf-space-end-xs" id="ruimte-hulpklasse" level={2}>
        Een kop dicht op de datum
      </Heading>
      <Text appearance="meta">2 november 2026</Text>
      <Text>Onder de datum staat de gemiddelde ruimte van de stroom.</Text>
    </Card>
  ),
})
