import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Link } from '../link/Link'
import { List } from '../list/List'
import { Text } from '../text/Text'
import { countryNames } from './flags'
import { PlayerName } from './PlayerName'

const meta = preview.meta({
  argTypes: {
    children: {
      control: 'text',
      description:
        'Een regel achter de naam met meer over de speler, in kleine, rustige letters en op een eigen regel, zoals het aantal wedstrijden van een hoofdtrainer. Voor een schermlezer komt hij als eigen tekst na de naam.',
    },
    country: {
      control: 'text',
      description:
        'Het land van de speler als landcode van twee letters, zoals `NL`. De vlag staat tussen het rugnummer en de naam, met de Nederlandse landnaam als tekst voor een schermlezer. Een land zonder tekening toont de twee letters van het land in een kader van dezelfde grootte, met dezelfde landnaam voor een schermlezer. `null` is een speler zonder land in een lijst waar anderen er wel een hebben: een lege plek van dezelfde breedte. Laat hem weg in een lijst waar niemand een vlag heeft.',
    },
    givenName: {
      control: 'text',
      description: 'De voornaam, in het gewone gewicht. Laat hem weg bij een speler met één naam.',
    },
    shirtNumber: {
      control: 'number',
      description:
        'Het rugnummer, in een kolom voor de naam. `null` is een speler zonder nummer in een lijst waar anderen er wel een hebben: de kolom blijft leeg. Laat hem weg in een lijst waar niemand een nummer heeft.',
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
          'Met een rugnummer staat het nummer in een kolom voor de naam, en met een regel achter de naam staat daar meer over de speler.',
          'Met een land staat er een klein vlagje tussen het nummer en de naam, of de landcode als we geen vlag hebben: een supporter ziet in één blik waar een speler vandaan komt, en een schermlezer leest de landnaam voor.',
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

export const WithShirtNumbers = meta.story({
  name: 'Met rugnummers, ook een speler zonder',
  parameters: {
    docs: {
      description: {
        story:
          'Het rugnummer staat in een kolom, zodat de namen op dezelfde plek beginnen. Een speler zonder nummer (`null`) houdt een lege kolom. Een lange naam loopt door onder de naam, niet onder het nummer.',
      },
    },
  },
  render: () => (
    <div style={{ maxInlineSize: '16rem' }}>
      <List role="list">
        <List.Item>
          <PlayerName givenName="Testspeler" shirtNumber={4} surname="Een" />
        </List.Item>
        <List.Item>
          <PlayerName givenName="Testspeler" shirtNumber={12} surname="van Twee" />
        </List.Item>
        <List.Item>
          <PlayerName givenName="Testspeler" shirtNumber={null} surname="Drie" />
        </List.Item>
        <List.Item>
          <PlayerName
            givenName="Jan van der Voorbeeldstraat"
            shirtNumber={39}
            surname="Proefmans-Van Nepperveldhuizen"
          />
        </List.Item>
      </List>
    </div>
  ),
})

export const WithLine = meta.story({
  name: 'Met een regel achter de naam',
  parameters: {
    docs: {
      description: {
        story:
          'De regel komt als `children` mee. De naam blijft één naam, en de regel staat eronder in kleine, rustige letters.',
      },
    },
  },
  render: () => (
    <List role="list">
      <List.Item>
        <PlayerName givenName="Testtrainer" surname="Een">
          34 wedstrijden, 1,85 punten per wedstrijd
        </PlayerName>
      </List.Item>
      <List.Item>
        <PlayerName givenName="Testtrainer" shirtNumber={null} surname="Twee">
          12 wedstrijden, 1,00 punten per wedstrijd
        </PlayerName>
      </List.Item>
    </List>
  ),
})

export const WithFlags = meta.story({
  name: 'Met vlaggen, ook een speler zonder land',
  parameters: {
    docs: {
      description: {
        story:
          'De vlag staat tussen het rugnummer en de naam, in een kolom van vaste breedte. Een speler zonder bekend land (`null`) houdt een lege plek van dezelfde breedte, zodat de namen op één lijn blijven. Een speler uit een land zonder tekening (hier Kazachstan) toont de landcode in een kader van dezelfde grootte. Een vlag met veel wit, zoals die van Nederland, Finland en Japan, heeft een dunne rand.',
      },
    },
  },
  render: () => (
    <div style={{ maxInlineSize: '16rem' }}>
      <List role="list">
        <List.Item>
          <PlayerName country="NL" givenName="Testspeler" shirtNumber={4} surname="Een" />
        </List.Item>
        <List.Item>
          <PlayerName country="FI" givenName="Testspeler" shirtNumber={12} surname="van Twee" />
        </List.Item>
        <List.Item>
          <PlayerName country="JP" givenName="Testspeler" shirtNumber={null} surname="Drie" />
        </List.Item>
        <List.Item>
          <PlayerName country={null} givenName="Testspeler" shirtNumber={21} surname="Vier" />
        </List.Item>
        <List.Item>
          <PlayerName country="KZ" givenName="Testspeler" shirtNumber={30} surname="Vijf" />
        </List.Item>
        <List.Item>
          <PlayerName
            country="DK"
            givenName="Jan van der Voorbeeldstraat"
            shirtNumber={39}
            surname="Proefmans-Van Nepperveldhuizen"
          />
        </List.Item>
      </List>
    </div>
  ),
})

export const WithFlagsDark = meta.story({
  globals: { theme: 'dark' },
  name: 'Met vlaggen, donker',
  parameters: {
    docs: {
      description: {
        story: 'In het donker haalt de rand om een witte vlag ook 3:1 tegen de kaart.',
      },
    },
  },
  render: () => (
    <List role="list">
      <List.Item>
        <PlayerName country="NL" givenName="Testspeler" shirtNumber={4} surname="Een" />
      </List.Item>
      <List.Item>
        <PlayerName country="FI" givenName="Testspeler" shirtNumber={12} surname="van Twee" />
      </List.Item>
      <List.Item>
        <PlayerName country="JP" givenName="Testspeler" shirtNumber={null} surname="Drie" />
      </List.Item>
    </List>
  ),
})

export const SimplifiedFlags = meta.story({
  name: 'Een vereenvoudigde vlag',
  parameters: {
    docs: {
      description: {
        story:
          "De echte vlag van sommige landen is te zwaar voor een lijst, door een wapen of fijne details. Zo'n land toont een vereenvoudigde vlag met de kleuren en de indeling van de echte, zonder wapen. De landnaam blijft het tekstalternatief.",
      },
    },
  },
  render: () => (
    <div style={{ maxInlineSize: '16rem' }}>
      <List role="list">
        <List.Item>
          <PlayerName country="ES" givenName="Testspeler" shirtNumber={2} surname="Zes" />
        </List.Item>
        <List.Item>
          <PlayerName country="BR" givenName="Testspeler" shirtNumber={7} surname="Zeven" />
        </List.Item>
        <List.Item>
          <PlayerName country="RS" givenName="Testspeler" shirtNumber={11} surname="Acht" />
        </List.Item>
        <List.Item>
          <PlayerName country="AR" givenName="Testspeler" shirtNumber={null} surname="Negen" />
        </List.Item>
      </List>
    </div>
  ),
})

const codeFrameList = (
  <div style={{ maxInlineSize: '16rem' }}>
    <List role="list">
      <List.Item>
        <PlayerName country="KZ" givenName="Testspeler" shirtNumber={3} surname="Tien" />
      </List.Item>
      <List.Item>
        <PlayerName country="MW" givenName="Testspeler" shirtNumber={14} surname="Elf" />
      </List.Item>
      <List.Item>
        <PlayerName country="NL" givenName="Testspeler" shirtNumber={9} surname="Twaalf" />
      </List.Item>
      <List.Item>
        <PlayerName country={null} givenName="Testspeler" shirtNumber={21} surname="Dertien" />
      </List.Item>
    </List>
  </div>
)

export const CountryCode = meta.story({
  name: 'Een land zonder tekening toont de landcode',
  parameters: {
    docs: {
      description: {
        story:
          'Heeft een land geen tekening, dan staat de landcode in een kader van dezelfde grootte als een vlag, met dezelfde rand. Een schermlezer leest de landnaam voor, niet de twee letters.',
      },
    },
  },
  render: () => codeFrameList,
})

export const CountryCodeDark = meta.story({
  globals: { theme: 'dark' },
  name: 'De landcode, donker',
  parameters: {
    docs: {
      description: {
        story: 'In het donker haalt de landcode 4,5:1 en de rand 3:1 tegen de kaart.',
      },
    },
  },
  render: () => codeFrameList,
})

export const AllFlags = meta.story({
  name: 'De landen die we hebben',
  parameters: {
    docs: {
      description: {
        story:
          'Alle landen die we hebben, bij een speler met de landcode als naam: de echte vlag, een vereenvoudigde vlag of de landcode. Een schermlezer leest de landnaam voor. Een code die geen land is, krijgt een lege plek.',
      },
    },
  },
  render: () => (
    <List role="list">
      {Object.keys(countryNames).map((code) => (
        <List.Item key={code}>
          <PlayerName country={code} givenName={`Testspeler ${code}`} surname="" />
        </List.Item>
      ))}
    </List>
  ),
})
