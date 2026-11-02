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
    labels: {
      description:
        'Of de naam en de waarde van elke plak als tekst rond de ring staan. Zonder die tekst is de ring kleiner en op zichzelf, en moet de pagina de getallen in een tabel geven.',
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
          'Een donutdiagram laat zien hoe een totaal over een paar delen is verdeeld, zoals de aanmeldingen over de maanden van een half jaar.',
          'De ring is getekend als SVG in onze eigen code, zonder grafiekbibliotheek en zonder iets van buiten te laden.',
          'Elke plak is zo breed als zijn deel van het totaal, en het totaal staat in het gat.',
          'Bij elke plak staan de naam en de waarde als tekst, dus het diagram is te lezen zonder de kleuren.',
          'Staan twee plakken zo dicht bij elkaar dat hun tekst over elkaar zou vallen, dan schuiven de teksten op en loopt er een streepje naar hun plak.',
          'Een deel met waarde nul heeft geen plak en geen tekst, en een diagram zonder waarden toont een lege ring met een nul.',
          '',
          'De plakken hebben het groen van iets positiefs of het rood van iets negatiefs, in dezelfde kleuren als de uitkomst van een wedstrijd.',
          'De pagina bepaalt welke getallen positief zijn en welke negatief: het onderdeel kent de betekenis niet.',
          'Ze lopen op van een zwakkere tint naar de volle kleur, in de volgorde van het diagram, en een lichte lijn om elke plak houdt hem los van de volgende.',
          'Die lijn is wit in licht en een lichte kleur in donker, op elk vlak, en is een omlijning van de plakken en geen gat in de kleur van het vlak.',
          'Ze is wat de plakken uit elkaar houdt, en niet het verschil in kleur.',
          'In een hoog-contrastweergave (forced colors) krijgen alle plakken dezelfde kleur, en doet de lijn het werk.',
          'Er is geen beweging.',
          '',
          'Het diagram is een plaatje van getallen en daarom verborgen voor een schermlezer.',
          'Zet dezelfde getallen in een `DataTable` ernaast: dat is het tekstalternatief.',
          'Het diagram is dus nooit de enige plek voor de getallen.',
          '',
          '- `title` is de titel boven de ring, en mag ontbreken.',
          '- `slices` zijn de plakken met een `label`, een `value` en eventueel een eigen `tone`.',
          '- `tone` kiest tussen groen (`positive`) en rood (`negative`) voor alle plakken die geen eigen `tone` hebben.',
          '- `labels={false}` laat de tekst rond de ring weg.',
          '',
          'Een plak kan een kleur van zichzelf hebben: groen (`positive`), grijs (`neutral`) of rood (`negative`), zoals de uitslagen van een seizoen.',
          'Plakken van dezelfde kleur lopen onderling van zwak naar sterk, zodat ze te onderscheiden blijven.',
          'Zonder tekst rond de ring is de ring zelf kleiner en past hij zich aan de plek aan, en staat de naam van elke plak in een tabel ernaast.',
          'Het vlakje voor een rij van die tabel is een `DonutChart.Swatch`, met precies de kleur van de plak.',
          'Een rij van een `DataTable` krijgt het vlakje als `marker` en de uitkomst in woorden als `note`.',
          '',
          'Meer diagrammen naast elkaar zet je in een `DonutChart.Group`.',
          'Is er niet genoeg ruimte voor ze naast elkaar, zoals op een telefoon, dan komen ze onder elkaar.',
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

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Twee diagrammen met een tabel, licht',
  render: card('31rem', negative, positive),
})

export const Dark = meta.story({
  globals: { theme: 'dark' },
  name: 'Twee diagrammen met een tabel, donker',
  render: card('31rem', negative, positive),
})

const surfaces = () => (
  <div style={{ display: 'grid', gap: '1.5rem' }}>
    {(['default', 'soft', 'warm'] as const).map((surface) => (
      <MonthCard key={surface} maxInlineSize="31rem" negative={negative} positive={positive} surface={surface} />
    ))}
  </div>
)

export const SurfacesLight = meta.story({
  globals: { theme: 'light' },
  name: 'Op het witte, het zachte en het warme vlak, licht',
  render: surfaces,
})

