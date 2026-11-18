import preview from '#.storybook/preview'

import { ControlsDocsPage } from '../../docs/ControlsDocsPage'
import { Link } from '../link/Link'
import { Text } from '../text/Text'
import { List, listElements } from './List'

const meta = preview.meta({
  argTypes: {
    as: {
      control: 'radio',
      description:
        'Het element: een opsomming of een genummerde lijst. Alleen een genummerde lijst heeft `start` en `reversed`.',
      options: listElements,
    },
    columns: {
      control: 'boolean',
      description:
        'De items in twee kolommen, na elkaar: eerst de eerste helft naar beneden, dan de rest. De leesvolgorde blijft die van de code.',
    },
    loose: {
      control: 'boolean',
      description: 'Een ruime lijst, zoals Markdown die kent: elk item heeft ruimte onder zich.',
    },
    plain: {
      control: 'boolean',
      description: 'Een lijst zonder opsommingstekens en inspringing, voor korte regels op een telefoon.',
    },
  },
  component: List,
  parameters: {
    docs: {
      description: {
        component: [
          'Een lijst zet dingen onder elkaar die bij elkaar horen, zodat een lezer ze in één oogopslag ziet.',
          'Kies een opsomming als de volgorde er niet toe doet, en een genummerde lijst als de lezer de stappen op volgorde moet doen.',
          'Elk item is een `List.Item`, dat alleen in een lijst werkt.',
        ].join('\n'),
      },
      page: ControlsDocsPage,
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Tekst/List',
})

export const Default = meta.story({
  args: { as: 'ul', loose: false },
  name: 'Lijst',
  render: ({ as, ...args }) => {
    const items = (
      <>
        <List.Item>Nieuws over sc Heerenveen uit de media</List.Item>
        <List.Item>De nieuwste discussies op het forum</List.Item>
        <List.Item>De stand en de uitslagen</List.Item>
      </>
    )

    return as === 'ol' ? (
      <List {...args} as="ol">
        {items}
      </List>
    ) : (
      <List {...args}>{items}</List>
    )
  },
})

export const Plain = meta.story({
  name: 'Zonder opsommingstekens',
  render: () => (
    <List plain role="list">
      <List.Item>Nieuws over sc Heerenveen uit de media</List.Item>
      <List.Item>De nieuwste discussies op het forum</List.Item>
      <List.Item>De stand en de uitslagen</List.Item>
    </List>
  ),
})

export const Columns = meta.story({
  name: 'In twee kolommen',
  render: () => (
    <List columns plain role="list">
      <List.Item>Europa 12</List.Item>
      <List.Item>Afrika 5</List.Item>
      <List.Item>Azië 2</List.Item>
      <List.Item>Noord-Amerika 1</List.Item>
      <List.Item>Zuid-Amerika 0</List.Item>
      <List.Item>Oceanië 0</List.Item>
    </List>
  ),
})

export const Numbered = meta.story({
  name: 'Genummerde lijst',
  render: () => (
    <List as="ol">
      <List.Item>Stuur ons de link naar het bericht dat weg moet.</List.Item>
      <List.Item>Vertel erbij wie je bent en waarom het weg moet.</List.Item>
    </List>
  ),
})

export const Loose = meta.story({
  name: 'Ruime lijst met alinea’s',
  parameters: {
    docs: {
      description: {
        story:
          'De ruimte staat tussen de items, dus een item zonder alinea krijgt evenveel als een item met een alinea. Onder de lijst staat evenveel ruimte als onder een gewone lijst.',
      },
    },
  },
  render: () => (
    <div className="hf-flow">
      <List loose>
        <List.Item>
          <Link href="#testkrant">Testkrant</Link>
          <Text>Een verzonnen dagblad om de site mee te testen. Het schrijft elke dag over sc Heerenveen.</Text>
        </List.Item>
        <List.Item>
          <Link href="#proefforum">Proefforum</Link>
        </List.Item>
        <List.Item>
          <Link href="#testpodcast">Testpodcast</Link>
          <Text>Een verzonnen podcast waarin supporters na elke wedstrijd napraten.</Text>
        </List.Item>
      </List>
      <Text>Onder de lijst staat evenveel ruimte als onder een gewone lijst.</Text>
    </div>
  ),
})
