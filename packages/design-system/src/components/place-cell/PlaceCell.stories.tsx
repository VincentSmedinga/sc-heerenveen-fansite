import preview from '#.storybook/preview'

import { DataTable } from '../data-table/DataTable'
import { tableColumns } from '../table-columns'
import { TopScorersTable } from '../top-scorers-table/TopScorersTable'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'De cel met de plaats van een rij in een ranglijst, in de kolom voor de rijkop.',
          'Delen rijen een plaats, dan toont alleen de eerste rij het nummer en tonen de volgende een verticaal beletselteken (⋮) op die plek, zodat je in één blik ziet wie een plaats deelt: 4, ⋮, ⋮, ⋮, 8.',
          'Een schermlezer hoort bij elke rij de plaats, bij een gedeelde rij "gedeeld 4", en nooit het teken.',
          'Een lijst die op een tweede kaart of pagina doorloopt, begint met een nummer.',
          '',
          'Elke ranglijst in het designsysteem gebruikt de cel: de stand, de doelpuntenmakers en een `DataTable` met plaatsen.',
          'Een tabel geeft de plaatsen van zijn rijen aan `sharedPlaces`, en elke cel krijgt `shared`.',
          'Het beletselteken van een rij voor een tijd weg (`gap` in een `DataTable`) is een ander teken voor iets anders: het staat in de rijkop, nooit in deze kolom.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/PlaceCell',
})

const players = [
  { givenName: 'Wouter', id: 1, surname: 'Proefman' },
  { givenName: 'Gerrit', id: 2, surname: 'Nepper' },
  { givenName: 'Joris', id: 3, surname: 'Testvoort' },
  { givenName: 'Daan', id: 4, surname: 'Voorbeeld' },
  { givenName: 'Sem', id: 5, surname: 'Demo' },
  { givenName: 'Luuk', id: 6, surname: 'Maquette' },
] as const

const ranking = () => (
  <TopScorersTable
    caption="Doelpuntenmakers van een verzonnen seizoen"
    rows={[
      { goals: 8, players: [players[0]], position: 1 },
      { goals: 4, players: [players[1]], position: 2 },
      { goals: 4, players: [players[2]], position: 2 },
      { goals: 4, players: [players[3]], position: 2 },
      { goals: 2, players: [players[4]], position: 5 },
      { goals: 1, players: [players[5]], position: 6 },
    ]}
    showGoalsPerMatch={false}
  />
)

export const SharedPlaces = meta.story({ globals: { theme: 'light' }, name: 'Gedeelde plaatsen', render: ranking })

export const SharedPlacesDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Gedeelde plaatsen, donker',
  render: ranking,
})

export const InADataTable = meta.story({
  name: 'In een DataTable',
  render: () => (
    <DataTable
      caption="De tien clubs met de meeste punten per wedstrijd, verzonnen"
      columns={['Club', { ...tableColumns.pointsPerMatch, key: true }, tableColumns.played]}
      rows={[
        { cells: ['2,50', 6], header: 'Testclub', position: 1 },
        { cells: ['2,00', 5], header: 'FC Voorbeeld', position: 2 },
        { cells: ['2,00', 5], header: 'SV Proefdorp', position: 2 },
        { cells: ['1,50', 4], header: 'Maquette United', position: 4 },
      ]}
    />
  ),
})
