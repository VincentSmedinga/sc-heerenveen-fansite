import preview from '#.storybook/preview'

import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { DataTable, type DataTableRow } from './DataTable'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een tabel met getallen, als echte `table`.',
          'De tabel heeft een bijschrift dat zegt wat erin staat, maar alleen een schermlezer krijgt het: bezienden zien de kop boven de tabel.',
          'Zet dus een kop boven de tabel, bijvoorbeeld in een kaart.',
          'Verder heeft de tabel kolomkoppen met `scope` en een rijkop voor elke rij.',
          '',
          '- `caption` is de tekst van het bijschrift, dat niet te zien is.',
          '- `columns` zijn de koppen van de kolommen.',
          '  De eerste kolom heeft de rijkoppen, zoals een dag of een pad.',
          '  De andere kolommen hebben getallen, aan het eind uitgelijnd en met tabelcijfers, zodat ze recht onder elkaar staan.',
          '- `rows` zijn de rijen van boven naar beneden.',
          '  Een rij heeft een `header` en `cells`, één voor elke kolom na de eerste.',
          '  Een getal schrijft het component op zijn Nederlands, met een punt tussen de duizendtallen.',
          '  De `header` moet uniek zijn.',
          '',
          'Een lange rijkop, zoals een pad zonder spaties, breekt af waar het moet.',
          'Een kolomkop breekt alleen bij een spatie af, dus houd hem kort: een lang woord als kop maakt de tabel breder dan een telefoon.',
          'Past een tabel met veel kolommen niet met hele woorden, geef een kolom dan als `{ abbreviation, name }`.',
          'De kop toont de afkorting, een schermlezer hoort het hele woord, en de pagina zet een regel onder de tabel die de afkortingen uitlegt, zoals de stand van de competitie doet.',
          'De tabel is voor een lijst van dingen met elk een paar getallen, niet voor samengevoegde cellen of cellen met meer dan tekst.',
          'De stand van de competitie heeft een eigen component, `StandingsTable`.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/DataTable',
})

// Made-up numbers: a few days, and a path that is far too long for a phone.
const days: DataTableRow[] = [
  { cells: [1204, 3519], header: 'ma 26 okt 2026' },
  { cells: [48, 120], header: 'zo 25 okt 2026' },
  { cells: [0, 0], header: 'za 24 okt 2026' },
  { cells: [64, 211], header: 'vr 23 okt 2026' },
]

const pages: DataTableRow[] = [
  { cells: [2000], header: '/' },
  { cells: [310], header: '/podcasts' },
  { cells: [12], header: '/redactie/een-heel-lang-pad/dat-de-pagina-niet-breder-mag-maken/zonder-spaties' },
]

const renderDays = (maxInlineSize: string) => () => (
  <div style={{ maxInlineSize }}>
    <Card aria-labelledby="dagen-kop">
      <Heading id="dagen-kop" level={2}>
        Per dag
      </Heading>
      <DataTable
        caption="Unieke bezoekers en paginaweergaven per dag, de nieuwste dag bovenaan"
        columns={['Dag', 'Unieke bezoekers', 'Weergaven']}
        rows={days}
      />
    </Card>
  </div>
)

const renderPages = (maxInlineSize: string) => () => (
  <div style={{ maxInlineSize }}>
    <Card aria-labelledby="paginas-kop">
      <Heading id="paginas-kop" level={2}>
        Meest bekeken pagina’s
      </Heading>
      <DataTable
        caption="De meest bekeken pagina’s, met het aantal weergaven"
        columns={['Pagina', 'Weergaven']}
        rows={pages}
      />
    </Card>
  </div>
)

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Drie kolommen, licht',
  render: renderDays('40rem'),
})

export const Dark = meta.story({
  globals: { theme: 'dark' },
  name: 'Drie kolommen, donker',
  render: renderDays('40rem'),
})

export const PhoneLight = meta.story({
  globals: { theme: 'light' },
  name: 'Op een telefoon, licht',
  render: renderDays('20rem'),
})

const results: DataTableRow[] = [
  { cells: [8, 5, 2, 1, 17], header: 'Wij scoren eerst' },
  { cells: [4, 1, 1, 2, 4], header: 'De tegenstander scoort eerst' },
]

const renderAbbreviations = () => (
  <div style={{ maxInlineSize: '20rem' }}>
    <Card aria-labelledby="afkortingen-kop">
      <Heading id="afkortingen-kop" level={2}>
        Na het eerste doelpunt
      </Heading>
      <DataTable
        caption="Wat er gebeurt na het eerste doelpunt"
        columns={[
          'Eerste doelpunt',
          { abbreviation: 'G', name: 'gespeeld' },
          { abbreviation: 'W', name: 'winst' },
          { abbreviation: 'GL', name: 'gelijk' },
          { abbreviation: 'V', name: 'verlies' },
          { abbreviation: 'P', name: 'punten' },
        ]}
        rows={results}
      />
      <Text appearance="meta">G gespeeld, W winst, GL gelijk, V verlies, P punten</Text>
    </Card>
  </div>
)

export const AbbreviationsLight = meta.story({
  globals: { theme: 'light' },
  name: 'Kolommen met een afkorting op een telefoon, licht',
  render: renderAbbreviations,
})

export const AbbreviationsDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Kolommen met een afkorting op een telefoon, donker',
  render: renderAbbreviations,
})

export const LongRowHeaderLight = meta.story({
  globals: { theme: 'light' },
  name: 'Een lange rijkop breekt af op een telefoon, licht',
  render: renderPages('20rem'),
})

export const LongRowHeaderDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Een lange rijkop breekt af op een telefoon, donker',
  render: renderPages('20rem'),
})
