import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { DataTable } from '../data-table/DataTable'
import { KeyFigures } from '../key-figures/KeyFigures'
import { Match } from '../match/Match'
import { tableColumns, tableLegend } from '../table-columns'
import { Text } from '../text/Text'
import { Winner } from '../winner/Winner'
import { GameStatusCard } from './GameStatusCard'

const match = (
  <Match
    competition="Eredivisie"
    dateTime="2026-11-28T15:45:00Z"
    home
    opponent="FC Twente"
    round="Speelronde 14"
    status="scheduled"
    time="za 28 nov 16:45"
  />
)

const standing = (
  <DataTable
    caption="Stand 2026/27"
    columns={['Fan', { ...tableColumns.points, key: true }]}
    legend={tableLegend([tableColumns.points])}
    rows={[
      { cells: [212], header: 'Tjalle99', position: 1 },
      { aside: 'Jij', cells: [198], header: 'Pompebled', highlight: true, position: 2 },
      { cells: [190], header: 'Blauwwit_Sjoerd', position: 3 },
    ]}
    sortable={false}
  />
)

const meta = preview.meta({
  args: {
    action: { href: '/fans/prognose', label: 'Naar de Prognose', type: 'link' as const },
    children: (
      <>
        {match}
        <Text>48 fans voorspelden al.</Text>
        {standing}
      </>
    ),
    game: 'prognose' as const,
    heading: 'Prognose',
    tag: { text: 'Open tot za 16.45', tone: 'open' as const },
  },
  argTypes: {
    action: { description: 'De knop voor wat nog te doen is, of de link naar de pagina van het spel.' },
    children: { control: false, description: 'Wat er speelt, en wat van de fan is.' },
    game: { description: 'Het spel, dat de kaart zijn watermerk geeft.' },
    heading: { description: 'De naam van het spel.' },
    tag: { description: 'Hoe het spel staat, in woorden.' },
  },
  component: GameStatusCard,
  parameters: {
    docs: {
      description: {
        component:
          'De kaart van een spel op de pagina Fans: de naam, hoe het spel staat, wat er speelt en de weg naar het spel.',
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Weergave/GameStatusCard',
})

export const Default = meta.story({ name: 'Open' })

export const ToDo = meta.story({
  args: {
    action: { href: '/fans/fjouwer', label: 'Kies je vier', type: 'button' as const },
    children: (
      <>
        {match}
        <Text>87 fans kozen hun vier.</Text>
        <KeyFigures
          figures={[
            { figure: '14', label: 'punten', note: 'in de laatste wedstrijd' },
            { figure: '2e', label: 'plek', note: 'van 87' },
          ]}
        />
      </>
    ),
    game: 'fjouwer' as const,
    heading: 'Fjouwer',
    tag: { text: 'Nog te doen', tone: 'todo' as const },
  },
  name: 'Nog te doen',
})

export const Rated = meta.story({
  args: {
    action: { href: '/fans/uitblinker', label: 'Naar de Uitblinker', type: 'link' as const },
    children: (
      <>
        <Winner
          average="7,8"
          label="Uitblinker vorige wedstrijd"
          line="Thuis tegen Sparta Rotterdam, 3–1"
          name="Dylan Vente"
        />
        <Text appearance="meta">31 fans gaven cijfers.</Text>
      </>
    ),
    game: 'uitblinker' as const,
    heading: 'Uitblinker',
    tag: { text: 'Gesloten', tone: 'closed' as const },
  },
  name: 'Gesloten met uitblinker',
})

export const Quiz = meta.story({
  args: {
    action: { href: '/fans/fantest', label: 'Naar de Fantest', type: 'link' as const },
    children: <Text>Er is nu geen Fantest. De quizzen van toen kun je naspelen.</Text>,
    game: 'fantest' as const,
    heading: 'Fantest',
    tag: { text: 'Gesloten', tone: 'closed' as const },
  },
  name: 'Geen quiz open',
})
