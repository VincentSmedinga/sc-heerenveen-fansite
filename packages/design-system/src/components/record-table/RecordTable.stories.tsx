import preview from '#.storybook/preview'

import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { RecordTable, type RecordTableRow } from './RecordTable'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De uitslagen van sc Heerenveen tegen één tegenstander, als echte `table`: een rij voor het totaal, thuis en uit.',
          'De tabel heeft een bijschrift dat zegt waarover hij gaat, maar alleen een schermlezer krijgt het: bezienden zien de kop van de kaart.',
          'Verder heeft de tabel kolomkoppen met `scope` en een rijkop met de naam van elke rij.',
          'De kolommen zijn G (gespeeld), W (gewonnen), GL (gelijk), V (verloren), DV (doelpunten voor) en DT (doelpunten tegen).',
          'Er zijn geen punten, want een beker geeft er geen.',
          'De koppen zijn afkortingen, en onder de tabel staan de volle woorden: "G gespeeld, W gewonnen, …".',
          'De afkorting zelf heeft ook een `title` met het volle woord, maar die verschijnt alleen onder een muis en een telefoon heeft er niets aan.',
          '',
          'Hij heeft de vorm van de stand (`StandingsTable`): dezelfde letters, lijnen en rijkoppen, de getallen rechts uitgelijnd met tabelcijfers.',
          'Een eigen component, want de stand heeft een plaats, een club en punten met een balk, en hier is niets daarvan.',
          'De tabel past op een smalle plek, zoals een telefoon, zonder zijwaarts te scrollen.',
          '',
          '- `caption` is de tekst van het bijschrift, dat niet te zien is.',
          '- `rows` zijn de rijen van boven naar beneden, met hun naam en de getallen.',
          '  De pagina telt de uitslagen en kiest de rijen: het component rekent niets uit.',
          '',
          'Er zijn geen links en geen afbeeldingen.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/RecordTable',
})

// Made-up figures of five matches against one club: Totaal is Thuis plus Uit.
const rows: RecordTableRow[] = [
  { drawn: 1, goalsAgainst: 4, goalsFor: 10, lost: 1, name: 'Totaal', played: 5, won: 3 },
  { drawn: 0, goalsAgainst: 0, goalsFor: 5, lost: 0, name: 'Thuis', played: 2, won: 2 },
  { drawn: 1, goalsAgainst: 4, goalsFor: 5, lost: 1, name: 'Uit', played: 3, won: 1 },
]

// A club we never played at home: the row has zeros.
const awayOnlyRows: RecordTableRow[] = [
  { drawn: 0, goalsAgainst: 1, goalsFor: 0, lost: 1, name: 'Totaal', played: 1, won: 0 },
  { drawn: 0, goalsAgainst: 0, goalsFor: 0, lost: 0, name: 'Thuis', played: 0, won: 0 },
  { drawn: 0, goalsAgainst: 1, goalsFor: 0, lost: 1, name: 'Uit', played: 1, won: 0 },
]

const caption = 'De uitslagen van sc Heerenveen tegen Demo Boys, in totaal, thuis en uit'

const renderCard = (maxInlineSize: string, tableRows: RecordTableRow[]) => () => (
  <div style={{ maxInlineSize }}>
    <Card aria-labelledby="uitslagen-kop" surface="soft">
      <Heading id="uitslagen-kop" level={2}>
        Onze uitslagen tegen Demo Boys
      </Heading>
      <RecordTable caption={caption} rows={tableRows} />
    </Card>
  </div>
)

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Totaal, thuis en uit, licht',
  render: renderCard('24rem', rows),
})

export const Dark = meta.story({
  globals: { theme: 'dark' },
  name: 'Totaal, thuis en uit, donker',
  render: renderCard('24rem', rows),
})

export const NoHomeMatchesLight = meta.story({
  globals: { theme: 'light' },
  name: 'Nooit thuis gespeeld, nullen, licht',
  render: renderCard('24rem', awayOnlyRows),
})

export const NarrowLight = meta.story({
  globals: { theme: 'light' },
  name: 'Smalle plek, geen zijwaartse scroll, licht',
  render: renderCard('20rem', rows),
})

export const NarrowDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Smalle plek, geen zijwaartse scroll, donker',
  render: renderCard('20rem', rows),
})
