import { expect, userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { DataTable, type DataTableProps, type DataTableRow } from './DataTable'

// Made-up clubs, so the table has enough rows to look for the extremes.
type Figures = [played: number, won: number, drawn: number, lost: number, goalsFor: number, goalsAgainst: number]

const club = (header: string, [played, won, drawn, lost, goalsFor, goalsAgainst]: Figures): DataTableRow => ({
  cells: [
    played,
    won,
    drawn,
    lost,
    { sortValue: goalsFor - goalsAgainst, text: `${goalsFor}–${goalsAgainst}` },
    won * 3 + drawn,
  ],
  header,
  href: '#club',
})

const manyClubs: DataTableRow[] = [
  club('Testclub', [12, 7, 3, 2, 21, 12]),
  club('FC Voorbeeld', [9, 2, 3, 4, 8, 11]),
  club('Proefstad SV', [3, 1, 1, 1, 3, 3]),
  club('Teststad Boys', [18, 11, 4, 3, 35, 17]),
  club('VV Maquette', [2, 0, 0, 2, 1, 5]),
  club('Oefendorp FC', [6, 3, 1, 2, 9, 7]),
  club('Fictief United', [15, 6, 5, 4, 20, 19]),
  club('Zonderland', [1, 1, 0, 0, 2, 0]),
  club('Ajax Test', [22, 5, 4, 13, 18, 41]),
  club('Nepclub ’s-Gravenvoorbeeld', [7, 4, 1, 2, 11, 6]),
  club('Elders Combinatie', [5, 2, 2, 1, 7, 5]),
  club('Álbum Rangers', [4, 1, 2, 1, 4, 4]),
]

const sortableColumns: DataTableProps['columns'] = [
  { name: 'Club', sortable: true },
  { abbreviation: 'G', name: 'gespeeld', sortable: true },
  { abbreviation: 'W', name: 'gewonnen', sortable: true },
  { abbreviation: 'GL', name: 'gelijk', sortable: true },
  { abbreviation: 'V', name: 'verloren', sortable: true },
  { abbreviation: 'D', name: 'doelpunten', sortable: true },
  { abbreviation: 'P', name: 'punten', sortable: true },
]

const meta = preview.meta({
  args: {
    caption: 'De tegenstanders van sc Heerenveen, met onze uitslagen tegen elk',
    columns: sortableColumns,
    rows: manyClubs,
  },
  component: DataTable,
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
          '  Met `href` wordt de rijkop een link naar de pagina over de rij, zoals de pagina van een club in een lijst van clubs.',
          '',
          'Een lange rijkop, zoals een pad zonder spaties, breekt af waar het moet.',
          'Een kolomkop breekt alleen bij een spatie af, dus houd hem kort: een lang woord als kop maakt de tabel breder dan een telefoon.',
          'Past een tabel met veel kolommen niet met hele woorden, geef een kolom dan als `{ abbreviation, name }`.',
          'De kop toont de afkorting, een schermlezer hoort het hele woord, en de pagina zet een regel onder de tabel die de afkortingen uitlegt, zoals de stand van de competitie doet.',
          'De tabel is voor een lijst van dingen met elk een paar getallen, niet voor samengevoegde cellen of cellen met meer dan tekst.',
          'De stand van de competitie heeft een eigen component, `StandingsTable`.',
          '',
          'Kies sorteerbare kolommen (`sortable`) voor een tabel met veel rijen, als de bezoeker een uiterste zoekt: de club waartegen we de meeste wedstrijden speelden, of de meeste doelpunten maakten.',
          'Bij een tabel van een paar rijen is sorteren overbodig.',
          'Sorteren werkt met JavaScript: de server stuurt de hele tabel in de volgorde van `rows`, en in de browser worden de koppen van die kolommen knoppen.',
          'Een getallenkolom begint met het grootste getal bovenaan en de eerste kolom van A tot Z; een tweede klik keert de richting om.',
          'Een cel als `{ text, sortValue }` toont `text` en sorteert op `sortValue`, bijvoorbeeld “7–5” dat op het doelpuntensaldo sorteert.',
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

const clubs: DataTableRow[] = [
  { cells: [4, 2, 1, 1, '7–5'], header: 'Testclub', href: '#testclub' },
  { cells: [3, 0, 1, 2, '2–6'], header: 'FC Voorbeeld', href: '#fc-voorbeeld' },
  { cells: [1, 1, 0, 0, '3–1'], header: 'Proefstad SV', href: '#proefstad-sv' },
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

export const Links = meta.story({
  name: 'Rijen met een link op een telefoon',
  render: () => (
    <div style={{ maxInlineSize: '20rem' }}>
      <Card aria-labelledby="clubs-kop">
        <Heading id="clubs-kop" level={2}>
          Tegenstanders
        </Heading>
        <DataTable
          caption="De tegenstanders van sc Heerenveen met onze uitslagen tegen elk"
          columns={[
            'Club',
            { abbreviation: 'G', name: 'gespeeld' },
            { abbreviation: 'W', name: 'gewonnen' },
            { abbreviation: 'GL', name: 'gelijk' },
            { abbreviation: 'V', name: 'verloren' },
            { abbreviation: 'D', name: 'doelpunten' },
          ]}
          rows={clubs}
        />
        <Text appearance="meta">G gespeeld, W gewonnen, GL gelijk, V verloren, D doelpunten (voor–tegen)</Text>
      </Card>
    </div>
  ),
})

const renderSortable = (maxInlineSize: string) => (args: DataTableProps) => (
  <div style={{ maxInlineSize }}>
    <Card aria-labelledby="sorteerbaar-kop">
      <Heading id="sorteerbaar-kop" level={2}>
        Alle tegenstanders
      </Heading>
      <DataTable {...args} />
      <Text appearance="meta">G gespeeld, W gewonnen, GL gelijk, V verloren, D doelpunten (voor–tegen), P punten</Text>
    </Card>
  </div>
)

export const Sortable = meta.story({
  globals: { theme: 'light' },
  name: 'Sorteerbare kolommen, licht',
  render: renderSortable('40rem'),
})

export const SortableDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Sorteerbare kolommen, donker',
  render: renderSortable('40rem'),
})

export const SortedPhone = meta.story({
  globals: { theme: 'light' },
  name: 'Gesorteerd op een telefoon, licht',
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'doelpunten' }))
    await expect(canvas.getByRole('columnheader', { name: 'doelpunten' })).toHaveAttribute('aria-sort', 'descending')
    await expect(canvas.getByRole('button', { name: 'doelpunten' })).toHaveFocus()
  },
  render: renderSortable('20rem'),
})

export const SortedPhoneDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Gesorteerd op een telefoon, donker',
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Club' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Club' }))
    await expect(canvas.getByRole('columnheader', { name: 'Club' })).toHaveAttribute('aria-sort', 'descending')
  },
  render: renderSortable('20rem'),
})
