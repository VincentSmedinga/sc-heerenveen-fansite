import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { RecordTable, type RecordTableRow } from './RecordTable'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De uitslagen van sc Heerenveen tegen één tegenstander, als echte `table`: een rij voor thuis en uit, en eronder de rij met het totaal.',
          'Kies hem op de pagina van een tegenstander; de punten staan er alleen als alle rijen ze hebben, dus een beker laat die kolom weg.',
          'De pagina telt de uitslagen en rekent het doelsaldo uit: het component rekent niets uit.',
          'Hij heeft de vorm van de stand (`StandingsTable`), zonder plaats en balk, en is gebouwd uit dezelfde kolommen uit `tableColumns`, in een `Card`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/RecordTable',
})

// Made-up figures of five matches against one club in the Eredivisie: the total is home plus
// away, and the points are 3 for a win and 1 for a draw.
const rows: RecordTableRow[] = [
  { drawn: 0, goalDifference: 5, lost: 0, name: 'Thuis', played: 2, points: 6, won: 2 },
  { drawn: 1, goalDifference: 1, lost: 1, name: 'Uit', played: 3, points: 4, won: 1 },
]
const total: RecordTableRow = { drawn: 1, goalDifference: 6, lost: 1, name: 'Totaal', played: 5, points: 10, won: 3 }

// The same table for the cup: it gives no points, so there is no column for them.
const withoutPoints = (row: RecordTableRow): RecordTableRow => ({ ...row, points: undefined })

// A club we never played at home: the row has zeros. A negative goal difference has a minus.
const awayOnlyRows: RecordTableRow[] = [
  { drawn: 0, goalDifference: 0, lost: 0, name: 'Thuis', played: 0, points: 0, won: 0 },
  { drawn: 0, goalDifference: -2, lost: 1, name: 'Uit', played: 1, points: 0, won: 0 },
]
const awayOnlyTotal: RecordTableRow = { ...awayOnlyRows[1]!, name: 'Totaal' }

const caption = 'De uitslagen van sc Heerenveen tegen Demo Boys in de Eredivisie, thuis, uit en in totaal'

const renderCard = (tableRows: RecordTableRow[], tableTotal: RecordTableRow) => () => (
  <div style={{ maxInlineSize: '24rem' }}>
    <Card aria-labelledby="uitslagen-kop" surface="soft">
      <Heading id="uitslagen-kop" level={2}>
        Onze uitslagen tegen Demo Boys
      </Heading>
      <RecordTable caption={caption} rows={tableRows} total={tableTotal} />
    </Card>
  </div>
)

export const Default = meta.story({
  name: 'Thuis en uit met het totaal',
  render: renderCard(rows, total),
})

export const NoHomeMatches = meta.story({
  name: 'Nooit thuis gespeeld, nullen en een minteken',
  render: renderCard(awayOnlyRows, awayOnlyTotal),
})

export const NoPoints = meta.story({
  name: 'Zonder punten, want de beker geeft er geen',
  render: renderCard(rows.map(withoutPoints), withoutPoints(total)),
})
