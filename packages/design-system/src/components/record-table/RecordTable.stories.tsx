import preview from '#.storybook/preview'

import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { RecordTable, type RecordTableRow } from './RecordTable'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De uitslagen van sc Heerenveen tegen één tegenstander, als echte `table`: een rij voor thuis en uit, en eronder de rij met het totaal.',
          'De tabel heeft een bijschrift dat zegt waarover hij gaat, maar alleen een schermlezer krijgt het: wie ziet, ziet de kop van de kaart.',
          'Verder heeft de tabel kolomkoppen met `scope` en een rijkop met de naam van elke rij.',
          'De kolommen zijn G (gespeeld), W (winst), G (gelijk), V (verlies), P (punten) en S (doelsaldo), met de letters uit de lijst van de kolommen van alle tabellen.',
          'De punten staan er alleen als alle rijen ze hebben: een beker geeft er geen, dus een tabel met bekerwedstrijden laat de kolom weg.',
          'De koppen zijn afkortingen, en onder de tabel staan de volle woorden: "G gespeeld, W winst, …".',
          'De afkorting zelf heeft ook een `title` met het volle woord, maar die verschijnt alleen onder een muis en een telefoon heeft er niets aan.',
          '',
          'De getallen van de winst, het gelijkspel en het verlies hebben de kleur van de uitslag, zoals de regels met wedstrijden: groen, grijs en rood.',
          'De kolomkop zegt wat ze zijn, dus kleur is niet het enige.',
          'Het doelsaldo heeft een teken: `+6`, `−2` of `0`.',
          'De punten en de rij met het totaal zijn vet, zwaarder dan de andere getallen, en boven het totaal staat een dikkere lijn.',
          '',
          'Hij heeft de vorm van de stand (`StandingsTable`): dezelfde letters, lijnen en rijkoppen, de getallen rechts uitgelijnd met tabelcijfers.',
          'Een eigen component, want de stand heeft een plaats, een club en punten met een balk, en hier is niets daarvan.',
          'De tabel past op een smalle plek, zoals een telefoon, zonder zijwaarts te scrollen.',
          '',
          '- `caption` is de tekst van het bijschrift, dat niet te zien is.',
          '- `rows` zijn de rijen van boven naar beneden, met hun naam en de getallen, en `total` is de rij eronder.',
          '  De pagina telt de uitslagen en rekent het doelsaldo uit: het component rekent niets uit.',
          '',
          'Er zijn geen links en geen afbeeldingen.',
        ].join('\n'),
      },
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

const renderCard = (maxInlineSize: string, tableRows: RecordTableRow[], tableTotal: RecordTableRow) => () => (
  <div style={{ maxInlineSize }}>
    <Card aria-labelledby="uitslagen-kop" surface="soft">
      <Heading id="uitslagen-kop" level={2}>
        Onze uitslagen tegen Demo Boys
      </Heading>
      <RecordTable caption={caption} rows={tableRows} total={tableTotal} />
    </Card>
  </div>
)

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Thuis en uit met het totaal, licht',
  render: renderCard('24rem', rows, total),
})

export const Dark = meta.story({
  globals: { theme: 'dark' },
  name: 'Thuis en uit met het totaal, donker',
  render: renderCard('24rem', rows, total),
})

export const NoHomeMatchesLight = meta.story({
  globals: { theme: 'light' },
  name: 'Nooit thuis gespeeld, nullen en een minteken, licht',
  render: renderCard('24rem', awayOnlyRows, awayOnlyTotal),
})

export const NarrowLight = meta.story({
  globals: { theme: 'light' },
  name: 'Smalle plek, geen zijwaartse scroll, licht',
  render: renderCard('20rem', rows, total),
})

export const NarrowDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Smalle plek, geen zijwaartse scroll, donker',
  render: renderCard('20rem', rows, total),
})

export const NoPointsLight = meta.story({
  globals: { theme: 'light' },
  name: 'Zonder punten, want de beker geeft er geen, licht',
  render: renderCard('24rem', rows.map(withoutPoints), withoutPoints(total)),
})
