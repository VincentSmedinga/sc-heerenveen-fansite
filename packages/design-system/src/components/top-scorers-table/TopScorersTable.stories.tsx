import preview from '#.storybook/preview'

import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { Text } from '../text/Text'
import { TopScorersTable, type TopScorersTableRow } from './TopScorersTable'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De doelpuntenmakers van sc Heerenveen in het seizoen, als echte `table`: iedereen die scoorde, van veel naar weinig doelpunten.',
          'De tabel heeft een bijschrift dat zegt voor welk seizoen en welke competities hij telt, maar alleen een schermlezer krijgt het: bezienden zien de kop van de kaart.',
          'Verder heeft de tabel kolomkoppen met `scope` en een rijkop met de naam van elke speler.',
          'De kolommen zijn de plaats, de speler en de doelpunten.',
          'De kop van de doelpunten is de afkorting D, en onder de tabel staat het volle woord: "D doelpunten".',
          'De afkorting zelf heeft ook een `title`, maar die verschijnt alleen onder een muis en een telefoon heeft er niets aan.',
          '',
          'Spelers met evenveel doelpunten hebben dezelfde plaats.',
          'Het aantal doelpunten is vet, zwaarder dan de andere getallen, want daarop is de lijst gesorteerd.',
          'De getallen staan rechts uitgelijnd en hebben tabelcijfers, zodat ze recht onder elkaar staan.',
          '',
          'In de cel van de doelpunten staat, rechts van het getal, dezelfde balk als in de stand.',
          'De lengte is het aandeel van de doelpunten van de topscorer: de topscorer vult de balk, een speler met de helft van de doelpunten vult de helft.',
          'De schaal begint bij nul, dus de balk toont de echte verhouding, en spelers met evenveel doelpunten hebben even lange balken.',
          'De balk is versiering: een schermlezer slaat hem over en leest alleen de getallen.',
          'Is de plek van de tabel te smal, zoals op een telefoon, dan verdwijnt de balk en blijft de rest van de tabel staan.',
          'Dat hangt af van de breedte van de plek waar de tabel in staat en niet van het scherm.',
          '',
          'Zonder doelpunten geeft de pagina geen tabel, maar een zin voor de lezer in de kaart.',
          '',
          '- `caption` is de tekst van het bijschrift, dat niet te zien is.',
          '- `rows` zijn de spelers van boven naar beneden, met hun plaats, naam en doelpunten.',
          '  De pagina telt de doelpunten en kiest de rijen: het component rekent alleen de balken uit.',
          '',
          "Er zijn geen links en geen foto's: alleen de namen.",
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/TopScorersTable',
})

// A made-up list: a top scorer with eight goals (so one goal is 12.5% of the bar), two players
// with four goals who share the second place, and two more.
const rows: TopScorersTableRow[] = [
  { goals: 8, player: 'Proefman', position: 1 },
  { goals: 4, player: 'Nepper', position: 2 },
  { goals: 4, player: 'Testvoort', position: 2 },
  { goals: 2, player: 'Demo', position: 4 },
  { goals: 1, player: 'Voorbeeld', position: 5 },
]

// A long list, like a season with many scorers: one player with seven goals, then levels down
// to the players with one goal, who share the last place.
const longRows: TopScorersTableRow[] = [
  { goals: 7, player: 'Proefman', position: 1 },
  { goals: 5, player: 'Nepper', position: 2 },
  { goals: 4, player: 'Demo', position: 3 },
  { goals: 4, player: 'Testvoort', position: 3 },
  { goals: 3, player: 'Voorbeeld', position: 5 },
  { goals: 3, player: 'Van der Voorbeeldstraat-Proefmans', position: 5 },
  { goals: 2, player: 'Dummy', position: 7 },
  { goals: 2, player: 'Monster', position: 7 },
  { goals: 2, player: 'Probeer', position: 7 },
  { goals: 1, player: 'Kopie', position: 10 },
  { goals: 1, player: 'Modelman', position: 10 },
  { goals: 1, player: 'Oefenaar', position: 10 },
  { goals: 1, player: 'Sjabloon', position: 10 },
  { goals: 1, player: 'Steekproef', position: 10 },
  { goals: 1, player: 'Teststraat', position: 10 },
  { goals: 1, player: 'Voorproef', position: 10 },
  { goals: 1, player: 'Voorstudie', position: 10 },
  { goals: 1, player: 'Werkstuk', position: 10 },
  { goals: 1, player: 'Zetproef', position: 10 },
  { goals: 1, player: 'Zonnetje', position: 10 },
]

// Everybody scored once: the same goals, so the same bars and the same place.
const equalRows: TopScorersTableRow[] = rows.map((row) => ({ ...row, goals: 1, position: 1 }))

const caption = 'Topscorers van sc Heerenveen in het seizoen 2026/27, in de Eredivisie en de KNVB Beker'

const render = (maxInlineSize: string, tableRows: TopScorersTableRow[]) => () => (
  <div style={{ maxInlineSize }}>
    <Card aria-labelledby="topscorers-kop">
      <Heading id="topscorers-kop" level={2}>
        Topscorers
      </Heading>
      <TopScorersTable caption={caption} rows={tableRows} />
    </Card>
  </div>
)

const renderEmpty = () => (
  <div style={{ maxInlineSize: '32rem' }}>
    <Card aria-labelledby="topscorers-kop">
      <Heading id="topscorers-kop" level={2}>
        Topscorers
      </Heading>
      <Text>We hebben nog geen doelpuntenmakers van dit seizoen. Kijk straks nog eens.</Text>
    </Card>
  </div>
)

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Topscorers met balken, licht',
  render: render('32rem', rows),
})

export const Dark = meta.story({
  globals: { theme: 'dark' },
  name: 'Topscorers met balken, donker',
  render: render('32rem', rows),
})

export const LongLight = meta.story({
  globals: { theme: 'light' },
  name: 'Lange lijst, twintig spelers, licht',
  render: render('32rem', longRows),
})

export const LongDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Lange lijst, twintig spelers, donker',
  render: render('32rem', longRows),
})

export const EqualLight = meta.story({
  globals: { theme: 'light' },
  name: 'Gelijke spelers, even lange balken, licht',
  render: render('32rem', equalRows),
})

export const EqualDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Gelijke spelers, even lange balken, donker',
  render: render('32rem', equalRows),
})

export const NarrowLight = meta.story({
  globals: { theme: 'light' },
  name: 'Smalle plek, de balk verdwijnt, licht',
  render: render('20rem', rows),
})

export const NarrowDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Smalle plek, de balk verdwijnt, donker',
  render: render('20rem', rows),
})

export const EmptyLight = meta.story({
  globals: { theme: 'light' },
  name: 'Nog geen doelpunten, een zin in plaats van een tabel, licht',
  render: renderEmpty,
})

export const EmptyDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Nog geen doelpunten, een zin in plaats van een tabel, donker',
  render: renderEmpty,
})
