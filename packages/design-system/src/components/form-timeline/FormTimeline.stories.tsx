import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { type FormResult } from '../form-chart/form'
import { Heading } from '../heading/Heading'
import { FormTimeline, type FormTimelineLatest } from './FormTimeline'

const meta = preview.meta({
  argTypes: {
    firstYear: { description: 'Het jaar van de eerste plek.' },
    labelEvery: { description: 'Het aantal jaar tussen twee labels.' },
    line: { control: false, description: 'De zin over de lijn, uit het laatste punt of uit niets.' },
    placesPerYear: { description: 'Het aantal plekken dat bij één jaar hoort.' },
    results: {
      description:
        'Per plek de uitslag, de oudste eerst: `W` (winst), `G` (gelijk), `V` (verlies) of `null` voor een lege plek.',
    },
    scope: { description: 'Wat meetelt en sinds wanneer, zodat een lege plek niet leest als "nooit gespeeld".' },
    title: { description: 'Het bijschrift onder de labels.' },
    window: { description: 'Het aantal uitslagen waarover de lijn het gemiddelde neemt.' },
  },
  component: FormTimeline,
  parameters: {
    docs: {
      description: {
        component: [
          'De tijdlijn laat uitslagen over de jaren zien als staafjes, met een vloeiende lijn door het gemiddelde.',
          'Elk jaar heeft vaste plekken op de as, ook als er niets is gespeeld: een jaar zonder uitslag is een gat, en de lijn stopt bij een gat.',
          'Kies hem voor een reeks die de tijd volgt, en de vormgrafiek van een seizoen voor een reeks die telt per speelronde.',
          '',
          'De grafiek is verborgen voor een schermlezer: de sleutel en de zinnen eronder zijn tekst, en de pagina zet de uitslagen als lijst of tabel ernaast.',
          'Het onderdeel weet niets van wedstrijden of seizoenen: de pagina geeft per plek een uitslag of niets, en de teksten.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/FormTimeline',
})

const season = (year: number) => `${year}/${String((year + 1) % 100).padStart(2, '0')}`

const line = (latest: FormTimelineLatest | null) =>
  latest === null
    ? 'De lijn begint na 4 wedstrijden achter elkaar.'
    : `De lijn laat zien hoeveel punten sc Heerenveen per wedstrijd haalde in de laatste 4 wedstrijden: ${latest.average}, bij de wedstrijd van ${season(latest.year)}.`

/** Made-up results of 37 years, two places for each, from 1990 up to and including 2026. */
const places = (from: number, to: number, pattern: string): (FormResult | null)[] =>
  Array.from({ length: 74 }, (_, place) => {
    const year = 1990 + Math.floor(place / 2)

    return year >= from && year <= to ? ((pattern[(place * 7) % pattern.length] ?? null) as FormResult | null) : null
  })

const TimelineCard = ({ results, scope }: { results: readonly (FormResult | null)[]; scope: string }) => (
  <Card aria-labelledby="verloop-kop">
    <Heading id="verloop-kop" level={2}>
      Verloop sinds 1990
    </Heading>
    <FormTimeline firstYear={1990} line={line} results={results} scope={scope} title="Seizoen" />
  </Card>
)

const withGaps = places(1990, 2026, 'WWGVWGGWVWWGWVGWWGVWGWVWWGGWWVWGW').map((result, place) =>
  // The club played a division lower from 1996 to 2001 and again from 2012 to 2014.
  (place >= 12 && place < 22) || (place >= 44 && place < 50) ? null : result,
)

export const WithGaps = meta.story({
  args: { firstYear: 1990, line, results: withGaps, scope: 'Alleen de Eredivisie.', title: 'Seizoen' },
  name: 'Een club die tussendoor lager speelde, de lijn stopt bij een gat',
  render: (args) => <TimelineCard results={args.results} scope={args.scope} />,
})

export const OnePiece = meta.story({
  args: {
    firstYear: 1990,
    line,
    results: places(2010, 2026, 'WGVWWGVWGWGV'),
    scope: 'Alleen de Eredivisie: alle 32 gespeelde wedstrijden sinds 2010/11.',
    title: 'Seizoen',
  },
  name: 'Een club die pas laat in de Eredivisie kwam, de eerste jaren zijn leeg',
  render: (args) => <TimelineCard results={args.results} scope={args.scope} />,
})

export const OnPhone = meta.story({
  args: { firstYear: 1990, line, results: withGaps, scope: 'Alleen de Eredivisie.', title: 'Seizoen' },
  name: 'Op een telefoon: 74 plekken in een smalle kaart',
  render: (args) => (
    <div style={{ inlineSize: '20rem', maxInlineSize: '100%' }}>
      <TimelineCard results={args.results} scope={args.scope} />
    </div>
  ),
})
