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
    period: {
      description:
        'Welk deel van de tijd de regel gaat, zoals de bezoeker het leest: "tot 14 mrt 2026" of "vanaf 1 sep 2025". Laat hem weg als de naam genoeg zegt, zoals bij de enige trainer van een seizoen.',
    },
    surname: { description: 'De achternaam, in het sterkere gewicht.' },
  },
  component: ShortStaff,
  parameters: {
    docs: {
      description: {
        component: [
          'Een persoon van de staf als korte regel in een lijst: de naam, en als dat iets zegt ervoor wanneer die de functie had of kreeg.',
          'Het is de korte regel van `ShortMatch` voor een persoon, met hetzelfde uiterlijk, voor een lijst zoals de hoofdtrainers van een seizoen.',
          'De naam staat als bij een speler: de voornaam in het normale gewicht en de achternaam in het sterkere. "(interim)" staat erachter in het normale gewicht.',
          'Zet de regel in een `List.Item`, de lijst in een `Card` onder een kop van niveau 2, en geef de `List` `role="list"`: Safari noemt een lijst zonder opsommingstekens anders geen lijst meer.',
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
    <Card aria-labelledby={id}>
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
