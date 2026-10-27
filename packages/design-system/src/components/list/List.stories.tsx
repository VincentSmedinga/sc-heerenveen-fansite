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
    loose: {
      control: 'boolean',
      description: 'Een ruime lijst, zoals Markdown die kent: elk item heeft ruimte onder zich.',
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
          'De ruimte hoort bij het item, dus een item zonder alinea krijgt evenveel als een item met een alinea. Onder de lijst staat evenveel ruimte als onder een gewone lijst.',
      },
    },
  },
  render: () => (
    <>
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
    </>
  ),
})
