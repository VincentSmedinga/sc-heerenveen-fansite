import { expect, userEvent } from 'storybook/test'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Bar, BarPlace } from '../bar/Bar'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { PlayerName } from '../player-name/PlayerName'
import { signedNumber, tableColumns, tableLegend } from '../table-columns'
import { Text } from '../text/Text'
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
  'Club',
  ...clubColumns.map((column) => ({ ...column, key: column.abbreviation === 'P' })),
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
          'Een tabel met getallen, als echte `table`: een lijst van dingen met elk een paar getallen. De eerste kolom heeft de rijkoppen, zoals een dag of een club, en de andere kolommen hebben getallen die recht onder elkaar staan.',
          'Het bijschrift (`caption`) zegt wat erin staat, maar alleen een schermlezer krijgt het: zet dus een kop boven de tabel, bijvoorbeeld in een kaart.',
          'Past een tabel met veel kolommen niet met hele woorden, geef een kolom dan als `{ abbreviation, name }`: de kop toont de afkorting, een schermlezer hoort het hele woord, en de pagina zet een regel onder de tabel die de afkortingen uitlegt.',
          'Elke tabel sorteert op zijn kolommen: de bezoeker zoekt een uiterste, zoals de meeste toeschouwers. Een klik sorteert, een tweede klik keert om en een derde zet de tabel terug in de volgorde van de pagina. Sorteren werkt met JavaScript; zonder blijft de tabel in de volgorde van `rows`.',
          'Een tabel gaat er alleen met een reden uit, met `sortable={false}`: een ranglijst, een lijst in twee tabellen, een tabel met een totaalrij of een gaprij, of een korte reeks in een eigen volgorde. Een tabel met een rangorde (`position`), een totaalrij of een gaprij, of in een `DataTable.Group`, geeft een fout als hij niet `sortable={false}` zegt. Een kolom die geen volgorde heeft, zoals een kolom met alleen een koppeling, gaat er uit met `sortable: false`.',
          'Tekst sorteert met de Nederlandse regels en een lege cel staat achteraan. Geef een cel met een datum of een stand een `sortValue`, en een rij met een voorvoegsel een `sortHeader`, zodat "van Basten" onder de B staat.',
          'In een tabel is vet voor één ding: het kerngetal, de kolom met `key` of, in een tabel die sorteert, de kolom waarop de bezoeker sorteerde. Vet is nooit het enige teken.',
          'Met `appearance="text"` is het een tabel met tekst, zoals een lijst van wedstrijden. De stand van de competitie heeft een eigen component, `StandingsTable`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
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

export const Default = meta.story({
  name: 'Tabel',
  render: renderSortable('40rem'),
})

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

export const Days = meta.story({
  name: 'Drie kolommen',
  render: renderDays('40rem'),
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

export const Abbreviations = meta.story({
  name: 'Kolommen met een afkorting',
  render: renderAbbreviations,
})

export const LongRowHeader = meta.story({
  name: 'Een lange rijkop breekt af',
  render: renderPages('20rem'),
})

export const Links = meta.story({
  name: 'Rijen met een link',
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
  parameters: {
    docs: { description: { story: 'Een totaalrij blijft onderaan staan, dus deze tabel sorteert niet.' } },
  },
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
          // The total stays at the bottom, so the table does not sort.
          sortable={false}
        />
        <Text appearance="meta">{tableLegend(seasonColumns)}.</Text>
      </Card>
    </div>
  ),
})

export const SeasonsWithGap = meta.story({
  name: 'Seizoenen met een onderbreking',
  parameters: {
    docs: { description: { story: 'Een gaprij blijft op zijn plek staan, dus deze tabel sorteert niet.' } },
  },
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
          // The gap stays where it is, so the table does not sort.
          sortable={false}
        />
      </Card>
    </div>
  ),
})

const standingColumns = [
  'Club',
  { abbreviation: 'G', name: 'gespeeld' },
  { abbreviation: 'DS', name: 'doelsaldo' },
  { abbreviation: 'P', key: true, name: 'punten' },
]

