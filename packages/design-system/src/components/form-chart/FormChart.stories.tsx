import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card, type CardSurface } from '../card/Card'
import { DataTable } from '../data-table/DataTable'
import { Heading } from '../heading/Heading'
import { type FormResult, pointsOf } from './form'
import { FormChart } from './FormChart'

const meta = preview.meta({
  argTypes: {
    matches: { description: 'Het aantal wedstrijden van het seizoen.' },
    results: {
      description: 'De gespeelde wedstrijden, de oudste eerst: `W` (winst), `G` (gelijk) of `V` (verlies).',
    },
    window: { description: 'Het aantal wedstrijden waarover de lijn het gemiddelde neemt.' },
  },
  component: FormChart,
  parameters: {
    docs: {
      description: {
        component: [
          'De vormgrafiek laat een seizoen zien als staafjes: één per wedstrijd, drie hoog voor een winst, één voor een gelijkspel en een klein blokje voor een verlies, met een vloeiende lijn erdoorheen die laat zien hoe het gaat.',
          'Boven de grafiek staat de vorm als letters, het oudste links.',
          'Wedstrijden die nog gespeeld moeten worden, hebben een lege plek.',
          'De lijn is het gemiddelde aantal punten per wedstrijd over de laatste wedstrijden, en begint pas als er genoeg wedstrijden zijn.',
          '',
          'De grafiek zelf is verborgen voor een schermlezer.',
          'De vorm in woorden, de uitleg van de letters en de zin over de lijn zijn tekst, en de pagina zet dezelfde cijfers in een `DataTable` ernaast.',
          '',
          'Het onderdeel zet `MarkRow`, `BarChart` en `BarChart.Trend` samen en voegt het voetbal toe: de letters, de punten en het gemiddelde.',
          'Die drie onderdelen weten niets van voetbal en kunnen een andere grafiek tekenen.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/FormChart',
})

/** A made-up season of 34 matches, from the first round to the last. */
const seasonResults = [...'WWGVWGGWVWWGWVGWWWGVWGWVWWGGWWVWGW'] as FormResult[]

const surfaceNames = {
  default: 'wit',
  soft: 'zacht',
  strong: 'sterk',
  transparent: 'doorzichtig',
  warm: 'warm',
} as const

const caption = 'Uitslagen van sc Heerenveen dit seizoen, met de punten'

const SeasonCard = ({ results, surface = 'default' }: { results: readonly FormResult[]; surface?: CardSurface }) => {
  const count = (result: FormResult) => results.filter((item) => item === result).length

  return (
    <div style={{ maxInlineSize: '36rem' }}>
      <Card aria-labelledby={`seizoen-kop-${surface}`} surface={surface}>
        <Heading id={`seizoen-kop-${surface}`} level={2}>
          {surface === 'default' ? 'Verloop van het seizoen' : `Verloop van het seizoen, ${surfaceNames[surface]} vlak`}
        </Heading>
        <FormChart results={results} />
        <DataTable
          caption={caption}
          columns={['Uitslag', 'Wedstrijden', 'Punten']}
          rows={[
            { cells: [count('W'), count('W') * pointsOf('W')], header: 'Winst' },
            { cells: [count('G'), count('G') * pointsOf('G')], header: 'Gelijk' },
            { cells: [count('V'), 0], header: 'Verlies' },
            {
              cells: [results.length, results.reduce((sum, result) => sum + pointsOf(result), 0)],
              header: 'Totaal',
            },
          ]}
        />
      </Card>
    </div>
  )
}

export const Season = meta.story({
  args: { results: seasonResults },
  name: 'Een heel seizoen, met de tabel erbij',
  render: (args) => <SeasonCard results={args.results} />,
})

export const SeasonDark = meta.story({
  args: { results: seasonResults },
  globals: { theme: 'dark' },
  name: 'Een heel seizoen, donker: de lijn is licht met een rand in de kleur van de kaart',
  render: (args) => <SeasonCard results={args.results} />,
})

export const InProgress = meta.story({
  args: { results: seasonResults.slice(0, 12) },
  name: 'Een seizoen onderweg, de rest van de plekken is leeg',
  render: (args) => <SeasonCard results={args.results} />,
})

export const AfterThree = meta.story({
  args: { results: seasonResults.slice(0, 3) },
  name: 'Na drie wedstrijden, nog geen lijn',
  render: (args) => <SeasonCard results={args.results} />,
})

export const Nothing = meta.story({
  args: { results: [] },
  name: 'Nog niets gespeeld',
  render: (args) => <SeasonCard results={args.results} />,
})

const surfaces = () => (
  <div style={{ display: 'grid', gap: '1.5rem' }}>
    {(['default', 'soft', 'warm'] as const).map((surface) => (
      <SeasonCard key={surface} results={seasonResults} surface={surface} />
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

export const Narrow = meta.story({
  args: { results: seasonResults },
  name: 'Een smalle kaart, de kleine grafiek',
  render: (args) => (
    <div style={{ maxInlineSize: '20rem' }}>
      <SeasonCard results={args.results} />
    </div>
  ),
})
