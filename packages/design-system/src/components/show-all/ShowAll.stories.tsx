import { expect, userEvent, within } from 'storybook/test'

import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { DataTable } from '../data-table/DataTable'
import { PredictionList } from '../prediction-list/PredictionList'
import { ShowAll } from './ShowAll'

// Made-up players and clubs.
const players = [
  'Wouter Proefman',
  'Gerrit Nepper',
  'Joris Testvoort',
  'Rick Demo',
  'Sander Voorbeeld',
  'Bram Schets',
  'Teun Kladblok',
]

const ranking = (
  <DataTable
    caption="De spelers van hoog naar laag op cijfer"
    columns={['Speler', { key: true, name: 'Gemiddeld cijfer' }]}
    legend="Gemiddeld cijfer: het gemiddelde van alle cijfers."
    rows={players.map((header, index) => ({
      cells: [(8.4 - index * 0.3).toFixed(1).replace('.', ',')],
      header,
      position: index + 1,
    }))}
    // The players stand in the order of the ranking.
    sortable={false}
  />
)

const sortableTable = (
  <DataTable
    appearance="text"
    caption="De clubtopscorer per seizoen, met zijn doelpunten"
    columns={['Seizoen', 'Speler', 'Doelpunten']}
    rows={players.map((player, index) => ({
      cells: [player, [9, 21, 14, 7, 18, 11, 16][index]!],
      header: `${2025 - index}/${(26 - index).toString().padStart(2, '0')}`,
    }))}
  />
)

const matches = (
  <PredictionList
    aria-label="Eerdere wedstrijden"
    items={['Alkmaar', 'Breda', 'Coevorden', 'Delft'].map((opponent, index) => ({
      match: {
        competition: 'Eredivisie',
        dateTime: '2026-11-29',
        home: true,
        opponent,
        round: `Speelronde ${14 - index}`,
        status: 'scheduled' as const,
        time: 'zo 29 nov',
      },
      points: 12 - index,
      prediction: 'Proefman, Nepper, Testvoort, Demo',
    }))}
  />
)

const meta = preview.meta({
  argTypes: {
    children: { control: false, description: 'Een tabel of een `PredictionList` met alle regels, met de legenda.' },
    lessLabel: { control: 'text', description: 'De tekst van de knop als de lijst open is.' },
    moreLabel: { control: 'text', description: 'De tekst van de knop als de lijst dicht is. Hij zegt wat erbij komt.' },
    shown: { control: 'number', description: 'Hoeveel regels er staan als de lijst dicht is.' },
    total: { control: false, description: 'Hoeveel regels de lijst heeft.' },
  },
  component: ShowAll,
  parameters: {
    docs: {
      description: {
        component: [
          'Toont de eerste regels van een tabel of lijst, met een knop voor de rest. Het blijft één lijst: één bijschrift, één legenda, en sorteren gaat over alle regels.',
          'Kies dit als de rest van dezelfde lijst komt. Kies een `Disclosure` als er iets anders achter zit, zoals uitleg, een tabel bij een grafiek of een actie.',
          'Zonder JavaScript staan alle regels er en is er geen knop.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/ShowAll',
})

export const Default = meta.story({
  args: { children: ranking, moreLabel: 'Toon alle 7 spelers', shown: 3, total: players.length },
  name: 'Dicht',
})

export const Open = meta.story({
  args: { children: ranking, moreLabel: 'Toon alle 7 spelers', shown: 3, total: players.length },
  name: 'Open',
  play: async ({ canvasElement }) => {
    const button = within(canvasElement).getByRole('button', { name: 'Toon alle 7 spelers' })

    await userEvent.click(button)
    await expect(button).toHaveAttribute('aria-expanded', 'true')
    await expect(within(canvasElement).getByText('Teun Kladblok')).toBeVisible()
  },
})

export const Sortable = meta.story({
  args: { children: sortableTable, moreLabel: 'Toon alle 7 seizoenen', shown: 3, total: players.length },
  name: 'Met een sorteerbare tabel',
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement)

    await expect(canvas.getByText('Teun Kladblok')).not.toBeVisible()
    await userEvent.click(canvas.getByRole('button', { name: 'Doelpunten' }))
    // The second row of the page has the most goals, so it stays, and the first one goes.
    await expect(canvas.getByText('Gerrit Nepper')).toBeVisible()
    await expect(canvas.getByText('Wouter Proefman')).not.toBeVisible()
  },
})

export const WithList = meta.story({
  args: { children: matches, moreLabel: 'Toon alle 4 wedstrijden', shown: 2, total: 4 },
  name: 'Met een lijst',
})