export const SurfacesDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Op het witte, het zachte en het warme vlak, donker',
  render: surfaces,
})

export const EmptyLight = meta.story({
  globals: { theme: 'light' },
  name: 'Zonder waarden, een lege ring met een nul, licht',
  render: card('31rem', [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]),
})

export const EmptyDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Zonder waarden, een lege ring met een nul, donker',
  render: card('31rem', [0, 0, 0, 0, 0, 0], [0, 0, 0, 0, 0, 0]),
})

export const OneEmptyLight = meta.story({
  globals: { theme: 'light' },
  name: 'Eén diagram zonder waarden, het andere heeft plakken, licht',
  render: card('31rem', [0, 0, 0, 0, 0, 0], positive),
})

export const NarrowLight = meta.story({
  globals: { theme: 'light' },
  name: 'Smalle plek, de diagrammen onder elkaar, licht',
  render: card('20rem', negative, positive),
})

export const NarrowDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Smalle plek, de diagrammen onder elkaar, donker',
  render: card('20rem', negative, positive),
})

export const Single = meta.story({
  args: { slices: slicesOf(positive), title: 'Aangemeld', tone: 'positive' },
  name: 'Eén diagram met besturing',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <DonutChart {...args} />
    </div>
  ),
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

export const CrowdedLight = meta.story({
  args: { slices: slicesOf([1, 1, 12, 1, 1, 1]), title: 'Aangemeld', tone: 'positive' },
  globals: { theme: 'light' },
  name: 'Kleine plakken naast elkaar, de teksten schuiven op, licht',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <DonutChart {...args} />
    </div>
  ),
})

export const CrowdedDark = meta.story({
  args: { slices: slicesOf([1, 1, 12, 1, 1, 1]), title: 'Aangemeld', tone: 'positive' },
  globals: { theme: 'dark' },
  name: 'Kleine plakken naast elkaar, de teksten schuiven op, donker',
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

const outcomeWords = { negative: 'verlies', neutral: 'gelijk', positive: 'winst' } as const

const ScoresCard = ({ slices }: { slices: readonly DonutChartSlice[] }) => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-labelledby="uitslagen-kop" surface="warm">
      <Heading id="uitslagen-kop" level={2}>
        Hoe vaak welke uitslag
      </Heading>
      <DonutChart labels={false} slices={slices} />
      <DataTable
        caption="Hoe vaak elke uitslag voorkwam, van de beste naar de slechtste"
        columns={['Uitslag', 'Keer']}
        rows={slices.map((slice, index) => ({
          cells: [slice.value],
          header: slice.label,
          marker: <DonutChart.Swatch index={index} slices={slices} />,
          note: outcomeWords[slice.tone ?? 'neutral'],
        }))}
      />
    </Card>
  </div>
)

export const ScoresLight = meta.story({
  globals: { theme: 'light' },
  name: 'Een plak per uitslag in groen, grijs en rood, met een tabel, licht',
  render: () => <ScoresCard slices={scores} />,
})

export const ScoresDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Een plak per uitslag in groen, grijs en rood, met een tabel, donker',
  render: () => <ScoresCard slices={scores} />,
})

export const ScoresOneSlice = meta.story({
  globals: { theme: 'light' },
  name: 'Eén uitslag, de ring is één plak met een tabel van één rij',
  render: () => <ScoresCard slices={[{ label: '2–1', tone: 'positive', value: 1 }]} />,
})

export const ScoresNoValues = meta.story({
  globals: { theme: 'light' },
  name: 'Zonder waarden, een lege ring met een nul en geen tekst rond de ring',
  render: () => (
    <div style={{ maxInlineSize: '24rem' }}>
      <DonutChart
        labels={false}
        slices={[
          { label: '1–0', tone: 'positive', value: 0 },
          { label: '0–1', tone: 'negative', value: 0 },
        ]}
      />
    </div>
  ),
})

export const ScoresTwelve = meta.story({
  globals: { theme: 'light' },
  name: 'Twaalf uitslagen, de plakken van één kleur lopen van zwak naar sterk',
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
