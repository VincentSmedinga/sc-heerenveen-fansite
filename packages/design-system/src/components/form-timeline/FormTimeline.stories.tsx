import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { type FormResult } from '../form-chart/form'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { FormTimeline } from './FormTimeline'

const meta = preview.meta({
  argTypes: {
    firstYear: { description: 'Het jaar van de eerste plek.' },
    labelEvery: { description: 'Het aantal jaar tussen twee labels.' },
    placesPerYear: { description: 'Het aantal plekken dat bij één jaar hoort.' },
    results: {
      description:
        'Per plek de uitslag, de oudste eerst: `W` (winst), `G` (gelijk), `V` (verlies) of `null` voor een lege plek.',
    },
    scope: {
      description: 'De tekst na de sleutel, in dezelfde alinea: wat meetelt, zoals de competitie.',
    },
    title: { description: 'Het bijschrift onder de labels.' },
    window: { description: 'Het hoogste aantal uitslagen waarover de lijn het gemiddelde neemt.' },
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
          'De grafiek is verborgen voor een schermlezer: de sleutel en de tekst eronder zijn tekst, en de pagina zet de uitslagen als lijst of tabel ernaast.',
          'Het onderdeel weet niets van wedstrijden of seizoenen: de pagina geeft per plek een uitslag of niets, en de tekst.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/FormTimeline',
})

const firstYear = 2010

/** Made-up results of 17 years, two places for each, from 2010 up to and including 2026. */
const places = (from: number, pattern: string): (FormResult | null)[] =>
  Array.from({ length: 34 }, (_, place) =>
    firstYear + Math.floor(place / 2) >= from
      ? ((pattern[(place * 7) % pattern.length] ?? null) as FormResult | null)
      : null,
  )

const TimelineCard = ({ limit, results }: { limit: boolean; results: readonly (FormResult | null)[] }) => (
  <Card aria-labelledby="resultaten-kop">
    <Heading id="resultaten-kop" level={2}>
      Resultaten sinds 2010
    </Heading>
    <FormTimeline firstYear={firstYear} results={results} title="Seizoen" />
    {/* A limit of the data is one line at the end of the card; complete data say nothing. */}
    {limit && <Text appearance="meta">Alleen de Eredivisie</Text>}
  </Card>
)

// The club played a division lower from 2013 to 2016 and again in 2021.
const withGaps = places(2010, 'WWGVWGGWVWWGWVGWWGVWGWVWWGGWWVWGW').map((result, place) =>
  (place >= 6 && place < 14) || (place >= 22 && place < 24) ? null : result,
)

export const WithGaps = meta.story({
  args: { firstYear, results: withGaps, title: 'Seizoen' },
  name: 'Een club die tussendoor lager speelde, de lijn stopt bij een gat',
  render: (args) => <TimelineCard limit results={args.results} />,
})

export const OnePiece = meta.story({
  args: { firstYear, results: places(2018, 'WGVWWGVWGWGV'), title: 'Seizoen' },
  name: 'Een club die pas laat in de Eredivisie kwam, de eerste jaren zijn leeg',
  render: (args) => <TimelineCard limit={false} results={args.results} />,
})
