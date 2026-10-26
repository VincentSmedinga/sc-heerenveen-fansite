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
          'De koppen zijn afkortingen.',
          'Onder de volledige tabel staan de volle woorden: "G gespeeld, W gewonnen, …".',
          'De korte vorm heeft die regel niet, want een smalle kolom heeft er geen plaats voor.',
          'De afkorting zelf heeft ook een `title` met het volle woord, maar die verschijnt alleen onder een muis en een telefoon heeft er niets aan.',
          '',
          'De rij van sc Heerenveen valt op met meer dan kleur: ze is vet, ze heeft een balk aan het begin van de rij en een schermlezer hoort "(onze club)" achter de naam.',
          'De kolom met punten staat voor het doelsaldo en is vet, zwaarder dan de andere getallen, want daarop is de stand gesorteerd.',
          'De afkortingen zijn G (gespeeld), W (gewonnen), G (gelijk), V (verloren), P (punten) en D (doelsaldo).',
          'De positie heeft de kleur van markeringen, de getallen staan rechts uitgelijnd en hebben tabelcijfers, zodat ze recht onder elkaar staan.',
          '',
          '- `caption` is de tekst van het bijschrift, dat niet te zien is.',
          '- `rows` zijn de clubs van boven naar beneden.',
          '  Het doelsaldo kan negatief zijn: het component schrijft een plus of een echte min.',
          '- `columns` is `all` (standaard) of `compact`.',
          '  Met alle kolommen is de tabel breder dan een telefoon.',
          '  Hij staat dan in een eigen gebied dat zijwaarts scrolt, een naam heeft (`label`) en met het toetsenbord bereikbaar is, zodat de pagina zelf nooit zijwaarts scrolt.',
          '  `compact` laat gewonnen, gelijk en verloren weg en past in een smalle kolom, zoals de zijbalk van de homepage.',
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

// A made-up table, like the one the seed puts in the database: seven clubs, sc Heerenveen in
// the middle, and one club with a negative goal difference.
const rows: StandingsTableRow[] = [
  {
    club: 'Demo Boys',
    drawn: 1,
    goalDifference: 1,
    lost: 0,
    played: 2,
    points: 4,
    position: 1,
    won: 1,
  },
  {
    club: 'Proefstad SV',
    drawn: 1,
    goalDifference: 1,
    lost: 0,
    played: 2,
    points: 4,
    position: 2,
    won: 1,
  },
  {
    club: 'sc Heerenveen',
    drawn: 0,
    goalDifference: 3,
    lost: 0,
    played: 2,
    points: 6,
    position: 3,
    won: 2,
  },
  {
    club: 'Voorbeeld United',
    drawn: 1,
    goalDifference: -1,
    lost: 1,
    played: 2,
    points: 1,
    position: 4,
    won: 0,
  },
  {
    club: 'Testdorp FC',
    drawn: 1,
    goalDifference: -2,
    lost: 1,
    played: 2,
    points: 1,
    position: 5,
    won: 0,
  },
  {
    club: 'Nepstad Rangers',
    drawn: 0,
    goalDifference: -2,
    lost: 2,
    played: 2,
    points: 0,
    position: 6,
    won: 0,
  },
]

const caption = 'Stand op 18 oktober 2026'

const renderFull = (maxInlineSize: string) => () => (
  <div style={{ maxInlineSize }}>
    <StandingsTable caption={caption} label="De volledige stand" rows={rows} />
  </div>
)

const renderCompact = () => (
  <div style={{ maxInlineSize: '20rem' }}>
    <Card aria-labelledby="stand-kop">
      <Heading id="stand-kop" level={2}>
        Stand
      </Heading>
      <StandingsTable caption={caption} columns="compact" label="De stand" rows={rows.slice(1, 4)} />
    </Card>
  </div>
)

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Alle kolommen, licht',
  render: renderFull('40rem'),
})

export const Dark = meta.story({
  globals: { theme: 'dark' },
  name: 'Alle kolommen, donker',
  render: renderFull('40rem'),
})

export const PhoneLight = meta.story({
  globals: { theme: 'light' },
  name: 'Alle kolommen op een telefoon, scrollt in een eigen gebied, licht',
  render: renderFull('20rem'),
})

export const PhoneDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Alle kolommen op een telefoon, scrollt in een eigen gebied, donker',
  render: renderFull('20rem'),
})

export const CompactLight = meta.story({
  globals: { theme: 'light' },
  name: 'Compact met drie clubs, in de zijbalk, licht',
  render: renderCompact,
})

export const CompactDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Compact met drie clubs, in de zijbalk, donker',
  render: renderCompact,
})
