import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { type TableColumn, tableColumns } from '../table-columns'
import { TopScorersTable, type TopScorersTableRow } from './TopScorersTable'

const meta = preview.meta({
  argTypes: {
    caption: { description: 'De tekst van het bijschrift, dat alleen een schermlezer krijgt.' },
    figure: { description: 'De kolom die de lijst telt, uit `tableColumns`: doelpunten, assists of minuten.' },
    rows: { description: 'De plaatsen van boven naar beneden, met de doelpunten en een of meer spelers.' },
    showGoalsPerMatch: {
      description: 'Voegt de kolom D/W toe. Elke speler krijgt dan een eigen rij.',
    },
  },
  component: TopScorersTable,
  parameters: {
    docs: {
      description: {
        component: [
          'De doelpuntenmakers van sc Heerenveen in het seizoen, als echte `table`: iedereen die scoorde, van veel naar weinig doelpunten, met de plaats, de speler en een balk bij de doelpunten.',
          'Spelers met evenveel doelpunten hebben dezelfde plaats; een korte lijst voegt ze samen in één rij, een lange lijst houdt een rij per speler. Met `figure` telt de lijst iets anders, zoals de assists of de minuten.',
          'De balk is versiering die een schermlezer overslaat, en op een te smalle plek verdwijnt hij. Zonder doelpunten geeft de pagina geen tabel maar een zin in de kaart.',
          'Hij is gebouwd uit `PlaceCell`, `PlayerName` en `Bar`, met de kolommen uit `tableColumns`, in een `Card` onder een kop van niveau 2.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
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

// The same players with their goals per match, one row each: the places stay shared.
const perMatchRows: TopScorersTableRow[] = [
  { goals: 8, players: [{ givenName: 'Wouter', goalsPerMatch: '0,32', id: 1, surname: 'Proefman' }], position: 1 },
  { goals: 4, players: [{ givenName: 'Gerrit', goalsPerMatch: '0,17', id: 2, surname: 'Nepper' }], position: 2 },
  { goals: 4, players: [{ givenName: 'Joris', goalsPerMatch: '0,50', id: 3, surname: 'Testvoort' }], position: 2 },
  { goals: 2, players: [{ givenName: 'Rick', goalsPerMatch: '0,09', id: 4, surname: 'Demo' }], position: 4 },
  { goals: 1, players: [{ givenName: 'Pieter', goalsPerMatch: '1,00', id: 5, surname: 'Voorbeeld' }], position: 5 },
]

const caption = 'Doelpuntenmakers van sc Heerenveen in het seizoen 2026/27, in de Eredivisie en de KNVB Beker'

// The minutes of the same players: one row each, and the figure is the minutes.
const minutesRows: TopScorersTableRow[] = [
  { goals: 1980, players: [{ givenName: 'Wouter', id: 1, surname: 'Proefman' }], position: 1 },
  { goals: 1710, players: [{ givenName: 'Gerrit', id: 2, surname: 'Nepper' }], position: 2 },
  { goals: 1710, players: [{ givenName: 'Joris', id: 3, surname: 'Testvoort' }], position: 2 },
  { goals: 905, players: [{ givenName: 'Rick', id: 4, surname: 'Demo' }], position: 4 },
  { goals: 90, players: [{ givenName: 'Pieter', id: 5, surname: 'Voorbeeld' }], position: 5 },
]

const render =
  (
    maxInlineSize: string,
    tableRows: TopScorersTableRow[],
    showGoalsPerMatch = false,
    figure: TableColumn = tableColumns.goals,
  ) =>
  () => (
    <div style={{ maxInlineSize }}>
      <Card aria-labelledby="doelpuntenmakers-kop">
        <Heading id="doelpuntenmakers-kop" level={2}>
          Doelpuntenmakers
        </Heading>
        <TopScorersTable caption={caption} figure={figure} rows={tableRows} showGoalsPerMatch={showGoalsPerMatch} />
      </Card>
    </div>
  )

export const Default = meta.story({
  args: { caption, rows, showGoalsPerMatch: false },
  name: 'Doelpuntenmakers met balken',
  render: (args) => (
    <div style={{ maxInlineSize: '32rem' }}>
      <Card aria-labelledby="doelpuntenmakers-kop">
        <Heading id="doelpuntenmakers-kop" level={2}>
          Doelpuntenmakers
        </Heading>
        <TopScorersTable {...args} />
      </Card>
    </div>
  ),
})

export const Minutes = meta.story({
  name: 'Een lijst van de minuten, met de letter M',
  render: render('32rem', minutesRows, false, tableColumns.minutes),
})

export const Long = meta.story({
  name: 'Lange lijst, twintig spelers',
  render: render('32rem', longRows),
})

export const Equal = meta.story({
  name: 'Gelijke spelers, even lange balken',
  render: render('32rem', equalRows),
})

export const Shared = meta.story({
  name: 'Gelijke spelers delen een rij',
  render: render('32rem', sharedRows),
})

export const PerMatch = meta.story({
  name: 'Met de kolom D/W, een rij per speler',
  render: render('32rem', perMatchRows, true),
})

export const LongNames = meta.story({
  name: 'Lange namen breken af op een spatie',
  render: render('20rem', longNameRows),
})
