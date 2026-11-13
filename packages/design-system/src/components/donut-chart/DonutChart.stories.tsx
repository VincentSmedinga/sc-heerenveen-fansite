import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { DataTable } from '../data-table/DataTable'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { DonutChart, type DonutChartSlice, donutChartTones } from './DonutChart'

// The type of the props as the table of controls shows it: the compiler gives `unknown[number]`
// for the lists.
const union = (values: readonly string[]) => ({ type: { summary: values.map((value) => `'${value}'`).join(' | ') } })

const labels = ['jan', 'feb', 'mrt', 'apr', 'mei', 'jun']

const slicesOf = (values: number[]): DonutChartSlice[] =>
  values.map((value, index) => ({ label: labels[index]!, value }))

const meta = preview.meta({
  argTypes: {
    centre: {
      description:
        'De tekst in het gat van de ring in plaats van het totaal, zoals `45–31` voor de doelpunten die we maakten en kregen.',
    },
    labels: {
      description:
        'Of de naam en de waarde van elke plak als tekst rond de ring staan. Zonder die tekst is de ring kleiner en op zichzelf, en moet de pagina de getallen in een tabel geven.',
    },
    size: {
      description:
        'Met `small` is de ring kleiner, met een kleinere tekst in het gat, om naast een groter diagram te staan in een `DonutChart.Group`, zoals de doelpunten naast de uitslagen.',
      table: union(['small']),
    },
    slices: {
      description:
        'De plakken in de volgorde waarin ze rond gaan, met de klok mee vanaf boven. Een plak kan een eigen `tone` hebben.',
    },
    title: { description: 'De titel boven de ring. Zonder titel staat er niets boven.' },
    tone: {
      control: 'radio',
      description:
        'Wat de kleur zegt: het groen van iets goeds (`positive`) of het rood van iets slechts (`negative`).',
      options: donutChartTones,
      table: union(donutChartTones),
    },
  },
  component: DonutChart,
  parameters: {
    docs: {
      description: {
        component: [
          'Een donutdiagram laat zien hoe een totaal over een paar delen is verdeeld, zoals de aanmeldingen over de maanden van een half jaar. Het totaal staat in het gat, en bij elke plak staan de naam en de waarde als tekst.',
          'De plakken zijn groen voor iets positiefs, rood voor iets negatiefs en grijs voor gelijk, zoals de uitkomst van een wedstrijd. De pagina bepaalt welke getallen positief zijn: het onderdeel kent de betekenis niet.',
          'Met `ranked` gaan de plakken van goed naar slecht en krijgen de uitersten de sterkste kleur. Een `DonutChart.Swatch` geeft een rij van een tabel precies de kleur van de plak.',
          'Meer diagrammen naast elkaar zet je in een `DonutChart.Group`.',
          'Het diagram is een plaatje van getallen en daarom verborgen voor een schermlezer: zet dezelfde getallen in een `DataTable` ernaast, want het diagram is nooit de enige plek voor de getallen.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/DonutChart',
})

const caption = 'Aanmeldingen en afmeldingen per maand, van januari tot en met juni'

type Surface = 'default' | 'soft' | 'warm'

const surfaceNames = { default: 'wit', soft: 'zacht', warm: 'warm' } as const

const MonthCard = ({
  maxInlineSize,
  negative,
  positive,
  surface = 'default',
}: {
  maxInlineSize: string
  negative: number[]
  positive: number[]
  surface?: Surface
}) => (
  <div style={{ maxInlineSize }}>
    <Card aria-labelledby={`maand-kop-${surface}`} surface={surface}>
      <Heading id={`maand-kop-${surface}`} level={2}>
        {surface === 'default' ? 'Aan- en afmeldingen per maand' : `Aan- en afmeldingen, ${surfaceNames[surface]} vlak`}
      </Heading>
      <DonutChart.Group>
        <DonutChart slices={slicesOf(positive)} title="Aangemeld" tone="positive" />
        <DonutChart slices={slicesOf(negative)} title="Afgemeld" tone="negative" />
      </DonutChart.Group>
      <DataTable
        caption={caption}
        columns={['Maand', 'Aangemeld', 'Afgemeld']}
        rows={labels.map((label, index) => ({ cells: [positive[index]!, negative[index]!], header: label }))}
      />
      <Text appearance="meta">Gebaseerd op de meldingen van het eerste halfjaar.</Text>
    </Card>
  </div>
)

const card = (maxInlineSize: string, negative: number[], positive: number[]) => () => (
  <MonthCard maxInlineSize={maxInlineSize} negative={negative} positive={positive} />
)

const positive = [3, 5, 4, 2, 6, 7]
const negative = [1, 2, 3, 2, 1, 4]

export const Default = meta.story({
  args: { slices: slicesOf(positive), title: 'Aangemeld', tone: 'positive' },
  name: 'Diagram',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <DonutChart {...args} />
    </div>
  ),
})

export const Months = meta.story({
  name: 'Twee diagrammen met een tabel',
  render: card('31rem', negative, positive),
})

const surfaces = () => (
  <div style={{ display: 'grid', gap: '1.5rem' }}>
    {(['default', 'soft', 'warm'] as const).map((surface) => (
      <MonthCard key={surface} maxInlineSize="31rem" negative={negative} positive={positive} surface={surface} />
    ))}
  </div>
)

export const Surfaces = meta.story({
  name: 'Op het witte, het zachte en het warme vlak',
  render: surfaces,
})

export const Empty = meta.story({
  name: 'Zonder waarden, een lege ring met een nul',
  render: card('31rem', [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]),
})

export const OneEmpty = meta.story({
  name: 'Eén diagram zonder waarden, het andere heeft plakken',
  render: card('31rem', [0, 0, 0, 0, 0, 0], positive),
})

export const OneSlice = meta.story({
  args: { slices: slicesOf([0, 0, 0, 0, 0, 4]), title: 'Afgemeld', tone: 'negative' },
  name: 'Alles in één plak, de ring is vol',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <DonutChart {...args} />
    </div>
  ),
})

export const Crowded = meta.story({
  args: { slices: slicesOf([1, 1, 12, 1, 1, 1]), title: 'Aangemeld', tone: 'positive' },
  name: 'Kleine plakken naast elkaar, de teksten schuiven op',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <DonutChart {...args} />
    </div>
  ),
})

const scores = [
  { label: '4–0', tone: 'positive', value: 2 },
  { label: '4–1', tone: 'positive', value: 1 },
  { label: '3–0', tone: 'positive', value: 2 },
  { label: '2–2', tone: 'neutral', value: 1 },
  { label: '0–0', tone: 'neutral', value: 1 },
  { label: '0–1', tone: 'negative', value: 5 },
] as const satisfies DonutChartSlice[]

const outcomes = [
  { heading: 'Winst', tone: 'positive', word: 'winst' },
  { heading: 'Gelijk', tone: 'neutral', word: 'gelijk' },
  { heading: 'Verlies', tone: 'negative', word: 'verlies' },
] as const

const ScoresCard = ({
  maxInlineSize = '24rem',
  slices,
}: {
  maxInlineSize?: string
  slices: readonly DonutChartSlice[]
}) => (
  <div style={{ maxInlineSize }}>
    <Card aria-labelledby="uitslagen-kop" surface="warm">
      <Heading id="uitslagen-kop" level={2}>
        Hoe vaak welke uitslag
      </Heading>
      <DonutChart labels={false} ranked slices={slices} />
      <DataTable.Group>
        {outcomes.map(({ heading, tone, word }) => {
          const rows = slices.flatMap((slice, index) => (slice.tone === tone ? [{ index, slice }] : []))

          return rows.length === 0 ? null : (
            <DataTable
              caption={`Uitslagen met ${word} en hoe vaak ze voorkwamen`}
              columns={[heading, { hidden: true, name: 'Keer' }]}
              key={tone}
              rows={rows.map(({ index, slice }) => ({
                cells: [`${slice.value}×`],
                header: slice.label,
                marker: <DonutChart.Swatch index={index} ranked slices={slices} />,
                note: word,
              }))}
            />
          )
        })}
      </DataTable.Group>
    </Card>
  </div>
)

export const Scores = meta.story({
  name: 'Een plak per uitslag in groen, grijs en rood, met drie tabellen',
  render: () => <ScoresCard slices={scores} />,
})

export const ScoresTwelve = meta.story({
  name: 'Twaalf uitslagen, de grootste winst en het grootste verlies zijn het donkerst',
  render: () => (
    <ScoresCard
      slices={[
        { label: '5–0', tone: 'positive', value: 1 },
        { label: '4–0', tone: 'positive', value: 2 },
        { label: '3–0', tone: 'positive', value: 2 },
        { label: '4–1', tone: 'positive', value: 1 },
        { label: '3–1', tone: 'positive', value: 3 },
        { label: '2–0', tone: 'positive', value: 4 },
        { label: '2–1', tone: 'positive', value: 3 },
        { label: '1–0', tone: 'positive', value: 2 },
        { label: '2–2', tone: 'neutral', value: 2 },
        { label: '1–1', tone: 'neutral', value: 3 },
        { label: '0–0', tone: 'neutral', value: 1 },
        { label: '0–1', tone: 'negative', value: 5 },
      ]}
    />
  ),
})

// Made-up numbers: how often we won, drew and lost, and the goals scored and conceded.
const pairScores: DonutChartSlice[] = [
  { label: '4–0', tone: 'positive', value: 1 },
  { label: '2–0', tone: 'positive', value: 3 },
  { label: '1–1', tone: 'neutral', value: 2 },
  { label: '0–2', tone: 'negative', value: 1 },
]

const pairGoals: DonutChartSlice[] = [
  // Clockwise from the top: red goals against first, so the green goals for sit at the left.
  { label: 'Tegen', tone: 'negative', value: 31 },
  { label: 'Gemaakt', tone: 'positive', value: 45 },
]

const pair = (maxInlineSize: string) => () => (
  <Card style={{ maxInlineSize }} surface="warm">
    <Heading level={2}>Hoe vaak welke uitslag</Heading>
    <DonutChart.Group>
      <DonutChart labels={false} ranked slices={pairScores} />
      <DonutChart centre="45–31" labels={false} size="small" slices={pairGoals} title="Doelsaldo" />
    </DonutChart.Group>
  </Card>
)

export const SmallNextToLarge = meta.story({
  name: 'Een klein diagram naast een groter, elk midden in zijn eigen kolom',
  render: pair('24rem'),
})
