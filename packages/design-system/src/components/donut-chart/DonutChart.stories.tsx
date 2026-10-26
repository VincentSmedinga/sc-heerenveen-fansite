import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { DataTable } from '../data-table/DataTable'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { DonutChart, donutChartOutcomes, type DonutChartSlice } from './DonutChart'

// The type of the props as the table of controls shows it: the compiler gives `unknown[number]`
// for the lists.
const union = (values: readonly string[]) => ({ type: { summary: values.map((value) => `'${value}'`).join(' | ') } })

const labels = ['1–15', '16–30', '31–45', '46–60', '61–75', '76–90']

const slicesOf = (values: number[]): DonutChartSlice[] =>
  values.map((value, index) => ({ label: labels[index]!, value }))

const meta = preview.meta({
  argTypes: {
    outcome: {
      control: 'radio',
      description: 'De kleur: het groen van een winst of het rood van een verlies.',
      options: donutChartOutcomes,
      table: union(donutChartOutcomes),
    },
    slices: { description: 'De plakken in de volgorde waarin ze rond gaan, met de klok mee vanaf boven.' },
    title: { description: 'De titel boven de ring.' },
  },
  component: DonutChart,
  parameters: {
    docs: {
      description: {
        component: [
          'Een donutdiagram laat zien hoe een totaal over een paar delen is verdeeld, zoals de doelpunten over de kwartieren van een wedstrijd.',
          'De ring is getekend als SVG in onze eigen code, zonder grafiekbibliotheek en zonder iets van buiten te laden.',
          'Elke plak is zo breed als zijn deel van het totaal, en het totaal staat in het gat.',
          'Bij elke plak staan de naam en de waarde als tekst, dus het diagram is te lezen zonder de kleuren.',
          'Staan twee plakken zo dicht bij elkaar dat hun tekst over elkaar zou vallen, dan schuiven de teksten op en loopt er een streepje naar hun plak.',
          'Een deel met waarde nul heeft geen plak en geen tekst, en een diagram zonder waarden toont een lege ring met een nul.',
          '',
          'De plakken hebben het groen van een winst of het rood van een verlies, zoals in de uitslagen: voor en tegen.',
          'Ze lopen op van een zwakkere tint naar de volle kleur, in de volgorde van het diagram, en een rand in de kleur van het vlak houdt elke plak los van de volgende.',
          'Die rand is wat de plakken uit elkaar houdt, en niet het verschil in kleur.',
          'In een hoog-contrastweergave (forced colors) krijgen alle plakken dezelfde kleur, en doet de rand het werk.',
          'Er is geen beweging.',
          '',
          'Het diagram is een plaatje van getallen en daarom verborgen voor een schermlezer.',
          'Zet dezelfde getallen in een `DataTable` ernaast: dat is het tekstalternatief.',
          'Het diagram is dus nooit de enige plek voor de getallen.',
          '',
          '- `title` is de titel boven de ring.',
          '- `slices` zijn de plakken met een `label` en een `value`.',
          '- `outcome` kiest tussen groen (`win`) en rood (`loss`).',
          '',
          'Meer diagrammen naast elkaar zet je in een `DonutChart.Group`.',
          'Is er niet genoeg ruimte voor ze naast elkaar, zoals op een telefoon, dan komen ze onder elkaar.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/DonutChart',
})

const caption = 'Doelpunten van sc Heerenveen per kwartier van de wedstrijd, voor en tegen'

const card = (maxInlineSize: string, against: number[], scored: number[]) => () => (
  <div style={{ maxInlineSize }}>
    <Card aria-labelledby="kwartier-kop">
      <Heading id="kwartier-kop" level={2}>
        Doelpunten per kwartier
      </Heading>
      <DonutChart.Group>
        <DonutChart outcome="win" slices={slicesOf(scored)} title="Voor" />
        <DonutChart outcome="loss" slices={slicesOf(against)} title="Tegen" />
      </DonutChart.Group>
      <DataTable
        caption={caption}
        columns={['Kwartier', 'Voor', 'Tegen']}
        rows={labels.map((label, index) => ({ cells: [scored[index]!, against[index]!], header: label }))}
      />
      <Text appearance="meta">
        Gebaseerd op 8 van de 10 gespeelde wedstrijden. Doelpunten in de verlenging tellen niet mee.
      </Text>
    </Card>
  </div>
)

const scored = [3, 5, 4, 2, 6, 7]
const against = [1, 2, 3, 2, 1, 4]

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Voor en tegen met een tabel, licht',
  render: card('31rem', against, scored),
})

export const Dark = meta.story({
  globals: { theme: 'dark' },
  name: 'Voor en tegen met een tabel, donker',
  render: card('31rem', against, scored),
})

export const NoGoalsLight = meta.story({
  globals: { theme: 'light' },
  name: 'Zonder doelpunten, een lege ring met een nul, licht',
  render: card('31rem', [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]),
})

export const NoGoalsDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Zonder doelpunten, een lege ring met een nul, donker',
  render: card('31rem', [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]),
})

export const CleanSheetLight = meta.story({
  globals: { theme: 'light' },
  name: 'Geen tegendoelpunt, alleen het diagram van voor heeft plakken, licht',
  render: card('31rem', [0, 0, 0, 0, 0, 0], scored),
})

export const NarrowLight = meta.story({
  globals: { theme: 'light' },
  name: 'Smalle plek, de diagrammen onder elkaar, licht',
  render: card('20rem', against, scored),
})

export const NarrowDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Smalle plek, de diagrammen onder elkaar, donker',
  render: card('20rem', against, scored),
})

export const Single = meta.story({
  args: { outcome: 'win', slices: slicesOf(scored), title: 'Voor' },
  name: 'Eén diagram met besturing',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <DonutChart {...args} />
    </div>
  ),
})

export const OneSlice = meta.story({
  args: { outcome: 'loss', slices: slicesOf([0, 0, 0, 0, 0, 4]), title: 'Tegen' },
  name: 'Alles in één plak, de ring is vol',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <DonutChart {...args} />
    </div>
  ),
})

export const CrowdedLight = meta.story({
  args: { outcome: 'win', slices: slicesOf([1, 1, 12, 1, 1, 1]), title: 'Voor' },
  globals: { theme: 'light' },
  name: 'Kleine plakken naast elkaar, de teksten schuiven op, licht',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <DonutChart {...args} />
    </div>
  ),
})

export const CrowdedDark = meta.story({
  args: { outcome: 'win', slices: slicesOf([1, 1, 12, 1, 1, 1]), title: 'Voor' },
  globals: { theme: 'dark' },
  name: 'Kleine plakken naast elkaar, de teksten schuiven op, donker',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <DonutChart {...args} />
    </div>
  ),
})