export const StandingStretchNear = meta.story({
  name: 'Stuk van de stand, met weinig clubs ertussen',
  render: () => (
    <div style={{ maxInlineSize: '20rem' }}>
      <Card aria-labelledby="stand-dichtbij-kop">
        <Heading id="stand-dichtbij-kop" level={2}>
          Stand
        </Heading>
        <Text appearance="meta">Na speelronde 12</Text>
        <DataTable
          caption="Stand, na speelronde 12"
          columns={standingColumns}
          rows={[
            { cells: [12, '+8', 21], header: 'Demo Boys', highlight: true, note: 'onze club', position: 6 },
            { cells: [12, '0', 20], header: 'Proefstad SV', position: 7 },
            { cells: [12, '−3', 17], header: 'Voorbeeld United', position: 8 },
            { cells: [12, '+1', 15], header: 'Testdorp FC', highlight: true, note: 'de tegenstander', position: 9 },
          ]}
          // A stretch of the league table is in the order of the places, so it does not sort.
          sortable={false}
        />
        <Text>We staan drie plekken en zes punten boven Testdorp FC.</Text>
      </Card>
    </div>
  ),
})

export const StandingStretchFar = meta.story({
  name: 'Stuk van de stand, met veel clubs ertussen',
  render: () => (
    <div style={{ maxInlineSize: '20rem' }}>
      <Card aria-labelledby="stand-ver-kop">
        <Heading id="stand-ver-kop" level={2}>
          Stand
        </Heading>
        <Text appearance="meta">Na speelronde 12</Text>
        <DataTable
          caption="Stand, na speelronde 12"
          columns={standingColumns}
          rows={[
            { cells: [12, '+8', 23], header: 'Nepstad Rangers', position: 5 },
            { cells: [12, '+8', 21], header: 'Demo Boys', highlight: true, note: 'onze club', position: 6 },
            { cells: [12, '0', 20], header: 'Proefstad SV', position: 7 },
            {
              cells: [],
              display: '9 clubs ertussen',
              gap: true,
              header: '9 clubs ertussen',
            },
            { cells: [12, '−9', 9], header: 'Oefenveld AFC', position: 17 },
            { cells: [12, '−29', 3], header: 'Testdorp FC', highlight: true, note: 'de tegenstander', position: 18 },
          ]}
          // A stretch of the league table is in the order of the places, so it does not sort.
          sortable={false}
        />
        <Text>We staan twaalf plekken en achttien punten boven Testdorp FC.</Text>
      </Card>
    </div>
  ),
})

export const NamesWithPeriods = meta.story({
  name: 'Namen met een tweede regel',
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
  name: 'Met de plaats in de ranglijst',
  parameters: {
    docs: {
      description: {
        story:
          'Een ranglijst heeft de volgorde als antwoord, en het bijschrift zegt in welke richting. Hij sorteert dus niet.',
      },
    },
  },
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
          // The order is the answer of a ranking, so it does not sort.
          sortable={false}
        />
        <Text appearance="meta">{tableLegend([tableColumns.pointsPerMatch, tableColumns.played])}</Text>
      </Card>
    </div>
  ),
})

