import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { type ChartTone } from '../chart/tones'
import { movingAverage } from '../chart/trend'
import { DataTable } from '../data-table/DataTable'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { BarChart, type BarChartBar } from './BarChart'

const meta = preview.meta({
  argTypes: {
    axis: { description: 'De nummers onder de plekken en het bijschrift, of `false` voor niets.' },
    bars: { description: 'De staafjes, één per plek. `null` is een plek zonder staafje.' },
    children: { description: 'Lagen op dezelfde grafiek, zoals een `BarChart.Trend`.' },
    max: { description: 'De waarde van een vol staafje. Ook de schaal van de lijn.' },
    ticks: { description: 'Hulplijnen op deze waarden, en op een brede grafiek de cijfers aan de zijkant.' },
    zero: {
      control: 'radio',
      description: 'Een waarde 0: `stub` is een streepje op de grond, `none` toont niets.',
      options: ['stub', 'none'],
      table: { type: { summary: "'stub' | 'none'" } },
    },
  },
  component: BarChart,
  parameters: {
    docs: {
      description: {
        component: [
          'Een staafdiagram zet een reeks waarden naast elkaar: een staafje per plek, van links naar rechts, zo hoog als de waarde bij de schaal past.',
          'Een plek zonder staafje toont alleen de grond, zodat de grafiek laat zien hoe lang de reeks wordt.',
          'Het onderdeel weet niets over wat de staafjes meten: de tonen, de schaal en de nummers zijn van de pagina.',
          'Een `BarChart.Trend` tekent er een vloeiende lijn overheen, op dezelfde schaal.',
          '',
          'De staafjes hebben de kleuren van de uitslag, in dezelfde sterkte als de balk in een tabel en de plakken van het donutdiagram.',
          'De grootte volgt de breedte van de plek waar de grafiek staat: een smalle kaart krijgt de kleine grafiek en een brede meer ruimte, met cijfers aan de zijkant.',
          '',
          'De grafiek is een plaatje van getallen en daarom verborgen voor een schermlezer.',
          'Zet dezelfde getallen als tekst of in een `DataTable` ernaast.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/BarChart',
})

/** Made-up goals per match of twelve matches, and how each ended. */
const goals = [2, 0, 3, 1, 1, 4, 2, 0, 2, 3, 1, 2]
const endings: ChartTone[] = [
  'positive',
  'negative',
  'positive',
  'neutral',
  'neutral',
  'positive',
  'positive',
  'negative',
  'neutral',
  'positive',
  'negative',
  'positive',
]

const bars: (BarChartBar | null)[] = [
  ...goals.map((value, index) => ({ tone: endings[index]!, value })),
  ...Array.from({ length: 22 }, () => null),
]

const GoalsCard = ({ trend = true }: { trend?: boolean }) => (
  <div style={{ maxInlineSize: '36rem' }}>
    <Card aria-labelledby="doelpunten-kop">
      <Heading id="doelpunten-kop" level={2}>
        Doelpunten per wedstrijd
      </Heading>
      <BarChart axis={{ title: 'Speelronde' }} bars={bars} max={4} ticks={[0, 2, 4]}>
        {trend && <BarChart.Trend values={movingAverage([...goals, ...Array.from({ length: 22 }, () => null)], 5)} />}
      </BarChart>
      <Text appearance="meta">
        De lijn laat zien hoeveel doelpunten sc Heerenveen per wedstrijd maakte in de laatste 5 wedstrijden: nu 1,8.
      </Text>
      <DataTable
        caption="Doelpunten van sc Heerenveen per speelronde"
        columns={['Speelronde', 'Doelpunten']}
        rows={goals.map((value, index) => ({ cells: [value], header: String(index + 1) }))}
      />
    </Card>
  </div>
)

export const Default = meta.story({
  args: { axis: { title: 'Speelronde' }, bars, max: 4, ticks: [0, 2, 4] },
  name: 'Staafjes met hulplijnen, met besturing',
  render: (args) => (
    <div style={{ maxInlineSize: '36rem' }}>
      <BarChart {...args} />
    </div>
  ),
})

export const OtherChart = meta.story({
  name: 'Dezelfde onderdelen, andere grafiek: doelpunten per wedstrijd',
  render: () => <GoalsCard />,
})

export const OtherChartDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Dezelfde onderdelen, andere grafiek, donker',
  render: () => <GoalsCard />,
})

export const NoLine = meta.story({
  name: 'Zonder lijn',
  render: () => <GoalsCard trend={false} />,
})
