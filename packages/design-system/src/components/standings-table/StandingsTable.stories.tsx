import preview from '#.storybook/preview'

import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { StandingsTable, type StandingsTableRow } from './StandingsTable'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De stand van de competitie, als echte `table`.',
          'De tabel heeft een bijschrift dat zegt voor welke dag de stand geldt, maar alleen een schermlezer krijgt het: bezienden zien de kop van de kaart.',
          'Verder heeft de tabel kolomkoppen met `scope` en een rijkop met de naam van elke club.',
          'De kolommen zijn de positie, de club, G (gespeeld) en P (punten).',
          'De koppen zijn afkortingen.',
          'Onder de volledige tabel staan de volle woorden: "G gespeeld, P punten, …".',
          'De korte vorm heeft die regel niet, want een smalle kolom heeft er geen plaats voor.',
          'De afkorting zelf heeft ook een `title` met het volle woord, maar die verschijnt alleen onder een muis en een telefoon heeft er niets aan.',
          '',
          'De rij van sc Heerenveen valt op met meer dan kleur: ze is vet, ze heeft een balk aan het begin van de rij en een schermlezer hoort "(onze club)" achter de naam.',
          'De punten zijn vet, zwaarder dan de andere getallen, want daarop is de stand gesorteerd.',
          'De positie heeft de kleur van markeringen, de getallen staan rechts uitgelijnd en hebben tabelcijfers, zodat ze recht onder elkaar staan.',
          '',
          'In de volledige tabel staat in de cel van de punten, rechts van het getal, een balk.',
          'De lengte is het aandeel van de punten van de koploper: de koploper vult de balk, een club met de helft van de punten vult de helft.',
          'De schaal begint bij nul, dus de balk toont de echte verhouding, en clubs met evenveel punten hebben even lange balken.',
          'Heeft niemand punten, dan zijn er geen balken.',
          'De balk is versiering: een schermlezer slaat hem over en leest alleen de getallen.',
          'Hij is groen, de kleur van een gewonnen wedstrijd, want punten komen uit winst: een rustige tint, en bij de rij van sc Heerenveen het hele groen.',
          'Is de plek van de tabel te smal, zoals op een telefoon, dan verdwijnt de balk en blijft de rest van de tabel staan.',
          'Dat hangt af van de breedte van de plek waar de tabel in staat en niet van het scherm.',
          '',
          '- `caption` is de tekst van het bijschrift, dat niet te zien is.',
          '- `rows` zijn de clubs van boven naar beneden.',
          '- `columns` is `all` (standaard) of `compact`.',
          '  `all` is de volledige stand, met balken en de uitleg van de afkortingen.',
          '  `compact` heeft geen balken en geen uitleg en past in een smalle kolom, zoals de zijbalk van de homepage.',
          '  Daar staan drie clubs, met sc Heerenveen in het midden als dat kan: de pagina kiest de rijen en geeft ze aan het component.',
          '',
          'Er zijn geen links en geen clubwapens: alleen de namen.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/StandingsTable',
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

const caption = 'Stand op 18 oktober 2026'

const renderFull = (maxInlineSize: string, tableRows: StandingsTableRow[]) => () => (
  <div style={{ maxInlineSize }}>
    <Card aria-labelledby="stand-kop">
      <Heading id="stand-kop" level={2}>
        Stand
      </Heading>
      <StandingsTable caption={caption} rows={tableRows} />
    </Card>
  </div>
)

const renderCompact = () => (
  <div style={{ maxInlineSize: '20rem' }}>
    <Card aria-labelledby="stand-kop">
      <Heading id="stand-kop" level={2}>
        Stand
      </Heading>
      <StandingsTable caption={caption} columns="compact" rows={rows.slice(1, 4)} />
    </Card>
  </div>
)

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Volledige stand met balken, licht',
  render: renderFull('32rem', rows),
})

export const Dark = meta.story({
  globals: { theme: 'dark' },
  name: 'Volledige stand met balken, donker',
  render: renderFull('32rem', rows),
})

export const EqualLight = meta.story({
  globals: { theme: 'light' },
  name: 'Gelijke punten, even lange balken, licht',
  render: renderFull('32rem', equalRows),
})

export const EqualDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Gelijke punten, even lange balken, donker',
  render: renderFull('32rem', equalRows),
})

export const NoPointsLight = meta.story({
  globals: { theme: 'light' },
  name: 'Niemand heeft punten, geen balken, licht',
  render: renderFull('32rem', noPointsRows),
})

export const NoPointsDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Niemand heeft punten, geen balken, donker',
  render: renderFull('32rem', noPointsRows),
})

export const NarrowLight = meta.story({
  globals: { theme: 'light' },
  name: 'Smalle plek, de balk verdwijnt, licht',
  render: renderFull('20rem', rows),
})

export const NarrowDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Smalle plek, de balk verdwijnt, donker',
  render: renderFull('20rem', rows),
})

export const CompactLight = meta.story({
  globals: { theme: 'light' },
  name: 'Korte stand met drie clubs, zonder balk, licht',
  render: renderCompact,
})

export const CompactDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Korte stand met drie clubs, zonder balk, donker',
  render: renderCompact,
})
