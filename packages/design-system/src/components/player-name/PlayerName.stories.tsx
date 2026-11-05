import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Link } from '../link/Link'
import { List } from '../list/List'
import { Text } from '../text/Text'
import { PlayerName } from './PlayerName'

const meta = preview.meta({
  argTypes: {
    givenName: {
      control: 'text',
      description: 'De voornaam, in het gewone gewicht. Laat hem weg bij een speler met één naam.',
    },
    surname: {
      control: 'text',
      description: 'De achternaam, in het zwaardere gewicht. Verplicht.',
    },
  },
  component: PlayerName,
  parameters: {
    docs: {
      description: {
        component: [
          'De naam van een speler, met de voornaam gewoon en de achternaam zwaarder, zodat je in één blik ziet over wie het gaat en welk deel de naam is waarop je zoekt.',
          'Voor een schermlezer en bij kopiëren is het één naam in één tekst; het gewicht is alleen voor het oog.',
          'Het gewicht staat op het component zelf, dus de naam ziet er overal hetzelfde uit.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Tekst/PlayerName',
})

export const Default = meta.story({
  args: { givenName: 'Jakob', surname: 'Trenskow' },
  name: 'Voornaam en achternaam',
  render: (args) => (
    <Text>
      De eerste treffer was van <PlayerName {...args} />.
    </Text>
  ),
})

export const SurnameOnly = meta.story({
  name: 'Alleen de achternaam',
  parameters: {
    docs: {
      description: {
        story:
          'Een speler met één naam, of een plek waar de voornaam er niet bij hoeft, toont alleen de achternaam in het zwaardere gewicht.',
      },
    },
  },
  render: () => (
    <Text>
      De tweede was van <PlayerName surname="Dinho" />.
    </Text>
  ),
})

export const InLink = meta.story({
  name: 'In een link',
  render: () => (
    <List role="list">
      <List.Item>
        <Link href="#trenskow">
          <PlayerName givenName="Jakob" surname="Trenskow" />
        </Link>
      </List.Item>
      <List.Item>
        <Link href="#van-aken">
          <PlayerName givenName="Joost" surname="van Aken" />
        </Link>
      </List.Item>
    </List>
  ),
})

export const InTableHeader = meta.story({
  name: 'In de rijkop van een tabel',
  parameters: {
    docs: {
      description: {
        story:
          'De rijkop van een tabel is halfvet, en toch blijft de voornaam gewoon: het gewicht staat op de naam zelf.',
      },
    },
  },
  render: () => (
    <table>
      <caption className="hf-visually-hidden">Doelpuntenmakers</caption>
      <thead>
        <tr>
          <th scope="col">Speler</th>
          <th scope="col">Doelpunten</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <th scope="row">
            <PlayerName givenName="Jakob" surname="Trenskow" />
          </th>
          <td>7</td>
        </tr>
        <tr>
          <th scope="row">
            <PlayerName givenName="Luca" surname="Oyen" />
          </th>
          <td>4</td>
        </tr>
      </tbody>
    </table>
  ),
})

export const Unsplit = meta.story({
  name: 'Een naam die niet te splitsen is',
  parameters: {
    docs: {
      description: {
        story:
          'Is niet te zien waar de achternaam begint, dan staat de hele naam in het gewone gewicht, met een lege achternaam, in plaats van een verkeerde splitsing.',
      },
    },
  },
  render: () => (
    <Text>
      Gespeeld door <PlayerName givenName="Jan Paul van Hecke" surname="" />.
    </Text>
  ),
})

export const Long = meta.story({
  name: 'Een lange naam breekt netjes',
  render: () => (
    <div style={{ maxInlineSize: '14rem' }}>
      <Text>
        <PlayerName givenName="Jan van der Voorbeeldstraat" surname="Proefmans-Van Nepperveldhuizen" />
      </Text>
    </div>
  ),
})

export const LongInHeaderAndList = meta.story({
  name: 'Een lange naam in een rijkop en in een lijst, op een smalle plek',
  parameters: {
    docs: {
      description: {
        story:
          'Op een smalle plek breekt de naam af op een spatie, ook in de rijkop van een tabel en in een lijst. Een woord dat langer is dan de plek breekt overal. De tabel wordt niet breder dan de plek.',
      },
    },
  },
  render: () => (
    <div style={{ maxInlineSize: '18rem' }}>
      <table>
        <caption className="hf-visually-hidden">Doelpuntenmakers</caption>
        <thead>
          <tr>
            <th scope="col">Speler</th>
            <th className="hf-numeric" scope="col">
              Doelpunten
            </th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">
              <PlayerName givenName="Jan Willem" surname="Van der Voorbeeldstraat-Proefmans" />
            </th>
            <td className="hf-numeric">7</td>
          </tr>
        </tbody>
      </table>
      <List role="list">
        <List.Item>
          <PlayerName givenName="Johannes Christiaan" surname="De Wit van Testvoort" />
        </List.Item>
      </List>
    </div>
  ),
})
