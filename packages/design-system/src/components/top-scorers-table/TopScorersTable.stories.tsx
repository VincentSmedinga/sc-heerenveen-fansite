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
          "Een korte lijst, zoals de top 5, voegt ze samen: spelers met evenveel doelpunten delen één rij, met de namen achter elkaar gescheiden door komma's, en een lange lijst met alle spelers houdt een rij per speler.",
          'De doelpunten in een gedeelde rij gelden voor elke speler, en een naam breekt nooit midden in de naam.',
          'Het aantal doelpunten is het kerngetal en dus vet, want daarop is de lijst gesorteerd.',
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
          '- `rows` zijn de plaatsen van boven naar beneden, met de plaats, de doelpunten en een of meer spelers (voornaam en achternaam, zie `PlayerName`).',
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
  { goals: 8, players: [{ givenName: 'Wouter', id: 1, surname: 'Proefman' }], position: 1 },
  { goals: 4, players: [{ givenName: 'Gerrit', id: 2, surname: 'Nepper' }], position: 2 },
  { goals: 4, players: [{ givenName: 'Joris', id: 3, surname: 'Testvoort' }], position: 2 },
  { goals: 2, players: [{ givenName: 'Rick', id: 4, surname: 'Demo' }], position: 4 },
  { goals: 1, players: [{ givenName: 'Pieter', id: 5, surname: 'Voorbeeld' }], position: 5 },
]

// A long list, like a season with many scorers: one player with seven goals, then levels down
// to the players with one goal, who share the last place.
const longRows: TopScorersTableRow[] = [
  { goals: 7, players: [{ givenName: 'Wouter', id: 6, surname: 'Proefman' }], position: 1 },
  { goals: 5, players: [{ givenName: 'Gerrit', id: 7, surname: 'Nepper' }], position: 2 },
  { goals: 4, players: [{ givenName: 'Rick', id: 8, surname: 'Demo' }], position: 3 },
  { goals: 4, players: [{ givenName: 'Joris', id: 9, surname: 'Testvoort' }], position: 3 },
  { goals: 3, players: [{ givenName: 'Pieter', id: 10, surname: 'Voorbeeld' }], position: 5 },
  { goals: 3, players: [{ givenName: 'Jan', id: 11, surname: 'Van der Voorbeeldstraat-Proefmans' }], position: 5 },
  { goals: 2, players: [{ givenName: 'Teun', id: 12, surname: 'Dummy' }], position: 7 },
  { goals: 2, players: [{ givenName: 'Sander', id: 13, surname: 'Monster' }], position: 7 },
  { goals: 2, players: [{ givenName: 'Lennart', id: 14, surname: 'Probeer' }], position: 7 },
  { goals: 1, players: [{ id: 15, surname: 'Kopie' }], position: 10 },
  { goals: 1, players: [{ id: 16, surname: 'Modelman' }], position: 10 },
  { goals: 1, players: [{ id: 17, surname: 'Oefenaar' }], position: 10 },
  { goals: 1, players: [{ givenName: 'Marijn', id: 18, surname: 'Sjabloon' }], position: 10 },
  { goals: 1, players: [{ givenName: 'Niels', id: 19, surname: 'Steekproef' }], position: 10 },
  { goals: 1, players: [{ id: 20, surname: 'Teststraat' }], position: 10 },
  { goals: 1, players: [{ id: 21, surname: 'Voorproef' }], position: 10 },
  { goals: 1, players: [{ id: 22, surname: 'Voorstudie' }], position: 10 },
  { goals: 1, players: [{ id: 23, surname: 'Werkstuk' }], position: 10 },
  { goals: 1, players: [{ id: 24, surname: 'Zetproef' }], position: 10 },
  { goals: 1, players: [{ id: 25, surname: 'Zonnetje' }], position: 10 },
]

// Long names: the surname with a prefix, and a row that players share. They wrap at a space in
// a narrow place, and a word that is wider than the place breaks anywhere.
const longNameRows: TopScorersTableRow[] = [
  {
    goals: 4,
    players: [{ givenName: 'Jan Willem', id: 1, surname: 'Van der Voorbeeldstraat-Proefmans' }],
    position: 1,
  },
  {
    goals: 2,
    players: [
      { givenName: 'Johannes Christiaan', id: 2, surname: 'De Wit van Testvoort' },
      { givenName: 'Gerrit', id: 3, surname: 'Nepper' },
    ],
    position: 2,
  },
]

// Everybody scored once: the same goals, so the same bars and the same place.
const equalRows: TopScorersTableRow[] = rows.map((row) => ({ ...row, goals: 1, position: 1 }))

// The short form of a list: players with the same goals share a row, so there is one row for
// each place. The goals are those of each player in the row.
const sharedRows: TopScorersTableRow[] = [
  { goals: 8, players: [{ givenName: 'Wouter', id: 1, surname: 'Proefman' }], position: 1 },
  {
    goals: 4,
    players: [
      { givenName: 'Gerrit', id: 2, surname: 'Nepper' },
      { givenName: 'Joris', id: 3, surname: 'Testvoort' },
    ],
    position: 2,
  },
  { goals: 2, players: [{ givenName: 'Rick', id: 4, surname: 'Demo' }], position: 4 },
  {
    goals: 1,
    players: [
      { givenName: 'Pieter', id: 5, surname: 'Voorbeeld' },
      { givenName: 'Jan', id: 6, surname: 'Van der Meer' },
      { id: 7, surname: 'Kopie' },
      { givenName: 'Marijn', id: 8, surname: 'Sjabloon' },
      { id: 9, surname: 'Teststraat' },
      { givenName: 'Niels', id: 10, surname: 'Steekproef' },
    ],
    position: 5,
  },
]

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

export const SharedLight = meta.story({
  globals: { theme: 'light' },
  name: 'Gelijke spelers delen een rij, licht',
  render: render('32rem', sharedRows),
})

export const SharedDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Gelijke spelers delen een rij, donker',
  render: render('32rem', sharedRows),
})

export const LongNamesNarrowLight = meta.story({
  globals: { theme: 'light' },
  name: 'Lange namen breken af op een spatie, smalle plek, licht',
  render: render('20rem', longNameRows),
})

export const SharedNarrowLight = meta.story({
  globals: { theme: 'light' },
  name: 'Gelijke spelers delen een rij op een smalle plek, licht',
  render: render('20rem', sharedRows),
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
