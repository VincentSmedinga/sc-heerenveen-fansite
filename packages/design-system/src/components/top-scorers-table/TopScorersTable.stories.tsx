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
          '- `rows` zijn de spelers van boven naar beneden, met hun plaats, naam (voornaam en achternaam, zie `PlayerName`) en doelpunten.',
          '  De pagina telt de doelpunten en kiest de rijen: het component rekent alleen de balken uit.',
          '',
          "Er zijn geen links en geen foto's: alleen de namen.",
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/TopScorersTable',
})

// A made-up list: a top scorer with eight goals (so one goal is 12.5% of the bar), two players
// with four goals who share the second place, and two more.
const rows: TopScorersTableRow[] = [
  { givenName: 'Wouter', goals: 8, id: 1, position: 1, surname: 'Proefman' },
  { givenName: 'Gerrit', goals: 4, id: 2, position: 2, surname: 'Nepper' },
  { givenName: 'Joris', goals: 4, id: 3, position: 2, surname: 'Testvoort' },
  { givenName: 'Rick', goals: 2, id: 4, position: 4, surname: 'Demo' },
  { givenName: 'Pieter', goals: 1, id: 5, position: 5, surname: 'Voorbeeld' },
]

// A long list, like a season with many scorers: one player with seven goals, then levels down
// to the players with one goal, who share the last place.
const longRows: TopScorersTableRow[] = [
  { givenName: 'Wouter', goals: 7, id: 6, position: 1, surname: 'Proefman' },
  { givenName: 'Gerrit', goals: 5, id: 7, position: 2, surname: 'Nepper' },
  { givenName: 'Rick', goals: 4, id: 8, position: 3, surname: 'Demo' },
  { givenName: 'Joris', goals: 4, id: 9, position: 3, surname: 'Testvoort' },
  { givenName: 'Pieter', goals: 3, id: 10, position: 5, surname: 'Voorbeeld' },
  { givenName: 'Jan', goals: 3, id: 11, position: 5, surname: 'Van der Voorbeeldstraat-Proefmans' },
  { givenName: 'Teun', goals: 2, id: 12, position: 7, surname: 'Dummy' },
  { givenName: 'Sander', goals: 2, id: 13, position: 7, surname: 'Monster' },
  { givenName: 'Lennart', goals: 2, id: 14, position: 7, surname: 'Probeer' },
  { goals: 1, id: 15, position: 10, surname: 'Kopie' },
  { goals: 1, id: 16, position: 10, surname: 'Modelman' },
  { goals: 1, id: 17, position: 10, surname: 'Oefenaar' },
  { givenName: 'Marijn', goals: 1, id: 18, position: 10, surname: 'Sjabloon' },
  { givenName: 'Niels', goals: 1, id: 19, position: 10, surname: 'Steekproef' },
  { goals: 1, id: 20, position: 10, surname: 'Teststraat' },
  { goals: 1, id: 21, position: 10, surname: 'Voorproef' },
  { goals: 1, id: 22, position: 10, surname: 'Voorstudie' },
  { goals: 1, id: 23, position: 10, surname: 'Werkstuk' },
  { goals: 1, id: 24, position: 10, surname: 'Zetproef' },
  { goals: 1, id: 25, position: 10, surname: 'Zonnetje' },
]

// Everybody scored once: the same goals, so the same bars and the same place.
const equalRows: TopScorersTableRow[] = rows.map((row) => ({ ...row, goals: 1, position: 1 }))

const caption = 'Doelpuntenmakers van sc Heerenveen in het seizoen 2026/27, in de Eredivisie en de KNVB Beker'

const render = (maxInlineSize: string, tableRows: TopScorersTableRow[]) => () => (
  <div style={{ maxInlineSize }}>
    <Card aria-labelledby="doelpuntenmakers-kop">
      <Heading id="doelpuntenmakers-kop" level={2}>
        Doelpuntenmakers
      </Heading>
      <TopScorersTable caption={caption} rows={tableRows} />
    </Card>
  </div>
)

const renderEmpty = () => (
  <div style={{ maxInlineSize: '32rem' }}>
    <Card aria-labelledby="doelpuntenmakers-kop">
      <Heading id="doelpuntenmakers-kop" level={2}>
        Doelpuntenmakers
      </Heading>
      <Text>We hebben nog geen doelpuntenmakers van dit seizoen. Kijk straks nog eens.</Text>
    </Card>
  </div>
)

export const Light = meta.story({
  globals: { theme: 'light' },
  name: 'Doelpuntenmakers met balken, licht',
  render: render('32rem', rows),
})

export const Dark = meta.story({
  globals: { theme: 'dark' },
  name: 'Doelpuntenmakers met balken, donker',
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
