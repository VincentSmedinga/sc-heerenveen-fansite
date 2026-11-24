import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { List } from '../list/List'
import { ShortStaff } from './ShortStaff'

const meta = preview.meta({
  argTypes: {
    givenName: { description: 'De voornaam, in het normale gewicht. Laat hem weg bij iemand met één naam.' },
    interim: { description: 'Of de persoon tijdelijk invalde. De regel zegt dan "(interim)" achter de naam.' },
    name: {
      description:
        'Een naam in één stuk, zoals een stadion of een club, in het gewicht van een naam. Voor een persoon gebruik je `givenName` en `surname`.',
    },
    note: {
      description:
        'Een korte tekst onder de regel, zoals waarom een club een tijd elders speelde. Gewone tekst, door ons geschreven.',
    },
    period: {
      description:
        'Welk deel van de tijd de regel gaat, zoals de bezoeker het leest: "tot 14 mrt 2026" of "vanaf 1 sep 2025". Laat hem weg als de naam genoeg zegt, zoals bij de enige trainer van een seizoen.',
    },
    surname: { description: 'De achternaam, in het gewicht van een naam.' },
  },
  component: ShortStaff,
  parameters: {
    docs: {
      description: {
        component: [
          'Een persoon van de staf als korte regel in een lijst: de naam, en als dat iets zegt ervoor wanneer die de functie had of kreeg.',
          'Het is een korte regel voor een persoon, voor een lijst zoals de hoofdtrainers van een seizoen. Een stadion of een club is geen achternaam: geef die mee als `name`. Zet de regel in een `List.Item`, de lijst in een `Card` onder een kop van niveau 2, en geef de `List` `role="list"`.',
          'Hij is gebouwd uit `PlayerName` en `Text`.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Patronen/ShortStaff',
})

const inCard = (children: React.ReactNode, heading: string, id: string) => (
  <div style={{ maxInlineSize: '20rem' }}>
    <Card aria-labelledby={id} surface="strong">
      <Heading id={id} level={2}>
        {heading}
      </Heading>
      <List role="list">{children}</List>
    </Card>
  </div>
)

export const Default = meta.story({
  args: { givenName: 'Testtrainer', period: 'vanaf 1 sep 2025', surname: 'Een' },
  name: 'Een regel met een periode',
  render: (args) =>
    inCard(
      <List.Item>
        <ShortStaff {...args} />
      </List.Item>,
      'Hoofdtrainer',
      'staf-een',
    ),
})

export const OnlyName = meta.story({
  name: 'Alleen de naam, voor de enige trainer van een seizoen',
  render: () =>
    inCard(
      <List.Item>
        <ShortStaff givenName="Testtrainer" surname="Een" />
      </List.Item>,
      'Hoofdtrainer',
      'staf-naam',
    ),
})

export const WithNote = meta.story({
  name: 'Een regel met een toelichting eronder',
  render: () =>
    inCard(
      <>
        <List.Item>
          <ShortStaff name="Eerste Stadion" period="tot 10 aug 2019" />
        </List.Item>
        <List.Item>
          <ShortStaff
            name="Tijdelijk Stadion"
            note="De club speelde tijdelijk in een andere stad, na de instorting van een deel van het dak."
            period="10 aug 2019 t/m 2019/20"
          />
        </List.Item>
        <List.Item>
          <ShortStaff name="Eerste Stadion" period="vanaf 2020/21" />
        </List.Item>
      </>,
      'Stadions',
      'staf-toelichting',
    ),
})

export const ChangeOfCoach = meta.story({
  name: 'Drie trainers in een seizoen, met een tijdelijke en een lange naam',
  render: () =>
    inCard(
      <>
        <List.Item>
          <ShortStaff givenName="Testtrainer" period="tot 14 mrt 2026" surname="Een" />
        </List.Item>
        <List.Item>
          <ShortStaff givenName="Testtrainer" interim period="tot 30 apr 2026" surname="Twee" />
        </List.Item>
        <List.Item>
          <ShortStaff
            givenName="Testtrainer"
            period="vanaf 1 mei 2026"
            surname="Drie, met een naam die zo lang is dat hij moet afbreken"
          />
        </List.Item>
      </>,
      'Hoofdtrainers',
      'staf-drie',
    ),
})
