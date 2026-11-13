import { userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { type ChartTone } from '../chart/tones'
import { movingAverage } from '../chart/trend'
import { DataTable } from '../data-table/DataTable'
import { Heading } from '../heading/Heading'
import { Strong } from '../strong/Strong'
import { Text } from '../text/Text'
import { BarChart, type BarChartBar } from './BarChart'

const meta = preview.meta({
  argTypes: {
    axis: { description: 'De nummers onder de plekken en het bijschrift, of `false` voor niets.' },
    bars: { description: 'De staafjes, één per plek. `null` is een plek zonder staafje.' },
    children: { description: 'Lagen op dezelfde grafiek, zoals een `BarChart.Trend`.' },
    dividers: {
      description:
        'Gestreepte verticale lijnen waar iets verandert, zoals een nieuwe trainer: 12 is de lijn tussen de twaalfde en de dertiende plek.',
    },
    max: { description: 'De waarde van een vol staafje. Ook de schaal van de lijn.' },
    ticks: { description: 'Hulplijnen op deze waarden, en op een brede grafiek de cijfers aan de zijkant.' },
    tickText: { description: 'De tekst van een cijfer aan de zijkant, bijvoorbeeld met een punt bij duizendtallen.' },
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
          'Met `labels` op de lijn volgt een tooltip de aanwijzer en toont de tekst van het dichtstbijzijnde punt; een tik of sleep met de vinger doet hetzelfde.',
          'De grafiek is een plaatje van getallen en daarom verborgen voor een schermlezer: zet dezelfde getallen als tekst of in een `DataTable` ernaast.',
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

const average = new Intl.NumberFormat('nl-NL', { maximumFractionDigits: 1, minimumFractionDigits: 1 })
const latest = average.format(movingAverage(goals, 5).at(-1) ?? 0)

/** The average per match over five matches, from the fifth match on, as the tooltip says it. */
const averages = movingAverage([...goals, ...Array.from({ length: 22 }, () => null)], 5)
const averageLabels = averages.map((value) => (value === null ? null : average.format(value)))

const GoalsCard = ({ trend = true }: { trend?: boolean }) => (
  <div style={{ maxInlineSize: '36rem' }}>
    <Card aria-labelledby="doelpunten-kop">
      <Heading id="doelpunten-kop" level={2}>
        Doelpunten per wedstrijd
      </Heading>
      <BarChart axis={{ title: 'Speelronde' }} bars={bars} max={4} ticks={[0, 2, 4]}>
        {trend && <BarChart.Trend labels={averageLabels} values={averages} />}
      </BarChart>
      <Text appearance="meta">
        {`De lijn laat zien hoeveel doelpunten sc Heerenveen per wedstrijd maakte in de laatste 5 wedstrijden: nu ${latest}.`}
      </Text>
      <div
        style={{
          columnGap: '1.5rem',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(min(14rem, 100%), 1fr))',
          rowGap: '1.5rem',
        }}
      >
        {[goals.slice(0, 6), goals.slice(6)].map((half, part) => (
          <DataTable
            caption={`Doelpunten van sc Heerenveen per speelronde, ronde ${part * 6 + 1} tot en met ${part * 6 + half.length}`}
            columns={['Speelronde', 'Doelpunten']}
            key={part}
            rows={half.map((value, index) => ({ cells: [value], header: String(part * 6 + index + 1) }))}
          />
        ))}
      </div>
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

export const Labelled = meta.story({
  name: 'Met het getal boven elke staaf, in het blauw van een telling',
  render: () => (
    <div style={{ maxInlineSize: '24rem' }}>
      <Card aria-labelledby="kwartier-kop">
        <Heading id="kwartier-kop" level={2}>
          Wanneer hij scoort
        </Heading>
        <BarChart
          axis={{
            labels: ['1–15', '16–30', '31–45', '46–60', '61–75', '76–90'].map((text, index) => ({
              at: index + 0.5,
              text,
            })),
          }}
          bars={[7, 3, 2, 3, 5, 6].map((value) => ({ label: String(value), tone: 'plain', value }))}
          max={7}
        />
      </Card>
    </div>
  ),
})

export const OtherChart = meta.story({
  name: 'Dezelfde onderdelen, andere grafiek: doelpunten per wedstrijd',
  render: () => <GoalsCard />,
})

export const NoLine = meta.story({
  name: 'Zonder lijn',
  render: () => <GoalsCard trend={false} />,
})

export const Tooltip = meta.story({
  name: 'Met tooltip bij de lijn, open',
  play: async ({ canvasElement }) => {
    const layer = canvasElement.querySelector<HTMLElement>('.hf-bar-chart-pointer')

    if (layer) {
      const box = layer.getBoundingClientRect()

      // Between the places of the tenth and the eleventh match, where the line has a point.
      await userEvent.pointer({
        coords: { clientX: box.left + box.width * 0.3, clientY: box.top + box.height / 2 },
        target: layer,
      })
    }
  },
  render: () => <GoalsCard />,
})

/** Made-up places in a table of 18 after each of 34 rounds, place 1 being the best. */
const places = [9, 7, 5, 4, 6, 8, 7, 5, 4, 3, 5, 6, 8, 9, 7, 6, 5, 4, 4, 6, 7, 9, 10, 8, 7, 6, 5, 5, 4, 6, 7, 6, 5, 4]

/**
 * A line of places with place 1 at the top: the chart grows upwards, so a place is turned into
 * a height (`19 - place`). A round without a place is a gap (`null`).
 */
const PlaceLine = ({ dividers = [], rounds }: { dividers?: readonly number[]; rounds: readonly (null | number)[] }) => (
  <div style={{ maxInlineSize: '36rem' }}>
    <Card aria-labelledby="plek-kop">
      <Heading id="plek-kop" level={2}>
        Plek per speelronde
      </Heading>
      <BarChart
        axis={{
          labels: [1, 8, 17, 25, 34].map((round) => ({ at: round - 0.5, text: String(round) })),
          marks: true,
          title: 'Speelronde',
        }}
        bars={rounds.map(() => null)}
        dividers={dividers}
        max={18}
        ticks={[18, 10, 1]}
        tickText={(height) => String(19 - height)}
      >
        <BarChart.Trend
          labels={rounds.map((place, index) =>
            place === null ? null : (
              <>
                Ronde {index + 1}: <Strong>plek {place}</Strong>
              </>
            ),
          )}
          values={rounds.map((place) => (place === null ? null : 19 - place))}
        />
      </BarChart>
    </Card>
  </div>
)

export const PlaceFullSeason = meta.story({
  name: 'Lijn met omgekeerde as: een heel seizoen, met streepjes en een vet deel in de tooltip',
  render: () => <PlaceLine rounds={places} />,
})

export const PlaceDividers = meta.story({
  name: 'Lijn met omgekeerde as: gestreepte lijnen bij een nieuwe trainer',
  render: () => <PlaceLine dividers={[12, 25]} rounds={places} />,
})

export const PlaceSeasonInProgress = meta.story({
  name: 'Lijn met omgekeerde as: een seizoen dat nog bezig is',
  render: () => <PlaceLine rounds={[...places.slice(0, 12), ...Array.from({ length: 22 }, () => null)]} />,
})

export const PlaceOpenPlace = meta.story({
  name: 'Lijn met omgekeerde as: een open plek in de lijn',
  render: () => (
    <PlaceLine rounds={places.map((place, index) => (index === 14 || index === 15 || index > 29 ? null : place))} />
  ),
})

export const PlaceTooltip = meta.story({
  name: 'Lijn met omgekeerde as: tooltip met een vet deel, open',
  play: async ({ canvasElement }) => {
    const layer = canvasElement.querySelector<HTMLElement>('.hf-bar-chart-pointer')

    if (layer) {
      const box = layer.getBoundingClientRect()

      // Round 12, where the line has a point.
      await userEvent.pointer({
        coords: { clientX: box.left + box.width * (11.5 / 34), clientY: box.top + box.height / 2 },
        target: layer,
      })
    }
  },
  render: () => <PlaceLine rounds={places} />,
})
