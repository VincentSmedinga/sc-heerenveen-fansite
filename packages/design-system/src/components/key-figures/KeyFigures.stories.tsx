import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Heading } from '../heading/Heading'
import { KeyFigures } from './KeyFigures'

const meta = preview.meta({
  argTypes: {
    figures: {
      description:
        'Twee tot vier getallen. Elk getal heeft het getal zelf (`figure`), het woord erbij (`label`) en een korte regel die zegt wat het telt (`note`).',
      table: { type: { summary: '{ figure: string; label: string; note: string }[]' } },
    },
  },
  component: KeyFigures,
  parameters: {
    docs: {
      description: {
        component: [
          'Een rij kerngetallen zet twee tot vier grote getallen bovenaan een pagina, zoals bij een speler, zodat de bezoeker in één blik ziet waar het over gaat.',
          'Elk getal staat in een eigen kaart, met een woord en een korte regel die zegt wat het telt.',
          'De rij is een lijst: een schermlezer zegt hoeveel getallen er zijn en leest elk getal als één zin, zoals "52 doelpunten, in alle competities".',
          'Kies hem voor getallen die de pagina openen; voor feiten in een lijst onder elkaar is `ShortFact` er.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/KeyFigures',
})

// The figures stand on the page, under the name of the player, each in a card of its own.
const onPage = (children: React.ReactNode) => (
  <div className="hf-flow">
    <Heading level={1}>Testspeler Een</Heading>
    {children}
  </div>
)

export const Default = meta.story({
  args: {
    figures: [
      { figure: '52', label: 'doelpunten', note: 'in alle competities' },
      { figure: '1,26', label: 'doelpunten per wedstrijd', note: 'in de 2 seizoenen met opstellingen' },
    ],
  },
  name: 'Een rij van twee',
  render: (args) => onPage(<KeyFigures {...args} />),
})

export const Three = meta.story({
  name: 'Een rij van drie',
  render: () =>
    onPage(
      <KeyFigures
        figures={[
          { figure: '315', label: 'wedstrijden', note: 'voor Testclub' },
          { figure: '52', label: 'doelpunten', note: 'in alle competities' },
          { figure: '103', label: 'keer de nul', note: 'in 1 op de 3 wedstrijden' },
        ]}
      />,
    ),
})

export const Four = meta.story({
  name: 'Een rij van vier, twee aan twee',
  render: () =>
    onPage(
      <KeyFigures
        figures={[
          { figure: '315', label: 'wedstrijden', note: 'voor Testclub' },
          { figure: '52', label: 'doelpunten', note: 'in alle competities' },
          { figure: '1,26', label: 'doelpunten per wedstrijd', note: 'in de 2 seizoenen met opstellingen' },
          { figure: '103', label: 'keer de nul', note: 'in 1 op de 3 wedstrijden' },
        ]}
      />,
    ),
})
