import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Card } from '../card/Card'
import { Heading } from '../heading/Heading'
import { Link } from '../link/Link'
import { List } from '../list/List'
import { ShortStaff } from './ShortStaff'

const meta = preview.meta({
  argTypes: {
    interim: { description: 'Of de persoon tijdelijk invalde. De regel zegt dan "(interim)" achter de naam.' },
    name: { description: 'De naam van de persoon, als tekst of als link.' },
    period: {
      description:
        'Welk deel van het seizoen de persoon de functie had, zoals de bezoeker het leest: "hele seizoen", "tot 14 mrt 2026" of "vanaf 1 sep 2025".',
    },
  },
  component: ShortStaff,
  parameters: {
    docs: {
      description: {
        component: [
          'Een persoon van de staf als korte regel in een lijst: wanneer die de functie had, en de naam.',
          'Het is de korte regel van `ShortMatch` voor een persoon, met hetzelfde uiterlijk, voor een lijst zoals de hoofdtrainers van een seizoen.',
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
  args: { name: 'Testtrainer Een', period: 'hele seizoen' },
  name: 'Een trainer het hele seizoen',
  render: (args) =>
    inCard(
      <List.Item>
        <ShortStaff {...args} />
      </List.Item>,
      'Hoofdtrainer',
      'staf-een',
    ),
})

export const ChangeOfCoach = meta.story({
  name: 'Drie trainers in een seizoen, met een tijdelijke en een link',
  render: () =>
    inCard(
      <>
        <List.Item>
          <ShortStaff name={<Link href="#testtrainer-een">Testtrainer Een</Link>} period="tot 14 mrt 2026" />
        </List.Item>
        <List.Item>
          <ShortStaff interim name="Testtrainer Twee" period="van 15 mrt 2026 tot 30 apr 2026" />
        </List.Item>
        <List.Item>
          <ShortStaff
            name="Testtrainer Drie, met een naam die zo lang is dat hij moet afbreken"
            period="vanaf 1 mei 2026"
          />
        </List.Item>
      </>,
      'Hoofdtrainers',
      'staf-drie',
    ),
})