export const SortableLast = meta.story({
  name: 'Sorteerbaar, als laatste in een kaart',
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

export const Sorted = meta.story({
  name: 'Gesorteerd, met drie klikken',
  parameters: {
    docs: {
      description: {
        story:
          'De eerste klik sorteert, de tweede keert om en de derde zet de tabel terug in de volgorde van de pagina, zonder pijl.',
      },
    },
  },
  play: async ({ canvas }) => {
    const header = () => canvas.getByRole('columnheader', { name: 'D doelsaldo' })

    await userEvent.click(canvas.getByRole('button', { name: 'D doelsaldo' }))
    await expect(header()).toHaveAttribute('aria-sort', 'descending')
    await expect(canvas.getByRole('button', { name: 'D doelsaldo' })).toHaveFocus()
    await userEvent.click(canvas.getByRole('button', { name: 'D doelsaldo' }))
    await expect(header()).toHaveAttribute('aria-sort', 'ascending')
    await userEvent.click(canvas.getByRole('button', { name: 'D doelsaldo' }))
    await expect(header()).toHaveAttribute('aria-sort', 'none')
    await expect(canvas.getByRole('status')).toHaveTextContent('Niet meer gesorteerd, in de volgorde van de pagina')
  },
  render: renderSortable('20rem'),
})

export const SortedKey = meta.story({
  name: 'Het kerngetal volgt de sortering',
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
  name: 'Sorteerbare kolommen met een lange kop en een korte, gesorteerd',
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
          columns={['Dag', 'Bezoekers', 'Weergaven']}
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

const sortableMatches: DataTableTextRow[] = [
  {
    cells: [{ content: '1 november 2026', sortValue: '2026-11-01' }, '2 - 1'],
    header: 'Testclub - FC Voorbeeld',
  },
  {
    cells: [{ content: '28 oktober 2026', sortValue: '2026-10-28' }, ''],
    header: 'Proefstad SV - Testclub',
  },
  {
    cells: [{ content: '3 oktober 2026', sortValue: '2026-10-03' }, '0 - 0'],
    header: 'Testclub - Teststad Boys',
  },
]

export const TextTableSorted = meta.story({
  name: 'Tabel met tekst die sorteert',
  parameters: {
    docs: {
      description: {
        story:
          'Een datum sorteert op een `sortValue` en niet op de woorden. Een lege cel staat achteraan, welke kant ook op, en een kolom met een koppeling zonder waarde sorteert niet.',
      },
    },
  },
  play: async ({ canvas }) => {
    const first = () => canvas.getAllByRole('rowheader')[0]

    await userEvent.click(canvas.getByRole('button', { name: 'Datum' }))
    await expect(first()).toHaveTextContent('Testclub - Teststad Boys')
    await userEvent.click(canvas.getByRole('button', { name: 'Datum' }))
    await expect(first()).toHaveTextContent('Testclub - FC Voorbeeld')
    await userEvent.click(canvas.getByRole('button', { name: 'Uitslag' }))
    await userEvent.click(canvas.getByRole('button', { name: 'Uitslag' }))
    await expect(canvas.getAllByRole('rowheader')[2]).toHaveTextContent('Proefstad SV - Testclub')
  },
  render: () => (
    <Card aria-labelledby="sorteerbare-wedstrijden-kop" style={{ maxInlineSize: '40rem' }}>
      <Heading id="sorteerbare-wedstrijden-kop" level={2}>
        Wedstrijden
      </Heading>
      <DataTable
        appearance="text"
        caption="Wedstrijden van Testclub, de nieuwste eerst"
        columns={['Wedstrijd', 'Datum', 'Uitslag']}
        rows={sortableMatches}
      />
    </Card>
  ),
})

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

const waits: [club: string, days: number][] = [
  ['FC Voorbeeld', 2760],
  ['Proefstad SV', 1740],
  ['Teststad Boys', 38],
]

export const TextTableWithBars = meta.story({
  name: 'Tabel met tekst en balken',
  parameters: {
    docs: {
      description: {
        story:
          'Een kolom van een tabel met tekst kan getallen met een `Bar` erachter hebben: geef de kolom als `{ bar: true, name }`, dan staan de getallen rechts uitgelijnd en staat de kop over het getal en de balk. Zet de tabel in een `BarPlace`: de balk verdwijnt daar waar de plaats te smal voor hem is. De balk is versiering en verborgen voor een schermlezer.',
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
          columns={['Club', { bar: true, name: 'Dagen geleden' }]}
          rows={waits.map(([club, days]) => ({
            cells: [
              <>
                {days.toLocaleString('nl-NL')}
                <Bar share={(days / 2760) * 100} />
              </>,
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
          'Waar de tabel te smal is voor vijf kolommen, staan de datum en de competitie onder de naam van de wedstrijd. De ruimte is die van de tabel zelf, niet die van het venster.',
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

// Made-up matches with what they still miss, for the columns of short signs.
const markColumns = [
  'Wedstrijd',
  { abbreviation: 'U', mark: true, name: 'Uitslag' },
  { abbreviation: 'D', mark: true, name: 'Doelpunten' },
  { abbreviation: 'O', mark: true, name: 'Opstelling' },
  { abbreviation: 'G', mark: true, name: 'Gegevens' },
] as const

const mark = (sign: string, description: string) => (
  <DataTable.Mark description={description} href="#gat">
    {sign}
  </DataTable.Mark>
)

const markRows: DataTableTextRow[] = [
  {
    cells: [null, mark('2', 'doelpunten zonder speler bij Testclub'), mark('?', 'opstelling ontbreekt'), null],
    header: '14 aug',
    secondary: 'Testclub (u)',
  },
  {
    cells: [
      mark('?', 'uitslag ontbreekt bij Proefstad'),
      null,
      mark('?', 'opstelling ontbreekt'),
      mark('1', 'gegeven ontbreekt'),
    ],
    header: '21 aug',
    secondary: 'Proefstad (t)',
  },
]

const renderMarks = (width: string) => () => (
  <Card aria-labelledby="tekens-kop" style={{ maxInlineSize: width }}>
    <Heading id="tekens-kop" level={2}>
      Wedstrijden met een gat
    </Heading>
    <DataTable appearance="text" caption="Wedstrijden met een gat" columns={markColumns} rows={markRows} />
  </Card>
)

export const Marks = meta.story({
  name: 'Kolommen met tekens',
  parameters: {
    docs: {
      description: {
        story:
          'Een kolom met `mark` heeft korte tekens, elk een `DataTable.Mark`, en een lege cel voor wat compleet is. Het teken is rood: kies het voor wat ontbreekt, en niet voor een gewone waarde. Met ruimte staat het hele woord boven de kolom; in een smalle ruimte is de kop de letter uit `abbreviation`, en een schermlezer hoort het hele woord.',
      },
    },
  },
  render: renderMarks('48rem'),
})

// The card "Onze schutters" of the Voorbeschouwing, with made-up players.
const scorerRow = (given: string, surname: string, last: string, goals: number, href?: string): DataTableRow => ({
  cells: [last, goals],
  display: <PlayerName givenName={given} href={href} surname={surname} />,
  header: `${given} ${surname}`,
})

const scorerColumns = ['Speler', 'Laatst', 'Goals']

const renderScorers = (withSquad: boolean) => () => (
  <Card aria-labelledby="schutters-kop" style={{ maxInlineSize: '24rem' }}>
    <Heading id="schutters-kop" level={2}>
      Onze schutters in Proefstad
    </Heading>
    {withSquad && (
      <Card aria-labelledby="schutters-selectie" surface="soft">
        <Heading id="schutters-selectie" level={3}>
          Uit de selectie van nu
        </Heading>
        <DataTable
          caption="Spelers uit de selectie van nu die scoorden in Proefstad"
          columns={scorerColumns}
          rows={[scorerRow('Joris', 'Voorbeeld', '2025', 1, '#')]}
        />
      </Card>
    )}
    <Heading level={3}>Het vaakst</Heading>
    <DataTable
      caption="De spelers die in Proefstad het vaakst scoorden"
      columns={scorerColumns}
      rows={[
        scorerRow('Piet', 'Proefman', '2023', 2, '#'),
        scorerRow('Nick', 'Nepper', '2021', 2),
        scorerRow('Joris', 'Voorbeeld', '2025', 1, '#'),
        scorerRow('Kees', 'Kopie', '2017', 1),
      ]}
    />
  </Card>
)

export const Scorers = meta.story({
  name: 'Onze schutters, met spelers uit de selectie',
  parameters: {
    docs: {
      description: {
        story:
          'De kaart Onze schutters van de Voorbeschouwing: een zachte kaart met de spelers uit de selectie van nu, en daaronder de vijf die het vaakst scoorden, in dezelfde tabel. De naam is een link als de speler een pagina heeft. Het jaar van het laatste doelpunt en het aantal staan rechts.',
      },
    },
  },
  render: renderScorers(true),
})

export const ScorersWithoutSquad = meta.story({
  name: 'Onze schutters, zonder spelers uit de selectie',
  parameters: {
    docs: {
      description: {
        story: 'Scoorde niemand uit de selectie op die kant, dan valt de zachte kaart weg en blijft "Het vaakst" over.',
      },
    },
  },
  render: renderScorers(false),
})
