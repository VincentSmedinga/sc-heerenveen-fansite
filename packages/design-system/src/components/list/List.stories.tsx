import preview from '#.storybook/preview'

import { Link } from '../link/Link'
import { Text } from '../text/Text'
import { List } from './List'

const meta = preview.meta({
  parameters: {
    docs: {
      description: {
        component: [
          'Een lijst met items. Elk item is een `List.Item`: het `li`-element, dat alleen in een lijst werkt.',
          '',
          'Met `as` kies je het element uit een vaste lijst:',
          '',
          '- `ul` (standaard): een opsomming met vierkante tekens.',
          '- `ol`: een genummerde lijst.',
          '  Alleen hier kun je `start` en `reversed` gebruiken.',
          '',
          'Met `loose` maak je een ruime lijst, zoals Markdown die kent: elk item heeft ruimte onder zich.',
          'De ruimte hoort bij het item, dus een item zonder alinea krijgt evenveel als een item met een alinea.',
          'De laatste alinea in een item heeft zelf geen ruimte onder zich, en onder de lijst staat evenveel ruimte als onder een gewone lijst.',
          'Zonder `loose` is de lijst compact.',
        ].join('\n'),
      },
    },
  },
  tags: ['autodocs'],
  title: 'Componenten/Tekst/List',
})

const render = () => (
  <>
    <List>
      <List.Item>Nieuws over sc Heerenveen uit de media</List.Item>
      <List.Item>De nieuwste discussies op het forum</List.Item>
    </List>
    <List as="ol">
      <List.Item>Stuur ons de link naar het bericht dat weg moet.</List.Item>
      <List.Item>Vertel erbij wie je bent en waarom het weg moet.</List.Item>
    </List>
  </>
)

export const Light = meta.story({ globals: { theme: 'light' }, name: 'Licht', render })

export const Dark = meta.story({ globals: { theme: 'dark' }, name: 'Donker', render })

const renderLoose = () => (
  <div style={{ maxInlineSize: '40rem' }}>
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
)

export const LooseLight = meta.story({ globals: { theme: 'light' }, name: 'Ruime lijst, licht', render: renderLoose })

export const LooseDark = meta.story({ globals: { theme: 'dark' }, name: 'Ruime lijst, donker', render: renderLoose })
