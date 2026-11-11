import { expect, userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import { Bar, BarPlace } from '../bar/Bar'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { PlayerName } from '../player-name/PlayerName'
import { signedNumber, tableColumns, tableLegend } from '../table-columns'
import { Text } from '../text/Text'
import { Time } from '../time/Time'
import { DataTable, type DataTableProps, type DataTableRow, type DataTableTextRow } from './DataTable'

// Made-up clubs, so the table has enough rows to look for the extremes.
type Figures = [played: number, won: number, drawn: number, lost: number, goalsFor: number, goalsAgainst: number]

const club = (header: string, [played, won, drawn, lost, goalsFor, goalsAgainst]: Figures): DataTableRow => ({
  cells: [
    played,
    won,
    drawn,
    lost,
    won * 3 + drawn,
    { sortValue: goalsFor - goalsAgainst, text: signedNumber(goalsFor - goalsAgainst) },
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

const flowColumns = [tableColumns.played, tableColumns.won, tableColumns.drawn, tableColumns.lost, tableColumns.points]
const clubColumns = [
  tableColumns.played,
  tableColumns.won,
  tableColumns.drawn,
  tableColumns.lost,
  tableColumns.points,
  tableColumns.goalDifference,
]
const clubLegend = tableLegend(clubColumns)

const sortableColumns: DataTableProps['columns'] = [
  { name: 'Club', sortable: true },
  ...clubColumns.map((column) => ({ ...column, key: column.abbreviation === 'P', sortable: true })),
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
          '  Met `marker` staat er een versiering voor de rijkop, zoals het vlakje van een plak van een donutdiagram, en met `note` hoort een schermlezer woorden achter de rijkop, zoals "winst" achter "4–0".',
          '  Een `marker` is zelf verborgen voor een schermlezer: de `note` zegt wat hij betekent (zie `DonutChart.Swatch` voor een voorbeeld).',
          '',
          'Een lange rijkop, zoals een pad zonder spaties, breekt af waar het moet.',
          'Een kolomkop breekt alleen bij een spatie af, dus houd hem kort: een lang woord als kop maakt de tabel breder dan een telefoon.',
          'Past een tabel met veel kolommen niet met hele woorden, geef een kolom dan als `{ abbreviation, name }`.',
          'De kop toont de afkorting, een schermlezer hoort het hele woord, en de pagina zet een regel onder de tabel die de afkortingen uitlegt, zoals de stand van de competitie doet.',
          'Is de tekst van een kop geen afkorting maar een andere schrijfwijze van de naam, zoals "Winst 12×" voor "Winst, 12 keer", geef de kolom dan als `{ name, shown }`.',
          'De tabel is voor een lijst van dingen met elk een paar getallen, niet voor samengevoegde cellen of cellen met meer dan tekst.',
          'De stand van de competitie heeft een eigen component, `StandingsTable`.',
          '',
          'Kies sorteerbare kolommen (`sortable`) voor een tabel met veel rijen, als de bezoeker een uiterste zoekt: de club waartegen we de meeste wedstrijden speelden, of waartegen we het hoogste doelsaldo hebben.',
          'Bij een tabel van een paar rijen is sorteren overbodig.',
          'Sorteren werkt met JavaScript: de server stuurt de hele tabel in de volgorde van `rows`, en in de browser worden de koppen van die kolommen knoppen.',
          'Een getallenkolom begint met het grootste getal bovenaan en de eerste kolom van A tot Z; een tweede klik keert de richting om.',
          'Een cel als `{ text, sortValue }` toont `text` en sorteert op `sortValue`, bijvoorbeeld “+18”, dat op het getal sorteert.',
          '',
          'In een tabel is vet voor één ding: het kerngetal, het getal waarop de tabel is geordend of dat het antwoord van de tabel is.',
          'Geef die kolom `key`; er kan er hoogstens één zijn, anders geeft de tabel een fout.',
          'In een tabel die sorteert, volgt het kerngetal de sortering: de kolom waarop de bezoeker sorteerde is vet, en voor de eerste klik is dat de kolom met `key`.',
          'Vet is nooit het enige teken: de sorteerknop en `aria-sort` zeggen het ook.',
          '',
          'Met `appearance="text"` is het een tabel met tekst, zoals een lijst van wedstrijden.',
          'De kolommen beginnen aan het begin, de rijkop kan een tweede regel met secundaire tekst hebben (`secondary`), en een cel kan elke inhoud hebben, zoals een link.',
          'Zo’n tabel kan niet sorteren.',
          'Een kolom die je als `{ fold: true, name }` geeft, vouwt op naar de rijkop waar de tabel te smal voor is, zoals de datum en de competitie van een wedstrijd op een telefoon.',
          'Waar de tabel ruimte heeft, is het een kolom, en waar niet, staat de tekst van de cellen op één regel onder de naam van de rij.',
          'De ruimte is die van de tabel zelf, niet die van het venster.',
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
  { cells: [4, 2, 1, 1, 7, '+2'], header: 'Testclub', href: '#testclub' },
  { cells: [3, 0, 1, 2, 1, '−4'], header: 'FC Voorbeeld', href: '#fc-voorbeeld' },
  { cells: [1, 1, 0, 0, 3, '+2'], header: 'Proefstad SV', href: '#proefstad-sv' },
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
        columns={['Eerste doelpunt', ...flowColumns]}
        rows={results}
      />
      <Text appearance="meta">{tableLegend(flowColumns)}</Text>
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
          columns={['Club', ...clubColumns]}
          rows={clubs}
        />
        <Text appearance="meta">{clubLegend}</Text>
      </Card>
    </div>
  ),
})

const seasonColumns = [tableColumns.played, tableColumns.started, tableColumns.goals, tableColumns.assists]

export const SeasonsWithTotal = meta.story({
  name: 'Seizoenen met een totaal',
  render: () => (
    <div style={{ maxInlineSize: '20rem' }}>
      <Card aria-labelledby="seizoenen-kop">
        <Heading id="seizoenen-kop" level={2}>
          Per seizoen
        </Heading>
        <DataTable
          caption="De cijfers van een speler per seizoen, het nieuwste seizoen eerst, met het totaal onderaan"
          columns={['Seizoen', ...seasonColumns]}
          rows={[
            { aside: 'nr. 35', cells: [28, 24, 9, 4], header: '2025/26', href: '/spelers/2025-26' },
            { cells: [30, 26, 12, '–'], header: '2024/25', href: '/spelers/2024-25' },
            { cells: [58, 50, 21, 4], header: 'Totaal', total: true },
          ]}
        />
        <Text appearance="meta">{tableLegend(seasonColumns)}.</Text>
      </Card>
    </div>
  ),
})

export const SeasonsWithGap = meta.story({
  name: 'Seizoenen met een onderbreking',
  render: () => (
    <div style={{ maxInlineSize: '20rem' }}>
      <Card aria-labelledby="onderbreking-kop">
        <Heading id="onderbreking-kop" level={2}>
          Per seizoen
        </Heading>
        <DataTable
          caption="De cijfers van een speler per seizoen, het nieuwste seizoen eerst, met het totaal onderaan"
          columns={['Seizoen', ...seasonColumns]}
          rows={[
            { cells: [28, 24, 9, 4], header: '2025/26', href: '/spelers/2025-26' },
            { cells: [], gap: true, header: 'niet bij sc Heerenveen' },
            { cells: [30, 26, 12, '–'], header: '2022/23', href: '/spelers/2022-23' },
            { cells: [58, 50, 21, 4], header: 'Totaal', total: true },
          ]}
        />
      </Card>
    </div>
  ),
})

export const NamesWithPeriods = meta.story({
  name: 'Namen met een tweede regel op een telefoon',
  render: () => (
    <div style={{ maxInlineSize: '20rem' }}>
      <Card aria-labelledby="trainers-kop">
        <Heading id="trainers-kop" level={2}>
          Resultaten per hoofdtrainer
        </Heading>
        <DataTable
          caption="De resultaten per hoofdtrainer, de nieuwste eerst"
          columns={[
            'Hoofdtrainer',
            tableColumns.played,
            tableColumns.won,
            { ...tableColumns.pointsPerMatch, key: true },
          ]}
          rows={[
            {
              cells: [14, 6, '1,71'],
              display: <PlayerName givenName="Robin" surname="Veldman" />,
              header: 'Robin Veldman, mrt 2025 – nu',
              secondary: 'mrt 2025 – nu',
            },
            {
              cells: [2, 1, '1,50'],
              display: <PlayerName givenName="Kees" surname="van Wonderen" />,
              header: 'Kees van Wonderen, jul 2022 – jun 2024',
              secondary: 'jul 2022 – jun 2024',
            },
          ]}
        />
      </Card>
    </div>
  ),
})

export const Ranked = meta.story({
  name: 'Met de plaats in de ranglijst op een telefoon',
  render: () => (
    <div style={{ maxInlineSize: '20rem' }}>
      <Card aria-labelledby="ranglijst-kop" surface="soft">
        <Heading id="ranglijst-kop" level={2}>
          Punten per wedstrijd
        </Heading>
        <DataTable
          caption="De drie clubs waartegen we gemiddeld de meeste punten per wedstrijd halen, van hoog naar laag"
          columns={['Club', { ...tableColumns.pointsPerMatch, key: true }, tableColumns.played]}
          rows={[
            { cells: ['2,43', 14], header: 'Testclub', href: '#club', position: 1 },
            { cells: ['2,10', 10], header: 'Nepclub ’s-Gravenvoorbeeld', href: '#club', position: 2 },
            { cells: ['1,88', 8], header: 'FC Voorbeeld', href: '#club', position: 3 },
          ]}
        />
        <Text appearance="meta">{tableLegend([tableColumns.pointsPerMatch, tableColumns.played])}</Text>
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
      <Text appearance="meta">{clubLegend}</Text>
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

export const SortableLast = meta.story({
  globals: { theme: 'light' },
  name: 'Sorteerbaar, als laatste in een kaart, licht',
  parameters: {
    docs: {
      description: {
        story:
          'De tabel is het laatste in de kaart, met alleen de verborgen regel voor de schermlezer erachter. Er komt geen extra ruimte onder, want de kaart heeft haar eigen binnenruimte.',
      },
    },
  },
  play: async ({ canvas }) => {
    await expect(canvas.getByRole('table')).toHaveStyle({ marginBlockEnd: '0px' })
  },
  render: () => (
    <Card aria-labelledby="sorteerbaar-laatste" style={{ maxInlineSize: '40rem' }}>
      <Heading id="sorteerbaar-laatste" level={2}>
        Tegenstanders
      </Heading>
      <DataTable caption="De tegenstanders van sc Heerenveen" columns={sortableColumns} rows={manyClubs} />
    </Card>
  ),
})

export const SortedPhone = meta.story({
  globals: { theme: 'light' },
  name: 'Gesorteerd op een telefoon, licht',
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'D doelsaldo' }))
    await expect(canvas.getByRole('columnheader', { name: 'D doelsaldo' })).toHaveAttribute('aria-sort', 'descending')
    await expect(canvas.getByRole('button', { name: 'D doelsaldo' })).toHaveFocus()
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

export const SortedKey = meta.story({
  globals: { theme: 'light' },
  name: 'Het kerngetal volgt de sortering, licht',
  parameters: {
    docs: {
      description: {
        story:
          'De punten zijn het kerngetal en dus vet. Na een klik op een andere kolom is die kolom vet en de punten niet meer: het kerngetal is de kolom waarop de tabel is geordend.',
      },
    },
  },
  play: async ({ canvas, canvasElement }) => {
    const keys = () =>
      [...canvasElement.querySelectorAll('tbody tr:first-child td')].map((cell) => cell.classList.contains('hf-key'))

    await expect(keys()).toEqual([false, false, false, false, true, false])
    await userEvent.click(canvas.getByRole('button', { name: 'D doelsaldo' }))
    await expect(keys()).toEqual([false, false, false, false, false, true])
  },
  render: renderSortable('40rem'),
})

export const SortableLongHeaders = meta.story({
  globals: { theme: 'light' },
  name: 'Sorteerbare kolommen met een lange kop en een korte, gesorteerd, licht',
  play: async ({ canvas }) => {
    await userEvent.click(canvas.getByRole('button', { name: 'Weergaven' }))
    await expect(canvas.getByRole('columnheader', { name: 'Weergaven' })).toHaveAttribute('aria-sort', 'descending')
  },
  render: () => (
    <div style={{ maxInlineSize: '20rem' }}>
      <Card aria-labelledby="lange-kop">
        <Heading id="lange-kop" level={2}>
          Per dag
        </Heading>
        <DataTable
          caption="Unieke bezoekers en paginaweergaven per dag"
          columns={[
            { name: 'Dag', sortable: true },
            { name: 'Bezoekers', sortable: true },
            { name: 'Weergaven', sortable: true },
          ]}
          rows={days}
        />
      </Card>
    </div>
  ),
})

const matches: DataTableTextRow[] = [
  {
    cells: ['2 - 1', 'Gespeeld'],
    header: 'Testclub - FC Voorbeeld',
    href: '#wedstrijd-1',
    secondary: 'zondag 1 november 2026, Eredivisie',
  },
  {
    cells: ['–', <a href="#uitslag">Uitslag ontbreekt</a>],
    header: 'Proefstad SV - Testclub',
    href: '#wedstrijd-2',
    secondary: 'woensdag 28 oktober 2026, KNVB Beker',
  },
  {
    cells: ['0 - 0', 'Gespeeld'],
    header: 'Testclub - Teststad Boys',
    secondary: 'zaterdag 3 oktober 2026, Eredivisie',
  },
]

export const TextTable = meta.story({
  name: 'Tabel met tekst',
  render: () => (
    <Card aria-labelledby="wedstrijden-kop" style={{ maxInlineSize: '40rem' }}>
      <Heading id="wedstrijden-kop" level={2}>
        Wedstrijden
      </Heading>
      <DataTable
        appearance="text"
        caption="Wedstrijden van Testclub met de uitslag en de status"
        columns={['Wedstrijd', 'Uitslag', 'Status']}
        rows={matches}
      />
    </Card>
  ),
})

const waits: [club: string, date: string, day: string, days: number][] = [
  ['FC Voorbeeld', '21 april 2019', '2019-04-21', 2760],
  ['Proefstad SV', '9 februari 2022', '2022-02-09', 1740],
  ['Teststad Boys', '3 oktober 2026', '2026-10-03', 38],
]

export const TextTableWithBars = meta.story({
  name: 'Tabel met tekst en balken',
  parameters: {
    docs: {
      description: {
        story:
          'Een cel van een tabel met tekst kan een `Bar` naast de tekst hebben. Zet de tabel in een `BarPlace`: de balk verdwijnt daar waar de plaats te smal voor hem is. De balk is versiering en verborgen voor een schermlezer.',
      },
    },
  },
  render: () => (
    <Card aria-labelledby="balken-kop" style={{ maxInlineSize: '24rem' }}>
      <Heading id="balken-kop" level={2}>
        Laatste overwinning
      </Heading>
      <BarPlace>
        <DataTable
          appearance="text"
          caption="De clubs van Testcompetitie, van de langste tijd sinds onze laatste overwinning tot de kortste"
          columns={['Club', 'Laatste overwinning', 'Dagen geleden']}
          rows={waits.map(([club, date, day, days]) => ({
            cells: [
              <>
                <Time dateTime={day}>{date}</Time>
                <Bar share={(days / 2760) * 100} />
              </>,
              days,
            ],
            header: club,
            href: '#club',
          }))}
        />
      </BarPlace>
    </Card>
  ),
})

const foldMatches: DataTableTextRow[] = [
  {
    cells: ['1 november 2026 om 14:30', 'Eredivisie, Speelronde 11', '2 - 1', 'Gespeeld'],
    header: 'Testclub - FC Voorbeeld',
    href: '#wedstrijd-1',
  },
  {
    cells: ['28 oktober 2026 om 20:00', 'KNVB Beker, Tweede ronde', '–', <a href="#uitslag">Uitslag ontbreekt</a>],
    header: 'Proefstad SV - Testclub',
    href: '#wedstrijd-2',
  },
]

const foldColumns = [
  'Wedstrijd',
  { fold: true, name: 'Datum' },
  { fold: true, name: 'Competitie' },
  'Uitslag',
  'Status',
]

export const FoldingColumns = meta.story({
  name: 'Kolommen die opvouwen',
  parameters: {
    docs: {
      description: {
        story:
          'Hier is de tabel breed genoeg voor vijf kolommen. In een smallere ruimte, zoals op een telefoon, staan de datum en de competitie onder de naam van de wedstrijd.',
      },
    },
  },
  render: () => (
    <Card aria-labelledby="vouw-kop">
      <Heading id="vouw-kop" level={2}>
        Wedstrijden
      </Heading>
      <DataTable appearance="text" caption="Wedstrijden van Testclub" columns={foldColumns} rows={foldMatches} />
    </Card>
  ),
})

export const FoldedColumns = meta.story({
  name: 'Kolommen opgevouwen',
  parameters: {
    docs: {
      description: {
        story: 'Dezelfde tabel in een smalle ruimte: drie kolommen, met de datum en de competitie onder de wedstrijd.',
      },
    },
  },
  render: () => (
    <Card aria-labelledby="gevouwen-kop" style={{ maxInlineSize: '30rem' }}>
      <Heading id="gevouwen-kop" level={2}>
        Wedstrijden
      </Heading>
      <DataTable appearance="text" caption="Wedstrijden van Testclub" columns={foldColumns} rows={foldMatches} />
    </Card>
  ),
})
