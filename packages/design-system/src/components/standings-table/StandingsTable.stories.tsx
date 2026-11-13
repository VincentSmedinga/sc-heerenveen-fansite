import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { StandingsTable, type StandingsTableRow } from './StandingsTable'

const meta = preview.meta({
  argTypes: {
    caption: { description: 'De tekst van het bijschrift, dat alleen een schermlezer krijgt.' },
    columns: {
      control: 'radio',
      description: '`all` is de volledige stand met balken, `compact` past in een smalle kolom zonder balken.',
      options: ['all', 'compact'],
    },
    rows: { description: 'De clubs van boven naar beneden. Een rij kan `pointsDeducted` hebben.' },
  },
  component: StandingsTable,
  parameters: {
    docs: {
      description: {
        component: [
          'De stand van de competitie, als echte `table` met de positie, de club, G (gespeeld) en P (punten), en in de volledige vorm een balk bij de punten.',
          'Kies de volledige vorm voor de pagina van een competitie en `compact` voor een smalle kolom, zoals de zijbalk van de homepage, met drie clubs en sc Heerenveen in het midden.',
          'De rij van sc Heerenveen valt op met meer dan kleur, de balk is versiering die een schermlezer overslaat, en onder de volledige tabel staat de uitleg van de afkortingen en een eventuele puntenaftrek.',
          'Hij is gebouwd uit `DataTable`-kolommen uit `tableColumns` en `Bar`, in een `Card` onder een kop van niveau 2.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/StandingsTable',
})

// A made-up table after ten matches: seven clubs, sc Heerenveen in the middle, a leader with 25
// points (so one point is 4% of the bar), two clubs with equal points.

const rows: StandingsTableRow[] = [
  { club: 'Demo Boys', played: 10, points: 25, position: 1 },
  { club: 'Proefstad SV', played: 10, points: 24, position: 2 },
  { club: 'sc Heerenveen', played: 10, points: 19, position: 3 },
  { club: 'Voorbeeld United', played: 10, points: 15, position: 4 },
  { club: 'Testdorp FC', played: 10, points: 15, position: 5 },
  { club: 'Nepstad Rangers', played: 10, points: 9, position: 6 },
  { club: 'Oefenveld AFC', played: 10, points: 4, position: 7 },
]

// Every club drew its first match: the same points, so the same bars.
const equalRows: StandingsTableRow[] = rows.map((row) => ({ ...row, played: 1, points: 1 }))

// The start of a season: nobody has points, so there are no bars.
const noPointsRows: StandingsTableRow[] = rows.map((row) => ({ ...row, played: 0, points: 0 }))

// The same table, in which a club lost six points to a deduction (its points are after it).
const deductedRows: StandingsTableRow[] = rows.map((row) =>
  row.club === 'Testdorp FC' ? { ...row, points: 9, pointsDeducted: 6 } : row,
)

const caption = 'Stand op 18 oktober 2026'

const renderFull = (tableRows: StandingsTableRow[]) => () => (
  <div style={{ maxInlineSize: '32rem' }}>
    <Card aria-labelledby="stand-kop">
      <Heading id="stand-kop" level={2}>
        Stand
      </Heading>
      <StandingsTable caption={caption} rows={tableRows} />
    </Card>
  </div>
)

export const Default = meta.story({
  args: { caption, columns: 'all', rows },
  name: 'Volledige stand met balken',
  render: (args) => (
    <div style={{ maxInlineSize: args.columns === 'compact' ? '20rem' : '32rem' }}>
      <Card aria-labelledby="stand-kop">
        <Heading id="stand-kop" level={2}>
          Stand
        </Heading>
        <StandingsTable {...args} />
      </Card>
    </div>
  ),
})

export const Equal = meta.story({
  name: 'Gelijke punten, even lange balken',
  render: renderFull(equalRows),
})

export const NoPoints = meta.story({
  name: 'Niemand heeft punten, geen balken',
  render: renderFull(noPointsRows),
})

export const Deduction = meta.story({
  name: 'Een club met puntenaftrek, een regel onder de tabel',
  render: renderFull(deductedRows),
})

export const Compact = meta.story({
  args: { caption, columns: 'compact', rows: rows.slice(1, 4) },
  name: 'Korte stand met drie clubs, zonder balk',
  render: Default.input.render,
})
